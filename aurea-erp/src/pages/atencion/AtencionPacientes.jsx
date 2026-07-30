import { useEffect, useState } from 'react'
import { FaPlus, FaTrash, FaSearch } from 'react-icons/fa'
import {
  obtenerColeccion,
  agregarDocumento,
  eliminarDocumento
} from '../../firebase/firestore.service'
import { formatearMoneda, formatearFecha } from '../../utils/formatters'
import { useAuth } from '../../context/AuthContext'

const TIPOS_PAGO = ['Efectivo', 'Tarjeta / POS', 'Transferencia', 'Cheque']
const RECARGO_POS = 0.05

function fechaHoyInput() {
  const hoy = new Date()
  const anio = hoy.getFullYear()
  const mes = String(hoy.getMonth() + 1).padStart(2, '0')
  const dia = String(hoy.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

export default function AtencionPacientes() {
  const { esAdmin } = useAuth()
  const [pacientes, setPacientes] = useState([])
  const [doctores, setDoctores] = useState([])
  const [servicios, setServicios] = useState([])
  const [atenciones, setAtenciones] = useState([])
  const [cargando, setCargando] = useState(true)

  const [fecha, setFecha] = useState(fechaHoyInput())
  const [pacienteId, setPacienteId] = useState('')
  const [busquedaServicio, setBusquedaServicio] = useState('')
  const [tratamientosSeleccionados, setTratamientosSeleccionados] = useState([])
  const [doctor, setDoctor] = useState('')
  const [especialista, setEspecialista] = useState('')
  const [tipoPago, setTipoPago] = useState('Efectivo')
  const [pagoDoctor, setPagoDoctor] = useState('')
  const [pagoEspecialista, setPagoEspecialista] = useState('')
  const [pagoDoctorEditadoManual, setPagoDoctorEditadoManual] = useState(false)
  const [pagoEspecialistaEditadoManual, setPagoEspecialistaEditadoManual] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    setCargando(true)
    const [listaPacientes, listaDoctores, listaInventario, listaAtenciones] = await Promise.all([
      obtenerColeccion('pacientes'),
      obtenerColeccion('doctores'),
      obtenerColeccion('inventario'),
      obtenerColeccion('atenciones', 'creadoEn')
    ])
    setPacientes(listaPacientes)
    setDoctores(listaDoctores)
    setServicios(listaInventario.filter((producto) => producto.tipo === 'Servicio'))
    setAtenciones(listaAtenciones)
    setCargando(false)
  }

  const serviciosFiltrados = busquedaServicio.length > 0
    ? servicios.filter((servicio) =>
        servicio.descripcion?.toLowerCase().includes(busquedaServicio.toLowerCase())
      )
    : []

  function agregarTratamiento(servicio) {
    setTratamientosSeleccionados((previos) => [
      ...previos,
      {
        id: `${servicio.id}-${Date.now()}`,
        descripcion: servicio.descripcion,
        precio: Number(servicio.precioVenta || servicio.precio || 0),
        cantidad: 1
      }
    ])
    setBusquedaServicio('')
  }

  function actualizarTratamiento(id, campo, valor) {
    setTratamientosSeleccionados((previos) =>
      previos.map((item) => (item.id === id ? { ...item, [campo]: valor } : item))
    )
  }

  function eliminarTratamiento(id) {
    setTratamientosSeleccionados((previos) => previos.filter((item) => item.id !== id))
  }

  const totalNumerico = tratamientosSeleccionados.reduce(
    (acumulado, item) => acumulado + Number(item.precio || 0) * Number(item.cantidad || 0),
    0
  )

  const esPos = tipoPago === 'Tarjeta / POS'
  const totalCobro = esPos ? totalNumerico * (1 + RECARGO_POS) : totalNumerico

  function recalcularComisiones(nuevoTotal, doctorActual, especialistaActual) {
    const totalBase = Number(nuevoTotal) || 0

    const personaEspecialista = doctores.find((item) => item.nombre === especialistaActual)
    const comisionEspecialista = personaEspecialista?.comision
      ? (totalBase * Number(personaEspecialista.comision)) / 100
      : 0

    const restanteDespuesEspecialista = totalBase - comisionEspecialista

    const personaDoctor = doctores.find((item) => item.nombre === doctorActual)
    const comisionDoctor = personaDoctor?.comision
      ? (restanteDespuesEspecialista * Number(personaDoctor.comision)) / 100
      : 0

    if (!pagoEspecialistaEditadoManual) {
      setPagoEspecialista(comisionEspecialista > 0 ? comisionEspecialista.toFixed(2) : '')
    }
    if (!pagoDoctorEditadoManual) {
      setPagoDoctor(comisionDoctor > 0 ? comisionDoctor.toFixed(2) : '')
    }
  }

  useEffect(() => {
    recalcularComisiones(totalNumerico, doctor, especialista)
  }, [totalNumerico])

  function manejarCambioDoctor(valor) {
    setDoctor(valor)
    recalcularComisiones(totalNumerico, valor, especialista)
  }

  function manejarCambioEspecialista(valor) {
    setEspecialista(valor)
    recalcularComisiones(totalNumerico, doctor, valor)
  }

  function manejarCambioPagoDoctorManual(valor) {
    setPagoDoctor(valor)
    setPagoDoctorEditadoManual(true)
  }

  function manejarCambioPagoEspecialistaManual(valor) {
    setPagoEspecialista(valor)
    setPagoEspecialistaEditadoManual(true)
  }

  function limpiarFormulario() {
    setFecha(fechaHoyInput())
    setPacienteId('')
    setTratamientosSeleccionados([])
    setDoctor('')
    setEspecialista('')
    setTipoPago('Efectivo')
    setPagoDoctor('')
    setPagoEspecialista('')
    setPagoDoctorEditadoManual(false)
    setPagoEspecialistaEditadoManual(false)
  }

  async function manejarGuardar(evento) {
    evento.preventDefault()

    const pacienteSeleccionado = pacientes.find((paciente) => paciente.id === pacienteId)

    if (!pacienteSeleccionado) {
      setMensaje('Selecciona un paciente')
      return
    }

    if (tratamientosSeleccionados.length === 0) {
      setMensaje('Agrega al menos un tratamiento a cobrar')
      return
    }

    if (totalNumerico <= 0) {
      setMensaje('El total debe ser mayor a cero')
      return
    }

    setGuardando(true)
    setMensaje('')

    try {
      const tratamientoTexto = tratamientosSeleccionados
        .map((item) => (item.cantidad > 1 ? `${item.descripcion} (x${item.cantidad})` : item.descripcion))
        .join(', ')

      await agregarDocumento('atenciones', {
        fecha,
        pacienteId: pacienteSeleccionado.id,
        pacienteNombre: pacienteSeleccionado.nombre,
        tratamiento: tratamientoTexto,
        tratamientos: tratamientosSeleccionados,
        doctor,
        especialista,
        tipoPago,
        total: totalNumerico,
        pagoDoctor: Number(pagoDoctor) || 0,
        pagoEspecialista: Number(pagoEspecialista) || 0,
        totalCobro
      })

      setMensaje('Atención registrada correctamente')
      limpiarFormulario()
      await cargarDatos()
    } catch (error) {
      setMensaje('Ocurrió un error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  async function manejarEliminar(id) {
    const confirmacion = window.confirm('¿Deseas eliminar este registro de atención?')
    if (!confirmacion) return

    await eliminarDocumento('atenciones', id)
    await cargarDatos()
  }

  const atencionesFiltradas = atenciones.filter((atencion) =>
    atencion.pacienteNombre?.toLowerCase().includes(busqueda.toLowerCase())
  )

  const restanteInfo = (() => {
    const personaEspecialista = doctores.find((item) => item.nombre === especialista)
    if (!personaEspecialista?.comision || totalNumerico <= 0) return null
    const comisionEsp = (totalNumerico * Number(personaEspecialista.comision)) / 100
    return totalNumerico - comisionEsp
  })()

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-aurea-goldDark">Atención Pacientes</h1>

      <form onSubmit={manejarGuardar} className="rounded-lg border border-aurea-border bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-aurea-text">Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={(evento) => setFecha(evento.target.value)}
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="mb-1 block text-sm font-medium text-aurea-text">Paciente</label>
            <select
              value={pacienteId}
              onChange={(evento) => setPacienteId(evento.target.value)}
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
            >
              <option value="">-- Selecciona un paciente --</option>
              {pacientes.map((paciente) => (
                <option key={paciente.id} value={paciente.id}>{paciente.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="relative mt-3">
          <label className="mb-1 block text-sm font-medium text-aurea-text">Tratamiento</label>
          <div className="relative">
            <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-aurea-goldDark/50" />
            <input
              type="text"
              value={busquedaServicio}
              onChange={(evento) => setBusquedaServicio(evento.target.value)}
              placeholder="Buscar servicio a cobrar..."
              className="w-full rounded-md border border-aurea-border py-2 pl-9 pr-3 outline-none focus:border-aurea-gold"
            />
          </div>

          {serviciosFiltrados.length > 0 && (
            <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-aurea-border bg-white shadow-md">
              {serviciosFiltrados.map((servicio) => (
                <button
                  key={servicio.id}
                  type="button"
                  onClick={() => agregarTratamiento(servicio)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-aurea-cream"
                >
                  <span>{servicio.descripcion}</span>
                  <span className="text-aurea-goldDark">L. {formatearMoneda(servicio.precioVenta || servicio.precio)}</span>
                </button>
              ))}
            </div>
          )}

          {servicios.length === 0 && (
            <p className="mt-1 text-xs text-aurea-text/60">
              No hay servicios catalogados como "Servicio" en Inventario todavía.
            </p>
          )}

          {tratamientosSeleccionados.length > 0 && (
            <div className="mt-3 overflow-x-auto rounded-md border border-aurea-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-aurea-border bg-aurea-cream text-left text-aurea-goldDark">
                    <th className="px-3 py-2">Servicio</th>
                    <th className="w-24 px-3 py-2">Precio</th>
                    <th className="w-20 px-3 py-2">Cant.</th>
                    <th className="w-24 px-3 py-2">Subtotal</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {tratamientosSeleccionados.map((item) => (
                    <tr key={item.id} className="border-b border-aurea-border/60 last:border-0">
                      <td className="px-3 py-2">{item.descripcion}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.precio}
                          onChange={(evento) => actualizarTratamiento(item.id, 'precio', Number(evento.target.value))}
                          className="w-full rounded-md border border-aurea-border px-2 py-1 outline-none focus:border-aurea-gold"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.cantidad}
                          onChange={(evento) => actualizarTratamiento(item.id, 'cantidad', Number(evento.target.value))}
                          className="w-full rounded-md border border-aurea-border px-2 py-1 outline-none focus:border-aurea-gold"
                        />
                      </td>
                      <td className="px-3 py-2 font-medium">
                        L. {formatearMoneda(item.precio * item.cantidad)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button type="button" onClick={() => eliminarTratamiento(item.id)} className="text-red-500 hover:text-red-700">
                          <FaTrash size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-aurea-text">Doctor(a)</label>
            <select
              value={doctor}
              onChange={(evento) => manejarCambioDoctor(evento.target.value)}
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
            >
              <option value="">-- Selecciona --</option>
              {doctores.map((persona) => (
                <option key={persona.id} value={persona.nombre}>{persona.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-aurea-text">Especialista</label>
            <select
              value={especialista}
              onChange={(evento) => manejarCambioEspecialista(evento.target.value)}
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
            >
              <option value="">-- Selecciona --</option>
              {doctores.map((persona) => (
                <option key={persona.id} value={persona.nombre}>{persona.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-aurea-text">Tipo de pago</label>
            <select
              value={tipoPago}
              onChange={(evento) => setTipoPago(evento.target.value)}
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
            >
              {TIPOS_PAGO.map((tipo) => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-aurea-text">Total (L.)</label>
            <input
              type="text"
              readOnly
              value={formatearMoneda(totalNumerico)}
              className="w-full rounded-md border border-aurea-border bg-aurea-cream/50 px-3 py-2 font-medium text-aurea-goldDark outline-none"
            />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-aurea-text">
              Pago Especialista (L.)
              {especialista && doctores.find((d) => d.nombre === especialista)?.comision && (
                <span className="ml-1 text-xs font-normal text-aurea-text/50">
                  ({doctores.find((d) => d.nombre === especialista).comision}% del total)
                </span>
              )}
            </label>
            <input
              type="number"
              value={pagoEspecialista}
              onChange={(evento) => manejarCambioPagoEspecialistaManual(evento.target.value)}
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-aurea-text">
              Pago Doctor(a) (L.)
              {doctor && doctores.find((d) => d.nombre === doctor)?.comision && (
                <span className="ml-1 text-xs font-normal text-aurea-text/50">
                  ({doctores.find((d) => d.nombre === doctor).comision}% del restante)
                </span>
              )}
            </label>
            <input
              type="number"
              value={pagoDoctor}
              onChange={(evento) => manejarCambioPagoDoctorManual(evento.target.value)}
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
            />
          </div>
        </div>

        {restanteInfo !== null && (
          <p className="mt-2 text-xs text-aurea-text/60">
            Después de descontar la comisión del especialista, quedan L. {formatearMoneda(restanteInfo)} sobre los que se calcula la comisión del doctor(a).
          </p>
        )}

        <div className="mt-4 flex flex-col justify-between gap-2 rounded-md bg-aurea-cream px-4 py-3 sm:flex-row sm:items-center">
          <span className="text-sm text-aurea-text">
            {esPos ? 'Se aplica recargo del 5% por pago con POS' : 'Total de cobro'}
          </span>
          <span className="text-lg font-bold text-aurea-goldDark">L. {formatearMoneda(totalCobro)}</span>
        </div>

        {mensaje && <p className="mt-3 text-sm text-aurea-text">{mensaje}</p>}

        <button
          type="submit"
          disabled={guardando}
          className="mt-4 flex items-center gap-2 rounded-md bg-aurea-gold px-5 py-2.5 text-sm font-medium text-white transition hover:bg-aurea-goldDark disabled:opacity-60"
        >
          <FaPlus size={11} />
          {guardando ? 'Guardando...' : 'Registrar Atención'}
        </button>
      </form>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-lg text-aurea-goldDark">Registros recientes</h2>
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
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Paciente</th>
              <th className="px-4 py-3">Tratamiento</th>
              <th className="px-4 py-3">Pago</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Total Cobro</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-aurea-text/60">Cargando...</td>
              </tr>
            ) : atencionesFiltradas.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-aurea-text/60">Aún no hay registros</td>
              </tr>
            ) : (
              atencionesFiltradas.map((atencion) => (
                <tr key={atencion.id} className="border-b border-aurea-border/60 hover:bg-aurea-cream/50">
                  <td className="px-4 py-3 text-aurea-text">{atencion.fecha}</td>
                  <td className="px-4 py-3 font-medium text-aurea-text">{atencion.pacienteNombre}</td>
                  <td className="px-4 py-3 text-aurea-text">{atencion.tratamiento}</td>
                  <td className="px-4 py-3 text-aurea-text">{atencion.tipoPago}</td>
                  <td className="px-4 py-3 text-aurea-text">L. {formatearMoneda(atencion.total)}</td>
                  <td className="px-4 py-3 font-medium text-aurea-goldDark">L. {formatearMoneda(atencion.totalCobro)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      {esAdmin && (
                        <button onClick={() => manejarEliminar(atencion.id)} className="text-red-500 hover:text-red-700">
                          <FaTrash size={14} />
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
    </div>
  )
}