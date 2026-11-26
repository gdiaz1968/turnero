import { useEffect, useMemo, useState } from 'react'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3032').replace(/\/$/, '')

const vistas = [
  { id: 'inicio', texto: 'Inicio' },
  { id: 'turnos', texto: 'Turnos' },
  { id: 'nuevo', texto: 'Nuevo turno' },
]

function fechaLocal() {
  const hoy = new Date()
  const anio = hoy.getFullYear()
  const mes = String(hoy.getMonth() + 1).padStart(2, '0')
  const dia = String(hoy.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

function formatearFecha(fecha) {
  if (!fecha) return ''
  const [anio, mes, dia] = fecha.slice(0, 10).split('-')
  return `${dia}/${mes}/${anio}`
}

function fechaCompleta(fecha) {
  const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${dias[fecha.getDay()]}, ${fecha.getDate()} de ${meses[fecha.getMonth()]} de ${fecha.getFullYear()}`
}

function horaEnMinutos(hora) {
  const [horas = 0, minutos = 0] = String(hora || '').split(':').map(Number)
  return horas * 60 + minutos
}

function normalizarMensaje(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[º°·]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function App() {
  const [formulario, setFormulario] = useState({
    nombre: '',
    telefono: '',
    servicio: '',
    fecha: fechaLocal(),
    hora: '',
    observaciones: '',
  })
  const [turnos, setTurnos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [vistaActiva, setVistaActiva] = useState('inicio')

  async function cargarTurnos() {
    try {
      setCargando(true)
      const respuesta = await fetch(`${API_URL}/api/turnos`)
      const datos = await respuesta.json()
      if (!respuesta.ok || !datos.success) throw new Error(datos.message || 'No se pudieron cargar los turnos.')
      setTurnos(Array.isArray(datos.turnos) ? datos.turnos : [])
      setError('')
    } catch (e) {
      setError(normalizarMensaje(e.message || 'No se pudo conectar con el servidor.'))
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarTurnos()
  }, [])

  const resumen = useMemo(() => {
    const hoy = fechaLocal()
    const ahora = new Date()
    const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes()
    const turnosHoy = turnos.filter((turno) => turno.fecha === hoy)
    const proximos = turnos.filter((turno) => {
      if (turno.fecha > hoy) return true
      if (turno.fecha < hoy) return false
      return horaEnMinutos(turno.hora) >= minutosAhora
    })
    return { hoy: turnosHoy.length, proximos: proximos.length, total: turnos.length, turnosHoy, proximos }
  }, [turnos])

  function cambiarCampo(evento) {
    const { name, value } = evento.target
    setFormulario((actual) => ({ ...actual, [name]: value }))
  }

  async function guardarTurno(evento) {
    evento.preventDefault()
    setGuardando(true)
    setMensaje('')
    setError('')

    try {
      const respuesta = await fetch(`${API_URL}/api/turnos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formulario),
      })
      const datos = await respuesta.json()
      if (!respuesta.ok || !datos.success) throw new Error(datos.message || 'No se pudo guardar el turno.')

      setMensaje(`Turno numero ${datos.id} registrado correctamente.`)
      setFormulario({
        nombre: '',
        telefono: '',
        servicio: '',
        fecha: fechaLocal(),
        hora: '',
        observaciones: '',
      })
      await cargarTurnos()
      setVistaActiva('turnos')
    } catch (e) {
      setError(normalizarMensaje(e.message || 'Ocurrio un error al guardar.'))
    } finally {
      setGuardando(false)
    }
  }

  const fechaDeHoy = fechaCompleta(new Date())

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">T</div>
          <div>
            <strong>TURNERO</strong>
            <span>Gestion de agenda</span>
          </div>
        </div>

        <p className="nav-caption">MENU PRINCIPAL</p>
        <nav className="side-nav" aria-label="Menu principal">
          {vistas.map((vista) => (
            <button
              key={vista.id}
              type="button"
              className={`nav-button ${vistaActiva === vista.id ? 'active' : ''}`}
              onClick={() => { setVistaActiva(vista.id); setMensaje(''); setError('') }}
            >
              <span className="nav-indicator" />
              {vista.texto}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="connection-dot" />
          Agenda conectada
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <p className="eyebrow">PANEL DE CONTROL</p>
            <h1>{vistaActiva === 'inicio' ? 'Resumen de agenda' : vistaActiva === 'turnos' ? 'Turnos registrados' : 'Registrar un turno'}</h1>
          </div>
          <div className="topbar-date">{fechaDeHoy}</div>
        </header>

        <div className="content-area">
          {mensaje && <div className="notice success" role="status">{mensaje}</div>}
          {error && <div className="notice error" role="alert">{error}</div>}

          {vistaActiva === 'inicio' && (
            <>
              <section className="welcome-row">
                <div>
                  <h2>Bienvenido a TURNERO</h2>
                  <p>Este es el estado actual de tu agenda.</p>
                </div>
                <button type="button" className="primary-button" onClick={() => { setVistaActiva('nuevo'); setMensaje(''); setError('') }}>
                  Nuevo turno
                </button>
              </section>

              <section className="metrics-grid" aria-label="Resumen de turnos">
                <MetricCard titulo="Turnos de hoy" valor={resumen.hoy} detalle="Registrados para hoy" />
                <MetricCard titulo="Proximos turnos" valor={resumen.proximos} detalle="Desde este momento" />
                <MetricCard titulo="Total de turnos" valor={resumen.total} detalle="En toda la agenda" />
              </section>

              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Agenda de hoy</h2>
                    <p>{formatearFecha(fechaLocal())}</p>
                  </div>
                  <button type="button" className="text-button" onClick={() => setVistaActiva('turnos')}>Ver todos</button>
                </div>
                {cargando ? (
                  <EstadoVacio texto="Cargando turnos..." />
                ) : resumen.turnosHoy.length === 0 ? (
                  <EstadoVacio texto="No hay turnos registrados para hoy." />
                ) : (
                  <div className="appointment-list">
                    {resumen.turnosHoy.map((turno) => <TurnoItem key={turno.id} turno={turno} />)}
                  </div>
                )}
              </section>

              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Proximos turnos</h2>
                    <p>Los siguientes horarios de la agenda</p>
                  </div>
                </div>
                {cargando ? (
                  <EstadoVacio texto="Cargando turnos..." />
                ) : resumen.proximos.length === 0 ? (
                  <EstadoVacio texto="No hay turnos proximos registrados." />
                ) : (
                  <div className="appointment-list">
                    {resumen.proximos.slice(0, 5).map((turno) => <TurnoItem key={turno.id} turno={turno} />)}
                  </div>
                )}
              </section>
            </>
          )}

          {vistaActiva === 'turnos' && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Todos los turnos</h2>
                  <p>Informacion consultada desde la base de datos</p>
                </div>
                <button type="button" className="secondary-button" onClick={cargarTurnos}>Actualizar</button>
              </div>
              {cargando ? (
                <EstadoVacio texto="Cargando turnos..." />
              ) : turnos.length === 0 ? (
                <EstadoVacio texto="Todavia no hay turnos registrados." />
              ) : (
                <div className="appointment-list">
                  {turnos.map((turno) => <TurnoItem key={turno.id} turno={turno} mostrarFecha />)}
                </div>
              )}
            </section>
          )}

          {vistaActiva === 'nuevo' && (
            <section className="panel form-panel">
              <div className="panel-heading">
                <div>
                  <h2>Datos del turno</h2>
                  <p>Completa los datos para guardar una nueva reserva.</p>
                </div>
              </div>
              <form onSubmit={guardarTurno} className="turn-form">
                <Campo etiqueta="Nombre del cliente">
                  <input name="nombre" value={formulario.nombre} onChange={cambiarCampo} required maxLength="120" placeholder="Nombre y apellido" className="campo" />
                </Campo>
                <Campo etiqueta="Telefono">
                  <input name="telefono" value={formulario.telefono} onChange={cambiarCampo} required maxLength="40" placeholder="Numero de contacto" className="campo" />
                </Campo>
                <Campo etiqueta="Servicio">
                  <input name="servicio" value={formulario.servicio} onChange={cambiarCampo} required maxLength="120" placeholder="Ejemplo: Corte de pelo" className="campo" />
                </Campo>
                <div className="form-row">
                  <Campo etiqueta="Fecha">
                    <input type="date" name="fecha" value={formulario.fecha} onChange={cambiarCampo} required className="campo" />
                  </Campo>
                  <Campo etiqueta="Hora">
                    <input type="time" name="hora" value={formulario.hora} onChange={cambiarCampo} required className="campo" />
                  </Campo>
                </div>
                <Campo etiqueta="Observaciones (opcional)">
                  <textarea name="observaciones" value={formulario.observaciones} onChange={cambiarCampo} rows="3" maxLength="1000" placeholder="Informacion adicional" className="campo campo-textarea" />
                </Campo>
                <div className="form-actions">
                  <button type="button" className="secondary-button" onClick={() => setVistaActiva('inicio')}>Cancelar</button>
                  <button type="submit" disabled={guardando} className="primary-button">
                    {guardando ? 'Guardando...' : 'Guardar turno'}
                  </button>
                </div>
              </form>
            </section>
          )}
        </div>
      </main>

      <nav className="mobile-nav" aria-label="Navegacion principal">
        {vistas.map((vista) => (
          <button
            key={vista.id}
            type="button"
            className={`mobile-nav-button ${vistaActiva === vista.id ? 'active' : ''}`}
            onClick={() => { setVistaActiva(vista.id); setMensaje(''); setError('') }}
          >
            {vista.texto}
          </button>
        ))}
      </nav>
    </div>
  )
}

function MetricCard({ titulo, valor, detalle }) {
  return (
    <article className="metric-card">
      <p>{titulo}</p>
      <strong>{valor}</strong>
      <span>{detalle}</span>
    </article>
  )
}

function TurnoItem({ turno, mostrarFecha = false }) {
  return (
    <article className="appointment-item">
      <div className="appointment-time">
        <strong>{turno.hora}</strong>
        {mostrarFecha && <span>{formatearFecha(turno.fecha)}</span>}
      </div>
      <div className="appointment-info">
        <strong>{turno.cliente}</strong>
        <span>{turno.servicio}</span>
        <span>{turno.telefono}</span>
        {turno.observaciones && <span>{turno.observaciones}</span>}
      </div>
      <span className="status-label">{normalizarMensaje(turno.estado)}</span>
    </article>
  )
}

function EstadoVacio({ texto }) {
  return <div className="empty-state">{texto}</div>
}

function Campo({ etiqueta, children }) {
  return (
    <label className="form-field">
      <span>{etiqueta}</span>
      {children}
    </label>
  )
}

export default App
