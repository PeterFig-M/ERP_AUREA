import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatearMoneda } from './formatters'

const COLOR_DORADO = [176, 141, 87]
const COLOR_DORADO_OSCURO = [140, 109, 63]
const COLOR_TEXTO = [46, 42, 38]

const DIENTES_SUPERIORES_PDF = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]
const DIENTES_INFERIORES_PDF = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]

const COLOR_SUPERFICIE_PDF = {
  caries: [220, 38, 38],
  resina: [37, 99, 235],
  amalgama: [156, 163, 175],
  extraccion: [234, 88, 12]
}

let logoCacheado = null

async function obtenerLogoBase64() {
  if (logoCacheado) return logoCacheado

  try {
    const respuesta = await fetch('/logo-pequeno.png')
    const blob = await respuesta.blob()

    logoCacheado = await new Promise((resolver, rechazar) => {
      const lector = new FileReader()
      lector.onloadend = () => resolver(lector.result)
      lector.onerror = rechazar
      lector.readAsDataURL(blob)
    })

    return logoCacheado
  } catch (error) {
    return null
  }
}

function dibujarLogo(documento, logoBase64, margen, tamano = 46, posicionY = 12) {
  if (!logoBase64) return
  try {
    documento.addImage(logoBase64, 'PNG', margen, posicionY, tamano, tamano)
  } catch (error) {
    return
  }
}

