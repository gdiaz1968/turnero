import { useEffect, useState } from 'react'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3032').replace(/\/$/, '')

function fechaLocal() {
  const hoy = new Date()
  const anio = hoy.getFullYear()
  const mes = String(hoy.getMonth() + 1).padStart(2, '0')
  const dia = String(hoy.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
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

  async function cargarTurnos() {
    try {
      setCargando(true)
      const respuesta = await fetch(`${API_URL}/api/turnos`)
      const datos = await respuesta.json()
      if (!respuesta.ok || !datos.success) throw new Error(datos.message || 'No se pudieron cargar los turnos.')
      setTurnos(datos.turnos)
      setError('')
    } catch (e) {
      setError(e.message || 'No se pudo conectar con el servidor.')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarTurnos()
  }, [])

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

      setMensaje(`Turno N.º ${datos.id} registrado correctamente.`)
      setFormulario({
        nombre: '',
        telefono: '',
        servicio: '',
        fecha: fechaLocal(),
        hora: '',
        observaciones: '',
      })
      await cargarTurnos()
    } catch (e) {
      setError(e.message || 'Ocurrió un error al guardar.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-800 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">Agenda simple</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">TURNERO</h1>
          <p className="mt-2 text-slate-600">Registrá un turno y consultá los que ya están guardados.</p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
          <section className="h-fit rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-bold">Nuevo turno</h2>
            <form onSubmit={guardarTurno} className="space-y-4">
              <Campo etiqueta="Nombre del cliente">
                <input name="nombre" value={formulario.nombre} onChange={cambiarCampo} required maxLength="120" placeholder="Nombre y apellido" className="campo" />
              </Campo>
              <Campo etiqueta="Teléfono">
                <input name="telefono" value={formulario.telefono} onChange={cambiarCampo} required maxLength="40" placeholder="Número de contacto" className="campo" />
              </Campo>
              <Campo etiqueta="Servicio">
                <input name="servicio" value={formulario.servicio} onChange={cambiarCampo} required maxLength="120" placeholder="Ej.: Corte de pelo" className="campo" />
              </Campo>
              <div className="grid grid-cols-2 gap-3">
                <Campo etiqueta="Fecha">
                  <input type="date" name="fecha" value={formulario.fecha} onChange={cambiarCampo} required className="campo" />
                </Campo>
                <Campo etiqueta="Hora">
                  <input type="time" name="hora" value={formulario.hora} onChange={cambiarCampo} required className="campo" />
                </Campo>
              </div>
              <Campo etiqueta="Observaciones (opcional)">
                <textarea name="observaciones" value={formulario.observaciones} onChange={cambiarCampo} rows="3" maxLength="1000" placeholder="Algún dato adicional" className="campo resize-y" />
              </Campo>

              {mensaje && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{mensaje}</p>}
              {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

              <button disabled={guardando} className="w-full rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
                {guardando ? 'Guardando...' : 'Guardar turno'}
              </button>
            </form>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Turnos registrados</h2>
                <p className="mt-1 text-sm text-slate-500">Los datos se consultan desde la base de datos.</p>
              </div>
              <button type="button" onClick={cargarTurnos} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50">Actualizar</button>
            </div>

            {cargando ? (
              <p className="py-8 text-center text-slate-500">Cargando turnos...</p>
            ) : turnos.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-slate-500">Todavía no hay turnos registrados.</p>
            ) : (
              <div className="space-y-3">
                {turnos.map((turno) => (
                  <article key={turno.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold text-slate-900">{turno.cliente}</h3>
                      <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">{turno.estado}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{turno.servicio}</p>
                    <p className="mt-2 text-sm font-medium text-slate-700">{turno.fecha} · {turno.hora}</p>
                    <p className="mt-1 text-sm text-slate-500">{turno.telefono}</p>
                    {turno.observaciones && <p className="mt-2 text-sm text-slate-500">{turno.observaciones}</p>}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}

function Campo({ etiqueta, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700">{etiqueta}</span>
      {children}
    </label>
  )
}

export default App
