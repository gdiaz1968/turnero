import { useState } from 'react'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3032').replace(/\\/$/, '')

function fechaHoy() {
  const hoy = new Date()
  const mes = String(hoy.getMonth() + 1).padStart(2, '0')
  const dia = String(hoy.getDate()).padStart(2, '0')
  return \`${hoy.getFullYear()}-\${mes}-\${dia}\`
}

function Campo({ etiqueta, children }) {
  return <label className="form-field"><span>{etiqueta}</span>{children}</label>
}

export default function Cliente() {
  const [formulario, setFormulario] = useState({ nombre: '', telefono: '', servicio: '', fecha: fechaHoy(), hora: '', observaciones: '' })
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [confirmacion, setConfirmacion] = useState(null)

  function cambiarCampo(evento) {
    const { name, value } = evento.target
    setFormulario((actual) => ({ ...actual, [name]: value }))
  }

  async function solicitarTurno(evento) {
    evento.preventDefault()
    setEnviando(true)
    setError('')
    try {
      const respuesta = await fetch(\`\${API_URL}/api/turnos\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formulario),
      })
      const datos = await respuesta.json()
      if (!respuesta.ok || !datos.success) throw new Error(datos.message || 'No se pudo enviar la solicitud.')
      setConfirmacion({ id: datos.id, fecha: formulario.fecha, hora: formulario.hora })
    } catch (e) {
      setError(e.message || 'No se pudo conectar con el servidor. Verifica tu conexion e intenta nuevamente.')
    } finally {
      setEnviando(false)
    }
  }

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
            <div className="client-step"><b>3</b><span>Espera la confirmacion del profesional.</span></div>
          </div>
        </section>
        <section className="client-card">
          {confirmacion ? (
            <div className="client-confirmation" role="status">
              <div className="client-confirmation-mark">✓</div>
              <h2>Solicitud recibida</h2>
              <p>Tu solicitud numero <strong>{confirmacion.id}</strong> fue registrada correctamente.</p>
              <p>Fecha solicitada: <strong>{confirmacion.fecha.split('-').reverse().join('/')}</strong><br />Horario solicitado: <strong>{confirmacion.hora}</strong></p>
              <p>El turno queda pendiente hasta que el profesional lo confirme.</p>
              <button type="button" className="client-submit" onClick={() => { setConfirmacion(null); setFormulario({ nombre: '', telefono: '', servicio: '', fecha: fechaHoy(), hora: '', observaciones: '' }) }}>Solicitar otro turno</button>
            </div>
          ) : (
            <>
              <h2>Solicitar un turno</h2>
              <p>Los campos marcados son obligatorios. La solicitud no confirma automaticamente el horario.</p>
              {error && <div className="client-message error" role="alert">{error}</div>}
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
            </>
          )}
        </section>
      </main>
      <footer className="client-footer">La solicitud requiere conexion a internet y queda pendiente de confirmacion.</footer>
    </div>
  )
}