export async function generarPdfFactura(factura, empresa) {
  const logoBase64 = await obtenerLogoBase64()

  const documento = new jsPDF({ unit: 'pt', format: 'letter', compress: true })
  const anchoPagina = documento.internal.pageSize.getWidth()
  const margen = 40

  documento.setFillColor(...COLOR_DORADO_OSCURO)
  documento.rect(0, 0, anchoPagina, 70, 'F')

  dibujarLogo(documento, logoBase64, margen)

  const desplazamientoTexto = logoBase64 ? margen + 56 : margen

  documento.setTextColor(255, 255, 255)
  documento.setFont('helvetica', 'bold')
  documento.setFontSize(16)
  documento.text(empresa.nombre || 'Aurea Dental Clinic', desplazamientoTexto, 30)

  documento.setFont('helvetica', 'normal')
  documento.setFontSize(8)
  documento.text(empresa.direccion || '', desplazamientoTexto, 45, { maxWidth: anchoPagina - desplazamientoTexto - margen - 160 })
  documento.text(`Tel: ${empresa.telefono || ''}   Correo: ${empresa.correo || ''}`, desplazamientoTexto, 58)

  documento.setFontSize(18)
  documento.setFont('helvetica', 'bold')
  const tituloDocumento = factura.tipoDocumento === 'comprobante' ? 'COMPROBANTE' : 'FACTURA'
  documento.text(tituloDocumento, anchoPagina - margen, 28, { align: 'right' })

  documento.setFontSize(9)
  documento.setFont('helvetica', 'normal')
  documento.text(`No. ${factura.numero}`, anchoPagina - margen, 44, { align: 'right' })

  if (factura.tipoDocumento !== 'comprobante') {
    documento.text(
      `[${factura.formaPago === 'credito' ? 'X' : ' '}] CRÉDITO   [${factura.formaPago === 'contado' ? 'X' : ' '}] CONTADO`,
      anchoPagina - margen,
      58,
      { align: 'right' }
    )
  }

  let cursorY = 92

  documento.setTextColor(...COLOR_TEXTO)
  documento.setFontSize(9)

  if (factura.tipoDocumento !== 'comprobante' && empresa.rtn) {
    documento.text(`RTN: ${empresa.rtn}`, margen, cursorY)
  }
  documento.text(`FECHA: ${factura.fecha}`, anchoPagina - margen, cursorY, { align: 'right' })
  cursorY += 18

  documento.setFillColor(...COLOR_DORADO_OSCURO)
  documento.rect(margen, cursorY, anchoPagina - margen * 2, 18, 'F')
  documento.setTextColor(255, 255, 255)
  documento.setFont('helvetica', 'bold')
  documento.text(`PACIENTE: ${factura.pacienteNombre || ''}`, margen + 6, cursorY + 13)
  cursorY += 26

  documento.setTextColor(...COLOR_TEXTO)
  documento.setFont('helvetica', 'normal')
  documento.setFontSize(8)
  if (factura.pacienteRtn) {
    documento.text(`R.T.N.: ${factura.pacienteRtn}`, margen, cursorY)
  }
  documento.text(`DOCTOR(A): ${factura.doctor || ''}`, anchoPagina / 2, cursorY)
  cursorY += 12
  documento.text(`ESPECIALISTA: ${factura.especialista || ''}`, anchoPagina / 2, cursorY)
  cursorY += 16

  const filasTabla = factura.items.map((item) => [
    item.descripcion,
    `L. ${formatearMoneda(item.precio)}`,
    String(item.cantidad),
    `L. ${formatearMoneda(item.precio * item.cantidad)}`
  ])

  autoTable(documento, {
    startY: cursorY,
    margin: { left: margen, right: margen },
    head: [['DESCRIPCIÓN', 'PRECIO U.', 'CANTIDAD', 'TOTAL']],
    body: filasTabla.length > 0 ? filasTabla : [['Sin productos agregados', '', '', '']],
    headStyles: { fillColor: COLOR_DORADO_OSCURO, textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: COLOR_TEXTO },
    theme: 'grid'
  })

  let cursorYFinal = documento.lastAutoTable.finalY + 14

  const anchoColumna = (anchoPagina - margen * 2) / 2

  documento.setFont('helvetica', 'bold')
  documento.setFontSize(8)
  documento.text('Total en Letras:', margen, cursorYFinal)
  documento.setFont('helvetica', 'normal')
  documento.text(factura.totalEnLetras, margen, cursorYFinal + 12, { maxWidth: anchoColumna - 10 })

  let cursorYIzquierda = cursorYFinal + 34

  if (factura.tipoDocumento !== 'comprobante') {
    documento.text(`CAI: ${empresa.cai || ''}`, margen, cursorYIzquierda, { maxWidth: anchoColumna - 10 })
    cursorYIzquierda += 12
    documento.text(
      `RANGO AUTORIZADO: ${empresa.prefijo}${empresa.rangoInicio} AL ${empresa.prefijo}${empresa.rangoFin}`,
      margen,
      cursorYIzquierda,
      { maxWidth: anchoColumna - 10 }
    )
    cursorYIzquierda += 12
    documento.text(`FECHA LÍMITE DE EMISIÓN: ${empresa.fechaLimite || ''}`, margen, cursorYIzquierda)
  }

  const columnaDerechaX = margen + anchoColumna + 10
  let filaResumenY = cursorYFinal

  const filasResumen = [
    ['DESCUENTOS/REBAJAS OTORGADOS L.', formatearMoneda(factura.descuento), false],
    ['IMPORTE EXONERADO L.', formatearMoneda(factura.importeExonerado || 0), false],
    ['IMPORTE EXENTO L.', formatearMoneda(factura.importeExento || 0), false],
    ['IMPORTE GRAVADO 15% L.', formatearMoneda(factura.subtotal), false],
    ['I.S.V. 15% L.', formatearMoneda(factura.isv), false],
    ['TOTAL A PAGAR L.', formatearMoneda(factura.total), true]
  ]

  filasResumen.forEach(([etiqueta, valor, esTotal]) => {
    documento.setFont('helvetica', esTotal ? 'bold' : 'normal')
    documento.setFontSize(esTotal ? 9 : 7.5)
    documento.text(etiqueta, columnaDerechaX, filaResumenY)
    documento.text(valor, anchoPagina - margen, filaResumenY, { align: 'right' })
    filaResumenY += esTotal ? 16 : 13
  })

  documento.setFontSize(7)
  documento.setTextColor(150, 150, 150)
  documento.text(
    'Original: Paciente   Copia: Archivo',
    anchoPagina / 2,
    documento.internal.pageSize.getHeight() - 20,
    { align: 'center' }
  )

  return documento
}

export async function descargarPdfFactura(factura, empresa, nombreArchivo) {
  const documento = await generarPdfFactura(factura, empresa)
  documento.save(`${nombreArchivo}.pdf`)
}

