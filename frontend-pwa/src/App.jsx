
import { useState } from 'react'

const initialAppointments = [
  {
    id: 1,
    time: '09:00',
    client: 'Martín Rodríguez',
    service: 'Corte clásico',
    professional: 'Lucas Fernández',
    status: 'Confirmado',
  },
  {
    id: 2,
    time: '10:00',
    client: 'Carolina Gómez',
    service: 'Coloración',
    professional: 'Sofía Martínez',
    status: 'Confirmado',
  },
  {
    id: 3,
    time: '11:30',
    client: 'Federico López',
    service: 'Corte + barba',
    professional: 'Lucas Fernández',
    status: 'Pendiente',
  },
  {
    id: 4,
    time: '14:00',
    client: 'Valentina Pérez',
    service: 'Manicuría',
    professional: 'Camila Torres',
    status: 'Confirmado',
  },
]

const navigation = [
  { label: 'Panel principal', icon: '▦', active: true },
  { label: 'Agenda', icon: '▣' },
  { label: 'Clientes', icon: '♙' },
  { label: 'Profesionales', icon: '♧' },
  { label: 'Servicios', icon: '◇' },
  { label: 'Configuración', icon: '⚙' },
]

function App() {
  const [appointments, setAppointments] = useState(initialAppointments)
  const [showModal, setShowModal] = useState(false)
  const [client, setClient] = useState('')
  const [service, setService] = useState('Corte clásico')
  const [time, setTime] = useState('15:00')

  function handleSubmit(event) {
    event.preventDefault()

    const newAppointment = {
      id: Date.now(),
      time,
      client,
      service,
      professional: 'Sin asignar',
      status: 'Pendiente',
    }

    setAppointments((current) =>
      [...current, newAppointment].sort((a, b) =>
        a.time.localeCompare(b.time),
      ),
    )

    setClient('')
    setService('Corte clásico')
    setTime('15:00')
    setShowModal(false)
  }

  return (
    <div className="min-h-screen bg-[#f5f6fa] text-slate-800">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col bg-[#17243a] text-white lg:flex">
          <div className="flex h-20 items-center gap-3 border-b border-white/10 px-7">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 text-xl font-bold">
              T
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide">TURNERO</h1>
              <p className="text-xs text-slate-400">Gestión de turnos</p>
            </div>
          </div>

          <div className="px-5 py-7">
            <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Menú principal
            </p>

            <nav className="space-y-2">
              {navigation.map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm ${
                    item.active
                      ? 'bg-indigo-500 font-semibold text-white'
                      : 'text-slate-300'
                  }`}
                >
                  <span className="w-5 text-center text-lg">{item.icon}</span>
                  {item.label}
                </div>
              ))}
            </nav>
          </div>

          <div className="mt-auto p-5">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold">Mi negocio</p>
              <p className="mt-1 text-xs text-slate-400">
                Barbería & Salón
              </p>
              <p className="mt-3 text-xs text-emerald-400">
                ● Cuenta de demostración
              </p>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="flex min-h-20 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
            <div>
              <p className="text-sm text-slate-500">Administración</p>
              <h2 className="text-lg font-bold text-slate-800">
                Panel principal
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold">Administrador</p>
                <p className="text-xs text-slate-500">Mi negocio</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">
                A
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-7xl space-y-7 p-5 sm:p-8">
            <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm text-slate-500">Viernes, 20 de noviembre de 2026</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  ¡Buen día!
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Este es el resumen de tu negocio.
                </p>
              </div>

              <button
                onClick={() => setShowModal(true)}
                className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
              >
                + Nuevo turno
              </button>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                title="Turnos de hoy"
                value={appointments.length}
                detail="Reservas registradas"
                icon="▣"
              />
              <SummaryCard
                title="Confirmados"
                value={appointments.filter((a) => a.status === 'Confirmado').length}
                detail="Turnos confirmados"
                icon="✓"
              />
              <SummaryCard
                title="Pendientes"
                value={appointments.filter((a) => a.status === 'Pendiente').length}
                detail="Requieren confirmación"
                icon="◷"
              />
              <SummaryCard
                title="Profesionales"
                value="3"
                detail="Personal registrado"
                icon="♙"
              />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1fr_300px]">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col justify-between gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="font-bold text-slate-900">Agenda del día</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Turnos programados para hoy
                    </p>
                  </div>
                  <span className="w-fit rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700">
                    20/11/2026
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {appointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center"
                    >
                      <div className="w-20 shrink-0">
                        <p className="text-lg font-bold text-slate-800">
                          {appointment.time}
                        </p>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-800">
                          {appointment.client}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {appointment.service} · {appointment.professional}
                        </p>
                      </div>

                      <span
                        className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                          appointment.status === 'Confirmado'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {appointment.status}
                      </span>
                    </div>
                  ))}

                  {appointments.length === 0 && (
                    <p className="p-8 text-center text-sm text-slate-500">
                      No hay turnos registrados.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="font-bold text-slate-900">Profesionales</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Equipo de trabajo
                  </p>

                  <div className="mt-5 space-y-4">
                    <Professional initials="LF" name="Lucas Fernández" role="Barbero" />
                    <Professional initials="SM" name="Sofía Martínez" role="Estilista" />
                    <Professional initials="CT" name="Camila Torres" role="Manicurista" />
                  </div>
                </div>

                <div className="rounded-2xl bg-indigo-600 p-5 text-white shadow-sm">
                  <p className="text-sm font-medium text-indigo-100">
                    TURNERO
                  </p>
                  <h3 className="mt-2 text-lg font-bold">
                    Organizá tu negocio
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-indigo-100">
                    Administrá tus reservas y profesionales desde un solo lugar.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md space-y-5 rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                Nuevo turno
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg px-3 py-1 text-xl text-slate-500 hover:bg-slate-100"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Nombre del cliente
              </label>
              <input
                required
                value={client}
                onChange={(event) => setClient(event.target.value)}
                placeholder="Ingresá el nombre"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Servicio</label>
              <select
                value={service}
                onChange={(event) => setService(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
              >
                <option>Corte clásico</option>
                <option>Corte + barba</option>
                <option>Coloración</option>
                <option>Manicuría</option>
                <option>Tratamiento capilar</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Horario</label>
              <input
                required
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-600"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Guardar turno
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ title, value, detail, icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-lg font-bold text-indigo-600">
          {icon}
        </span>
      </div>
      <p className="mt-4 text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  )
}

function Professional({ initials, name, role }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
        {initials}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-800">{name}</p>
        <p className="text-xs text-slate-500">{role}</p>
      </div>
    </div>
  )
}

export default App
