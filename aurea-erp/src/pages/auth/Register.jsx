import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registrarUsuario } from '../../firebase/auth.service'

export default function Register() {
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const navegar = useNavigate()

  async function manejarEnvio(evento) {
    evento.preventDefault()
    setError('')
    setCargando(true)

    try {
      await registrarUsuario({ nombre, telefono, correo, password })
      navegar('/factura')
    } catch (errorRegistro) {
      setError(errorRegistro.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-aurea-cream px-4">
      <div className="w-full max-w-md animate-fadeInUp rounded-lg border border-aurea-border bg-white p-8 shadow-lg">
        <div className="mb-8 flex flex-col items-center rounded-md bg-aurea-goldDark px-6 py-6">
          <img src="/logo-amplio.png" alt="Aurea Dental Clinic" className="h-16 object-contain" />
        </div>

        <form onSubmit={manejarEnvio} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-aurea-text">Nombre completo</label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(evento) => setNombre(evento.target.value)}
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none transition focus:border-aurea-gold focus:ring-2 focus:ring-aurea-gold/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-aurea-text">Número de teléfono</label>
            <input
              type="tel"
              required
              value={telefono}
              onChange={(evento) => setTelefono(evento.target.value)}
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none transition focus:border-aurea-gold focus:ring-2 focus:ring-aurea-gold/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-aurea-text">Correo (@aureadentalc.com)</label>
            <input
              type="email"
              required
              value={correo}
              onChange={(evento) => setCorreo(evento.target.value)}
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none transition focus:border-aurea-gold focus:ring-2 focus:ring-aurea-gold/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-aurea-text">Contraseña</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(evento) => setPassword(evento.target.value)}
              className="w-full rounded-md border border-aurea-border px-3 py-2 outline-none transition focus:border-aurea-gold focus:ring-2 focus:ring-aurea-gold/20"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-md bg-aurea-gold py-2 font-medium text-white transition hover:bg-aurea-goldDark active:scale-[0.99] disabled:opacity-60"
          >
            {cargando ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-aurea-text">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-medium text-aurea-goldDark hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  )
}