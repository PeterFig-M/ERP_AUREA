import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import SignaturePad from 'signature_pad'
import { FaSave, FaPrint, FaPlus, FaTrash, FaEraser, FaArrowLeft } from 'react-icons/fa'
import {
  obtenerDocumentoPorId,
  obtenerExpedientePorPaciente,
  guardarExpediente,
  obtenerColeccion,
  obtenerConfiguracionEmpresa
} from '../../firebase/firestore.service'
import { formatearFecha, sanitizarNombreArchivo } from '../../utils/formatters'
import { descargarPdfExpediente } from '../../utils/pdfGenerator'

const DIENTES_SUPERIORES = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]
const DIENTES_INFERIORES = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]

const ESTADOS_SUPERFICIE = ['ninguno', 'caries', 'resina', 'amalgama', 'extraccion']

const CLASE_SUPERFICIE = {
  ninguno: 'bg-white border-aurea-goldDark/50',
  caries: 'bg-red-500 border-red-700',
  resina: 'bg-blue-500 border-blue-700',
  amalgama: 'bg-gray-400 border-gray-600',
  extraccion: 'bg-orange-500 border-orange-700'
}

function normalizarEstadoSuperficie(valor) {
  if (valor === true) return 'caries'
  if (!valor || !ESTADOS_SUPERFICIE.includes(valor)) return 'ninguno'
  return valor
}

const ANTECEDENTES_IZQUIERDA = [
  { clave: 'epilepsia', etiqueta: 'Epilepsia o Convulsiones' },
  { clave: 'diabetes', etiqueta: 'Diabetes Mellitus' },
  { clave: 'hipertension', etiqueta: 'Hipertensión Arterial' },
  { clave: 'embarazo', etiqueta: 'Embarazo Actual' }
]

const ANTECEDENTES_DERECHA = [
  { clave: 'anemia', etiqueta: 'Anemia o Problemas de Sangre' },
  { clave: 'hepatitis', etiqueta: 'Hepatitis o Insuficiencia Renal' },
  { clave: 'asma', etiqueta: 'Asma o Alergias Crónicas' },
  { clave: 'alergiasMedicamentosas', etiqueta: 'Alergias Medicamentosas' }
]

const ANTECEDENTES_VACIO = {
  epilepsia: false,
  diabetes: false,
  hipertension: false,
  embarazo: false,
  anemia: false,
  hepatitis: false,
  asma: false,
  alergiasMedicamentosas: false,
  otros: ''
}

const OPCIONES_PROTESIS = [
  { valor: 'ninguna', etiqueta: 'Ninguna' },
  { valor: 'removible', etiqueta: 'Removible' },
  { valor: 'fija', etiqueta: 'Fija' }
]

function fechaHoyInput() {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
}

function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return ''
  const nacimiento = new Date(fechaNacimiento)
  if (isNaN(nacimiento)) return ''
  const hoy = new Date()
  let edad = hoy.getFullYear() - nacimiento.getFullYear()
  const diferenciaMes = hoy.getMonth() - nacimiento.getMonth()
  if (diferenciaMes < 0 || (diferenciaMes === 0 && hoy.getDate() < nacimiento.getDate())) edad--
  return String(edad)
}

function SuperficieBox({ estado, alClic }) {
  const estadoNormalizado = normalizarEstadoSuperficie(estado)
  return (
    <button
      type="button"
      onClick={alClic}
      className={`h-3 w-3 border transition ${CLASE_SUPERFICIE[estadoNormalizado]}`}
    />
  )
}

