import { useEffect, useState } from 'react'
import { FaPlus, FaTrash, FaEdit, FaTimes, FaSave, FaExclamationTriangle } from 'react-icons/fa'
import {
  obtenerColeccion,
  agregarDocumento,
  actualizarDocumento,
  eliminarDocumento
} from '../../firebase/firestore.service'
import { formatearMoneda } from '../../utils/formatters'

const AREAS = ['General', 'Ortodoncia', 'Endodoncia', 'Cirugía', 'Estética', 'Prótesis', 'Higiene', 'Administración']
const TIPOS = ['Insumo', 'Material', 'Instrumental', 'Servicio', 'Medicamento']

const ESTADO_VACIO = {
  item: '',
  descripcion: '',
  area: 'General',
  tipo: 'Insumo',
  unidades: '',
  precioCompra: '',
  precioVenta: '',
  fechaVencimiento: ''
}

export default function Inventario() {
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [formulario, setFormulario] = useState(ESTADO_VACIO)
  const [idEnEdicion, setIdEnEdicion] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    cargarProductos()
  }, [])

  async function cargarProductos() {
    setCargando(true)
    const lista = await obtenerColeccion('inventario')
    setProductos(lista)
    setCargando(false)
  }

  function actualizarCampo(campo, valor) {
    setFormulario((previo) => ({ ...previo, [campo]: valor }))
  }

  function iniciarEdicion(producto) {
    setIdEnEdicion(producto.id)
    setFormulario({
      item: producto.item || '',
      descripcion: producto.descripcion || '',
      area: producto.area || 'General',
      tipo: producto.tipo || 'Insumo',
      unidades: producto.unidades ?? '',
      precioCompra: producto.precioCompra ?? '',
      precioVenta: producto.precioVenta ?? '',
      fechaVencimiento: producto.fechaVencimiento || ''
    })
    setMensaje('')
  }

  function cancelarEdicion() {
    setIdEnEdicion(null)
    setFormulario(ESTADO_VACIO)
  }

  async function manejarGuardar(evento) {
    evento.preventDefault()

    if (formulario.descripcion.trim().length === 0) {
      setMensaje('La descripción es obligatoria')
      return
    }

    setGuardando(true)
    setMensaje('')

    try {
      const datos = {
        item: formulario.item.trim(),
        descripcion: formulario.descripcion.trim(),
        area: formulario.area,
        tipo: formulario.tipo,
        unidades: Number(formulario.unidades) || 0,
        precioCompra: Number(formulario.precioCompra) || 0,
        precioVenta: Number(formulario.precioVenta) || 0,
        fechaVencimiento: formulario.fechaVencimiento
      }

      if (idEnEdicion) {
        await actualizarDocumento('inventario', idEnEdicion, datos)
        setMensaje('Producto actualizado correctamente')
      } else {
        await agregarDocumento('inventario', datos)
        setMensaje('Producto agregado correctamente')
      }

      cancelarEdicion()
      await cargarProductos()
    } catch (error) {
      setMensaje('Ocurrió un error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  async function manejarEliminar(id) {
    const confirmacion = window.confirm('¿Deseas eliminar este producto del inventario?')
    if (!confirmacion) return

    await eliminarDocumento('inventario', id)
    await cargarProductos()

    if (idEnEdicion === id) cancelarEdicion()
  }

  function estaPorVencer(fecha) {
    if (!fecha) return false
    const hoy = new Date()
    const fechaVencimiento = new Date(fecha)
    const diferenciaDias = (fechaVencimiento - hoy) / (1000 * 60 * 60 * 24)
    return diferenciaDias <= 30 && diferenciaDias >= 0
  }

  function yaVencido(fecha) {
    if (!fecha) return false
    return new Date(fecha) < new Date()
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-aurea-goldDark">Inventario</h1>

      <form onSubmit={manejarGuardar} className="rounded-lg border border-aurea-border bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-aurea-text">No. Item</label>
            <input
              type="text"
              value={formulario.item}
              onChange={(evento) => actualizarCampo('item', evento.target.value)}
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="mb-1 block text-sm font-medium text-aurea-text">Descripción</label>
            <input
              type="text"
              value={formulario.descripcion}
              onChange={(evento) => actualizarCampo('descripcion', evento.target.value)}
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-aurea-text">Área</label>
            <select
              value={formulario.area}
              onChange={(evento) => actualizarCampo('area', evento.target.value)}
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
            >
              {AREAS.map((area) => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-aurea-text">Tipo</label>
            <select
              value={formulario.tipo}
              onChange={(evento) => actualizarCampo('tipo', evento.target.value)}
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
            >
              {TIPOS.map((tipo) => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-aurea-text">Unidades</label>
            <input
              type="number"
              value={formulario.unidades}
              onChange={(evento) => actualizarCampo('unidades', evento.target.value)}
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-aurea-text">Precio compra (L.)</label>
            <input
              type="number"
              value={formulario.precioCompra}
              onChange={(evento) => actualizarCampo('precioCompra', evento.target.value)}
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-aurea-text">Precio venta (L.)</label>
            <input
              type="number"
              value={formulario.precioVenta}
              onChange={(evento) => actualizarCampo('precioVenta', evento.target.value)}
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-aurea-text">Fecha de vencimiento</label>
            <input
              type="date"
              value={formulario.fechaVencimiento}
              onChange={(evento) => actualizarCampo('fechaVencimiento', evento.target.value)}
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
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Descripción</th>
              <th className="px-4 py-3">Área</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Unidades</th>
              <th className="px-4 py-3">P. Compra</th>
              <th className="px-4 py-3">P. Venta</th>
              <th className="px-4 py-3">Vencimiento</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-aurea-text/60">
                  Cargando...
                </td>
              </tr>
            ) : productos.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-aurea-text/60">
                  Aún no hay productos en el inventario
                </td>
              </tr>
            ) : (
              productos.map((producto) => (
                <tr key={producto.id} className="border-b border-aurea-border/60 hover:bg-aurea-cream/50">
                  <td className="px-4 py-3 text-aurea-text">{producto.item || '-'}</td>
                  <td className="px-4 py-3 font-medium text-aurea-text">{producto.descripcion}</td>
                  <td className="px-4 py-3 text-aurea-text">{producto.area || '-'}</td>
                  <td className="px-4 py-3 text-aurea-text">{producto.tipo || '-'}</td>
                  <td className="px-4 py-3 text-aurea-text">{producto.unidades}</td>
                  <td className="px-4 py-3 text-aurea-text">L. {formatearMoneda(producto.precioCompra)}</td>
                  <td className="px-4 py-3 text-aurea-text">L. {formatearMoneda(producto.precioVenta)}</td>
                  <td className="px-4 py-3">
                    {producto.fechaVencimiento ? (
                      <span
                        className={`flex items-center gap-1 ${
                          yaVencido(producto.fechaVencimiento)
                            ? 'font-medium text-red-600'
                            : estaPorVencer(producto.fechaVencimiento)
                            ? 'font-medium text-amber-600'
                            : 'text-aurea-text'
                        }`}
                      >
                        {(yaVencido(producto.fechaVencimiento) || estaPorVencer(producto.fechaVencimiento)) && (
                          <FaExclamationTriangle size={11} />
                        )}
                        {producto.fechaVencimiento}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => iniciarEdicion(producto)} className="text-aurea-goldDark hover:text-aurea-gold">
                        <FaEdit size={14} />
                      </button>
                      <button onClick={() => manejarEliminar(producto.id)} className="text-red-500 hover:text-red-700">
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