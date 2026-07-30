import { useState } from 'react'
import { FaSave, FaPlus, FaTimes } from 'react-icons/fa'
import { agregarDocumento } from '../../firebase/firestore.service'

export default function IngresarPaciente() {
  const [nombre, setNombre] = useState('')
  const [identidad, setIdentidad] = useState('')
  const [telefono, setTelefono] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [rtn, setRtn] = useState('')
  const [notas, setNotas] = useState('')
  const [alergias, setAlergias] = useState([])
  const [alergiaActual, setAlergiaActual] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  function agregarAlergia() {
    const texto = alergiaActual.trim()
    if (texto.length === 0) return
    if (alergias.includes(texto)) {
      setAlergiaActual('')
      return
    }
    setAlergias((previas) => [...previas, texto])
    setAlergiaActual('')
  }

  function quitarAlergia(alergia) {
    setAlergias((previas) => previas.filter((item) => item !== alergia))
  }

  function manejarTeclaAlergia(evento) {
    if (evento.key === 'Enter') {
      evento.preventDefault()
      agregarAlergia()
    }
  }

  function limpiarFormulario() {
    setNombre('')
    setIdentidad('')
    setTelefono('')
    setFechaNacimiento('')
    setRtn('')
    setNotas('')
    setAlergias([])
    setAlergiaActual('')
  }

  async function manejarGuardar(evento) {
    evento.preventDefault()

    if (nombre.trim().length === 0) {
      setMensaje('El nombre del paciente es obligatorio')
      return
    }

    setGuardando(true)
    setMensaje('')

    try {
      await agregarDocumento('pacientes', {
        nombre: nombre.trim(),
        identidad: identidad.trim(),
        telefono: telefono.trim(),
        fechaNacimiento,
        rtn: rtn.trim(),
        notas: notas.trim(),
        alergias
      })

      setMensaje('Paciente ingresado correctamente')
      limpiarFormulario()
    } catch (error) {
      setMensaje('Ocurrió un error al guardar el paciente')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="font-display text-2xl text-aurea-goldDark">Ingresar Paciente</h1>

      <form onSubmit={manejarGuardar} className="space-y-5 rounded-lg border border-aurea-border bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-aurea-text">Nombre completo</label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(evento) => setNombre(evento.target.value)}
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none transition focus:border-aurea-gold focus:ring-2 focus:ring-aurea-gold/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-aurea-text">No. de identidad</label>
            <input
              type="text"
              value={identidad}
              onChange={(evento) => setIdentidad(evento.target.value)}
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none transition focus:border-aurea-gold focus:ring-2 focus:ring-aurea-gold/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-aurea-text">Fecha de cumpleaños</label>
            <input
              type="date"
              value={fechaNacimiento}
              onChange={(evento) => setFechaNacimiento(evento.target.value)}
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none transition focus:border-aurea-gold focus:ring-2 focus:ring-aurea-gold/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-aurea-text">Teléfono</label>
            <input
              type="tel"
              value={telefono}
              onChange={(evento) => setTelefono(evento.target.value)}
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none transition focus:border-aurea-gold focus:ring-2 focus:ring-aurea-gold/20"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-aurea-text">RTN (en caso de necesitar factura con RTN)</label>
            <input
              type="text"
              value={rtn}
              onChange={(evento) => setRtn(evento.target.value)}
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none transition focus:border-aurea-gold focus:ring-2 focus:ring-aurea-gold/20"
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
              onKeyDown={manejarTeclaAlergia}
              placeholder="Escribe una alergia y presiona Enter"
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none transition focus:border-aurea-gold focus:ring-2 focus:ring-aurea-gold/20"
            />
            <button
              type="button"
              onClick={agregarAlergia}
              className="flex shrink-0 items-center gap-2 rounded-md bg-aurea-gold px-4 py-2 text-sm font-medium text-white transition hover:bg-aurea-goldDark"
            >
              <FaPlus size={11} />
              Agregar
            </button>
          </div>

          {alergias.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {alergias.map((alergia) => (
                <span
                  key={alergia}
                  className="flex items-center gap-2 rounded-full bg-aurea-cream px-3 py-1 text-sm text-aurea-goldDark"
                >
                  {alergia}
                  <button
                    type="button"
                    onClick={() => quitarAlergia(alergia)}
                    className="text-aurea-goldDark/60 hover:text-red-600"
                  >
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
            rows={4}
            value={notas}
            onChange={(evento) => setNotas(evento.target.value)}
            placeholder="Observaciones generales del paciente..."
            className="w-full resize-none rounded-md border border-aurea-border px-3 py-2 outline-none transition focus:border-aurea-gold focus:ring-2 focus:ring-aurea-gold/20"
          />
        </div>

        {mensaje && (
          <div className="rounded-md border border-aurea-border bg-aurea-cream px-4 py-3 text-sm text-aurea-text">
            {mensaje}
          </div>
        )}

        <button
          type="submit"
          disabled={guardando}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-aurea-gold py-3 font-medium text-white transition hover:bg-aurea-goldDark active:scale-[0.99] disabled:opacity-60"
        >
          <FaSave />
          {guardando ? 'Guardando...' : 'Guardar Paciente'}
        </button>
      </form>
    </div>
  )
}