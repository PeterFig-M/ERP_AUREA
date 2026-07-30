import { useEffect, useMemo, useState } from 'react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import format from 'date-fns/format'
import parse from 'date-fns/parse'
import startOfWeek from 'date-fns/startOfWeek'
import getDay from 'date-fns/getDay'
import es from 'date-fns/locale/es'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { FaPlus, FaTrash, FaTimes, FaSave } from 'react-icons/fa'
import {
  obtenerColeccion,
  agregarDocumento,
  eliminarDocumento
} from '../../firebase/firestore.service'
import { useAuth } from '../../context/AuthContext'

const localizador = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: es }),
  getDay,
  locales: { es }
})

const MENSAJES_CALENDARIO = {
  next: 'Siguiente',
  previous: 'Anterior',
  today: 'Hoy',
  month: 'Mes',
  week: 'Semana',
  day: 'Día',
  agenda: 'Agenda',
  date: 'Fecha',
  time: 'Hora',
  event: 'Cita',
  noEventsInRange: 'No hay citas en este rango',
  showMore: (total) => `+ ${total} más`
}

const PALETA_COLORES = ['#B08D57', '#8C6D3F', '#6B8E8A', '#A56A6A', '#7A8C5A', '#8A6B9E']

function fechaHoyISO() {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
}

const ESTADO_VACIO = {
  pacienteId: '',
  tratamientoId: '',
  doctor: '',
  especialista: '',
  fecha: fechaHoyISO(),
  hora: '09:00'
}

