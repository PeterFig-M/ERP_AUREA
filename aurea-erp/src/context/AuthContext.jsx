import { createContext, useContext, useEffect, useState } from 'react'
import { suscribirEstadoAuth, obtenerPerfilUsuario } from '../firebase/auth.service'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const desuscribir = suscribirEstadoAuth(async (usuarioActual) => {
      if (usuarioActual) {
        const datosPerfil = await obtenerPerfilUsuario(usuarioActual.uid)
        setUsuario(usuarioActual)
        setPerfil(datosPerfil)
      } else {
        setUsuario(null)
        setPerfil(null)
      }
      setCargando(false)
    })

    return () => desuscribir()
  }, [])

  const esAdmin = perfil?.rol === 'admin'

  return (
    <AuthContext.Provider value={{ usuario, perfil, esAdmin, cargando }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}