import { useEffect, useMemo, useState } from 'react'
import Cliente from './Cliente.jsx'
import ConsultaTurno from './ConsultaTurno.jsx'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3032').replace(/\/$/, '')

const vistas = [
  { id: 'inicio', texto: 'Inicio' },
  { id: 'calendario', texto: 'Calendario' },
  { id: 'turnos', texto: 'Turnos' },
  { id: 'nuevo', texto: 'Nuevo turno' },
]

const estados = {
  PENDIENTE: 'Pendiente',
  REGISTRADO: 'Pendiente',
  CONFIRMADO: 'Confirmado',
  RECHAZADO: 'Rechazado',
  CANCELADO: 'Cancelado',
  FINALIZADO: 'Finalizado',
}

function fechaLocal() {
  const hoy = new Date()
  return crearFecha(hoy.getFullYear(), hoy.getMonth() + 1, hoy.getDate())
}

function crearFecha(anio, mes, dia) {
  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

function fechaDesdeTexto(fecha) {
  const [anio, mes, dia] = fecha.slice(0, 10).split('-').map(Number)
  return new Date(anio, mes - 1, dia)
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
  if (window.location.hash === '#solicitar-turno') return <Cliente />
  const rutaConsulta = window.location.hash.match(/^#consulta-turno\/([A-Za-z0-9_-]{43})$/)
  if (rutaConsulta) return <ConsultaTurno token={rutaConsulta[1]} />

  const [formulario, setFormulario] = useState({
    nombre: '', telefono: '', servicio: '', fecha: fechaLocal(), hora: '', observaciones: '',
  })
  const [turnos, setTurnos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [actualizandoId, setActualizandoId] = useState(null)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [vistaActiva, setVistaActiva] = useState('inicio')
  const [mesVisible, setMesVisible] = useState(() => {
    const hoy = new Date()
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  })
  const [fechaSeleccionada, setFechaSeleccionada] = useState(fechaLocal())

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

  useEffect(() => { cargarTurnos() }, [])

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
    const pendientes = turnos.filter((turno) => ['PENDIENTE', 'REGISTRADO'].includes(turno.estado)).length
    return { hoy: turnosHoy.length, proximos: proximos.length, total: turnos.length, pendientes, turnosHoy, proximos }
  }, [turnos])

  const turnosPorFecha = useMemo(() => {
    return turnos.reduce((grupos, turno) => {
      if (!grupos[turno.fecha]) grupos[turno.fecha] = []
      grupos[turno.fecha].push(turno)
      return grupos
    }, {})
  }, [turnos])

  const diasCalendario = useMemo(() => {
    const anio = mesVisible.getFullYear()
    const mes = mesVisible.getMonth()
    const primerDia = new Date(anio, mes, 1)
    const desplazamiento = (primerDia.getDay() + 6) % 7
    const cantidadDias = new Date(anio, mes + 1, 0).getDate()
    const cantidadCeldas = Math.ceil((desplazamiento + cantidadDias) / 7) * 7
    return Array.from({ length: cantidadCeldas }, (_, indice) => {
      const numeroDia = indice - desplazamiento + 1
      if (numeroDia < 1 || numeroDia > cantidadDias) return null
      const fecha = crearFecha(anio, mes + 1, numeroDia)
      return { fecha, dia: numeroDia, turnos: turnosPorFecha[fecha] || [] }
    })
  }, [mesVisible, turnosPorFecha])

  const turnosSeleccionados = turnosPorFecha[fechaSeleccionada] || []
  const tituloMes = mesVisible.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

  function cambiarCampo(evento) {
    const { name, value } = evento.target
    setFormulario((actual) => ({ ...actual, [name]: value }))
  }

  async function actualizarEstado(turno, nuevoEstado) {
    const accion = estados[nuevoEstado].toLowerCase()
    if (!window.confirm(`Confirma que desea marcar el turno de ${turno.cliente} como ${accion}?`)) return
    setActualizandoId(turno.id)
    setMensaje('')
    setError('')
    try {
      const respuesta = await fetch(`${API_URL}/api/turnos/${turno.id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      })
      const datos = await respuesta.json()
      if (!respuesta.ok || !datos.success) throw new Error(datos.message || 'No se pudo actualizar el turno.')
      setMensaje('Estado del turno actualizado correctamente.')
      await cargarTurnos()
    } catch (e) {
      setError(normalizarMensaje(e.message || 'No se pudo actualizar el turno.'))
    } finally {
      setActualizandoId(null)
    }
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
      setMensaje(`Turno numero ${datos.id} registrado como pendiente.`)
      setFormulario({ nombre: '', telefono: '', servicio: '', fecha: fechaLocal(), hora: '', observaciones: '' })
      await cargarTurnos()
      setVistaActiva('calendario')
      setFechaSeleccionada(formulario.fecha)
      const fechaNueva = fechaDesdeTexto(formulario.fecha)
      setMesVisible(new Date(fechaNueva.getFullYear(), fechaNueva.getMonth(), 1))
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
          <div><strong>TURNERO</strong><span>Gestion de agenda</span></div>
        </div>
        <a className="client-preview-link" href="/#solicitar-turno" target="_blank" rel="noreferrer">Ver pantalla cliente</a>
        <p className="nav-caption">MENU PRINCIPAL</p>
        <nav className="side-nav" aria-label="Menu principal">
          {vistas.map((vista) => (
            <button key={vista.id} type="button" className={`nav-button ${vistaActiva === vista.id ? 'active' : ''}`}
              onClick={() => { setVistaActiva(vista.id); setMensaje(''); setError('') }}>
              <span className="nav-indicator" />{vista.texto}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer"><span className="connection-dot" />Agenda conectada</div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div><p className="eyebrow">PANEL DE CONTROL</p>
            <h1>{vistaActiva === 'inicio' ? 'Resumen de agenda' : vistaActiva === 'calendario' ? 'Calendario de turnos' : vistaActiva === 'turnos' ? 'Turnos registrados' : 'Registrar un turno'}</h1>
          </div>
          <div className="topbar-date">{fechaDeHoy}</div>
        </header>

        <div className="content-area">
          {mensaje && <div className="notice success" role="status">{mensaje}</div>}
          {error && <div className="notice error" role="alert">{error}</div>}

          {vistaActiva === 'inicio' && (
            <>
              <section className="welcome-row">
                <div><h2>Bienvenido a TURNERO</h2><p>Este es el estado actual de tu agenda.</p></div>
                <button type="button" className="primary-button" onClick={() => { setVistaActiva('nuevo'); setMensaje(''); setError('') }}>Nuevo turno</button>
              </section>
              <section className="metrics-grid" aria-label="Resumen de turnos">
                <MetricCard titulo="Turnos de hoy" valor={resumen.hoy} detalle="Registrados para hoy" />
                <MetricCard titulo="Pendientes de revision" valor={resumen.pendientes} detalle="Esperan confirmacion" />
                <MetricCard titulo="Total de turnos" valor={resumen.total} detalle="En toda la agenda" />
              </section>
              <section className="panel">
                <div className="panel-heading"><div><h2>Agenda de hoy</h2><p>{formatearFecha(fechaLocal())}</p></div>
                  <button type="button" className="text-button" onClick={() => { setFechaSeleccionada(fechaLocal()); setVistaActiva('calendario') }}>Abrir calendario</button>
                </div>
                {cargando ? <EstadoVacio texto="Cargando turnos..." /> : resumen.turnosHoy.length === 0 ? <EstadoVacio texto="No hay turnos para hoy." /> :
                  <div className="appointment-list">{resumen.turnosHoy.map((turno) => <TurnoItem key={turno.id} turno={turno} />)}</div>}
              </section>
            </>
          )}

          {vistaActiva === 'calendario' && (
            <section className="calendar-layout">
              <div className="panel calendar-panel">
                <div className="calendar-toolbar">
                  <button type="button" className="secondary-button" aria-label="Mes anterior" onClick={() => setMesVisible(new Date(mesVisible.getFullYear(), mesVisible.getMonth() - 1, 1))}>Anterior</button>
                  <h2>{tituloMes}</h2>
                  <button type="button" className="secondary-button" onClick={() => { const hoy = new Date(); setMesVisible(new Date(hoy.getFullYear(), hoy.getMonth(), 1)); setFechaSeleccionada(fechaLocal()) }}>Hoy</button>
                  <button type="button" className="secondary-button" aria-label="Mes siguiente" onClick={() => setMesVisible(new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 1))}>Siguiente</button>
                </div>
                <div className="calendar-legend">
                  {Object.entries({ PENDIENTE: 'Pendiente', CONFIRMADO: 'Confirmado', RECHAZADO: 'Rechazado', CANCELADO: 'Cancelado', FINALIZADO: 'Finalizado' }).map(([estado, etiqueta]) =>
                    <span key={estado}><i className={`legend-dot estado-${estado.toLowerCase()}`} />{etiqueta}</span>)}
                </div>
                <div className="calendar-grid">
                  {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map((dia) => <div className="calendar-weekday" key={dia}>{dia}</div>)}
                  {diasCalendario.map((celda, indice) => celda ? (
                    <button type="button" key={celda.fecha} className={`calendar-day ${fechaSeleccionada === celda.fecha ? 'selected' : ''} ${celda.fecha === fechaLocal() ? 'today' : ''}`}
                      onClick={() => setFechaSeleccionada(celda.fecha)}>
                      <span className="calendar-day-number">{celda.dia}</span>
                      {celda.turnos.length > 0 && <span className="calendar-day-count">{celda.turnos.length} {celda.turnos.length === 1 ? 'turno' : 'turnos'}</span>}
                      <span className="calendar-dots">{celda.turnos.slice(0, 5).map((turno) => <i key={turno.id} className={`legend-dot estado-${(turno.estado === 'REGISTRADO' ? 'pendiente' : turno.estado.toLowerCase())}`} />)}</span>
                    </button>
                  ) : <div className="calendar-day empty" key={`vacio-${indice}`} />)}
                </div>
              </div>

              <div className="panel selected-day-panel">
                <div className="panel-heading"><div><h2>Turnos del dia</h2><p>{formatearFecha(fechaSeleccionada)}</p></div>
                  <button type="button" className="text-button" onClick={cargarTurnos}>Actualizar</button>
                </div>
                {cargando ? <EstadoVacio texto="Cargando turnos..." /> : turnosSeleccionados.length === 0 ? <EstadoVacio texto="No hay turnos para esta fecha." /> :
                  <div className="appointment-list">{turnosSeleccionados.map((turno) =>
                    <TurnoItem key={turno.id} turno={turno} acciones actualizando={actualizandoId === turno.id} onEstado={actualizarEstado} />)}</div>}
              </div>
            </section>
          )}

          {vistaActiva === 'turnos' && (
            <section className="panel">
              <div className="panel-heading"><div><h2>Todos los turnos</h2><p>Informacion consultada desde la base de datos</p></div>
                <button type="button" className="secondary-button" onClick={cargarTurnos}>Actualizar</button></div>
              {cargando ? <EstadoVacio texto="Cargando turnos..." /> : turnos.length === 0 ? <EstadoVacio texto="Todavia no hay turnos registrados." /> :
                <div className="appointment-list">{turnos.map((turno) => <TurnoItem key={turno.id} turno={turno} mostrarFecha />)}</div>}
            </section>
          )}

          {vistaActiva === 'nuevo' && (
            <section className="panel form-panel">
              <div className="panel-heading"><div><h2>Datos del turno</h2><p>Completa los datos para guardar una nueva solicitud.</p></div></div>
              <form onSubmit={guardarTurno} className="turn-form">
                <Campo etiqueta="Nombre del cliente"><input name="nombre" value={formulario.nombre} onChange={cambiarCampo} required maxLength="120" placeholder="Nombre y apellido" className="campo" /></Campo>
                <Campo etiqueta="Telefono"><input name="telefono" value={formulario.telefono} onChange={cambiarCampo} required maxLength="40" placeholder="Numero de contacto" className="campo" /></Campo>
                <Campo etiqueta="Servicio"><input name="servicio" value={formulario.servicio} onChange={cambiarCampo} required maxLength="120" placeholder="Ejemplo: Corte de pelo" className="campo" /></Campo>
                <div className="form-row">
                  <Campo etiqueta="Fecha"><input type="date" name="fecha" value={formulario.fecha} onChange={cambiarCampo} required className="campo" /></Campo>
                  <Campo etiqueta="Hora"><input type="time" name="hora" value={formulario.hora} onChange={cambiarCampo} required className="campo" /></Campo>
                </div>
                <Campo etiqueta="Observaciones (opcional)"><textarea name="observaciones" value={formulario.observaciones} onChange={cambiarCampo} rows="3" maxLength="1000" placeholder="Informacion adicional" className="campo campo-textarea" /></Campo>
                <div className="form-actions">
                  <button type="button" className="secondary-button" onClick={() => setVistaActiva('inicio')}>Cancelar</button>
                  <button type="submit" disabled={guardando} className="primary-button">{guardando ? 'Guardando...' : 'Guardar turno'}</button>
                </div>
              </form>
            </section>
          )}
        </div>
      </main>

      <nav className="mobile-nav" aria-label="Navegacion principal">
        {vistas.map((vista) => <button key={vista.id} type="button" className={`mobile-nav-button ${vistaActiva === vista.id ? 'active' : ''}`}
          onClick={() => { setVistaActiva(vista.id); setMensaje(''); setError('') }}>{vista.texto}</button>)}
      </nav>
    </div>
  )
}

function MetricCard({ titulo, valor, detalle }) {
  return <article className="metric-card"><p>{titulo}</p><strong>{valor}</strong><span>{detalle}</span></article>
}

function TurnoItem({ turno, mostrarFecha = false, acciones = false, actualizando = false, onEstado }) {
  const estado = turno.estado === 'REGISTRADO' ? 'PENDIENTE' : turno.estado
  const puedeResolver = ['PENDIENTE', 'REGISTRADO'].includes(estado)
  return (
    <article className="appointment-item">
      <div className="appointment-time"><strong>{turno.hora}</strong>{mostrarFecha && <span>{formatearFecha(turno.fecha)}</span>}</div>
      <div className="appointment-info"><strong>{turno.cliente}</strong><span>{turno.servicio}</span><span>{turno.telefono}</span>{turno.observaciones && <span>{turno.observaciones}</span>}</div>
      <span className={`status-label estado-${estado.toLowerCase()}`}>{estados[estado] || estado}</span>
      {acciones && <div className="appointment-actions">
        {puedeResolver && <>
          <button type="button" className="action-confirm" disabled={actualizando} onClick={() => onEstado(turno, 'CONFIRMADO')}>Dar OK</button>
          <button type="button" className="action-reject" disabled={actualizando} onClick={() => onEstado(turno, 'RECHAZADO')}>Rechazar</button>
        </>}
        {estado === 'CONFIRMADO' && <>
          <button type="button" className="action-confirm" disabled={actualizando} onClick={() => onEstado(turno, 'FINALIZADO')}>Finalizar</button>
          <button type="button" className="action-reject" disabled={actualizando} onClick={() => onEstado(turno, 'CANCELADO')}>Cancelar</button>
        </>}
        {actualizando && <span className="updating-label">Actualizando...</span>}
      </div>}
    </article>
  )
}

function EstadoVacio({ texto }) { return <div className="empty-state">{texto}</div> }
function Campo({ etiqueta, children }) {
  return <label className="form-field"><span>{etiqueta}</span>{children}</label>
}

export default App
