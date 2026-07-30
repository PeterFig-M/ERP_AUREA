const UNIDADES = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE']
const DECENAS = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE']
const DIEZ_MULTIPLOS = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA']
const CENTENAS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS']

function convertirGrupo(numero) {
  let texto = ''

  if (numero === 100) return 'CIEN'

  const centena = Math.floor(numero / 100)
  const resto = numero % 100

  if (centena > 0) texto += CENTENAS[centena] + ' '

  if (resto >= 10 && resto <= 19) {
    texto += DECENAS[resto - 10]
  } else {
    const decena = Math.floor(resto / 10)
    const unidad = resto % 10

    if (decena === 2 && unidad > 0) {
      texto += 'VEINTI' + UNIDADES[unidad].toLowerCase().replace(/^./, (letra) => letra.toUpperCase())
      texto = texto.trim().toUpperCase()
    } else {
      if (decena > 0) texto += DIEZ_MULTIPLOS[decena]
      if (decena > 0 && unidad > 0) texto += ' Y '
      if (unidad > 0) texto += UNIDADES[unidad]
    }
  }

  return texto.trim()
}

export function numeroALetras(numero) {
  const entero = Math.floor(numero)
  const centavos = Math.round((numero - entero) * 100)

  if (entero === 0) {
    return `CERO LEMPIRAS CON ${String(centavos).padStart(2, '0')}/100`
  }

  let texto = ''
  const millones = Math.floor(entero / 1000000)
  const miles = Math.floor((entero % 1000000) / 1000)
  const resto = entero % 1000

  if (millones > 0) {
    texto += millones === 1 ? 'UN MILLON ' : convertirGrupo(millones) + ' MILLONES '
  }

  if (miles > 0) {
    texto += miles === 1 ? 'MIL ' : convertirGrupo(miles) + ' MIL '
  }

  if (resto > 0) {
    texto += convertirGrupo(resto)
  }

  texto = texto.trim() + (entero === 1 ? ' LEMPIRA' : ' LEMPIRAS')

  return `${texto} CON ${String(centavos).padStart(2, '0')}/100`
}