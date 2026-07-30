import { FaBars, FaSignOutAlt } from 'react-icons/fa'
import { useAuth } from '../../context/AuthContext'
import { cerrarSesion } from '../../firebase/auth.service'
import { useNavigate } from 'react-router-dom'

export default function Topbar({ alAbrirMenu }) {
  const { perfil } = useAuth()
  const navegar = useNavigate()

  async function manejarSalir() {
    await cerrarSesion()
    navegar('/login')
  }

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-aurea-border bg-white/95 px-4 py-3 backdrop-blur-sm lg:px-8">
      <button
        onClick={alAbrirMenu}
        className="rounded-md p-2 text-aurea-goldDark transition hover:bg-aurea-cream lg:hidden"
        aria-label="Abrir menú"
      >
        <FaBars size={20} />
      </button>

      <div className="flex flex-1 items-center justify-end gap-4">
        <span className="hidden text-sm text-aurea-text sm:inline">{perfil?.correo}</span>
        <button
          onClick={manejarSalir}
          className="flex items-center gap-2 rounded-md bg-aurea-goldDark px-4 py-2 text-sm text-white transition hover:bg-aurea-gold active:scale-95"
        >
          <FaSignOutAlt />
          Salir
        </button>
      </div>
    </header>
  )
}