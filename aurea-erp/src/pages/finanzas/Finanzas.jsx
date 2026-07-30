import { useEffect, useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { FaPlus, FaTrash, FaEdit, FaSave, FaTimes, FaPrint, FaTrophy, FaUserFriends, FaHandHoldingUsd } from 'react-icons/fa'
import {
  obtenerColeccion,
  agregarDocumento,
  actualizarDocumento,
  eliminarDocumento
} from '../../firebase/firestore.service'
import {
  formatearMoneda, obtenerClaveMes, etiquetaDesdeClaveMes, parseFechaDDMMYYYY
} from '../../utils/formatters'
import { descargarPdfFinanzas } from '../../utils/pdfGenerator'

const MESES = [
  { valor: '01', nombre: 'Enero' }, { valor: '02', nombre: 'Febrero' }, { valor: '03', nombre: 'Marzo' },
  { valor: '04', nombre: 'Abril' }, { valor: '05', nombre: 'Mayo' }, { valor: '06', nombre: 'Junio' },
  { valor: '07', nombre: 'Julio' }, { valor: '08', nombre: 'Agosto' }, { valor: '09', nombre: 'Septiembre' },
  { valor: '10', nombre: 'Octubre' }, { valor: '11', nombre: 'Noviembre' }, { valor: '12', nombre: 'Diciembre' }
]

const ISV_PORCENTAJE = 0.15

const ESTADO_VACIO_RESULTADO = {
  mes: MESES[new Date().getMonth()].valor,
  anio: String(new Date().getFullYear()),
  alquiler: '',
  servicios: '',
  depreciacion: '',
  gastosFinancieros: ''
}

function fechaHoyISO() {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
}

export default function Finanzas() {
  const [atenciones, setAtenciones] = useState([])
  const [inventario, setInventario] = useState([])
  const [estadoResultados, setEstadoResultados] = useState([])
  const [socios, setSocios] = useState([])
  const [dividendos, setDividendos] = useState([])
  const [cargando, setCargando] = useState(true)

  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState(fechaHoyISO())

  const [formularioResultado, setFormularioResultado] = useState(ESTADO_VACIO_RESULTADO)
  const [idResultadoEnEdicion, setIdResultadoEnEdicion] = useState(null)
  const [guardandoResultado, setGuardandoResultado] = useState(false)

  const [nombreSocio, setNombreSocio] = useState('')
  const [guardandoSocio, setGuardandoSocio] = useState(false)

  const [socioIdDividendo, setSocioIdDividendo] = useState('')
  const [montoDividendo, setMontoDividendo] = useState('')
  const [fechaDividendo, setFechaDividendo] = useState(fechaHoyISO())
  const [guardandoDividendo, setGuardandoDividendo] = useState(false)

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    setCargando(true)
    const [listaAtenciones, listaInventario, listaResultados, listaSocios, listaDividendos] = await Promise.all([
      obtenerColeccion('atenciones'),
      obtenerColeccion('inventario'),
      obtenerColeccion('estadoResultados', 'creadoEn'),
      obtenerColeccion('socios', 'creadoEn'),
      obtenerColeccion('dividendos', 'creadoEn')
    ])
    setAtenciones(listaAtenciones)
    setInventario(listaInventario)
    setEstadoResultados(listaResultados)
    setSocios(listaSocios)
    setDividendos(listaDividendos)
    setCargando(false)
  }

  const atencionesFiltradas = useMemo(() => {
    return atenciones.filter((atencion) => {
      if (!atencion.fecha) return false
      const fecha = new Date(atencion.fecha)
      if (isNaN(fecha)) return false
      if (fechaInicio && fecha < new Date(fechaInicio)) return false
      if (fechaFin && fecha > new Date(fechaFin + 'T23:59:59')) return false
      return true
    })
  }, [atenciones, fechaInicio, fechaFin])

  const resultadosFiltrados = useMemo(() => {
    return estadoResultados.filter((entrada) => {
      const fechaEntrada = new Date(Number(entrada.anio), Number(entrada.mes) - 1, 1)
      if (fechaInicio && fechaEntrada < new Date(fechaInicio.slice(0, 7) + '-01')) return false
      if (fechaFin && fechaEntrada > new Date(fechaFin)) return false
      return true
    })
  }, [estadoResultados, fechaInicio, fechaFin])

  const mapaInventarioTipo = useMemo(() => {
    const mapa = {}
    inventario.forEach((producto) => {
      mapa[producto.descripcion] = producto.tipo
    })
    return mapa
  }, [inventario])

  const mapaInventarioCompra = useMemo(() => {
    const mapa = {}
    inventario.forEach((producto) => {
      mapa[producto.descripcion] = Number(producto.precioCompra || 0)
    })
    return mapa
  }, [inventario])

  const totalVendido = useMemo(() => {
    return atencionesFiltradas.reduce((acc, atencion) => acc + Number(atencion.total || 0), 0)
  }, [atencionesFiltradas])

  const impuestosTotal = useMemo(() => {
    return atencionesFiltradas.reduce((acc, atencion) => {
      const total = Number(atencion.total || 0)
      const isvImplicito = total - (total / (1 + ISV_PORCENTAJE))
      return acc + isvImplicito
    }, 0)
  }, [atencionesFiltradas])

  const costoVentasTotal = useMemo(() => {
    let total = 0
    atencionesFiltradas.forEach((atencion) => {
      (atencion.tratamientos || []).forEach((item) => {
        const tipoItem = mapaInventarioTipo[item.descripcion]
        if (tipoItem !== 'Servicio') {
          const precioCompra = mapaInventarioCompra[item.descripcion] || 0
          total += precioCompra * Number(item.cantidad || 0)
        }
      })
    })
    return total
  }, [atencionesFiltradas, mapaInventarioTipo, mapaInventarioCompra])

  const sueldosTotal = useMemo(() => {
    return atencionesFiltradas.reduce(
      (acc, atencion) => acc + Number(atencion.pagoDoctor || 0) + Number(atencion.pagoEspecialista || 0),
      0
    )
  }, [atencionesFiltradas])

  const alquilerTotal = resultadosFiltrados.reduce((acc, e) => acc + Number(e.alquiler || 0), 0)
  const serviciosTotal = resultadosFiltrados.reduce((acc, e) => acc + Number(e.servicios || 0), 0)
  const depreciacionTotal = resultadosFiltrados.reduce((acc, e) => acc + Number(e.depreciacion || 0), 0)
  const gastosFinancierosTotal = resultadosFiltrados.reduce((acc, e) => acc + Number(e.gastosFinancieros || 0), 0)

  const gastosOperacionTotal = sueldosTotal + alquilerTotal + serviciosTotal + depreciacionTotal

  const utilidadBruta = totalVendido - costoVentasTotal
  const utilidadNeta = utilidadBruta - gastosOperacionTotal - gastosFinancierosTotal - impuestosTotal

  const costosTotalesGenerales = costoVentasTotal + gastosOperacionTotal + gastosFinancierosTotal + impuestosTotal

  const datosGraficoMensual = useMemo(() => {
    const acumulado = {}

    atencionesFiltradas.forEach((atencion) => {
      const fecha = new Date(atencion.fecha)
      if (isNaN(fecha)) return
      const clave = obtenerClaveMes(fecha)
      acumulado[clave] = acumulado[clave] || { ventas: 0, costoVentas: 0, isv: 0, sueldos: 0, otros: 0 }

      const total = Number(atencion.total || 0)
      acumulado[clave].ventas += total
      acumulado[clave].isv += total - (total / (1 + ISV_PORCENTAJE))
      acumulado[clave].sueldos += Number(atencion.pagoDoctor || 0) + Number(atencion.pagoEspecialista || 0)

      ;(atencion.tratamientos || []).forEach((item) => {
        const tipoItem = mapaInventarioTipo[item.descripcion]
        if (tipoItem !== 'Servicio') {
          const precioCompra = mapaInventarioCompra[item.descripcion] || 0
          acumulado[clave].costoVentas += precioCompra * Number(item.cantidad || 0)
        }
      })
    })

    resultadosFiltrados.forEach((entrada) => {
      const clave = `${entrada.anio}-${entrada.mes}`
      acumulado[clave] = acumulado[clave] || { ventas: 0, costoVentas: 0, isv: 0, sueldos: 0, otros: 0 }
      acumulado[clave].otros +=
        Number(entrada.alquiler || 0) + Number(entrada.servicios || 0) +
        Number(entrada.depreciacion || 0) + Number(entrada.gastosFinancieros || 0)
    })

    return Object.entries(acumulado)
      .map(([clave, valores]) => {
        const costos = valores.costoVentas + valores.sueldos + valores.otros + valores.isv
        return {
          mes: etiquetaDesdeClaveMes(clave),
          claveOrden: clave,
          ventas: Number(valores.ventas.toFixed(2)),
          costos: Number(costos.toFixed(2)),
          ganancia: Number((valores.ventas - costos).toFixed(2))
        }
      })
      .sort((a, b) => a.claveOrden.localeCompare(b.claveOrden))
  }, [atencionesFiltradas, resultadosFiltrados, mapaInventarioTipo, mapaInventarioCompra])

  const { rankingServicios, rankingProductos } = useMemo(() => {
    const acumuladoServicios = {}
    const acumuladoProductos = {}

    atencionesFiltradas.forEach((atencion) => {
      (atencion.tratamientos || []).forEach((item) => {
        const totalItem = Number(item.precio || 0) * Number(item.cantidad || 0)
        const tipoItem = mapaInventarioTipo[item.descripcion]
        const destino = tipoItem === 'Servicio' ? acumuladoServicios : acumuladoProductos
        destino[item.descripcion] = destino[item.descripcion] || { descripcion: item.descripcion, totalVendido: 0 }
        destino[item.descripcion].totalVendido += totalItem
      })
    })

    const servicios = Object.values(acumuladoServicios).sort((a, b) => b.totalVendido - a.totalVendido).slice(0, 3)
    const productos = Object.values(acumuladoProductos).sort((a, b) => b.totalVendido - a.totalVendido).slice(0, 3)

    return { rankingServicios: servicios, rankingProductos: productos }
  }, [atencionesFiltradas, mapaInventarioTipo])

  const dividendosEnRango = useMemo(() => {
    return dividendos.filter((dividendo) => {
      const fecha = parseFechaDDMMYYYY(dividendo.fecha)
      if (!fecha) return false
      if (fechaInicio && fecha < new Date(fechaInicio)) return false
      if (fechaFin && fecha > new Date(fechaFin + 'T23:59:59')) return false
      return true
    })
  }, [dividendos, fechaInicio, fechaFin])

  function actualizarCampoResultado(campo, valor) {
    setFormularioResultado((previo) => ({ ...previo, [campo]: valor }))
  }

  function iniciarEdicionResultado(entrada) {
    setIdResultadoEnEdicion(entrada.id)
    setFormularioResultado({
      mes: entrada.mes,
      anio: entrada.anio,
      alquiler: entrada.alquiler ?? '',
      servicios: entrada.servicios ?? '',
      depreciacion: entrada.depreciacion ?? '',
      gastosFinancieros: entrada.gastosFinancieros ?? ''
    })
  }

  function cancelarEdicionResultado() {
    setIdResultadoEnEdicion(null)
    setFormularioResultado(ESTADO_VACIO_RESULTADO)
  }

  async function manejarGuardarResultado(evento) {
    evento.preventDefault()
    setGuardandoResultado(true)

    try {
      const datos = {
        mes: formularioResultado.mes,
        anio: formularioResultado.anio,
        alquiler: Number(formularioResultado.alquiler) || 0,
        servicios: Number(formularioResultado.servicios) || 0,
        depreciacion: Number(formularioResultado.depreciacion) || 0,
        gastosFinancieros: Number(formularioResultado.gastosFinancieros) || 0
      }

      if (idResultadoEnEdicion) {
        await actualizarDocumento('estadoResultados', idResultadoEnEdicion, datos)
      } else {
        await agregarDocumento('estadoResultados', datos)
      }

      cancelarEdicionResultado()
      await cargarDatos()
    } finally {
      setGuardandoResultado(false)
    }
  }

  async function manejarEliminarResultado(id) {
    const confirmacion = window.confirm('¿Deseas eliminar este registro mensual?')
    if (!confirmacion) return
    await eliminarDocumento('estadoResultados', id)
    await cargarDatos()
  }

  async function manejarAgregarSocio(evento) {
    evento.preventDefault()
    if (nombreSocio.trim().length === 0) return

    setGuardandoSocio(true)
    try {
      await agregarDocumento('socios', { nombre: nombreSocio.trim() })
      setNombreSocio('')
      await cargarDatos()
    } finally {
      setGuardandoSocio(false)
    }
  }

  async function manejarEliminarSocio(id) {
    const confirmacion = window.confirm('¿Deseas eliminar este socio?')
    if (!confirmacion) return
    await eliminarDocumento('socios', id)
    await cargarDatos()
  }

  async function manejarAgregarDividendo(evento) {
    evento.preventDefault()

    const socio = socios.find((item) => item.id === socioIdDividendo)
    if (!socio || !montoDividendo || Number(montoDividendo) <= 0) return

    setGuardandoDividendo(true)
    try {
      const [anio, mes, dia] = fechaDividendo.split('-')
      await agregarDocumento('dividendos', {
        socioId: socio.id,
        socioNombre: socio.nombre,
        monto: Number(montoDividendo),
        fecha: `${dia}/${mes}/${anio}`
      })
      setMontoDividendo('')
      await cargarDatos()
    } finally {
      setGuardandoDividendo(false)
    }
  }

  async function manejarEliminarDividendo(id) {
    const confirmacion = window.confirm('¿Deseas eliminar este registro de retiro?')
    if (!confirmacion) return
    await eliminarDocumento('dividendos', id)
    await cargarDatos()
  }

  async function manejarImprimirReporte() {
    await descargarPdfFinanzas({
      fechaInicio,
      fechaFin,
      totalVendido,
      costoVentasTotal,
      utilidadBruta,
      sueldosTotal,
      alquilerTotal,
      serviciosTotal,
      depreciacionTotal,
      gastosOperacionTotal,
      gastosFinancierosTotal,
      impuestosTotal,
      utilidadNeta,
      rankingServicios,
      rankingProductos,
      dividendosEnRango
    })
  }

  if (cargando) {
    return <p className="text-aurea-text">Cargando información financiera...</p>
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-aurea-goldDark">Finanzas</h1>

      <div className="rounded-lg border border-aurea-border bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-aurea-text">Desde</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(evento) => setFechaInicio(evento.target.value)}
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-aurea-text">Hasta</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(evento) => setFechaFin(evento.target.value)}
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={manejarImprimirReporte}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-aurea-gold py-2 text-sm font-medium text-white transition hover:bg-aurea-goldDark"
            >
              <FaPrint size={12} />
              Imprimir Estado de Resultados
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-aurea-border bg-white p-4 shadow-sm">
          <p className="text-sm text-aurea-text">Total Vendido</p>
          <p className="mt-1 text-2xl font-bold text-aurea-gold">L. {formatearMoneda(totalVendido)}</p>
          <p className="text-xs text-aurea-text/60">{atencionesFiltradas.length} atenciones (sin recargo POS)</p>
        </div>
        <div className="rounded-lg border border-aurea-border bg-white p-4 shadow-sm">
          <p className="text-sm text-aurea-text">Total Costos Operativos</p>
          <p className="mt-1 text-2xl font-bold text-red-600">L. {formatearMoneda(costosTotalesGenerales)}</p>
          <p className="text-xs text-aurea-text/60">Costo de ventas + gastos + impuestos</p>
        </div>
        <div className="rounded-lg border border-aurea-border bg-white p-4 shadow-sm">
          <p className="text-sm text-aurea-text">Utilidad Neta</p>
          <p className={`mt-1 text-2xl font-bold ${utilidadNeta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            L. {formatearMoneda(utilidadNeta)}
          </p>
          <p className="text-xs text-aurea-text/60">En el rango seleccionado</p>
        </div>
      </div>

      <div className="rounded-lg border border-aurea-border bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-display text-lg text-aurea-goldDark">Ventas, Costos y Ganancias por mes</h2>
        {datosGraficoMensual.length === 0 ? (
          <p className="text-sm text-aurea-text/60">No hay datos para el rango seleccionado</p>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={datosGraficoMensual}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5DDD0" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(valor) => `L. ${formatearMoneda(valor)}`} />
                <Legend />
                <Line type="monotone" dataKey="ventas" name="Total Vendido" stroke="#B08D57" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="costos" name="Costos Operativos" stroke="#C0392B" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="ganancia" name="Ganancias" stroke="#2F8F5B" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-aurea-border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <FaTrophy className="text-aurea-gold" />
            <h3 className="font-display text-base text-aurea-goldDark">Top Servicios Vendidos</h3>
          </div>
          {rankingServicios.length === 0 ? (
            <p className="text-sm text-aurea-text/60">Sin datos</p>
          ) : (
            <ol className="space-y-2">
              {rankingServicios.map((servicio, indice) => (
                <li key={servicio.descripcion} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-aurea-gold text-xs font-bold text-white">{indice + 1}</span>
                    {servicio.descripcion}
                  </span>
                  <span className="font-medium text-aurea-goldDark">L. {formatearMoneda(servicio.totalVendido)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="rounded-lg border border-aurea-border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <FaTrophy className="text-blue-500" />
            <h3 className="font-display text-base text-aurea-goldDark">Top Productos Vendidos</h3>
          </div>
          {rankingProductos.length === 0 ? (
            <p className="text-sm text-aurea-text/60">Sin datos</p>
          ) : (
            <ol className="space-y-2">
              {rankingProductos.map((producto, indice) => (
                <li key={producto.descripcion} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">{indice + 1}</span>
                    {producto.descripcion}
                  </span>
                  <span className="font-medium text-aurea-goldDark">L. {formatearMoneda(producto.totalVendido)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-aurea-border bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-display text-lg text-aurea-goldDark">Estado de Resultados</h2>
        <p className="mb-3 text-xs text-aurea-text/70">
          Ventas, Costo de Ventas, Sueldos e Impuestos se calculan automáticamente desde Atención Pacientes (sin el recargo del 5% de POS, ya que ese monto lo retiene el banco). Registra aquí solo Alquiler, Servicios, Depreciación y Gastos Financieros.
        </p>

        <form onSubmit={manejarGuardarResultado} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-aurea-text">Mes</label>
            <select
              value={formularioResultado.mes}
              onChange={(evento) => actualizarCampoResultado('mes', evento.target.value)}
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
            >
              {MESES.map((mes) => (
                <option key={mes.valor} value={mes.valor}>{mes.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-aurea-text">Año</label>
            <input
              type="number"
              value={formularioResultado.anio}
              onChange={(evento) => actualizarCampoResultado('anio', evento.target.value)}
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-aurea-text">Alquiler (L.)</label>
            <input
              type="number"
              value={formularioResultado.alquiler}
              onChange={(evento) => actualizarCampoResultado('alquiler', evento.target.value)}
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-aurea-text">Servicios (L.)</label>
            <input
              type="number"
              value={formularioResultado.servicios}
              onChange={(evento) => actualizarCampoResultado('servicios', evento.target.value)}
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-aurea-text">Depreciación (L.)</label>
            <input
              type="number"
              value={formularioResultado.depreciacion}
              onChange={(evento) => actualizarCampoResultado('depreciacion', evento.target.value)}
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-aurea-text">Gastos Financieros (L.)</label>
            <input
              type="number"
              value={formularioResultado.gastosFinancieros}
              onChange={(evento) => actualizarCampoResultado('gastosFinancieros', evento.target.value)}
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              disabled={guardandoResultado}
              className="flex items-center gap-2 rounded-md bg-aurea-gold px-5 py-2 text-sm font-medium text-white transition hover:bg-aurea-goldDark disabled:opacity-60"
            >
              {idResultadoEnEdicion ? <FaSave size={12} /> : <FaPlus size={11} />}
              {idResultadoEnEdicion ? 'Guardar' : 'Agregar'}
            </button>
            {idResultadoEnEdicion && (
              <button
                type="button"
                onClick={cancelarEdicionResultado}
                className="flex items-center gap-2 rounded-md border border-aurea-border px-4 py-2 text-sm font-medium text-aurea-text transition hover:bg-aurea-cream"
              >
                <FaTimes size={11} />
              </button>
            )}
          </div>
        </form>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-aurea-border text-left text-aurea-goldDark">
                <th className="py-2 pr-2">Mes/Año</th>
                <th className="py-2 pr-2">Alquiler</th>
                <th className="py-2 pr-2">Servicios</th>
                <th className="py-2 pr-2">Depreciación</th>
                <th className="py-2 pr-2">G. Financieros</th>
                <th className="w-16"></th>
              </tr>
            </thead>
            <tbody>
              {estadoResultados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-aurea-text/60">Aún no hay registros mensuales</td>
                </tr>
              ) : (
                estadoResultados.map((entrada) => (
                  <tr key={entrada.id} className="border-b border-aurea-border/60">
                    <td className="py-2 pr-2 text-aurea-text">{entrada.mes}/{entrada.anio}</td>
                    <td className="py-2 pr-2 text-aurea-text">L. {formatearMoneda(entrada.alquiler)}</td>
                    <td className="py-2 pr-2 text-aurea-text">L. {formatearMoneda(entrada.servicios)}</td>
                    <td className="py-2 pr-2 text-aurea-text">L. {formatearMoneda(entrada.depreciacion)}</td>
                    <td className="py-2 pr-2 text-aurea-text">L. {formatearMoneda(entrada.gastosFinancieros)}</td>
                    <td className="py-2">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => iniciarEdicionResultado(entrada)} className="text-aurea-goldDark hover:text-aurea-gold">
                          <FaEdit size={13} />
                        </button>
                        <button onClick={() => manejarEliminarResultado(entrada.id)} className="text-red-500 hover:text-red-700">
                          <FaTrash size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-5 rounded-md border border-aurea-border bg-aurea-cream/50 p-4">
          <h3 className="mb-3 font-display text-base text-aurea-goldDark">Resumen del periodo seleccionado</h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-aurea-text">Ventas o ingresos</span>
              <span className="font-medium">L. {formatearMoneda(totalVendido)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-aurea-text">Costo de ventas</span>
              <span className="font-medium">L. {formatearMoneda(costoVentasTotal)}</span>
            </div>
            <div className="flex justify-between border-t border-aurea-border pt-1.5 font-bold text-aurea-goldDark">
              <span>Utilidad bruta</span>
              <span>L. {formatearMoneda(utilidadBruta)}</span>
            </div>
            <div className="pt-2 text-aurea-text">Gastos de operación</div>
            <div className="flex justify-between pl-4">
              <span className="text-aurea-text">Sueldos</span>
              <span>L. {formatearMoneda(sueldosTotal)}</span>
            </div>
            <div className="flex justify-between pl-4">
              <span className="text-aurea-text">Alquiler</span>
              <span>L. {formatearMoneda(alquilerTotal)}</span>
            </div>
            <div className="flex justify-between pl-4">
              <span className="text-aurea-text">Servicios</span>
              <span>L. {formatearMoneda(serviciosTotal)}</span>
            </div>
            <div className="flex justify-between pl-4">
              <span className="text-aurea-text">Depreciación</span>
              <span>L. {formatearMoneda(depreciacionTotal)}</span>
            </div>
            <div className="flex justify-between border-t border-aurea-border pt-1.5 font-medium">
              <span>Total Gastos de Operación</span>
              <span>L. {formatearMoneda(gastosOperacionTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-aurea-text">Gastos financieros</span>
              <span className="font-medium">L. {formatearMoneda(gastosFinancierosTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-aurea-text">Impuestos (ISV implícito 15%)</span>
              <span className="font-medium">L. {formatearMoneda(impuestosTotal)}</span>
            </div>
            <div className={`flex justify-between border-t-2 border-aurea-goldDark pt-2 text-base font-bold ${utilidadNeta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              <span>Utilidad neta</span>
              <span>L. {formatearMoneda(utilidadNeta)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-aurea-border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <FaUserFriends className="text-aurea-goldDark" />
            <h2 className="font-display text-lg text-aurea-goldDark">Socios</h2>
          </div>

          <form onSubmit={manejarAgregarSocio} className="flex gap-2">
            <input
              type="text"
              value={nombreSocio}
              onChange={(evento) => setNombreSocio(evento.target.value)}
              placeholder="Nombre del socio"
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
            />
            <button
              type="submit"
              disabled={guardandoSocio}
              className="flex shrink-0 items-center gap-2 rounded-md bg-aurea-gold px-4 py-2 text-sm font-medium text-white transition hover:bg-aurea-goldDark disabled:opacity-60"
            >
              <FaPlus size={11} />
              Agregar
            </button>
          </form>

          <div className="mt-4 space-y-2">
            {socios.length === 0 ? (
              <p className="text-sm text-aurea-text/60">Aún no hay socios registrados</p>
            ) : (
              socios.map((socio) => (
                <div key={socio.id} className="flex items-center justify-between rounded-md border border-aurea-border px-3 py-2 text-sm">
                  <span className="text-aurea-text">{socio.nombre}</span>
                  <button onClick={() => manejarEliminarSocio(socio.id)} className="text-red-500 hover:text-red-700">
                    <FaTrash size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-aurea-border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <FaHandHoldingUsd className="text-aurea-goldDark" />
            <h2 className="font-display text-lg text-aurea-goldDark">Retiro de Dividendos</h2>
          </div>

          <form onSubmit={manejarAgregarDividendo} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-aurea-text">Socio</label>
              <select
                value={socioIdDividendo}
                onChange={(evento) => setSocioIdDividendo(evento.target.value)}
                className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
              >
                <option value="">-- Selecciona un socio --</option>
                {socios.map((socio) => (
                  <option key={socio.id} value={socio.id}>{socio.nombre}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-aurea-text">Monto (L.)</label>
                <input
                  type="number"
                  value={montoDividendo}
                  onChange={(evento) => setMontoDividendo(evento.target.value)}
                  className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-aurea-text">Fecha</label>
                <input
                  type="date"
                  value={fechaDividendo}
                  onChange={(evento) => setFechaDividendo(evento.target.value)}
                  className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={guardandoDividendo}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-aurea-gold py-2 text-sm font-medium text-white transition hover:bg-aurea-goldDark disabled:opacity-60"
            >
              <FaPlus size={11} />
              Registrar Retiro
            </button>
          </form>

          <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
            {dividendos.length === 0 ? (
              <p className="text-sm text-aurea-text/60">Aún no hay retiros registrados</p>
            ) : (
              dividendos.map((dividendo) => (
                <div key={dividendo.id} className="flex items-center justify-between rounded-md border border-aurea-border px-3 py-2 text-sm">
                  <div>
                    <span className="font-medium text-aurea-text">{dividendo.socioNombre}</span>
                    <span className="ml-2 text-aurea-text/60">{dividendo.fecha}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-aurea-goldDark">L. {formatearMoneda(dividendo.monto)}</span>
                    <button onClick={() => manejarEliminarDividendo(dividendo.id)} className="text-red-500 hover:text-red-700">
                      <FaTrash size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}