export async function generarPdfCotizacion(cotizacion, empresa) {
  const logoBase64 = await obtenerLogoBase64()

  const documento = new jsPDF({ unit: 'pt', format: 'letter', compress: true })
  const anchoPagina = documento.internal.pageSize.getWidth()
  const margen = 40

  documento.setFillColor(...COLOR_DORADO_OSCURO)
  documento.rect(0, 0, anchoPagina, 70, 'F')

  dibujarLogo(documento, logoBase64, margen)

  const desplazamientoTexto = logoBase64 ? margen + 56 : margen

  documento.setTextColor(255, 255, 255)
  documento.setFont('helvetica', 'bold')
  documento.setFontSize(16)
  documento.text(empresa.nombre || 'Aurea Dental Clinic', desplazamientoTexto, 30)

  documento.setFont('helvetica', 'normal')
  documento.setFontSize(8)
  documento.text(empresa.direccion || '', desplazamientoTexto, 45, { maxWidth: anchoPagina - desplazamientoTexto - margen - 160 })
  documento.text(`Tel: ${empresa.telefono || ''}   Correo: ${empresa.correo || ''}`, desplazamientoTexto, 58)

  documento.setFontSize(18)
  documento.setFont('helvetica', 'bold')
  documento.text('COTIZACIÓN', anchoPagina - margen, 28, { align: 'right' })

  documento.setFontSize(9)
  documento.setFont('helvetica', 'normal')
  documento.text(`No. ${cotizacion.numero}`, anchoPagina - margen, 44, { align: 'right' })

  let cursorY = 92

  documento.setTextColor(...COLOR_TEXTO)
  documento.setFontSize(9)
  documento.text(`FECHA: ${cotizacion.fecha}`, anchoPagina - margen, cursorY, { align: 'right' })
  cursorY += 18

  documento.setFillColor(...COLOR_DORADO_OSCURO)
  documento.rect(margen, cursorY, anchoPagina - margen * 2, 18, 'F')
  documento.setTextColor(255, 255, 255)
  documento.setFont('helvetica', 'bold')
  documento.text(`PACIENTE: ${cotizacion.pacienteNombre || ''}`, margen + 6, cursorY + 13)
  cursorY += 26

  documento.setTextColor(...COLOR_TEXTO)
  documento.setFont('helvetica', 'normal')
  documento.setFontSize(8)
  documento.text(`DOCTOR(A): ${cotizacion.doctor || ''}`, margen, cursorY)
  documento.text(`ESPECIALISTA: ${cotizacion.especialista || ''}`, anchoPagina / 2, cursorY)
  cursorY += 16

  const filasTabla = cotizacion.items.map((item) => [
    item.descripcion,
    `L. ${formatearMoneda(item.precio)}`,
    String(item.cantidad),
    `L. ${formatearMoneda(item.precio * item.cantidad)}`
  ])

  autoTable(documento, {
    startY: cursorY,
    margin: { left: margen, right: margen },
    head: [['DESCRIPCIÓN', 'PRECIO U.', 'CANTIDAD', 'TOTAL']],
    body: filasTabla.length > 0 ? filasTabla : [['Sin productos agregados', '', '', '']],
    headStyles: { fillColor: COLOR_DORADO_OSCURO, textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: COLOR_TEXTO },
    theme: 'grid'
  })

  let cursorYFinal = documento.lastAutoTable.finalY + 14

  const anchoColumna = (anchoPagina - margen * 2) / 2

  documento.setFont('helvetica', 'bold')
  documento.setFontSize(8)
  documento.text('Total en Letras:', margen, cursorYFinal)
  documento.setFont('helvetica', 'normal')
  documento.text(cotizacion.totalEnLetras, margen, cursorYFinal + 12, { maxWidth: anchoColumna - 10 })

  const columnaDerechaX = margen + anchoColumna + 10
  let filaResumenY = cursorYFinal

  const filasResumen = [
    ['DESCUENTO L.', formatearMoneda(cotizacion.descuento), false],
    ['SUBTOTAL L.', formatearMoneda(cotizacion.subtotal), false],
    ['I.S.V. 15% L.', formatearMoneda(cotizacion.isv), false],
    ['TOTAL ESTIMADO L.', formatearMoneda(cotizacion.total), true]
  ]

  filasResumen.forEach(([etiqueta, valor, esTotal]) => {
    documento.setFont('helvetica', esTotal ? 'bold' : 'normal')
    documento.setFontSize(esTotal ? 9 : 8)
    documento.text(etiqueta, columnaDerechaX, filaResumenY)
    documento.text(valor, anchoPagina - margen, filaResumenY, { align: 'right' })
    filaResumenY += esTotal ? 16 : 13
  })

  documento.setFontSize(7)
  documento.setTextColor(150, 150, 150)
  documento.text(
    'Este documento es una cotización estimada, no representa un comprobante fiscal',
    anchoPagina / 2,
    documento.internal.pageSize.getHeight() - 20,
    { align: 'center' }
  )

  return documento
}