export default function Citas() {
  const { esAdmin } = useAuth()
  const [pacientes, setPacientes] = useState([])
  const [doctores, setDoctores] = useState([])
  const [tratamientos, setTratamientos] = useState([])
  const [citas, setCitas] = useState([])
  const [cargando, setCargando] = useState(true)

  const [modalAbierto, setModalAbierto] = useState(false)
  const [formulario, setFormulario] = useState(ESTADO_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const [citaSeleccionada, setCitaSeleccionada] = useState(null)

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    setCargando(true)
    const [listaPacientes, listaDoctores, listaInventario, listaCitas] = await Promise.all([
      obtenerColeccion('pacientes'),
      obtenerColeccion('doctores'),
      obtenerColeccion('inventario'),
      obtenerColeccion('citas')
    ])
    setPacientes(listaPacientes)
    setDoctores(listaDoctores)
    setTratamientos(listaInventario.filter((producto) => producto.tipo === 'Servicio'))
    setCitas(listaCitas)
    setCargando(false)
  }

  const mapaColorDoctor = useMemo(() => {
    const mapa = {}
    doctores.forEach((doctor, indice) => {
      mapa[doctor.nombre] = PALETA_COLORES[indice % PALETA_COLORES.length]
    })
    return mapa
  }, [doctores])

  const eventosCalendario = useMemo(() => {
    return citas.map((cita) => {
      const inicio = new Date(`${cita.fecha}T${cita.hora}`)
      const fin = new Date(inicio.getTime() + 30 * 60000)
      return {
        id: cita.id,
        title: `${cita.pacienteNombre} · ${cita.doctor || 'Sin doctor'}`,
        start: inicio,
        end: fin,
        recurso: cita
      }
    })
  }, [citas])

  function estiloEvento(evento) {
    const color = mapaColorDoctor[evento.recurso.doctor] || '#B08D57'
    return {
      style: {
        backgroundColor: color,
        borderRadius: '6px',
        color: 'white',
        border: 'none',
        fontSize: '12px'
      }
    }
  }

  function abrirModalNuevo(slotInfo) {
    const fechaSeleccionada = slotInfo?.start
      ? `${slotInfo.start.getFullYear()}-${String(slotInfo.start.getMonth() + 1).padStart(2, '0')}-${String(slotInfo.start.getDate()).padStart(2, '0')}`
      : fechaHoyISO()

    setFormulario({ ...ESTADO_VACIO, fecha: fechaSeleccionada })
    setMensaje('')
    setModalAbierto(true)
  }

  function cerrarModal() {
    setModalAbierto(false)
    setFormulario(ESTADO_VACIO)
  }

  function actualizarCampo(campo, valor) {
    setFormulario((previo) => ({ ...previo, [campo]: valor }))
  }

  async function manejarGuardarCita(evento) {
    evento.preventDefault()

    const pacienteSeleccionado = pacientes.find((p) => p.id === formulario.pacienteId)
    const tratamientoSeleccionado = tratamientos.find((t) => t.id === formulario.tratamientoId)

    if (!pacienteSeleccionado) {
      setMensaje('Selecciona un paciente')
      return
    }

    if (!tratamientoSeleccionado) {
      setMensaje('Selecciona un tratamiento')
      return
    }

    if (!formulario.doctor) {
      setMensaje('Selecciona la doctora que atenderá')
      return
    }

    setGuardando(true)
    setMensaje('')

    try {
      await agregarDocumento('citas', {
        pacienteId: pacienteSeleccionado.id,
        pacienteNombre: pacienteSeleccionado.nombre,
        pacienteTelefono: pacienteSeleccionado.telefono || '',
        tratamiento: tratamientoSeleccionado.descripcion,
        doctor: formulario.doctor,
        especialista: formulario.especialista,
        fecha: formulario.fecha,
        hora: formulario.hora,
        recordatorioMananaEnviado: false,
        recordatorio20MinEnviado: false
      })

      cerrarModal()
      await cargarDatos()
    } catch (error) {
      setMensaje('Ocurrió un error al guardar la cita')
    } finally {
      setGuardando(false)
    }
  }

  async function manejarEliminarCita() {
    const confirmacion = window.confirm('¿Deseas eliminar esta cita?')
    if (!confirmacion) return

    await eliminarDocumento('citas', citaSeleccionada.id)
    setCitaSeleccionada(null)
    await cargarDatos()
  }

  if (cargando) {
    return <p className="text-aurea-text">Cargando calendario...</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-2xl text-aurea-goldDark">Citas</h1>
        <button
          onClick={() => abrirModalNuevo(null)}
          className="flex items-center justify-center gap-2 rounded-md bg-aurea-gold px-5 py-2.5 text-sm font-medium text-white transition hover:bg-aurea-goldDark"
        >
          <FaPlus size={12} />
          Nueva Cita
        </button>
      </div>

      {doctores.length > 0 && (
        <div className="flex flex-wrap gap-3 rounded-lg border border-aurea-border bg-white p-3 text-xs">
          {doctores.map((doctor) => (
            <span key={doctor.id} className="flex items-center gap-1.5">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: mapaColorDoctor[doctor.nombre] }}
              />
              {doctor.nombre}
            </span>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-aurea-border bg-white p-3 shadow-sm sm:p-4">
        <div style={{ height: 620 }}>
          <Calendar
            localizer={localizador}
            events={eventosCalendario}
            startAccessor="start"
            endAccessor="end"
            culture="es"
            messages={MENSAJES_CALENDARIO}
            selectable
            onSelectSlot={abrirModalNuevo}
            onSelectEvent={(evento) => setCitaSeleccionada(evento.recurso)}
            eventPropGetter={estiloEvento}
            views={['month', 'week', 'day', 'agenda']}
            defaultView="week"
            popup
          />
        </div>
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fadeIn">
          <div className="w-full max-w-md animate-fadeInUp rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg text-aurea-goldDark">Nueva Cita</h2>
              <button onClick={cerrarModal} className="text-aurea-text hover:text-red-600">
                <FaTimes size={18} />
              </button>
            </div>

            <form onSubmit={manejarGuardarCita} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-aurea-text">Paciente</label>
                <select
                  value={formulario.pacienteId}
                  onChange={(evento) => actualizarCampo('pacienteId', evento.target.value)}
                  className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
                >
                  <option value="">-- Selecciona un paciente --</option>
                  {pacientes.map((paciente) => (
                    <option key={paciente.id} value={paciente.id}>{paciente.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-aurea-text">Tratamiento</label>
                <select
                  value={formulario.tratamientoId}
                  onChange={(evento) => actualizarCampo('tratamientoId', evento.target.value)}
                  className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
                >
                  <option value="">-- Selecciona un tratamiento --</option>
                  {tratamientos.map((tratamiento) => (
                    <option key={tratamiento.id} value={tratamiento.id}>{tratamiento.descripcion}</option>
                  ))}
                </select>
                {tratamientos.length === 0 && (
                  <p className="mt-1 text-xs text-aurea-text/60">
                    No hay tratamientos catalogados como "Servicio" en Inventario todavía.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-aurea-text">Doctor(a)</label>
                  <select
                    value={formulario.doctor}
                    onChange={(evento) => actualizarCampo('doctor', evento.target.value)}
                    className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
                  >
                    <option value="">-- Selecciona --</option>
                    {doctores.map((doctor) => (
                      <option key={doctor.id} value={doctor.nombre}>{doctor.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-aurea-text">Especialista</label>
                  <select
                    value={formulario.especialista}
                    onChange={(evento) => actualizarCampo('especialista', evento.target.value)}
                    className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
                  >
                    <option value="">-- Selecciona --</option>
                    {doctores.map((doctor) => (
                      <option key={doctor.id} value={doctor.nombre}>{doctor.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-aurea-text">Fecha</label>
                  <input
                    type="date"
                    value={formulario.fecha}
                    onChange={(evento) => actualizarCampo('fecha', evento.target.value)}
                    className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-aurea-text">Hora</label>
                  <input
                    type="time"
                    value={formulario.hora}
                    onChange={(evento) => actualizarCampo('hora', evento.target.value)}
                    className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
                  />
                </div>
              </div>

              {mensaje && <p className="text-sm text-red-600">{mensaje}</p>}

              <button
                type="submit"
                disabled={guardando}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-aurea-gold py-2.5 font-medium text-white transition hover:bg-aurea-goldDark disabled:opacity-60"
              >
                <FaSave />
                {guardando ? 'Guardando...' : 'Agendar Cita'}
              </button>
            </form>
          </div>
        </div>
      )}

      {citaSeleccionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fadeIn">
          <div className="w-full max-w-md animate-fadeInUp rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg text-aurea-goldDark">Detalle de la Cita</h2>
              <button onClick={() => setCitaSeleccionada(null)} className="text-aurea-text hover:text-red-600">
                <FaTimes size={18} />
              </button>
            </div>

            <div className="space-y-2 text-sm text-aurea-text">
              <p><span className="font-medium">Paciente:</span> {citaSeleccionada.pacienteNombre}</p>
              <p><span className="font-medium">Tratamiento:</span> {citaSeleccionada.tratamiento}</p>
              <p><span className="font-medium">Doctor(a):</span> {citaSeleccionada.doctor}</p>
              <p><span className="font-medium">Especialista:</span> {citaSeleccionada.especialista || '-'}</p>
              <p><span className="font-medium">Fecha:</span> {citaSeleccionada.fecha}</p>
              <p><span className="font-medium">Hora:</span> {citaSeleccionada.hora}</p>
            </div>

            {esAdmin && (
              <button
                onClick={manejarEliminarCita}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-md border border-red-300 py-2.5 font-medium text-red-600 transition hover:bg-red-50"
              >
                <FaTrash size={13} />
                Eliminar Cita
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}