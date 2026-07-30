import { useEffect, useState } from 'react'
import { FaDownload, FaTrash, FaSearch } from 'react-icons/fa'
import {
  obtenerColeccion,
  obtenerConfiguracionEmpresa,
  eliminarDocumento
} from '../../firebase/firestore.service'
import { formatearMoneda, sanitizarNombreArchivo } from '../../utils/formatters'
import { descargarPdfCotizacion } from '../../utils/pdfGenerator'

export default function HistorialCotizacion() {
  const [cotizaciones, setCotizaciones] = useState([])
  const [empresa, setEmpresa] = useState({})
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [descargandoId, setDescargandoId] = useState(null)

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    setCargando(true)
    const [listaCotizaciones, empresaCargada] = await Promise.all([
      obtenerColeccion('cotizaciones', 'creadoEn'),
      obtenerConfiguracionEmpresa()
    ])
    setCotizaciones(listaCotizaciones)
    setEmpresa(empresaCargada || {})
    setCargando(false)
  }

  const cotizacionesFiltradas = cotizaciones.filter((cotizacion) =>
    cotizacion.pacienteNombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    cotizacion.numero?.toLowerCase().includes(busqueda.toLowerCase())
  )

  async function manejarDescargar(cotizacion) {
    setDescargandoId(cotizacion.id)
    try {
      const nombreArchivo = sanitizarNombreArchivo(`${cotizacion.numero}_${cotizacion.pacienteNombre}`)
      await descargarPdfCotizacion(cotizacion, empresa, nombreArchivo)
    } finally {
      setDescargandoId(null)
    }
  }

  async function manejarEliminar(id) {
    const confirmacion = window.confirm('¿Deseas eliminar esta cotización del historial? Esta acción no se puede deshacer.')
    if (!confirmacion) return

    await eliminarDocumento('cotizaciones', id)
    await cargarDatos()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-2xl text-aurea-goldDark">Historial de Cotización</h1>

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
                <td colSpan={5} className="px-4 py-6 text-center text-aurea-text/60">
                  Cargando...
                </td>
              </tr>
            ) : cotizacionesFiltradas.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-aurea-text/60">
                  No se encontraron cotizaciones
                </td>
              </tr>
            ) : (
              cotizacionesFiltradas.map((cotizacion) => (
                <tr key={cotizacion.id} className="border-b border-aurea-border/60 hover:bg-aurea-cream/50">
                  <td className="px-4 py-3 font-medium text-aurea-text">{cotizacion.numero}</td>
                  <td className="px-4 py-3 text-aurea-text">{cotizacion.pacienteNombre}</td>
                  <td className="px-4 py-3 text-aurea-text">{cotizacion.fecha}</td>
                  <td className="px-4 py-3 font-medium text-aurea-text">L. {formatearMoneda(cotizacion.total)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => manejarDescargar(cotizacion)}
                        disabled={descargandoId === cotizacion.id}
                        title="Descargar PDF"
                        className="text-aurea-goldDark hover:text-aurea-gold disabled:opacity-50"
                      >
                        <FaDownload size={14} />
                      </button>
                      <button
                        onClick={() => manejarEliminar(cotizacion.id)}
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