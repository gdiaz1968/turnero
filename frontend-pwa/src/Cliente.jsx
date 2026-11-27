import { useCallback, useEffect, useState } from 'react'
import './ClienteConsulta.css'
import './ConsultaTurno.css'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3032').replace(/\/$/, '')

function fechaHoy() {
  const hoy = new Date()
  const mes = String(hoy.getMonth() + 1).padStart(2, '0')
  const dia = String(hoy.getDate()).padStart(2, '0')
  return hoy.getFullYear() + '-' + mes + '-' + dia
}

function Campo({ etiqueta, children }) {
  return <label className="form-field"><span>{etiqueta}</span>{children}</label>
}

const ESTADOS = {
  PENDIENTE: {
    titulo: 'Tu solicitud esta pendiente',
    detalle: 'El profesional todavia no confirmo el horario solicitado.',
    clase: 'pendiente',
  },
  REGISTRADO: {
    titulo: 'Tu solicitud esta pendiente',
    detalle: 'El profesional todavia no confirmo el horario solicitado.',
    clase: 'pendiente',
  },
  CONFIRMADO: {
    titulo: 'Tu turno fue confirmado',
    detalle: 'El profesional confirmo tu turno. Te esperamos.',
    clase: 'confirmado',
  },
  RECHAZADO: {
    titulo: 'No fue posible confirmar tu solicitud',
    detalle: 'El horario solicitado no pudo ser aceptado. Comunicate con el negocio para consultar otras opciones.',
    clase: 'rechazado',
  },
  CANCELADO: {
    titulo: 'Tu turno fue cancelado',
    detalle: 'Este turno ya no esta vigente. Comunicate con el negocio si deseas solicitar otro.',
    clase: 'cancelado',
  },
  FINALIZADO: {
    titulo: 'Tu turno fue finalizado',
    detalle: 'La atencion correspondiente a este turno ya fue realizada. Gracias por elegirnos.',
    clase: 'finalizado',
  },
}

function mostrarFecha(fecha) {
  if (!fecha) return ''
  const [anio, mes, dia] = fecha.slice(0, 10).split('-')
  return dia + '/' + mes + '/' + anio
}

function formatearCodigo(codigo) {
  return String(codigo || '').match(/.{1,4}/g)?.join('-') || codigo
}

