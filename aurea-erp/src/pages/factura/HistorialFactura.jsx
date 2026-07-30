import { useEffect, useState } from 'react'
import { FaDownload, FaTrash, FaSearch } from 'react-icons/fa'
import {
  obtenerColeccion,
  obtenerConfiguracionEmpresa,
  eliminarDocumento
} from '../../firebase/firestore.service'
import { formatearMoneda, sanitizarNombreArchivo } from '../../utils/formatters'
import { descargarPdfFactura } from '../../utils/pdfGenerator'

export default function HistorialFactura() {
  const [facturas, setFacturas] = useState([])
  const [empresa, setEmpresa] = useState({})
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [descargandoId, setDescargandoId] = useState(null)

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    setCargando(true)
    const [listaFacturas, empresaCargada] = await Promise.all([
      obtenerColeccion('facturas', 'creadoEn'),
      obtenerConfiguracionEmpresa()
    ])
    setFacturas(listaFacturas)
    setEmpresa(empresaCargada || {})
    setCargando(false)
  }

  const facturasFiltradas = facturas.filter((factura) =>
    factura.pacienteNombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    factura.numero?.toLowerCase().includes(busqueda.toLowerCase())
  )

  async function manejarDescargar(factura) {
    setDescargandoId(factura.id)
    try {
      const nombreArchivo = sanitizarNombreArchivo(`${factura.numero}_${factura.pacienteNombre}`)
      await descargarPdfFactura(factura, empresa, nombreArchivo)
    } finally {
      setDescargandoId(null)
    }
  }

  async function manejarEliminar(id) {
    const confirmacion = window.confirm('¿Deseas eliminar este registro del historial? Esta acción no se puede deshacer.')
    if (!confirmacion) return

    await eliminarDocumento('facturas', id)
    await cargarDatos()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-2xl text-aurea-goldDark">Historial de Ingresos</h1>

        <div className="relative w-full sm:w-72">
          <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-aurea-goldDark/50" />
          <input
            type="text"
            placeholder="Buscar por paciente o número..."
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
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">No.</th>
              <th className="px-4 py-3">Paciente</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Total</th>
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
            ) : facturasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-aurea-text/60">
                  No se encontraron documentos
                </td>
              </tr>
            ) : (
              facturasFiltradas.map((factura) => (
                <tr key={factura.id} className="border-b border-aurea-border/60 hover:bg-aurea-cream/50">
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        factura.tipoDocumento === 'comprobante'
                          ? 'bg-aurea-goldLight text-aurea-goldDark'
                          : 'bg-aurea-gold/20 text-aurea-goldDark'
                      }`}
                    >
                      {factura.tipoDocumento === 'comprobante' ? 'Comprobante' : 'Factura'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-aurea-text">{factura.numero}</td>
                  <td className="px-4 py-3 text-aurea-text">{factura.pacienteNombre}</td>
                  <td className="px-4 py-3 text-aurea-text">{factura.fecha}</td>
                  <td className="px-4 py-3 font-medium text-aurea-text">L. {formatearMoneda(factura.total)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => manejarDescargar(factura)}
                        disabled={descargandoId === factura.id}
                        title="Descargar PDF"
                        className="text-aurea-goldDark hover:text-aurea-gold disabled:opacity-50"
                      >
                        <FaDownload size={14} />
                      </button>
                      <button
                        onClick={() => manejarEliminar(factura.id)}
                        title="Eliminar"
                        className="text-red-500 hover:text-red-700"
                      >
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