export async function descargarPdfCotizacion(cotizacion, empresa, nombreArchivo) {
  const documento = await generarPdfCotizacion(cotizacion, empresa)
  documento.save(`${nombreArchivo}.pdf`)
}

function dibujarFilaOdontogramaPdf(documento, margen, inicioY, anchoDisponible, dientesLista, estadosDientes) {
  const pasoX = anchoDisponible / dientesLista.length
  const ladoCaja = 3.2

  dientesLista.forEach((numero, indice) => {
    const centroX = margen + pasoX * indice + pasoX / 2
    const datos = estadosDientes?.[numero]
    const presente = datos?.presente !== false

    documento.setFont('helvetica', 'normal')
    documento.setFontSize(6)
    documento.setTextColor(...COLOR_TEXTO)
    documento.text(String(numero), centroX, inicioY, { align: 'center' })

    if (!presente) {
      documento.setFontSize(5)
      documento.setTextColor(180, 40, 40)
      documento.text('Ausente', centroX, inicioY + 9, { align: 'center' })
      return
    }

    const superficies = datos?.superficies || {}
    const posiciones = {
      arriba: [centroX - ladoCaja / 2, inicioY + 3],
      izquierda: [centroX - ladoCaja * 1.6, inicioY + 3 + ladoCaja],
      centro: [centroX - ladoCaja / 2, inicioY + 3 + ladoCaja],
      derecha: [centroX + ladoCaja * 0.6, inicioY + 3 + ladoCaja],
      abajo: [centroX - ladoCaja / 2, inicioY + 3 + ladoCaja * 2]
    }

    Object.entries(posiciones).forEach(([clave, coordenadas]) => {
      const [x, y] = coordenadas
      const estado = superficies[clave] || 'ninguno'
      const color = COLOR_SUPERFICIE_PDF[estado]

      if (color) {
        documento.setFillColor(...color)
        documento.rect(x, y, ladoCaja, ladoCaja, 'F')
      } else {
        documento.setFillColor(255, 255, 255)
        documento.rect(x, y, ladoCaja, ladoCaja, 'F')
      }

      documento.setDrawColor(...COLOR_DORADO_OSCURO)
      documento.setLineWidth(0.2)
      documento.rect(x, y, ladoCaja, ladoCaja, 'S')
    })
  })
}

function dibujarLeyendaOdontogramaPdf(documento, margen, y) {
  const leyenda = [
    ['Caries', COLOR_SUPERFICIE_PDF.caries],
    ['Obturación de resina', COLOR_SUPERFICIE_PDF.resina],
    ['Obturación de amalgama', COLOR_SUPERFICIE_PDF.amalgama],
    ['Extracción indicada', COLOR_SUPERFICIE_PDF.extraccion]
  ]

  let cursorX = margen

  documento.setFontSize(6.5)

  leyenda.forEach(([etiqueta, color]) => {
    documento.setFillColor(...color)
    documento.rect(cursorX, y - 4, 5, 5, 'F')
    documento.setDrawColor(...COLOR_DORADO_OSCURO)
    documento.setLineWidth(0.2)
    documento.rect(cursorX, y - 4, 5, 5, 'S')

    documento.setTextColor(...COLOR_TEXTO)
    documento.setFont('helvetica', 'normal')
    documento.text(etiqueta, cursorX + 8, y)

    cursorX += 8 + documento.getTextWidth(etiqueta) + 14
  })
}

