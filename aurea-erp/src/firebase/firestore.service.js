import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore'
import { db } from './config'

export async function obtenerColeccion(nombreColeccion, campoOrden = null) {
  const referencia = campoOrden
    ? query(collection(db, nombreColeccion), orderBy(campoOrden, 'desc'))
    : collection(db, nombreColeccion)

  const snapshot = await getDocs(referencia)
  return snapshot.docs.map((documento) => ({ id: documento.id, ...documento.data() }))
}

export async function obtenerDocumentoPorId(nombreColeccion, id) {
  const referencia = doc(db, nombreColeccion, id)
  const snapshot = await getDoc(referencia)
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null
}

export async function agregarDocumento(nombreColeccion, datos) {
  const referencia = await addDoc(collection(db, nombreColeccion), {
    ...datos,
    creadoEn: serverTimestamp()
  })
  return referencia.id
}

export async function actualizarDocumento(nombreColeccion, id, datos) {
  const referencia = doc(db, nombreColeccion, id)
  await updateDoc(referencia, datos)
}

export async function eliminarDocumento(nombreColeccion, id) {
  const referencia = doc(db, nombreColeccion, id)
  await deleteDoc(referencia)
}

export async function obtenerConfiguracionEmpresa() {
  return obtenerDocumentoPorId('configuracion', 'empresa')
}

export async function generarSiguienteNumeroFactura() {
  const referenciaConfig = doc(db, 'configuracion', 'empresa')

  const numeroGenerado = await runTransaction(db, async (transaccion) => {
    const snapshot = await transaccion.get(referenciaConfig)
    const datos = snapshot.data()

    const correlativoActual = parseInt(datos.correlativo, 10)
    const rangoFin = parseInt(datos.rangoFin, 10)

    if (correlativoActual > rangoFin) {
      throw new Error('El rango autorizado de facturación se ha agotado. Actualiza el CAI en Configuración.')
    }

    const numeroCompleto = `${datos.prefijo}${String(correlativoActual).padStart(8, '0')}`

    transaccion.update(referenciaConfig, { correlativo: String(correlativoActual + 1) })

    return { numeroCompleto, datosEmpresa: datos }
  })

  return numeroGenerado
}

export async function generarSiguienteNumeroComprobante() {
  const referenciaConfig = doc(db, 'configuracion', 'empresa')

  const numeroGenerado = await runTransaction(db, async (transaccion) => {
    const snapshot = await transaccion.get(referenciaConfig)
    const datos = snapshot.data()

    const correlativoActual = parseInt(datos.correlativoComprobante || '1', 10)
    const numeroCompleto = `COMP-${String(correlativoActual).padStart(6, '0')}`

    transaccion.update(referenciaConfig, { correlativoComprobante: String(correlativoActual + 1) })

    return numeroCompleto
  })

  return numeroGenerado
}

export async function generarSiguienteNumeroCotizacion() {
  const referenciaConfig = doc(db, 'configuracion', 'empresa')

  const numeroGenerado = await runTransaction(db, async (transaccion) => {
    const snapshot = await transaccion.get(referenciaConfig)
    const datos = snapshot.data()

    const correlativoActual = parseInt(datos.correlativoCotizacion || '1', 10)
    const numeroCompleto = `COT-${String(correlativoActual).padStart(6, '0')}`

    transaccion.update(referenciaConfig, { correlativoCotizacion: String(correlativoActual + 1) })

    return numeroCompleto
  })

  return numeroGenerado
}

export async function obtenerExpedientePorPaciente(pacienteId) {
  const referencia = doc(db, 'expedientes', pacienteId)
  const snapshot = await getDoc(referencia)
  return snapshot.exists() ? snapshot.data() : null
}

export async function guardarExpediente(pacienteId, datos) {
  const referencia = doc(db, 'expedientes', pacienteId)
  await setDoc(referencia, {
    ...datos,
    actualizadoEn: serverTimestamp()
  })
}

export async function agregarPagoACobro(cobroId, montoPago, formaPago) {
  const referenciaCobro = doc(db, 'cobros', cobroId)

  await runTransaction(db, async (transaccion) => {
    const snapshot = await transaccion.get(referenciaCobro)
    const datos = snapshot.data()

    const pagosActuales = datos.pagos || []
    const nuevoPago = { fecha: formatearFechaLocal(), monto: Number(montoPago), formaPago }
    const pagosActualizados = [...pagosActuales, nuevoPago]

    const totalPagado = pagosActualizados.reduce((acumulado, pago) => acumulado + Number(pago.monto), 0)
    const nuevoSaldo = Math.max(Number(datos.totalTratamiento) - totalPagado, 0)

    transaccion.update(referenciaCobro, {
      pagos: pagosActualizados,
      saldo: nuevoSaldo
    })
  })
}

function formatearFechaLocal() {
  const hoy = new Date()
  const dia = String(hoy.getDate()).padStart(2, '0')
  const mes = String(hoy.getMonth() + 1).padStart(2, '0')
  const anio = hoy.getFullYear()
  return `${dia}/${mes}/${anio}`
}

export async function reducirInventarioPorVenta(items) {
  const itemsInventariables = (items || []).filter(
    (item) => item.inventarioId && item.tipo !== 'Servicio'
  )

  for (const item of itemsInventariables) {
    const referencia = doc(db, 'inventario', item.inventarioId)

    try {
      await runTransaction(db, async (transaccion) => {
        const snapshot = await transaccion.get(referencia)
        if (!snapshot.exists()) return

        const datos = snapshot.data()
        const unidadesActuales = Number(datos.unidades || 0)
        const nuevasUnidades = Math.max(unidadesActuales - Number(item.cantidad || 0), 0)

        transaccion.update(referencia, { unidades: nuevasUnidades })
      })
    } catch (error) {
      // Si el producto ya no existe en inventario, se omite sin afectar el guardado de la factura
    }
  }
}