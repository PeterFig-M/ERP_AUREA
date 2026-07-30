import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Sidebar from './components/layout/Sidebar'
import Topbar from './components/layout/Topbar'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import Citas from './pages/citas/Citas'
import Factura from './pages/factura/Factura'
import HistorialFactura from './pages/factura/HistorialFactura'
import Cotizacion from './pages/cotizacion/Cotizacion'
import HistorialCotizacion from './pages/cotizacion/HistorialCotizacion'
import IngresarPaciente from './pages/pacientes/IngresarPaciente'
import Pacientes from './pages/pacientes/Pacientes'
import Expediente from './pages/pacientes/Expediente'
import Doctores from './pages/doctores/Doctores'
import Inventario from './pages/inventario/Inventario'
import AtencionPacientes from './pages/atencion/AtencionPacientes'
import Cobros from './pages/cobros/Cobros'
import Finanzas from './pages/finanzas/Finanzas'
import Configuracion from './pages/configuracion/Configuracion'

function LayoutPrivado({ children }) {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const ubicacion = useLocation()

  return (
    <div className="flex min-h-screen bg-aurea-cream">
      <Sidebar abierto={menuAbierto} alCerrar={() => setMenuAbierto(false)} />
      <div className="flex flex-1 flex-col">
        <Topbar alAbrirMenu={() => setMenuAbierto(true)} />
        <main key={ubicacion.pathname} className="flex-1 overflow-y-auto p-4 animate-fadeInUp lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Register />} />

          <Route path="/citas" element={
            <ProtectedRoute><LayoutPrivado><Citas /></LayoutPrivado></ProtectedRoute>
          } />
          <Route path="/factura" element={
            <ProtectedRoute><LayoutPrivado><Factura /></LayoutPrivado></ProtectedRoute>
          } />
          <Route path="/historial-factura" element={
            <ProtectedRoute requiereAdmin><LayoutPrivado><HistorialFactura /></LayoutPrivado></ProtectedRoute>
          } />
          <Route path="/cotizacion" element={
            <ProtectedRoute><LayoutPrivado><Cotizacion /></LayoutPrivado></ProtectedRoute>
          } />
          <Route path="/historial-cotizacion" element={
            <ProtectedRoute requiereAdmin><LayoutPrivado><HistorialCotizacion /></LayoutPrivado></ProtectedRoute>
          } />
          <Route path="/ingresar-paciente" element={
            <ProtectedRoute><LayoutPrivado><IngresarPaciente /></LayoutPrivado></ProtectedRoute>
          } />
          <Route path="/pacientes" element={
            <ProtectedRoute><LayoutPrivado><Pacientes /></LayoutPrivado></ProtectedRoute>
          } />
          <Route path="/expediente/:id" element={
            <ProtectedRoute><LayoutPrivado><Expediente /></LayoutPrivado></ProtectedRoute>
          } />
          <Route path="/inventario" element={
            <ProtectedRoute requiereAdmin><LayoutPrivado><Inventario /></LayoutPrivado></ProtectedRoute>
          } />
          <Route path="/finanzas" element={
            <ProtectedRoute requiereAdmin><LayoutPrivado><Finanzas /></LayoutPrivado></ProtectedRoute>
          } />
          <Route path="/atencion-pacientes" element={
            <ProtectedRoute><LayoutPrivado><AtencionPacientes /></LayoutPrivado></ProtectedRoute>
          } />
          <Route path="/cobros" element={
            <ProtectedRoute requiereAdmin><LayoutPrivado><Cobros /></LayoutPrivado></ProtectedRoute>
          } />
          <Route path="/doctores" element={
            <ProtectedRoute requiereAdmin><LayoutPrivado><Doctores /></LayoutPrivado></ProtectedRoute>
          } />
          <Route path="/configuracion" element={
            <ProtectedRoute requiereAdmin><LayoutPrivado><Configuracion /></LayoutPrivado></ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/citas" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}