const ETIQUETA_PROTESIS = {
  ninguna: 'Ninguna',
  removible: 'Removible',
  fija: 'Fija'
}

export async function generarPdfExpediente(datos) {
  const {
    paciente, empresaNombre, datosGenerales, antecedentes, consentimiento,
    estadosDientes, protesis, diagnostico, notas, odontologoNombre, firmaPaciente, firmaOdontologo
  } = datos

  const logoBase64 = await obtenerLogoBase64()

  const documento = new jsPDF({ unit: 'pt', format: 'letter', compress: true })
  const anchoPagina = documento.internal.pageSize.getWidth()
  const alturaPagina = documento.internal.pageSize.getHeight()
  const margen = 40
  const alturaHeader = 64

  function dibujarEncabezado(titulo) {
    documento.setFillColor(...COLOR_DORADO_OSCURO)
    documento.rect(0, 0, anchoPagina, alturaHeader, 'F')
    dibujarLogo(documento, logoBase64, margen, 40, 12)
    documento.setTextColor(255, 255, 255)
    documento.setFont('helvetica', 'bold')
    documento.setFontSize(15)
    documento.text(titulo, logoBase64 ? margen + 50 : margen, alturaHeader / 2 + 5)
  }

  function saltoPaginaSiNecesario(cursorActual, espacioNecesario = 90) {
    if (cursorActual > alturaPagina - espacioNecesario) {
      documento.addPage()
      return 30
    }
    return cursorActual
  }

  dibujarEncabezado('EXPEDIENTE DENTAL')

  let cursorY = alturaHeader + 24

  documento.setTextColor(...COLOR_TEXTO)
  documento.setFont('helvetica', 'bold')
  documento.setFontSize(11)
  documento.text('DATOS GENERALES DEL PACIENTE', margen, cursorY)
  cursorY += 6

  autoTable(documento, {
    startY: cursorY,
    margin: { left: margen, right: margen },
    body: [
      ['Fecha de Ingreso', datosGenerales?.fechaIngreso || '-', 'Nombre del Paciente', paciente?.nombre || '-'],
      ['Edad', datosGenerales?.edad || '-', 'Teléfono', paciente?.telefono || '-']
    ],
    theme: 'grid',
    bodyStyles: { fontSize: 8, textColor: COLOR_TEXTO },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 90 }, 2: { fontStyle: 'bold', cellWidth: 90 } }
  })

  cursorY = documento.lastAutoTable.finalY + 16

  if (paciente?.alergias?.length > 0) {
    documento.setTextColor(180, 40, 40)
    documento.setFont('helvetica', 'bold')
    documento.setFontSize(8.5)
    documento.text(`Alergias: ${paciente.alergias.join(', ')}`, margen, cursorY)
    documento.setTextColor(...COLOR_TEXTO)
    cursorY += 16
  }

  documento.setFont('helvetica', 'bold')
  documento.setFontSize(11)
  documento.text('ANTECEDENTES MÉDICOS', margen, cursorY)
  cursorY += 6

  const listaAntecedentes = [
    ['Epilepsia o Convulsiones', antecedentes?.epilepsia],
    ['Diabetes Mellitus', antecedentes?.diabetes],
    ['Hipertensión Arterial', antecedentes?.hipertension],
    ['Embarazo Actual', antecedentes?.embarazo],
    ['Anemia o Problemas de Sangre', antecedentes?.anemia],
    ['Hepatitis o Insuficiencia Renal', antecedentes?.hepatitis],
    ['Asma o Alergias Crónicas', antecedentes?.asma],
    ['Alergias Medicamentosas', antecedentes?.alergiasMedicamentosas]
  ]

  autoTable(documento, {
    startY: cursorY,
    margin: { left: margen, right: margen },
    body: [
      [listaAntecedentes[0], listaAntecedentes[4]],
      [listaAntecedentes[1], listaAntecedentes[5]],
      [listaAntecedentes[2], listaAntecedentes[6]],
      [listaAntecedentes[3], listaAntecedentes[7]]
    ].map((fila) => fila.map(([etiqueta, marcado]) => `${marcado ? '[X]' : '[ ]'} ${etiqueta}`)),
    theme: 'plain',
    bodyStyles: { fontSize: 8, textColor: COLOR_TEXTO, cellPadding: 2 }
  })

  cursorY = documento.lastAutoTable.finalY + 4

  if (antecedentes?.otros) {
    documento.setFont('helvetica', 'normal')
    documento.setFontSize(8)
    documento.text(`Otros: ${antecedentes.otros}`, margen, cursorY, { maxWidth: anchoPagina - margen * 2 })
    cursorY += 14
  }

  cursorY += 8
  cursorY = saltoPaginaSiNecesario(cursorY, 140)
  if (cursorY === 30) dibujarEncabezado('EXPEDIENTE DENTAL')

  documento.setFont('helvetica', 'bold')
  documento.setFontSize(11)
  documento.text('CONSENTIMIENTO CLÍNICO', margen, cursorY)
  cursorY += 14

  documento.setFont('helvetica', 'normal')
  documento.setFontSize(8.5)
  const textoConsentimiento =
    `Yo, ${consentimiento?.nombre || '_____________'}, identificado con el número de documento ${consentimiento?.documento || '_____________'}, ` +
    `manifiesto que toda la información provista respecto a mis antecedentes de salud es veraz. He recibido explicación detallada sobre el ` +
    `tratamiento propuesto por el odontólogo de ${empresaNombre || 'Aurea Dental Clinic'}. Otorgo de manera libre mi consentimiento para la ejecución ` +
    `de los mismos, exonerando al equipo médico de situaciones fortuitas o imprevistas.`

  const lineasConsentimiento = documento.splitTextToSize(textoConsentimiento, anchoPagina - margen * 2)
  documento.text(lineasConsentimiento, margen, cursorY)
  cursorY += lineasConsentimiento.length * 11 + 16

  cursorY = saltoPaginaSiNecesario(cursorY, 160)
  if (cursorY === 30) dibujarEncabezado('EXPEDIENTE DENTAL')

  documento.setFont('helvetica', 'bold')
  documento.setFontSize(11)
  documento.text('ODONTOGRAMA', margen, cursorY)
  cursorY += 4

  const anchoDisponible = anchoPagina - margen * 2

  cursorY += 16
  dibujarFilaOdontogramaPdf(documento, margen, cursorY, anchoDisponible, DIENTES_SUPERIORES_PDF, estadosDientes)
  cursorY += 20

  cursorY += 20
  dibujarFilaOdontogramaPdf(documento, margen, cursorY, anchoDisponible, DIENTES_INFERIORES_PDF, estadosDientes)
  cursorY += 22

  dibujarLeyendaOdontogramaPdf(documento, margen, cursorY)
  cursorY += 16

  documento.setFont('helvetica', 'bold')
  documento.setFontSize(8)
  documento.setTextColor(...COLOR_TEXTO)
  documento.text(`Prótesis: ${ETIQUETA_PROTESIS[protesis] || 'Ninguna'}`, margen, cursorY)
  cursorY += 20

  cursorY = saltoPaginaSiNecesario(cursorY, 140)
  if (cursorY === 30) dibujarEncabezado('EXPEDIENTE DENTAL')

  documento.setFont('helvetica', 'bold')
  documento.setFontSize(11)
  documento.text('DIAGNÓSTICO Y PLAN DE TRATAMIENTO', margen, cursorY)
  cursorY += 6

  documento.setFont('helvetica', 'normal')
  documento.setFontSize(8.5)
  const lineasDiagnostico = documento.splitTextToSize(diagnostico || 'Sin diagnóstico registrado.', anchoPagina - margen * 2)
  documento.text(lineasDiagnostico, margen, cursorY + 10)
  cursorY += lineasDiagnostico.length * 11 + 20

  cursorY = saltoPaginaSiNecesario(cursorY, 140)
  if (cursorY === 30) dibujarEncabezado('EXPEDIENTE DENTAL')

  documento.setFont('helvetica', 'bold')
  documento.setFontSize(11)
  documento.text('EVOLUCIÓN DEL TRATAMIENTO', margen, cursorY)
  cursorY += 6

  const filasNotas = (notas || []).map((nota) => [nota.fecha, nota.texto])

  autoTable(documento, {
    startY: cursorY,
    margin: { left: margen, right: margen },
    head: [['Fecha', 'Descripción']],
    body: filasNotas.length > 0 ? filasNotas : [['-', 'Sin registros']],
    headStyles: { fillColor: COLOR_DORADO_OSCURO, textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: COLOR_TEXTO },
    columnStyles: { 0: { cellWidth: 70 } },
    theme: 'grid'
  })

  cursorY = documento.lastAutoTable.finalY + 30

  cursorY = saltoPaginaSiNecesario(cursorY, 130)
  if (cursorY === 30) dibujarEncabezado('EXPEDIENTE DENTAL')

  documento.setFont('helvetica', 'normal')
  documento.setFontSize(8)
  documento.setTextColor(...COLOR_TEXTO)

  const anchoFirma = (anchoPagina - margen * 2 - 30) / 2

  documento.text('Firma del Paciente / Tutor:', margen, cursorY)
  documento.text(`Firma y Sello del Odontólogo (${odontologoNombre || 'N/D'}):`, margen + anchoFirma + 30, cursorY)
  cursorY += 8

  if (firmaPaciente?.tipo === 'dibujo' && firmaPaciente?.valor) {
    documento.addImage(firmaPaciente.valor, 'PNG', margen, cursorY, 140, 55)
  } else if (firmaPaciente?.tipo === 'texto' && firmaPaciente?.valor) {
    documento.setFont('helvetica', 'italic')
    documento.setFontSize(13)
    documento.text(firmaPaciente.valor, margen, cursorY + 35)
    documento.setFont('helvetica', 'normal')
  }

  if (firmaOdontologo?.tipo === 'dibujo' && firmaOdontologo?.valor) {
    documento.addImage(firmaOdontologo.valor, 'PNG', margen + anchoFirma + 30, cursorY, 140, 55)
  } else if (firmaOdontologo?.tipo === 'texto' && firmaOdontologo?.valor) {
    documento.setFont('helvetica', 'italic')
    documento.setFontSize(13)
    documento.text(firmaOdontologo.valor, margen + anchoFirma + 30, cursorY + 35)
    documento.setFont('helvetica', 'normal')
  }

  documento.setFontSize(8)
  documento.line(margen, cursorY + 60, margen + anchoFirma, cursorY + 60)
  documento.line(margen + anchoFirma + 30, cursorY + 60, anchoPagina - margen, cursorY + 60)

  return documento
}