function DienteSuperficies({ numero, datos, alClicSuperficie, alClicPresente }) {
  const superficies = datos?.superficies || {}
  const presente = datos?.presente !== false

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] font-medium text-aurea-text">{numero}</span>
      <div className="grid grid-cols-3 grid-rows-3 gap-0.5">
        <div />
        <SuperficieBox estado={superficies.arriba} alClic={() => alClicSuperficie('arriba')} />
        <div />
        <SuperficieBox estado={superficies.izquierda} alClic={() => alClicSuperficie('izquierda')} />
        <SuperficieBox estado={superficies.centro} alClic={() => alClicSuperficie('centro')} />
        <SuperficieBox estado={superficies.derecha} alClic={() => alClicSuperficie('derecha')} />
        <div />
        <SuperficieBox estado={superficies.abajo} alClic={() => alClicSuperficie('abajo')} />
        <div />
      </div>
      <button
        type="button"
        onClick={alClicPresente}
        className={`text-[10px] font-bold ${presente ? 'text-aurea-goldDark' : 'text-red-500'}`}
        title={presente ? 'Presente (clic para marcar ausente)' : 'Ausente (clic para marcar presente)'}
      >
        {presente ? 'P' : 'A'}
      </button>
    </div>
  )
}

export default function Expediente() {
  const { id } = useParams()
  const navegar = useNavigate()

  const [paciente, setPaciente] = useState(null)
  const [doctores, setDoctores] = useState([])
  const [empresaNombre, setEmpresaNombre] = useState('Aurea Dental Clinic')
  const [cargando, setCargando] = useState(true)

  const [fechaIngreso, setFechaIngreso] = useState(fechaHoyInput())
  const [edad, setEdad] = useState('')
  const [antecedentes, setAntecedentes] = useState(ANTECEDENTES_VACIO)

  const [consentimientoNombre, setConsentimientoNombre] = useState('')
  const [consentimientoDocumento, setConsentimientoDocumento] = useState('')

  const [estadosDientes, setEstadosDientes] = useState({})
  const [protesis, setProtesis] = useState('ninguna')

  const [diagnostico, setDiagnostico] = useState('')
  const [notas, setNotas] = useState([])

  const [odontologoNombre, setOdontologoNombre] = useState('')

  const [tipoFirmaPaciente, setTipoFirmaPaciente] = useState('dibujo')
  const [nombreFirmantePaciente, setNombreFirmantePaciente] = useState('')
  const [firmaPacienteGuardada, setFirmaPacienteGuardada] = useState(null)

  const [tipoFirmaOdontologo, setTipoFirmaOdontologo] = useState('dibujo')
  const [nombreFirmanteOdontologo, setNombreFirmanteOdontologo] = useState('')
  const [firmaOdontologoGuardada, setFirmaOdontologoGuardada] = useState(null)

  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const canvasPacienteRef = useRef(null)
  const signaturePadPacienteRef = useRef(null)
  const canvasOdontologoRef = useRef(null)
  const signaturePadOdontologoRef = useRef(null)

  useEffect(() => {
    async function cargarDatos() {
      setCargando(true)

      const [datosPaciente, listaDoctores, empresa, expedienteExistente] = await Promise.all([
        obtenerDocumentoPorId('pacientes', id),
        obtenerColeccion('doctores'),
        obtenerConfiguracionEmpresa(),
        obtenerExpedientePorPaciente(id)
      ])

      setPaciente(datosPaciente)
      setDoctores(listaDoctores)
      setEmpresaNombre(empresa?.nombre || 'Aurea Dental Clinic')

      if (expedienteExistente) {
        setFechaIngreso(expedienteExistente.datosGenerales?.fechaIngreso || fechaHoyInput())
        setEdad(expedienteExistente.datosGenerales?.edad || calcularEdad(datosPaciente?.fechaNacimiento))
        setAntecedentes(expedienteExistente.antecedentes || ANTECEDENTES_VACIO)
        setEstadosDientes(expedienteExistente.odontograma?.estados || {})
        setProtesis(expedienteExistente.protesis || 'ninguna')
        setDiagnostico(expedienteExistente.diagnostico || '')
        setNotas(expedienteExistente.notas || [])
        setConsentimientoNombre(expedienteExistente.consentimiento?.nombre || datosPaciente?.nombre || '')
        setConsentimientoDocumento(expedienteExistente.consentimiento?.documento || datosPaciente?.identidad || '')
        setOdontologoNombre(expedienteExistente.odontologoNombre || '')
        setFirmaPacienteGuardada(expedienteExistente.firmaPaciente || null)
        setFirmaOdontologoGuardada(expedienteExistente.firmaOdontologo || null)
        if (expedienteExistente.firmaPaciente?.tipo === 'texto') {
          setNombreFirmantePaciente(expedienteExistente.firmaPaciente.valor)
        }
        if (expedienteExistente.firmaOdontologo?.tipo === 'texto') {
          setNombreFirmanteOdontologo(expedienteExistente.firmaOdontologo.valor)
        }
      } else {
        setEdad(calcularEdad(datosPaciente?.fechaNacimiento))
        setConsentimientoNombre(datosPaciente?.nombre || '')
        setConsentimientoDocumento(datosPaciente?.identidad || '')
        setNotas([{ id: `nota-${Date.now()}`, fecha: formatearFecha(), texto: '' }])
      }

      setCargando(false)
    }

    cargarDatos()
  }, [id])

  useEffect(() => {
    if (!cargando && canvasPacienteRef.current && tipoFirmaPaciente === 'dibujo') {
      const canvas = canvasPacienteRef.current
      const relacionPixeles = Math.max(window.devicePixelRatio || 1, 1)
      canvas.width = canvas.offsetWidth * relacionPixeles
      canvas.height = canvas.offsetHeight * relacionPixeles
      canvas.getContext('2d').scale(relacionPixeles, relacionPixeles)

      signaturePadPacienteRef.current = new SignaturePad(canvas, {
        backgroundColor: 'rgb(255,255,255)',
        penColor: 'rgb(46,42,38)'
      })

      if (firmaPacienteGuardada?.tipo === 'dibujo' && firmaPacienteGuardada?.valor) {
        signaturePadPacienteRef.current.fromDataURL(firmaPacienteGuardada.valor)
      }
    }
  }, [cargando, tipoFirmaPaciente])

  useEffect(() => {
    if (!cargando && canvasOdontologoRef.current && tipoFirmaOdontologo === 'dibujo') {
      const canvas = canvasOdontologoRef.current
      const relacionPixeles = Math.max(window.devicePixelRatio || 1, 1)
      canvas.width = canvas.offsetWidth * relacionPixeles
      canvas.height = canvas.offsetHeight * relacionPixeles
      canvas.getContext('2d').scale(relacionPixeles, relacionPixeles)

      signaturePadOdontologoRef.current = new SignaturePad(canvas, {
        backgroundColor: 'rgb(255,255,255)',
        penColor: 'rgb(46,42,38)'
      })

      if (firmaOdontologoGuardada?.tipo === 'dibujo' && firmaOdontologoGuardada?.valor) {
        signaturePadOdontologoRef.current.fromDataURL(firmaOdontologoGuardada.valor)
      }
    }
  }, [cargando, tipoFirmaOdontologo])

  function actualizarAntecedente(clave, valor) {
    setAntecedentes((previo) => ({ ...previo, [clave]: valor }))
  }

  function alternarSuperficie(numero, superficie) {
    setEstadosDientes((previos) => {
      const datosActuales = previos[numero] || { superficies: {}, presente: true }
      const estadoActual = normalizarEstadoSuperficie(datosActuales.superficies?.[superficie])
      const indice = ESTADOS_SUPERFICIE.indexOf(estadoActual)
      const siguiente = ESTADOS_SUPERFICIE[(indice + 1) % ESTADOS_SUPERFICIE.length]

      return {
        ...previos,
        [numero]: {
          ...datosActuales,
          superficies: {
            ...datosActuales.superficies,
            [superficie]: siguiente
          }
        }
      }
    })
  }

  function alternarPresente(numero) {
    setEstadosDientes((previos) => {
      const datosActuales = previos[numero] || { superficies: {}, presente: true }
      return {
        ...previos,
        [numero]: {
          ...datosActuales,
          presente: datosActuales.presente === false
        }
      }
    })
  }

  function agregarLineaNota() {
    setNotas((previas) => [...previas, { id: `nota-${Date.now()}`, fecha: formatearFecha(), texto: '' }])
  }

  function actualizarNota(idNota, campo, valor) {
    setNotas((previas) => previas.map((nota) => (nota.id === idNota ? { ...nota, [campo]: valor } : nota)))
  }

  function eliminarNota(idNota) {
    setNotas((previas) => previas.filter((nota) => nota.id !== idNota))
  }

  function limpiarFirmaPaciente() {
    signaturePadPacienteRef.current?.clear()
  }

  function limpiarFirmaOdontologo() {
    signaturePadOdontologoRef.current?.clear()
  }

  async function manejarGuardar() {
    setGuardando(true)
    setMensaje('')

    let firmaPaciente = firmaPacienteGuardada
    if (tipoFirmaPaciente === 'dibujo' && signaturePadPacienteRef.current && !signaturePadPacienteRef.current.isEmpty()) {
      firmaPaciente = { tipo: 'dibujo', valor: signaturePadPacienteRef.current.toDataURL('image/png') }
    } else if (tipoFirmaPaciente === 'texto' && nombreFirmantePaciente.trim().length > 0) {
      firmaPaciente = { tipo: 'texto', valor: nombreFirmantePaciente.trim() }
    }

    let firmaOdontologo = firmaOdontologoGuardada
    if (tipoFirmaOdontologo === 'dibujo' && signaturePadOdontologoRef.current && !signaturePadOdontologoRef.current.isEmpty()) {
      firmaOdontologo = { tipo: 'dibujo', valor: signaturePadOdontologoRef.current.toDataURL('image/png') }
    } else if (tipoFirmaOdontologo === 'texto' && nombreFirmanteOdontologo.trim().length > 0) {
      firmaOdontologo = { tipo: 'texto', valor: nombreFirmanteOdontologo.trim() }
    }

    try {
      await guardarExpediente(id, {
        pacienteId: id,
        pacienteNombre: paciente?.nombre || '',
        datosGenerales: { fechaIngreso, edad },
        antecedentes,
        consentimiento: { nombre: consentimientoNombre, documento: consentimientoDocumento },
        odontograma: { estados: estadosDientes },
        protesis,
        diagnostico,
        notas,
        odontologoNombre,
        firmaPaciente,
        firmaOdontologo
      })

      setFirmaPacienteGuardada(firmaPaciente)
      setFirmaOdontologoGuardada(firmaOdontologo)
      setMensaje('Expediente guardado correctamente')
    } catch (error) {
      setMensaje('Ocurrió un error al guardar el expediente')
    } finally {
      setGuardando(false)
    }
  }

  async function manejarDescargarPdf() {
    const nombreArchivo = sanitizarNombreArchivo(`Expediente_Clinico_${paciente?.nombre || id}`)

    await descargarPdfExpediente(
      {
        paciente,
        empresaNombre,
        datosGenerales: { fechaIngreso, edad },
        antecedentes,
        consentimiento: { nombre: consentimientoNombre, documento: consentimientoDocumento },
        estadosDientes,
        protesis,
        diagnostico,
        notas,
        odontologoNombre,
        firmaPaciente: firmaPacienteGuardada,
        firmaOdontologo: firmaOdontologoGuardada
      },
      nombreArchivo
    )
  }

  if (cargando) {
    return <p className="text-aurea-text">Cargando expediente...</p>
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => navegar('/pacientes')}
        className="flex items-center gap-2 text-sm font-medium text-aurea-goldDark hover:underline"
      >
        <FaArrowLeft size={12} />
        Volver a Pacientes
      </button>

      <div className="rounded-lg border border-aurea-border bg-white p-4 shadow-sm sm:p-6">
        <h1 className="mb-4 border-b border-aurea-border pb-3 font-display text-2xl text-aurea-goldDark">
          Expediente Clínico
        </h1>

        <h2 className="mb-3 flex items-center gap-2 font-display text-base text-aurea-goldDark">
          <span className="h-4 w-1 rounded bg-aurea-gold" />
          Datos Generales del Paciente
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-aurea-text">Fecha de Ingreso</label>
            <input
              type="date"
              value={fechaIngreso}
              onChange={(evento) => setFechaIngreso(evento.target.value)}
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-aurea-text">Nombre Completo del Paciente</label>
            <input
              type="text"
              readOnly
              value={paciente?.nombre || ''}
              className="w-full rounded-md border border-aurea-border bg-aurea-cream/40 px-3 py-2 text-aurea-text outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-aurea-text">Edad</label>
            <input
              type="text"
              value={edad}
              onChange={(evento) => setEdad(evento.target.value)}
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-aurea-text">Teléfono / Celular</label>
            <input
              type="text"
              readOnly
              value={paciente?.telefono || ''}
              className="w-full rounded-md border border-aurea-border bg-aurea-cream/40 px-3 py-2 text-aurea-text outline-none"
            />
          </div>
        </div>

        {paciente?.alergias?.length > 0 && (
          <p className="mt-3 text-sm font-medium text-red-600">
            Alergias registradas: {paciente.alergias.join(', ')}
          </p>
        )}
      </div>

      <div className="rounded-lg border border-aurea-border bg-white p-4 shadow-sm sm:p-6">
        <h2 className="mb-3 flex items-center gap-2 font-display text-base text-aurea-goldDark">
          <span className="h-4 w-1 rounded bg-aurea-gold" />
          Antecedentes Médicos
        </h2>

        <div className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
          {ANTECEDENTES_IZQUIERDA.map((item) => (
            <label key={item.clave} className="flex items-center gap-2 text-sm text-aurea-text">
              <input
                type="checkbox"
                checked={antecedentes[item.clave]}
                onChange={(evento) => actualizarAntecedente(item.clave, evento.target.checked)}
                className="h-4 w-4 accent-aurea-gold"
              />
              {item.etiqueta}
            </label>
          ))}
          {ANTECEDENTES_DERECHA.map((item) => (
            <label key={item.clave} className="flex items-center gap-2 text-sm text-aurea-text">
              <input
                type="checkbox"
                checked={antecedentes[item.clave]}
                onChange={(evento) => actualizarAntecedente(item.clave, evento.target.checked)}
                className="h-4 w-4 accent-aurea-gold"
              />
              {item.etiqueta}
            </label>
          ))}
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-aurea-text">Otros</label>
          <input
            type="text"
            value={antecedentes.otros}
            onChange={(evento) => actualizarAntecedente('otros', evento.target.value)}
            placeholder="Especifique aquí otro antecedente observado..."
            className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
          />
        </div>
      </div>

      <div className="rounded-lg border border-aurea-border bg-white p-4 shadow-sm sm:p-6">
        <h2 className="mb-3 flex items-center gap-2 font-display text-base text-aurea-goldDark">
          <span className="h-4 w-1 rounded bg-aurea-gold" />
          Consentimiento Clínico
        </h2>

        <p className="text-sm leading-relaxed text-aurea-text">
          Yo,{' '}
          <input
            type="text"
            value={consentimientoNombre}
            onChange={(evento) => setConsentimientoNombre(evento.target.value)}
            className="inline-block w-48 border-b border-aurea-goldDark bg-transparent px-1 outline-none focus:border-aurea-gold"
          />
          , identificado con el número de documento{' '}
          <input
            type="text"
            value={consentimientoDocumento}
            onChange={(evento) => setConsentimientoDocumento(evento.target.value)}
            className="inline-block w-48 border-b border-aurea-goldDark bg-transparent px-1 outline-none focus:border-aurea-gold"
          />
          , manifiesto que toda la información provista respecto a mis antecedentes de salud es veraz. He recibido
          explicación detallada sobre el tratamiento propuesto por el odontólogo de <strong>{empresaNombre}</strong>.
          Otorgo de manera libre mi consentimiento para la ejecución de los mismos, exonerando al equipo médico de
          situaciones fortuitas o imprevistas.
        </p>
      </div>

      <div className="rounded-lg border border-aurea-border bg-white p-4 shadow-sm sm:p-6">
        <h2 className="mb-3 flex items-center gap-2 font-display text-base text-aurea-goldDark">
          <span className="h-4 w-1 rounded bg-aurea-gold" />
          Odontograma
        </h2>

        <div className="overflow-x-auto rounded-md border border-aurea-border bg-aurea-cream/40 p-4">
          <div className="flex min-w-max justify-center gap-2">
            {DIENTES_SUPERIORES.map((numero) => (
              <DienteSuperficies
                key={numero}
                numero={numero}
                datos={estadosDientes[numero]}
                alClicSuperficie={(superficie) => alternarSuperficie(numero, superficie)}
                alClicPresente={() => alternarPresente(numero)}
              />
            ))}
          </div>
          <div className="my-3 border-t border-dashed border-aurea-border" />
          <div className="flex min-w-max justify-center gap-2">
            {DIENTES_INFERIORES.map((numero) => (
              <DienteSuperficies
                key={numero}
                numero={numero}
                datos={estadosDientes[numero]}
                alClicSuperficie={(superficie) => alternarSuperficie(numero, superficie)}
                alClicPresente={() => alternarPresente(numero)}
              />
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-4 text-xs text-aurea-text">
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm border border-red-700 bg-red-500" /> Caries</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm border border-blue-700 bg-blue-500" /> Obturación de resina</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm border border-gray-600 bg-gray-400" /> Obturación de amalgama</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm border border-orange-700 bg-orange-500" /> Extracción indicada</span>
        </div>

        <p className="mt-2 text-xs text-aurea-text/60">
          Toca cada superficie del diente para ciclar entre los estados. Toca la letra "P" para alternar entre Presente y Ausente.
        </p>

        <div className="mt-5">
          <p className="mb-2 text-sm font-medium text-aurea-text">Prótesis</p>
          <div className="flex overflow-hidden rounded-md border border-aurea-border text-sm">
            {OPCIONES_PROTESIS.map((opcion) => (
              <button
                key={opcion.valor}
                type="button"
                onClick={() => setProtesis(opcion.valor)}
                className={`flex-1 px-4 py-2 font-medium transition ${
                  protesis === opcion.valor ? 'bg-aurea-gold text-white' : 'bg-white text-aurea-text hover:bg-aurea-cream'
                }`}
              >
                {opcion.etiqueta}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-aurea-border bg-white p-4 shadow-sm sm:p-6">
        <h2 className="mb-3 flex items-center gap-2 font-display text-base text-aurea-goldDark">
          <span className="h-4 w-1 rounded bg-aurea-gold" />
          Diagnóstico y Plan de Tratamiento
        </h2>
        <textarea
          rows={5}
          value={diagnostico}
          onChange={(evento) => setDiagnostico(evento.target.value)}
          placeholder="Describe el diagnóstico y el plan de tratamiento propuesto..."
          className="w-full resize-none rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
        />
      </div>

      <div className="rounded-lg border border-aurea-border bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-base text-aurea-goldDark">
            <span className="h-4 w-1 rounded bg-aurea-gold" />
            Evolución del Tratamiento
          </h2>
          <button
            onClick={agregarLineaNota}
            className="flex items-center gap-2 text-sm font-medium text-aurea-goldDark hover:underline"
          >
            <FaPlus size={11} />
            Agregar línea
          </button>
        </div>

        <div className="space-y-3">
          {notas.map((nota) => (
            <div key={nota.id} className="flex flex-col gap-2 rounded-md border border-aurea-border p-3 sm:flex-row sm:items-start">
              <input
                type="date"
                value={nota.fecha.includes('/') ? '' : nota.fecha}
                onChange={(evento) => actualizarNota(nota.id, 'fecha', evento.target.value)}
                placeholder={nota.fecha}
                className="w-full shrink-0 rounded-md border border-aurea-border px-3 py-2 text-sm outline-none focus:border-aurea-gold sm:w-40"
              />
              <textarea
                rows={2}
                value={nota.texto}
                onChange={(evento) => actualizarNota(nota.id, 'texto', evento.target.value)}
                placeholder="Describe el procedimiento realizado..."
                className="w-full resize-none rounded-md border border-aurea-border px-3 py-2 text-sm outline-none focus:border-aurea-gold"
              />
              <button
                onClick={() => eliminarNota(nota.id)}
                className="shrink-0 self-center text-red-500 hover:text-red-700 sm:self-start sm:pt-2"
              >
                <FaTrash size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-aurea-border bg-white p-4 shadow-sm sm:p-6">
        <h2 className="mb-3 flex items-center gap-2 font-display text-base text-aurea-goldDark">
          <span className="h-4 w-1 rounded bg-aurea-gold" />
          Firmas
        </h2>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-aurea-text">Firma del Paciente / Tutor</p>
              <div className="flex overflow-hidden rounded-md border border-aurea-border text-xs">
                <button
                  onClick={() => setTipoFirmaPaciente('dibujo')}
                  className={`px-2 py-1 font-medium transition ${tipoFirmaPaciente === 'dibujo' ? 'bg-aurea-gold text-white' : 'bg-white text-aurea-text'}`}
                >
                  Táctil
                </button>
                <button
                  onClick={() => setTipoFirmaPaciente('texto')}
                  className={`px-2 py-1 font-medium transition ${tipoFirmaPaciente === 'texto' ? 'bg-aurea-gold text-white' : 'bg-white text-aurea-text'}`}
                >
                  Escribir
                </button>
              </div>
            </div>

            {tipoFirmaPaciente === 'dibujo' ? (
              <div>
                <canvas ref={canvasPacienteRef} className="h-32 w-full touch-none rounded-md border border-aurea-border bg-white" />
                <button onClick={limpiarFirmaPaciente} className="mt-2 flex items-center gap-2 text-xs text-aurea-goldDark hover:underline">
                  <FaEraser size={11} />
                  Limpiar
                </button>
              </div>
            ) : (
              <input
                type="text"
                value={nombreFirmantePaciente}
                onChange={(evento) => setNombreFirmantePaciente(evento.target.value)}
                placeholder="Nombre completo del paciente"
                className="w-full rounded-md border border-aurea-border px-3 py-2 font-display text-lg italic outline-none focus:border-aurea-gold"
              />
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-aurea-text">Firma y Sello del Odontólogo</p>
              <div className="flex overflow-hidden rounded-md border border-aurea-border text-xs">
                <button
                  onClick={() => setTipoFirmaOdontologo('dibujo')}
                  className={`px-2 py-1 font-medium transition ${tipoFirmaOdontologo === 'dibujo' ? 'bg-aurea-gold text-white' : 'bg-white text-aurea-text'}`}
                >
                  Táctil
                </button>
                <button
                  onClick={() => setTipoFirmaOdontologo('texto')}
                  className={`px-2 py-1 font-medium transition ${tipoFirmaOdontologo === 'texto' ? 'bg-aurea-gold text-white' : 'bg-white text-aurea-text'}`}
                >
                  Escribir
                </button>
              </div>
            </div>

            <select
              value={odontologoNombre}
              onChange={(evento) => setOdontologoNombre(evento.target.value)}
              className="mb-2 w-full rounded-md border border-aurea-border px-3 py-2 text-sm outline-none focus:border-aurea-gold"
            >
              <option value="">-- Doctor(a) que atiende --</option>
              {doctores.map((doctor) => (
                <option key={doctor.id} value={doctor.nombre}>{doctor.nombre}</option>
              ))}
            </select>

            {tipoFirmaOdontologo === 'dibujo' ? (
              <div>
                <canvas ref={canvasOdontologoRef} className="h-32 w-full touch-none rounded-md border border-aurea-border bg-white" />
                <button onClick={limpiarFirmaOdontologo} className="mt-2 flex items-center gap-2 text-xs text-aurea-goldDark hover:underline">
                  <FaEraser size={11} />
                  Limpiar
                </button>
              </div>
            ) : (
              <input
                type="text"
                value={nombreFirmanteOdontologo}
                onChange={(evento) => setNombreFirmanteOdontologo(evento.target.value)}
                placeholder="Nombre completo del odontólogo"
                className="w-full rounded-md border border-aurea-border px-3 py-2 font-display text-lg italic outline-none focus:border-aurea-gold"
              />
            )}
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
          {guardando ? 'Guardando...' : 'Guardar Expediente'}
        </button>
        <button
          onClick={manejarDescargarPdf}
          className="flex flex-1 items-center justify-center gap-2 rounded-md border border-aurea-goldDark py-3 font-medium text-aurea-goldDark transition hover:bg-aurea-cream"
        >
          <FaPrint />
          Imprimir / Guardar PDF
        </button>
      </div>
    </div>
  )
}