export function formatearMoneda(valor) {
  const numero = Number(valor) || 0
  return numero.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatearFecha(fecha = new Date()) {
  const dia = String(fecha.getDate()).padStart(2, '0')
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const anio = fecha.getFullYear()
  return `${dia}/${mes}/${anio}`
}

export function sanitizarNombreArchivo(texto) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '_')
}

export function parseFechaDDMMYYYY(fecha) {
  if (!fecha || typeof fecha !== 'string') return null
  const partes = fecha.split('/')
  if (partes.length !== 3) return null
  const [dia, mes, anio] = partes
  return new Date(Number(anio), Number(mes) - 1, Number(dia))
}

export function obtenerEtiquetaMes(fecha) {
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${meses[fecha.getMonth()]} ${fecha.getFullYear()}`
}

export function obtenerClaveMes(fecha) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
}

export function etiquetaDesdeClaveMes(clave) {
  const [anio, mes] = clave.split('-')
  return obtenerEtiquetaMes(new Date(Number(anio), Number(mes) - 1, 1))
}