export async function descargarPdfExpediente(datos, nombreArchivo) {
  const documento = await generarPdfExpediente(datos)
  documento.save(`${nombreArchivo}.pdf`)
}

export async function generarPdfFinanzas(datos) {
  const {
    fechaInicio, fechaFin,
    totalVendido, costoVentasTotal, utilidadBruta,
    sueldosTotal, alquilerTotal, serviciosTotal, depreciacionTotal, gastosOperacionTotal,
    gastosFinancierosTotal, impuestosTotal, utilidadNeta,
    rankingServicios, rankingProductos, dividendosEnRango
  } = datos

  const logoBase64 = await obtenerLogoBase64()

  const documento = new jsPDF({ unit: 'pt', format: 'letter', compress: true })
  const anchoPagina = documento.internal.pageSize.getWidth()
  const margen = 40

  documento.setFillColor(...COLOR_DORADO_OSCURO)
  documento.rect(0, 0, anchoPagina, 50, 'F')

  dibujarLogo(documento, logoBase64, margen, 34, 8)

  const desplazamientoTexto = logoBase64 ? margen + 44 : margen

  documento.setTextColor(255, 255, 255)
  documento.setFont('helvetica', 'bold')
  documento.setFontSize(15)
  documento.text('ESTADO DE RESULTADOS', desplazamientoTexto, 30)

  let cursorY = 72

  documento.setTextColor(...COLOR_TEXTO)
  documento.setFontSize(9)
  documento.text(`Periodo: ${fechaInicio || 'Inicio'} al ${fechaFin || 'Hoy'}`, margen, cursorY)
  cursorY += 20

  autoTable(documento, {
    startY: cursorY,
    margin: { left: margen, right: margen },
    body: [
      ['Ventas o ingresos', `L. ${formatearMoneda(totalVendido)}`],
      ['Costo de ventas', `L. ${formatearMoneda(costoVentasTotal)}`],
      ['Utilidad bruta', `L. ${formatearMoneda(utilidadBruta)}`],
      ['Gastos de operación', ''],
      ['   Sueldos', `L. ${formatearMoneda(sueldosTotal)}`],
      ['   Alquiler', `L. ${formatearMoneda(alquilerTotal)}`],
      ['   Servicios', `L. ${formatearMoneda(serviciosTotal)}`],
      ['   Depreciación', `L. ${formatearMoneda(depreciacionTotal)}`],
      ['   Total Gastos de Operación', `L. ${formatearMoneda(gastosOperacionTotal)}`],
      ['Gastos financieros', `L. ${formatearMoneda(gastosFinancierosTotal)}`],
      ['Impuestos', `L. ${formatearMoneda(impuestosTotal)}`],
      ['Utilidad neta', `L. ${formatearMoneda(utilidadNeta)}`]
    ],
    theme: 'grid',
    bodyStyles: { fontSize: 8.5, textColor: COLOR_TEXTO },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 260 } },
    didParseCell: (datosCelda) => {
      if (datosCelda.row.index === 2 || datosCelda.row.index === 11) {
        datosCelda.cell.styles.fontStyle = 'bold'
        datosCelda.cell.styles.fillColor = [250, 246, 240]
      }
    }
  })

  let cursorYFinal = documento.lastAutoTable.finalY + 20

  documento.setFont('helvetica', 'bold')
  documento.setFontSize(10)
  documento.text('Top 3 Servicios Vendidos', margen, cursorYFinal)
  cursorYFinal += 6

  autoTable(documento, {
    startY: cursorYFinal,
    margin: { left: margen, right: margen },
    head: [['Posición', 'Servicio', 'Total Vendido']],
    body: rankingServicios.length > 0
      ? rankingServicios.map((s, i) => [String(i + 1), s.descripcion, `L. ${formatearMoneda(s.totalVendido)}`])
      : [['-', 'Sin datos', '']],
    headStyles: { fillColor: COLOR_DORADO_OSCURO, textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: COLOR_TEXTO },
    theme: 'grid'
  })

  cursorYFinal = documento.lastAutoTable.finalY + 20

  if (cursorYFinal > documento.internal.pageSize.getHeight() - 150) {
    documento.addPage()
    cursorYFinal = 60
  }

  documento.setFont('helvetica', 'bold')
  documento.setFontSize(10)
  documento.text('Top 3 Productos Vendidos', margen, cursorYFinal)
  cursorYFinal += 6

  autoTable(documento, {
    startY: cursorYFinal,
    margin: { left: margen, right: margen },
    head: [['Posición', 'Producto', 'Total Vendido']],
    body: rankingProductos.length > 0
      ? rankingProductos.map((p, i) => [String(i + 1), p.descripcion, `L. ${formatearMoneda(p.totalVendido)}`])
      : [['-', 'Sin datos', '']],
    headStyles: { fillColor: [70, 110, 180], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: COLOR_TEXTO },
    theme: 'grid'
  })

  cursorYFinal = documento.lastAutoTable.finalY + 20

  documento.setFont('helvetica', 'bold')
  documento.setFontSize(10)
  documento.text('Retiro de Dividendos en el Periodo', margen, cursorYFinal)
  cursorYFinal += 6

  autoTable(documento, {
    startY: cursorYFinal,
    margin: { left: margen, right: margen },
    head: [['Fecha', 'Socio', 'Monto']],
    body: dividendosEnRango.length > 0
      ? dividendosEnRango.map((d) => [d.fecha, d.socioNombre, `L. ${formatearMoneda(d.monto)}`])
      : [['-', 'Sin retiros registrados', '']],
    headStyles: { fillColor: [50, 140, 90], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: COLOR_TEXTO },
    theme: 'grid'
  })

  return documento
}

export async function descargarPdfFinanzas(datos) {
  const documento = await generarPdfFinanzas(datos)
  documento.save(`Estado_Resultados_${Date.now()}.pdf`)
}