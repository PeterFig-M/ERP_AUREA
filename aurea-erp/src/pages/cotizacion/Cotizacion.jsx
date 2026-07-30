import { useEffect, useState } from 'react'
import { FaPrint, FaSave, FaTrash, FaPlus, FaSearch } from 'react-icons/fa'
import {
  obtenerColeccion,
  agregarDocumento,
  obtenerConfiguracionEmpresa,
  generarSiguienteNumeroCotizacion
} from '../../firebase/firestore.service'
import { numeroALetras } from '../../utils/numeroALetras'
import { formatearMoneda, formatearFecha, sanitizarNombreArchivo } from '../../utils/formatters'
import { descargarPdfCotizacion } from '../../utils/pdfGenerator'

const ISV_PORCENTAJE = 0.15

export default function Cotizacion() {
  const [empresa, setEmpresa] = useState({})
  const [pacientes, setPacientes] = useState([])
  const [doctores, setDoctores] = useState([])
  const [inventario, setInventario] = useState([])

  const [pacienteId, setPacienteId] = useState('')
  const [doctor, setDoctor] = useState('')
  const [especialista, setEspecialista] = useState('')
  const [items, setItems] = useState([])
  const [busquedaProducto, setBusquedaProducto] = useState('')
  const [descuento, setDescuento] = useState(0)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [ultimaCotizacionGuardada, setUltimaCotizacionGuardada] = useState(null)

  useEffect(() => {
    async function cargarDatosIniciales() {
      const [empresaCargada, pacientesCargados, doctoresCargados, inventarioCargado] = await Promise.all([
        obtenerConfiguracionEmpresa(),
        obtenerColeccion('pacientes'),
        obtenerColeccion('doctores'),
        obtenerColeccion('inventario')
      ])

      setEmpresa(empresaCargada || {})
      setPacientes(pacientesCargados)
      setDoctores(doctoresCargados)
      setInventario(inventarioCargado)
    }

    cargarDatosIniciales()
  }, [])

  const pacienteSeleccionado = pacientes.find((paciente) => paciente.id === pacienteId)

  const productosFiltrados = busquedaProducto.length > 0
    ? inventario.filter((producto) =>
        producto.descripcion?.toLowerCase().includes(busquedaProducto.toLowerCase())
      )
    : []

  function agregarProductoDesdeInventario(producto) {
    setItems((itemsPrevios) => [
      ...itemsPrevios,
      {
        id: `${producto.id}-${Date.now()}`,
        descripcion: producto.descripcion,
        precio: Number(producto.precioVenta || producto.precio || 0),
        cantidad: 1
      }
    ])
    setBusquedaProducto('')
  }

  function agregarLineaManual() {
    setItems((itemsPrevios) => [
      ...itemsPrevios,
      { id: `manual-${Date.now()}`, descripcion: '', precio: 0, cantidad: 1 }
    ])
  }

  function actualizarItem(id, campo, valor) {
    setItems((itemsPrevios) =>
      itemsPrevios.map((item) => (item.id === id ? { ...item, [campo]: valor } : item))
    )
  }

  function eliminarItem(id) {
    setItems((itemsPrevios) => itemsPrevios.filter((item) => item.id !== id))
  }

  const subtotalBruto = items.reduce((acumulado, item) => acumulado + Number(item.precio || 0) * Number(item.cantidad || 0), 0)
  const subtotal = Math.max(subtotalBruto - Number(descuento || 0), 0)
  const isv = subtotal * ISV_PORCENTAJE
  const total = subtotal + isv

  function limpiarFormulario() {
    setPacienteId('')
    setDoctor('')
    setEspecialista('')
    setItems([])
    setDescuento(0)
    setUltimaCotizacionGuardada(null)
  }

  async function manejarGuardar() {
    if (!pacienteSeleccionado) {
      setMensaje('Selecciona un paciente antes de guardar')
      return
    }

    if (items.length === 0) {
      setMensaje('Agrega al menos un producto o servicio')
      return
    }

    setGuardando(true)
    setMensaje('')

    try {
      const numero = await generarSiguienteNumeroCotizacion()

      const datosCotizacion = {
        numero,
        pacienteId: pacienteSeleccionado.id,
        pacienteNombre: pacienteSeleccionado.nombre,
        doctor,
        especialista,
        items,
        descuento: Number(descuento || 0),
        subtotal,
        isv,
        total,
        totalEnLetras: numeroALetras(total),
        fecha: formatearFecha()
      }

      await agregarDocumento('cotizaciones', datosCotizacion)

      setUltimaCotizacionGuardada(datosCotizacion)
      setMensaje('Cotización guardada correctamente')
    } catch (error) {
      setMensaje(error.message || 'Ocurrió un error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  async function manejarDescargarPdf() {
    if (!ultimaCotizacionGuardada) {
      setMensaje('Guarda la cotización antes de descargarla')
      return
    }

    const nombreArchivo = sanitizarNombreArchivo(
      `${ultimaCotizacionGuardada.numero}_${ultimaCotizacionGuardada.pacienteNombre}`
    )

    await descargarPdfCotizacion(ultimaCotizacionGuardada, empresa, nombreArchivo)
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-aurea-goldDark">Cotización</h1>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-lg border border-aurea-border bg-white p-4 shadow-sm">
            <label className="mb-1 block text-sm font-medium text-aurea-text">Paciente</label>
            <select
              value={pacienteId}
              onChange={(evento) => setPacienteId(evento.target.value)}
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
            >
              <option value="">-- Selecciona un paciente --</option>
              {pacientes.map((paciente) => (
                <option key={paciente.id} value={paciente.id}>
                  {paciente.nombre}
                </option>
              ))}
            </select>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-aurea-text">Doctor(a)</label>
                <select
                  value={doctor}
                  onChange={(evento) => setDoctor(evento.target.value)}
                  className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
                >
                  <option value="">-- Selecciona --</option>
                  {doctores.map((persona) => (
                    <option key={persona.id} value={persona.nombre}>
                      {persona.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-aurea-text">Especialista</label>
                <select
                  value={especialista}
                  onChange={(evento) => setEspecialista(evento.target.value)}
                  className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
                >
                  <option value="">-- Selecciona --</option>
                  {doctores.map((persona) => (
                    <option key={persona.id} value={persona.nombre}>
                      {persona.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="relative rounded-lg border border-aurea-border bg-white p-4 shadow-sm">
            <div className="relative">
              <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-aurea-goldDark/50" />
              <input
                type="text"
                placeholder="Buscar producto o servicio del inventario..."
                value={busquedaProducto}
                onChange={(evento) => setBusquedaProducto(evento.target.value)}
                className="w-full rounded-md border border-aurea-border py-2 pl-9 pr-3 outline-none focus:border-aurea-gold"
              />
            </div>

            {productosFiltrados.length > 0 && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-aurea-border">
                {productosFiltrados.map((producto) => (
                  <button
                    key={producto.id}
                    onClick={() => agregarProductoDesdeInventario(producto)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-aurea-cream"
                  >
                    <span>{producto.descripcion}</span>
                    <span className="text-aurea-goldDark">L. {formatearMoneda(producto.precioVenta || producto.precio)}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-aurea-border text-left text-aurea-goldDark">
                    <th className="py-2 pr-2">Descripción</th>
                    <th className="w-24 py-2 pr-2">Precio U.</th>
                    <th className="w-20 py-2 pr-2">Cantidad</th>
                    <th className="w-24 py-2 pr-2">Total</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-aurea-border/60">
                      <td className="py-2 pr-2">
                        <input
                          type="text"
                          value={item.descripcion}
                          onChange={(evento) => actualizarItem(item.id, 'descripcion', evento.target.value)}
                          className="w-full rounded-md border border-aurea-border px-2 py-1 outline-none focus:border-aurea-gold"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          value={item.precio}
                          onChange={(evento) => actualizarItem(item.id, 'precio', Number(evento.target.value))}
                          className="w-full rounded-md border border-aurea-border px-2 py-1 outline-none focus:border-aurea-gold"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          value={item.cantidad}
                          onChange={(evento) => actualizarItem(item.id, 'cantidad', Number(evento.target.value))}
                          className="w-full rounded-md border border-aurea-border px-2 py-1 outline-none focus:border-aurea-gold"
                        />
                      </td>
                      <td className="py-2 pr-2 font-medium">
                        L. {formatearMoneda(item.precio * item.cantidad)}
                      </td>
                      <td className="py-2 text-right">
                        <button onClick={() => eliminarItem(item.id)} className="text-red-500 hover:text-red-700">
                          <FaTrash size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={agregarLineaManual}
              className="mt-3 flex items-center gap-2 text-sm font-medium text-aurea-goldDark hover:underline"
            >
              <FaPlus size={11} />
              Agregar línea manual
            </button>
          </div>

          <div className="rounded-lg border border-aurea-border bg-white p-4 shadow-sm">
            <label className="mb-1 block text-sm font-medium text-aurea-text">Descuento / Rebaja (L.)</label>
            <input
              type="number"
              value={descuento}
              onChange={(evento) => setDescuento(evento.target.value)}
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
            />

            <div className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal bruto:</span>
                <span>L. {formatearMoneda(subtotalBruto)}</span>
              </div>
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>L. {formatearMoneda(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>ISV 15%:</span>
                <span>L. {formatearMoneda(isv)}</span>
              </div>
              <div className="flex justify-between border-t border-aurea-border pt-2 text-base font-bold text-aurea-goldDark">
                <span>Total estimado:</span>
                <span>L. {formatearMoneda(total)}</span>
              </div>
            </div>
          </div>

          {mensaje && (
            <div className="rounded-md border border-aurea-border bg-aurea-cream px-4 py-3 text-sm text-aurea-text">
              {mensaje}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={manejarGuardar}
              disabled={guardando}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-aurea-gold py-3 font-medium text-white transition hover:bg-aurea-goldDark disabled:opacity-60"
            >
              <FaSave />
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              onClick={manejarDescargarPdf}
              className="flex flex-1 items-center justify-center gap-2 rounded-md border border-aurea-goldDark py-3 font-medium text-aurea-goldDark transition hover:bg-aurea-cream"
            >
              <FaPrint />
              Imprimir / Guardar PDF
            </button>
          </div>

          {ultimaCotizacionGuardada && (
            <button
              onClick={limpiarFormulario}
              className="w-full rounded-md py-2 text-sm text-aurea-goldDark hover:underline"
            >
              Iniciar una nueva cotización
            </button>
          )}
        </div>

        <div className="rounded-lg border border-aurea-border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-start justify-between border-b border-aurea-border pb-4">
            <div>
              <p className="font-display text-lg font-bold text-aurea-goldDark">{empresa.nombre}</p>
              <p className="max-w-xs text-xs text-aurea-text">{empresa.direccion}</p>
              <p className="text-xs text-aurea-text">Tel: {empresa.telefono}</p>
              <p className="text-xs text-aurea-text">Correo: {empresa.correo}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-aurea-goldDark">COTIZACIÓN</p>
              <p className="text-xs text-aurea-text">No. PENDIENTE</p>
            </div>
          </div>

          <div className="mb-4 flex justify-end text-xs text-aurea-text">
            <span>FECHA: {formatearFecha()}</span>
          </div>

          <div className="mb-1 bg-aurea-goldDark px-3 py-2 text-sm font-bold text-white">
            PACIENTE: {pacienteSeleccionado?.nombre || ''}
          </div>
          <div className="mb-4 flex flex-col justify-between gap-1 border-b border-aurea-border pb-4 text-xs text-aurea-text sm:flex-row">
            <span>DOCTOR(A): {doctor}</span>
            <span>ESPECIALISTA: {especialista}</span>
          </div>

          <table className="w-full text-xs">
            <thead>
              <tr className="bg-aurea-goldDark text-left text-white">
                <th className="px-2 py-2">DESCRIPCIÓN</th>
                <th className="px-2 py-2">PRECIO U.</th>
                <th className="px-2 py-2">CANTIDAD</th>
                <th className="px-2 py-2">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-2 py-4 text-center text-aurea-text/60">
                    Sin productos agregados
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-b border-aurea-border/60">
                    <td className="px-2 py-2">{item.descripcion}</td>
                    <td className="px-2 py-2">L. {formatearMoneda(item.precio)}</td>
                    <td className="px-2 py-2">{item.cantidad}</td>
                    <td className="px-2 py-2">L. {formatearMoneda(item.precio * item.cantidad)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="mt-4 grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
            <div>
              <p className="font-bold text-aurea-text">Total en Letras:</p>
              <p className="text-aurea-text">{numeroALetras(total)}</p>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <span>DESCUENTO L.</span>
                <span>{formatearMoneda(descuento)}</span>
              </div>
              <div className="flex justify-between">
                <span>SUBTOTAL L.</span>
                <span>{formatearMoneda(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>I.S.V. 15% L.</span>
                <span>{formatearMoneda(isv)}</span>
              </div>
              <div className="flex justify-between border-t border-aurea-border pt-1 font-bold text-aurea-goldDark">
                <span>TOTAL ESTIMADO L.</span>
                <span>{formatearMoneda(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}