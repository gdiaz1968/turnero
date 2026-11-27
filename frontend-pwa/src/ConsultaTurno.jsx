import { useCallback, useEffect, useState } from 'react'
import './ConsultaTurno.css'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3032').replace(/\/$/, '')

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

export default function ConsultaTurno({ token }) {
  const [turno, setTurno] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [actualizando, setActualizando] = useState(false)
  const [error, setError] = useState('')

  const consultar = useCallback(async (silencioso = false) => {
    if (silencioso) setActualizando(true)
    else setCargando(true)

    try {
      const respuesta = await fetch(
        API_URL + '/api/turnos/consulta/' + encodeURIComponent(token),
        { cache: 'no-store' }
      )
      const datos = await respuesta.json()
      if (!respuesta.ok || !datos.success) {
        throw new Error(datos.message || 'No se pudo consultar el turno.')
      }
      setTurno(datos.turno)
      setError('')
    } catch (e) {
      setError(e.message || 'No se pudo conectar con el servidor.')
    } finally {
      setCargando(false)
      setActualizando(false)
    }
  }, [token])

  useEffect(() => {
    consultar()
    const intervalo = window.setInterval(() => consultar(true), 20000)
    return () => window.clearInterval(intervalo)
  }, [consultar])

  const estado = turno ? ESTADOS[turno.estado] || {
    titulo: 'Estado del turno',
    detalle: 'Consulta nuevamente para ver la informacion actualizada.',
    clase: 'pendiente',
  } : null

  return (
    <div className="consulta-page">
      <header className="consulta-header">
        <div className="consulta-brand">
          <div className="consulta-brand-mark">T</div>
          <div><strong>TURNERO</strong><span>Consulta de turnos</span></div>
        </div>
      </header>

      <main className="consulta-card">
        <p className="consulta-kicker">ESTADO DE TU SOLICITUD</p>
        <h1>Consulta de turno</h1>

        {cargando ? (
          <div className="consulta-loading" role="status">Consultando el estado de tu turno...</div>
        ) : error ? (
          <div className="consulta-error" role="alert">
            <strong>No pudimos consultar el turno</strong>
            <p>{error}</p>
            <button type="button" className="consulta-button" onClick={() => consultar()}>Volver a intentar</button>
          </div>
        ) : turno && (
          <>
            <section className={'consulta-estado ' + estado.clase} aria-live="polite">
              <span className="consulta-estado-etiqueta">{turno.estado}</span>
              <h2>{estado.titulo}</h2>
              <p>{estado.detalle}</p>
            </section>

            <section className="consulta-datos" aria-label="Datos del turno">
              <div><span>Servicio</span><strong>{turno.servicio}</strong></div>
              <div><span>Fecha</span><strong>{mostrarFecha(turno.fecha)}</strong></div>
              <div><span>Horario</span><strong>{turno.hora}</strong></div>
            </section>

            <p className="consulta-actualizacion">
              El estado se actualiza automaticamente. Ultima consulta: {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}.
            </p>
            <button type="button" className="consulta-button" onClick={() => consultar(true)} disabled={actualizando}>
              {actualizando ? 'Actualizando...' : 'Actualizar estado'}
            </button>
          </>
        )}
      </main>

      <footer className="consulta-footer">
        Guarda este enlace para volver a consultar el estado de tu turno.
      </footer>
    </div>
  )
}
