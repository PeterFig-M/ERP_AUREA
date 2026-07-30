import { useEffect, useState } from 'react'
import { FaPlus, FaTrash, FaTimes, FaSearch, FaMoneyBillWave, FaChevronDown, FaChevronUp } from 'react-icons/fa'
import {
  obtenerColeccion,
  agregarDocumento,
  eliminarDocumento,
  agregarPagoACobro
} from '../../firebase/firestore.service'
import { formatearMoneda } from '../../utils/formatters'

const FORMAS_PAGO = ['Efectivo', 'Transferencia', 'POS']

const ESTADO_VACIO = { pacienteId: '', totalTratamiento: '' }

export default function Cobros() {
  const [pacientes, setPacientes] = useState([])
  const [cobros, setCobros] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  const [formulario, setFormulario] = useState(ESTADO_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const [cobroSeleccionado, setCobroSeleccionado] = useState(null)
  const [montoPago, setMontoPago] = useState('')
  const [formaPagoSeleccionada, setFormaPagoSeleccionada] = useState('Efectivo')
  const [registrandoPago, setRegistrandoPago] = useState(false)

  const [historialAbierto, setHistorialAbierto] = useState({})

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    setCargando(true)
    const [listaPacientes, listaCobros] = await Promise.all([
      obtenerColeccion('pacientes'),
      obtenerColeccion('cobros', 'creadoEn')
    ])
    setPacientes(listaPacientes)
    setCobros(listaCobros)
    setCargando(false)
  }

  async function manejarCrearCobro(evento) {
    evento.preventDefault()

    const pacienteSeleccionado = pacientes.find((paciente) => paciente.id === formulario.pacienteId)

    if (!pacienteSeleccionado) {
      setMensaje('Selecciona un paciente')
      return
    }

    if (!formulario.totalTratamiento || Number(formulario.totalTratamiento) <= 0) {
      setMensaje('Ingresa un total de tratamiento válido')
      return
    }

    setGuardando(true)
    setMensaje('')

    try {
      await agregarDocumento('cobros', {
        pacienteId: pacienteSeleccionado.id,
        pacienteNombre: pacienteSeleccionado.nombre,
        totalTratamiento: Number(formulario.totalTratamiento),
        saldo: Number(formulario.totalTratamiento),
        pagos: []
      })

      setMensaje('Plan de cobro creado correctamente')
      setFormulario(ESTADO_VACIO)
      await cargarDatos()
    } catch (error) {
      setMensaje('Ocurrió un error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  async function manejarEliminar(id) {
    const confirmacion = window.confirm('¿Deseas eliminar este plan de cobro? Se perderá el historial de pagos.')
    if (!confirmacion) return

    await eliminarDocumento('cobros', id)
    await cargarDatos()
  }

  function abrirRegistroPago(cobro) {
    setCobroSeleccionado(cobro)
    setMontoPago('')
    setFormaPagoSeleccionada('Efectivo')
  }

  function cerrarRegistroPago() {
    setCobroSeleccionado(null)
    setMontoPago('')
    setFormaPagoSeleccionada('Efectivo')
  }

  async function manejarRegistrarPago() {
    const monto = Number(montoPago)

    if (!monto || monto <= 0) {
      return
    }

    if (monto > cobroSeleccionado.saldo) {
      const confirmar = window.confirm('El monto ingresado es mayor al saldo pendiente. ¿Deseas continuar de todas formas?')
      if (!confirmar) return
    }

    setRegistrandoPago(true)

    try {
      await agregarPagoACobro(cobroSeleccionado.id, monto, formaPagoSeleccionada)
      cerrarRegistroPago()
      await cargarDatos()
    } finally {
      setRegistrandoPago(false)
    }
  }

  function alternarHistorial(id) {
    setHistorialAbierto((previo) => ({ ...previo, [id]: !previo[id] }))
  }

  const cobrosFiltrados = cobros.filter((cobro) =>
    cobro.pacienteNombre?.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-aurea-goldDark">Cobros</h1>

      <form onSubmit={manejarCrearCobro} className="rounded-lg border border-aurea-border bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-aurea-text">Paciente</label>
            <select
              value={formulario.pacienteId}
              onChange={(evento) => setFormulario((previo) => ({ ...previo, pacienteId: evento.target.value }))}
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
            >
              <option value="">-- Selecciona un paciente --</option>
              {pacientes.map((paciente) => (
                <option key={paciente.id} value={paciente.id}>{paciente.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-aurea-text">Total del tratamiento (L.)</label>
            <input
              type="number"
              value={formulario.totalTratamiento}
              onChange={(evento) => setFormulario((previo) => ({ ...previo, totalTratamiento: evento.target.value }))}
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
            />
          </div>
        </div>

        {mensaje && <p className="mt-3 text-sm text-aurea-text">{mensaje}</p>}

        <button
          type="submit"
          disabled={guardando}
          className="mt-4 flex items-center gap-2 rounded-md bg-aurea-gold px-5 py-2.5 text-sm font-medium text-white transition hover:bg-aurea-goldDark disabled:opacity-60"
        >
          <FaPlus size={11} />
          {guardando ? 'Creando...' : 'Crear Plan de Cobro'}
        </button>
      </form>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-lg text-aurea-goldDark">Planes activos</h2>
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cargando ? (
          <p className="text-aurea-text/60">Cargando...</p>
        ) : cobrosFiltrados.length === 0 ? (
          <p className="text-aurea-text/60">Aún no hay planes de cobro registrados</p>
        ) : (
          cobrosFiltrados.map((cobro) => {
            const pagosOrdenados = [...(cobro.pagos || [])].reverse()
            const totalPagado = (cobro.pagos || []).reduce((acumulado, pago) => acumulado + Number(pago.monto), 0)
            const porcentajePagado = cobro.totalTratamiento > 0 ? (totalPagado / cobro.totalTratamiento) * 100 : 0
            const completado = cobro.saldo <= 0
            const historialVisible = historialAbierto[cobro.id]

            return (
              <div key={cobro.id} className="flex flex-col rounded-lg border border-aurea-border bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-start justify-between">
                  <h3 className="font-medium text-aurea-text">{cobro.pacienteNombre}</h3>
                  <button onClick={() => manejarEliminar(cobro.id)} className="text-red-500 hover:text-red-700">
                    <FaTrash size={13} />
                  </button>
                </div>

                <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-aurea-cream">
                  <div
                    className={`h-full rounded-full transition-all ${completado ? 'bg-green-500' : 'bg-aurea-gold'}`}
                    style={{ width: `${Math.min(porcentajePagado, 100)}%` }}
                  />
                </div>

                <div className="mb-3 space-y-1 text-sm text-aurea-text">
                  <div className="flex justify-between">
                    <span>Total tratamiento:</span>
                    <span className="font-medium">L. {formatearMoneda(cobro.totalTratamiento)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pagado:</span>
                    <span className="font-medium text-green-600">L. {formatearMoneda(totalPagado)}</span>
                  </div>
                  <div className="flex justify-between border-t border-aurea-border pt-1 font-bold">
                    <span>Saldo:</span>
                    <span className={completado ? 'text-green-600' : 'text-aurea-goldDark'}>
                      {completado ? 'Completado' : `L. ${formatearMoneda(cobro.saldo)}`}
                    </span>
                  </div>
                </div>

                {pagosOrdenados.length > 0 && (
                  <div className="mb-3">
                    <button
                      onClick={() => alternarHistorial(cobro.id)}
                      className="flex w-full items-center justify-between rounded-md bg-aurea-cream/60 px-3 py-1.5 text-xs font-medium text-aurea-goldDark"
                    >
                      Historial de pagos ({pagosOrdenados.length})
                      {historialVisible ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
                    </button>

                    {historialVisible && (
                      <div className="mt-2 max-h-32 space-y-1 overflow-y-auto rounded-md border border-aurea-border px-3 py-2 text-xs">
                        {pagosOrdenados.map((pago, indice) => (
                          <div key={indice} className="flex items-center justify-between text-aurea-text">
                            <span>{pago.fecha}</span>
                            <span className="rounded bg-aurea-cream px-1.5 py-0.5 text-[10px] font-medium text-aurea-goldDark">
                              {pago.formaPago || '-'}
                            </span>
                            <span className="font-medium">L. {formatearMoneda(pago.monto)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {!completado && (
                  <button
                    onClick={() => abrirRegistroPago(cobro)}
                    className="mt-auto flex items-center justify-center gap-2 rounded-md bg-aurea-gold py-2 text-sm font-medium text-white transition hover:bg-aurea-goldDark"
                  >
                    <FaMoneyBillWave size={12} />
                    Registrar Pago
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>

      {cobroSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fadeIn">
          <div className="w-full max-w-md animate-fadeInUp rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg text-aurea-goldDark">Registrar Pago</h2>
              <button onClick={cerrarRegistroPago} className="text-aurea-text hover:text-red-600">
                <FaTimes size={16} />
              </button>
            </div>

            <p className="mb-1 text-sm text-aurea-text">{cobroSeleccionado.pacienteNombre}</p>
            <p className="mb-4 text-sm text-aurea-text">
              Saldo pendiente: <span className="font-bold text-aurea-goldDark">L. {formatearMoneda(cobroSeleccionado.saldo)}</span>
            </p>

            <label className="mb-1 block text-sm font-medium text-aurea-text">Monto a abonar (L.)</label>
            <input
              type="number"
              value={montoPago}
              onChange={(evento) => setMontoPago(evento.target.value)}
              autoFocus
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
            />

            <label className="mb-1 mt-3 block text-sm font-medium text-aurea-text">Forma de pago</label>
            <select
              value={formaPagoSeleccionada}
              onChange={(evento) => setFormaPagoSeleccionada(evento.target.value)}
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
            >
              {FORMAS_PAGO.map((forma) => (
                <option key={forma} value={forma}>{forma}</option>
              ))}
            </select>

            <div className="mt-5 flex gap-3">
              <button
                onClick={manejarRegistrarPago}
                disabled={registrandoPago}
                className="flex flex-1 items-center justify-center gap-2 rounded-md bg-aurea-gold py-2.5 font-medium text-white transition hover:bg-aurea-goldDark disabled:opacity-60"
              >
                {registrandoPago ? 'Registrando...' : 'Confirmar Pago'}
              </button>
              <button
                onClick={cerrarRegistroPago}
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