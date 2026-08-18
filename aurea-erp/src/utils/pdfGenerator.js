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
  const lineasTotalEnLetras = documento.splitTextToSize(factura.totalEnLetras, anchoColumna - 10)
  documento.text(lineasTotalEnLetras, margen, cursorYFinal + 12)

  let cursorYIzquierda = cursorYFinal + 12 + lineasTotalEnLetras.length * 10 + 12

  if (factura.tipoDocumento !== 'comprobante') {
    documento.setFontSize(7.5)

    const textoCai = `CAI: ${empresa.cai || ''}`
    documento.text(textoCai, margen, cursorYIzquierda, { maxWidth: anchoColumna - 10 })
    cursorYIzquierda += 11

    const textoRango = `RANGO AUTORIZADO: ${empresa.prefijo}${empresa.rangoInicio} AL ${empresa.prefijo}${empresa.rangoFin}`
    const lineasRango = documento.splitTextToSize(textoRango, anchoColumna - 10)
    documento.text(lineasRango, margen, cursorYIzquierda)
    cursorYIzquierda += lineasRango.length * 10 + 1

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

  const cursorYPiePagina = Math.max(cursorYIzquierda, filaResumenY) + 20

  documento.setFontSize(7)
  documento.setTextColor(150, 150, 150)
  documento.text(
    'Original: Paciente   Copia: Archivo',
    anchoPagina / 2,
    Math.max(cursorYPiePagina, documento.internal.pageSize.getHeight() - 20),
    { align: 'center' }
  )

  return documento
}