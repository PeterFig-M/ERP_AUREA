import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, requiereAdmin = false }) {
  const { usuario, esAdmin, cargando } = useAuth()

  if (cargando) {
    return (
      <div className="flex h-screen items-center justify-center bg-aurea-cream">
        <p className="text-aurea-goldDark">Cargando...</p>
      </div>
    )
  }

  if (!usuario) {
    return <Navigate to="/login" replace />
  }

  if (requiereAdmin && !esAdmin) {
    return <Navigate to="/factura" replace />
  }

  return children
}