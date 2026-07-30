import { useEffect, useState } from 'react'
import { FaSave } from 'react-icons/fa'
import { obtenerConfiguracionEmpresa, actualizarDocumento } from '../../firebase/firestore.service'

const ESTADO_VACIO = {
  nombre: '',
  rtn: '',
  telefono: '',
  correo: '',
  direccion: '',
  cai: '',
  fechaLimite: '',
  prefijo: '',
  rangoInicio: '',
  rangoFin: '',
  correlativo: ''
}

export default function Configuracion() {
  const [formulario, setFormulario] = useState(ESTADO_VACIO)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    cargarConfiguracion()
  }, [])

  async function cargarConfiguracion() {
    setCargando(true)
    const datos = await obtenerConfiguracionEmpresa()

    if (datos) {
      setFormulario({
        nombre: datos.nombre || '',
        rtn: datos.rtn || '',
        telefono: datos.telefono || '',
        correo: datos.correo || '',
        direccion: datos.direccion || '',
        cai: datos.cai || '',
        fechaLimite: datos.fechaLimite || '',
        prefijo: datos.prefijo || '',
        rangoInicio: datos.rangoInicio || '',
        rangoFin: datos.rangoFin || '',
        correlativo: datos.correlativo || ''
      })
    }

    setCargando(false)
  }

  function actualizarCampo(campo, valor) {
    setFormulario((previo) => ({ ...previo, [campo]: valor }))
  }

  async function manejarGuardar(evento) {
    evento.preventDefault()
    setGuardando(true)
    setMensaje('')

    try {
      await actualizarDocumento('configuracion', 'empresa', formulario)
      setMensaje('Configuración actualizada correctamente')
    } catch (error) {
      setMensaje('Ocurrió un error al guardar los cambios')
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) {
    return <p className="text-aurea-text">Cargando configuración...</p>
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="font-display text-2xl text-aurea-goldDark">Configuración</h1>

      <form onSubmit={manejarGuardar} className="space-y-4">
        <div className="rounded-lg border border-aurea-border bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-display text-lg text-aurea-goldDark">Datos de la empresa</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-aurea-text">Nombre</label>
              <input
                type="text"
                value={formulario.nombre}
                onChange={(evento) => actualizarCampo('nombre', evento.target.value)}
                className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-aurea-text">RTN</label>
              <input
                type="text"
                value={formulario.rtn}
                onChange={(evento) => actualizarCampo('rtn', evento.target.value)}
                className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-aurea-text">Teléfono</label>
              <input
                type="text"
                value={formulario.telefono}
                onChange={(evento) => actualizarCampo('telefono', evento.target.value)}
                className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-aurea-text">Correo Electrónico</label>
              <input
                type="email"
                value={formulario.correo}
                onChange={(evento) => actualizarCampo('correo', evento.target.value)}
                className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-aurea-text">Dirección</label>
              <textarea
                rows={3}
                value={formulario.direccion}
                onChange={(evento) => actualizarCampo('direccion', evento.target.value)}
                className="w-full resize-none rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-aurea-border bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-display text-lg text-aurea-goldDark">Datos SAR (CAI)</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-aurea-text">Código CAI</label>
              <input
                type="text"
                value={formulario.cai}
                onChange={(evento) => actualizarCampo('cai', evento.target.value)}
                className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-aurea-text">Fecha límite de emisión</label>
              <input
                type="text"
                value={formulario.fechaLimite}
                onChange={(evento) => actualizarCampo('fechaLimite', evento.target.value)}
                placeholder="dd/mm/aaaa"
                className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-aurea-text">Prefijo de factura</label>
              <input
                type="text"
                value={formulario.prefijo}
                onChange={(evento) => actualizarCampo('prefijo', evento.target.value)}
                placeholder="000-001-01-"
                className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-aurea-text">Rango autorizado - inicio</label>
              <input
                type="text"
                value={formulario.rangoInicio}
                onChange={(evento) => actualizarCampo('rangoInicio', evento.target.value)}
                className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-aurea-text">Rango autorizado - fin</label>
              <input
                type="text"
                value={formulario.rangoFin}
                onChange={(evento) => actualizarCampo('rangoFin', evento.target.value)}
                className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-aurea-text">Correlativo actual</label>
              <input
                type="text"
                value={formulario.correlativo}
                onChange={(evento) => actualizarCampo('correlativo', evento.target.value)}
                className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none focus:border-aurea-gold"
              />
            </div>
          </div>

          <p className="mt-3 text-xs text-aurea-text/60">
            El correlativo actual avanza automáticamente cada vez que se emite una factura. Solo edítalo aquí si necesitas corregirlo manualmente o al registrar un nuevo CAI.
          </p>
        </div>

        {mensaje && (
          <div className="rounded-md border border-aurea-border bg-aurea-cream px-4 py-3 text-sm text-aurea-text">
            {mensaje}
          </div>
        )}

        <button
          type="submit"
          disabled={guardando}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-aurea-gold py-3 font-medium text-white transition hover:bg-aurea-goldDark active:scale-[0.99] disabled:opacity-60"
        >
          <FaSave />
          {guardando ? 'Guardando...' : 'Guardar Configuración'}
        </button>
      </form>
    </div>
  )
}