export default function Cliente() {
  const [formulario, setFormulario] = useState({ nombre: '', telefono: '', servicio: '', fecha: fechaHoy(), hora: '', observaciones: '' })
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [confirmacion, setConfirmacion] = useState(null)
  const [codigoCopiado, setCodigoCopiado] = useState(false)

  const [consulta, setConsulta] = useState({ telefono: '', codigo: '' })
  const [turnoConsultado, setTurnoConsultado] = useState(null)
  const [consultando, setConsultando] = useState(false)
  const [actualizando, setActualizando] = useState(false)
  const [errorConsulta, setErrorConsulta] = useState('')

  function cambiarCampo(evento) {
    const { name, value } = evento.target
    setFormulario((actual) => ({ ...actual, [name]: value }))
  }

  function cambiarConsulta(evento) {
    const { name, value } = evento.target
    setConsulta((actual) => ({
      ...actual,
      [name]: name === 'codigo' ? value.replace(/[^a-fA-F0-9]/g, '').toUpperCase().slice(0, 16) : value,
    }))
    setTurnoConsultado(null)
    setErrorConsulta('')
  }

  async function copiarCodigo() {
    try {
      await navigator.clipboard.writeText(confirmacion.codigo)
      setCodigoCopiado(true)
    } catch {
      setError('No se pudo copiar el codigo. Puedes anotarlo manualmente.')
    }
  }

  async function solicitarTurno(evento) {
    evento.preventDefault()
    setEnviando(true)
    setError('')
    setConfirmacion(null)
    try {
      const respuesta = await fetch(API_URL + '/api/turnos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formulario),
      })
      const datos = await respuesta.json()
      if (!respuesta.ok || !datos.success) throw new Error(datos.message || 'No se pudo enviar la solicitud.')
      if (!datos.codigoConsulta) throw new Error('El turno se registro, pero el servidor no devolvio el codigo de consulta. Contacta al negocio.')
      setConfirmacion({ id: datos.id, fecha: formulario.fecha, hora: formulario.hora, codigo: datos.codigoConsulta })
      setConsulta({ telefono: formulario.telefono, codigo: datos.codigoConsulta })
      setTurnoConsultado(null)
      setErrorConsulta('')
      setCodigoCopiado(false)
    } catch (e) {
      setError(e.message || 'No se pudo conectar con el servidor. Verifica tu conexion e intenta nuevamente.')
    } finally {
      setEnviando(false)
    }
  }

  const buscarTurno = useCallback(async (silencioso = false) => {
    if (!consulta.telefono.trim() || !consulta.codigo.trim()) return
    if (silencioso) setActualizando(true)
    else {
      setConsultando(true)
      setTurnoConsultado(null)
    }

    try {
      const respuesta = await fetch(API_URL + '/api/turnos/consulta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify(consulta),
      })
      const datos = await respuesta.json()
      if (!respuesta.ok || !datos.success) throw new Error(datos.message || 'No se pudo consultar el turno.')
      setTurnoConsultado(datos.turno)
      setErrorConsulta('')
    } catch (e) {
      setErrorConsulta(e.message || 'No se pudo conectar con el servidor.')
    } finally {
      setConsultando(false)
      setActualizando(false)
    }
  }, [consulta])

  useEffect(() => {
    if (!turnoConsultado) return undefined
    const intervalo = window.setInterval(() => buscarTurno(true), 20000)
    return () => window.clearInterval(intervalo)
  }, [turnoConsultado, buscarTurno])

  const estado = turnoConsultado ? ESTADOS[turnoConsultado.estado] || {
    titulo: 'Estado del turno',
    detalle: 'Consulta nuevamente para ver la informacion actualizada.',
    clase: 'pendiente',
  } : null

  return (
    <div className="client-page">
      <header className="client-header">
        <div className="client-brand"><div className="client-brand-mark">T</div><div><strong>TURNERO</strong><span>Solicitud de turnos</span></div></div>
        <div className="client-header-note">Solicita tu turno desde el celular o la computadora</div>
      </header>

      <main className="client-content">
        <section className="client-intro">
          <p className="client-kicker">TU TIEMPO, MEJOR ORGANIZADO</p>
          <h1>Solicita tu proximo turno de forma simple.</h1>
          <p>Completa tus datos y elegi el servicio, el dia y el horario que preferis. El profesional revisara tu solicitud y te confirmara el turno.</p>
          <div className="client-steps">
            <div className="client-step"><b>1</b><span>Completa tus datos de contacto.</span></div>
            <div className="client-step"><b>2</b><span>Indica el servicio y el horario que preferis.</span></div>
            <div className="client-step"><b>3</b><span>Guarda tu codigo para consultar el estado cuando quieras.</span></div>
          </div>
        </section>

        <section className="client-card">
          <h2>Solicitar un turno</h2>
          <p>Los campos marcados son obligatorios. La solicitud no confirma automaticamente el horario.</p>

          {error && <div className="client-message error" role="alert">{error}</div>}

          {confirmacion && (
            <div className="client-confirmation client-confirmation-inline" role="status">
              <div className="client-confirmation-mark">OK</div>
              <h2>Solicitud recibida</h2>
              <p>Tu solicitud numero <strong>{confirmacion.id}</strong> fue registrada correctamente como pendiente.</p>
              <p>Fecha solicitada: <strong>{mostrarFecha(confirmacion.fecha)}</strong><br />Horario solicitado: <strong>{confirmacion.hora}</strong></p>
              <div className="client-codigo-consulta">
                <span>Tu codigo privado de consulta</span>
                <strong>{formatearCodigo(confirmacion.codigo)}</strong>
                <button type="button" className="client-submit" onClick={copiarCodigo}>
                  {codigoCopiado ? 'Codigo copiado' : 'Copiar codigo'}
                </button>
                <small>Guarda este codigo. Junto con tu telefono te permitira consultar el estado de tu turno.</small>
              </div>
            </div>
          )}

          <form className="client-form" onSubmit={solicitarTurno}>
            <Campo etiqueta="Nombre y apellido"><input className="campo" name="nombre" value={formulario.nombre} onChange={cambiarCampo} required maxLength="120" autoComplete="name" placeholder="Como te llamas" /></Campo>
            <Campo etiqueta="Telefono de contacto"><input className="campo" name="telefono" type="tel" value={formulario.telefono} onChange={cambiarCampo} required maxLength="40" autoComplete="tel" placeholder="Tu numero de telefono" /></Campo>
            <Campo etiqueta="Servicio que necesitas"><input className="campo" name="servicio" value={formulario.servicio} onChange={cambiarCampo} required maxLength="120" placeholder="Ejemplo: Corte de cabello" /></Campo>
            <div className="form-row">
              <Campo etiqueta="Fecha preferida"><input className="campo" type="date" name="fecha" value={formulario.fecha} min={fechaHoy()} onChange={cambiarCampo} required /></Campo>
              <Campo etiqueta="Hora preferida"><input className="campo" type="time" name="hora" value={formulario.hora} onChange={cambiarCampo} required /></Campo>
            </div>
            <Campo etiqueta="Comentario (opcional)"><textarea className="campo campo-textarea" name="observaciones" value={formulario.observaciones} onChange={cambiarCampo} maxLength="1000" rows="3" placeholder="Agrega un comentario si lo necesitas" /></Campo>
            <button className="client-submit" type="submit" disabled={enviando}>{enviando ? 'Enviando solicitud...' : 'Enviar solicitud de turno'}</button>
          </form>
        </section>

        <section className="client-card client-consulta-card">
          <p className="consulta-kicker">SEGUIMIENTO DE SOLICITUD</p>
          <h2>Consultar mi turno</h2>
          <p>Ingresa el mismo telefono que utilizaste al solicitar el turno y tu codigo privado de consulta.</p>

          <form className="client-form" onSubmit={(evento) => { evento.preventDefault(); buscarTurno() }}>
            <Campo etiqueta="Telefono de contacto">
              <input className="campo" name="telefono" type="tel" value={consulta.telefono} onChange={cambiarConsulta} required maxLength="40" autoComplete="tel" placeholder="El telefono que registraste" />
            </Campo>
            <Campo etiqueta="Codigo privado de consulta">
              <input className="campo" name="codigo" value={consulta.codigo} onChange={cambiarConsulta} required minLength="16" maxLength="16" autoComplete="off" placeholder="16 caracteres (letras y numeros)" />
            </Campo>
            {errorConsulta && <div className="client-message error" role="alert">{errorConsulta}</div>}
            <button className="client-submit" type="submit" disabled={consultando || actualizando}>
              {consultando ? 'Consultando...' : 'Consultar estado'}
            </button>
          </form>

          {turnoConsultado && (
            <div className="client-consulta-resultado" aria-live="polite">
              <section className={'consulta-estado ' + estado.clase}>
                <span className="consulta-estado-etiqueta">{turnoConsultado.estado}</span>
                <h2>{estado.titulo}</h2>
                <p>{estado.detalle}</p>
              </section>
              <section className="consulta-datos" aria-label="Datos del turno">
                <div><span>Servicio</span><strong>{turnoConsultado.servicio}</strong></div>
                <div><span>Fecha</span><strong>{mostrarFecha(turnoConsultado.fecha)}</strong></div>
                <div><span>Horario</span><strong>{turnoConsultado.hora}</strong></div>
              </section>
              <p className="consulta-actualizacion">El estado se actualiza automaticamente cada 20 segundos. Ultima consulta: {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}.</p>
              <button type="button" className="consulta-button" onClick={() => buscarTurno(true)} disabled={actualizando}>
                {actualizando ? 'Actualizando...' : 'Actualizar estado'}
              </button>
            </div>
          )}
        </section>
      </main>

      <footer className="client-footer">La solicitud requiere conexion a internet y queda pendiente de confirmacion.</footer>
    </div>
  )
}
