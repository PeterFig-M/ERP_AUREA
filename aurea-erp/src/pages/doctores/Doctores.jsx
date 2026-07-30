import { useEffect, useState } from 'react'
import { FaPlus, FaTrash, FaEdit, FaTimes, FaSave } from 'react-icons/fa'
import {
  obtenerColeccion,
  agregarDocumento,
  actualizarDocumento,
  eliminarDocumento
} from '../../firebase/firestore.service'

const ESTADO_VACIO = {
  nombre: '',
  fechaNacimiento: '',
  especialidad: '',
  comision: ''
}

export default function Doctores() {
  const [doctores, setDoctores] = useState([])
  const [cargando, setCargando] = useState(true)
  const [formulario, setFormulario] = useState(ESTADO_VACIO)
  const [idEnEdicion, setIdEnEdicion] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    cargarDoctores()
  }, [])

  async function cargarDoctores() {
    setCargando(true)
    const lista = await obtenerColeccion('doctores')
    setDoctores(lista)
    setCargando(false)
  }

  function actualizarCampo(campo, valor) {
    setFormulario((previo) => ({ ...previo, [campo]: valor }))
  }

  function iniciarEdicion(doctor) {
    setIdEnEdicion(doctor.id)
    setFormulario({
      nombre: doctor.nombre || '',
      fechaNacimiento: doctor.fechaNacimiento || '',
      especialidad: doctor.especialidad || '',
      comision: doctor.comision || ''
    })
  }

  function cancelarEdicion() {
    setIdEnEdicion(null)
    setFormulario(ESTADO_VACIO)
  }

  async function manejarGuardar(evento) {
    evento.preventDefault()

    if (formulario.nombre.trim().length === 0) {
      setMensaje('El nombre es obligatorio')
      return
    }

    setGuardando(true)
    setMensaje('')

    try {
      const datos = {
        nombre: formulario.nombre.trim(),
        fechaNacimiento: formulario.fechaNacimiento,
        especialidad: formulario.especialidad.trim(),
        comision: Number(formulario.comision) || 0
      }

      if (idEnEdicion) {
        await actualizarDocumento('doctores', idEnEdicion, datos)
        setMensaje('Doctor(a) actualizado correctamente')
      } else {
        await agregarDocumento('doctores', datos)
        setMensaje('Doctor(a) agregado correctamente')
      }

      cancelarEdicion()
      await cargarDoctores()
    } catch (error) {
      setMensaje('Ocurrió un error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  async function manejarEliminar(id) {
    const confirmacion = window.confirm('¿Deseas eliminar este registro?')
    if (!confirmacion) return

    await eliminarDocumento('doctores', id)
    await cargarDoctores()

    if (idEnEdicion === id) cancelarEdicion()
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-aurea-goldDark">Doctores</h1>

      <form onSubmit={manejarGuardar} className="rounded-lg border border-aurea-border bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-aurea-text">Nombre</label>
            <input
              type="text"
              value={formulario.nombre}
              onChange={(evento) => actualizarCampo('nombre', evento.target.value)}
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
            <label className="mb-1 block text-sm font-medium text-aurea-text">Especialidad</label>
            <input
              type="text"
              value={formulario.especialidad}
              onChange={(evento) => actualizarCampo('especialidad', evento.target.value)}
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-aurea-text">Comisión (%)</label>
            <input
              type="number"
              value={formulario.comision}
              onChange={(evento) => actualizarCampo('comision', evento.target.value)}
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
            />
          </div>
        </div>

        {mensaje && <p className="mt-3 text-sm text-aurea-text">{mensaje}</p>}

        <div className="mt-4 flex gap-3">
          <button
            type="submit"
            disabled={guardando}
            className="flex items-center gap-2 rounded-md bg-aurea-gold px-5 py-2 text-sm font-medium text-white transition hover:bg-aurea-goldDark disabled:opacity-60"
          >
            {idEnEdicion ? <FaSave /> : <FaPlus size={11} />}
            {idEnEdicion ? 'Guardar cambios' : 'Agregar'}
          </button>

          {idEnEdicion && (
            <button
              type="button"
              onClick={cancelarEdicion}
              className="flex items-center gap-2 rounded-md border border-aurea-border px-5 py-2 text-sm font-medium text-aurea-text transition hover:bg-aurea-cream"
            >
              <FaTimes size={11} />
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="overflow-x-auto rounded-lg border border-aurea-border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-aurea-goldDark text-left text-white">
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Cumpleaños</th>
              <th className="px-4 py-3">Especialidad</th>
              <th className="px-4 py-3">Comisión</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-aurea-text/60">
                  Cargando...
                </td>
              </tr>
            ) : doctores.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-aurea-text/60">
                  Aún no hay doctores registrados
                </td>
              </tr>
            ) : (
              doctores.map((doctor) => (
                <tr key={doctor.id} className="border-b border-aurea-border/60 hover:bg-aurea-cream/50">
                  <td className="px-4 py-3 font-medium text-aurea-text">{doctor.nombre}</td>
                  <td className="px-4 py-3 text-aurea-text">{doctor.fechaNacimiento || '-'}</td>
                  <td className="px-4 py-3 text-aurea-text">{doctor.especialidad || '-'}</td>
                  <td className="px-4 py-3 text-aurea-text">{doctor.comision}%</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => iniciarEdicion(doctor)} className="text-aurea-goldDark hover:text-aurea-gold">
                        <FaEdit size={14} />
                      </button>
                      <button onClick={() => manejarEliminar(doctor.id)} className="text-red-500 hover:text-red-700">
                        <FaTrash size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}