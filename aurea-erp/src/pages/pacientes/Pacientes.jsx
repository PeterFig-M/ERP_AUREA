import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaEdit, FaTrash, FaFileMedical, FaTimes, FaSave, FaSearch } from 'react-icons/fa'
import {
  obtenerColeccion,
  actualizarDocumento,
  eliminarDocumento
} from '../../firebase/firestore.service'
import { formatearFecha } from '../../utils/formatters'
import { useAuth } from '../../context/AuthContext'

export default function Pacientes() {
  const { esAdmin } = useAuth()
  const [pacientes, setPacientes] = useState([])
  const [mapaUltimaEdicion, setMapaUltimaEdicion] = useState({})
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [pacienteEnEdicion, setPacienteEnEdicion] = useState(null)
  const [formulario, setFormulario] = useState({})
  const [alergiaActual, setAlergiaActual] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const navegar = useNavigate()

  useEffect(() => {
    cargarPacientes()
  }, [])

  async function cargarPacientes() {
    setCargando(true)
    const [listaPacientes, listaExpedientes] = await Promise.all([
      obtenerColeccion('pacientes'),
      obtenerColeccion('expedientes')
    ])

    const mapa = {}
    listaExpedientes.forEach((expediente) => {
      const pacienteId = expediente.pacienteId || expediente.id
      const timestamp = expediente.actualizadoEn
      if (timestamp?.toDate) {
        mapa[pacienteId] = formatearFecha(timestamp.toDate())
      }
    })

    setMapaUltimaEdicion(mapa)
    setPacientes(listaPacientes)
    setCargando(false)
  }

  const pacientesFiltrados = pacientes.filter((paciente) =>
    paciente.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  )

  function abrirEdicion(paciente) {
    setPacienteEnEdicion(paciente.id)
    setFormulario({
      nombre: paciente.nombre || '',
      identidad: paciente.identidad || '',
      telefono: paciente.telefono || '',
      fechaNacimiento: paciente.fechaNacimiento || '',
      rtn: paciente.rtn || '',
      notas: paciente.notas || '',
      alergias: paciente.alergias || []
    })
    setMensaje('')
  }

  function cerrarEdicion() {
    setPacienteEnEdicion(null)
    setFormulario({})
    setAlergiaActual('')
  }

  function actualizarCampo(campo, valor) {
    setFormulario((previo) => ({ ...previo, [campo]: valor }))
  }

  function agregarAlergia() {
    const texto = alergiaActual.trim()
    if (texto.length === 0) return
    if (formulario.alergias.includes(texto)) {
      setAlergiaActual('')
      return
    }
    actualizarCampo('alergias', [...formulario.alergias, texto])
    setAlergiaActual('')
  }

  function quitarAlergia(alergia) {
    actualizarCampo('alergias', formulario.alergias.filter((item) => item !== alergia))
  }

  async function manejarGuardarEdicion() {
    if (formulario.nombre.trim().length === 0) {
      setMensaje('El nombre es obligatorio')
      return
    }

    setGuardando(true)
    setMensaje('')

    try {
      await actualizarDocumento('pacientes', pacienteEnEdicion, {
        nombre: formulario.nombre.trim(),
        identidad: formulario.identidad.trim(),
        telefono: formulario.telefono.trim(),
        fechaNacimiento: formulario.fechaNacimiento,
        rtn: formulario.rtn.trim(),
        notas: formulario.notas.trim(),
        alergias: formulario.alergias
      })

      await cargarPacientes()
      cerrarEdicion()
    } catch (error) {
      setMensaje('Ocurrió un error al guardar los cambios')
    } finally {
      setGuardando(false)
    }
  }

  async function manejarEliminar(id) {
    const confirmacion = window.confirm('¿Deseas eliminar este paciente? Esta acción no se puede deshacer.')
    if (!confirmacion) return

    await eliminarDocumento('pacientes', id)
    await cargarPacientes()
  }

  function irAlExpediente(id) {
    navegar(`/expediente/${id}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-2xl text-aurea-goldDark">Pacientes</h1>

        <div className="relative w-full sm:w-72">
          <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-aurea-goldDark/50" />
          <input
            type="text"
            placeholder="Buscar paciente..."
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            className="w-full rounded-md border border-aurea-border py-2 pl-9 pr-3 outline-none focus:border-aurea-gold"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-aurea-border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-aurea-goldDark text-left text-white">
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Identidad</th>
              <th className="px-4 py-3">Teléfono</th>
              <th className="px-4 py-3">Cumpleaños</th>
              <th className="px-4 py-3">Última edición expediente</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-aurea-text/60">
                  Cargando...
                </td>
              </tr>
            ) : pacientesFiltrados.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-aurea-text/60">
                  No se encontraron pacientes
                </td>
              </tr>
            ) : (
              pacientesFiltrados.map((paciente) => (
                <tr key={paciente.id} className="border-b border-aurea-border/60 hover:bg-aurea-cream/50">
                  <td className="px-4 py-3 font-medium text-aurea-text">{paciente.nombre}</td>
                  <td className="px-4 py-3 text-aurea-text">{paciente.identidad || '-'}</td>
                  <td className="px-4 py-3 text-aurea-text">{paciente.telefono || '-'}</td>
                  <td className="px-4 py-3 text-aurea-text">{paciente.fechaNacimiento || '-'}</td>
                  <td className="px-4 py-3 text-aurea-text">{mapaUltimaEdicion[paciente.id] || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => irAlExpediente(paciente.id)}
                        title="Expediente"
                        className="text-aurea-goldDark hover:text-aurea-gold"
                      >
                        <FaFileMedical size={15} />
                      </button>
                      <button
                        onClick={() => abrirEdicion(paciente)}
                        title="Editar"
                        className="text-aurea-goldDark hover:text-aurea-gold"
                      >
                        <FaEdit size={15} />
                      </button>
                      {esAdmin && (
                        <button
                          onClick={() => manejarEliminar(paciente.id)}
                          title="Eliminar"
                          className="text-red-500 hover:text-red-700"
                        >
                          <FaTrash size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pacienteEnEdicion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fadeIn">
          <div className="w-full max-w-2xl animate-fadeInUp rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl text-aurea-goldDark">Editar Paciente</h2>
              <button onClick={cerrarEdicion} className="text-aurea-text hover:text-red-600">
                <FaTimes size={18} />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-aurea-text">Nombre completo</label>
                  <input
                    type="text"
                    value={formulario.nombre}
                    onChange={(evento) => actualizarCampo('nombre', evento.target.value)}
                    className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-aurea-text">No. de identidad</label>
                  <input
                    type="text"
                    value={formulario.identidad}
                    onChange={(evento) => actualizarCampo('identidad', evento.target.value)}
                    className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-aurea-text">Fecha de cumpleaños</label>
                  <input
                    type="date"
                    value={formulario.fechaNacimiento}
                    onChange={(evento) => actualizarCampo('fechaNacimiento', evento.target.value)}
                    className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-aurea-text">Teléfono</label>
                  <input
                    type="tel"
                    value={formulario.telefono}
                    onChange={(evento) => actualizarCampo('telefono', evento.target.value)}
                    className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-aurea-text">RTN</label>
                  <input
                    type="text"
                    value={formulario.rtn}
                    onChange={(evento) => actualizarCampo('rtn', evento.target.value)}
                    className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-aurea-text">Alergias</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={alergiaActual}
                    onChange={(evento) => setAlergiaActual(evento.target.value)}
                    onKeyDown={(evento) => {
                      if (evento.key === 'Enter') {
                        evento.preventDefault()
                        agregarAlergia()
                      }
                    }}
                    placeholder="Escribe una alergia y presiona Enter"
                    className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
                  />
                  <button
                    type="button"
                    onClick={agregarAlergia}
                    className="shrink-0 rounded-md bg-aurea-gold px-4 py-2 text-sm font-medium text-white transition hover:bg-aurea-goldDark"
                  >
                    Agregar
                  </button>
                </div>

                {formulario.alergias?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {formulario.alergias.map((alergia) => (
                      <span
                        key={alergia}
                        className="flex items-center gap-2 rounded-full bg-aurea-cream px-3 py-1 text-sm text-aurea-goldDark"
                      >
                        {alergia}
                        <button onClick={() => quitarAlergia(alergia)} className="text-aurea-goldDark/60 hover:text-red-600">
                          <FaTimes size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-aurea-text">Notas</label>
                <textarea
                  rows={3}
                  value={formulario.notas}
                  onChange={(evento) => actualizarCampo('notas', evento.target.value)}
                  className="w-full resize-none rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
                />
              </div>

              {mensaje && <p className="text-sm text-red-600">{mensaje}</p>}
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={manejarGuardarEdicion}
                disabled={guardando}
                className="flex flex-1 items-center justify-center gap-2 rounded-md bg-aurea-gold py-2.5 font-medium text-white transition hover:bg-aurea-goldDark disabled:opacity-60"
              >
                <FaSave />
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button
                onClick={cerrarEdicion}
                className="rounded-md border border-aurea-border px-5 py-2.5 font-medium text-aurea-text transition hover:bg-aurea-cream"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}