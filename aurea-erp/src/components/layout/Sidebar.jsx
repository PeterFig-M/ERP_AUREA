import { NavLink } from 'react-router-dom'
import {
  FaFileInvoice,
  FaHistory,
  FaFileAlt,
  FaUserPlus,
  FaUsers,
  FaBoxOpen,
  FaChartLine,
  FaStethoscope,
  FaHandHoldingUsd,
  FaUserMd,
  FaCog,
  FaCalendarAlt
} from 'react-icons/fa'
import { useAuth } from '../../context/AuthContext'

const enlaces = [
  { ruta: '/citas', etiqueta: 'Citas', icono: FaCalendarAlt, admin: false },
  { ruta: '/factura', etiqueta: 'Factura', icono: FaFileInvoice, admin: false },
  { ruta: '/historial-factura', etiqueta: 'Historial Ingresos', icono: FaHistory, admin: true },
  { ruta: '/cotizacion', etiqueta: 'Cotización', icono: FaFileAlt, admin: false },
  { ruta: '/historial-cotizacion', etiqueta: 'Historial Cotización', icono: FaHistory, admin: true },
  { ruta: '/ingresar-paciente', etiqueta: 'Ingresar Paciente', icono: FaUserPlus, admin: false },
  { ruta: '/pacientes', etiqueta: 'Pacientes', icono: FaUsers, admin: false },
  { ruta: '/inventario', etiqueta: 'Inventario', icono: FaBoxOpen, admin: true },
  { ruta: '/finanzas', etiqueta: 'Finanzas', icono: FaChartLine, admin: true },
  { ruta: '/atencion-pacientes', etiqueta: 'Atención Pacientes', icono: FaStethoscope, admin: false },
  { ruta: '/cobros', etiqueta: 'Cobros', icono: FaHandHoldingUsd, admin: true },
  { ruta: '/doctores', etiqueta: 'Doctores', icono: FaUserMd, admin: true },
  { ruta: '/configuracion', etiqueta: 'Configuración', icono: FaCog, admin: true }
]

export default function Sidebar({ abierto, alCerrar }) {
  const { esAdmin } = useAuth()

  return (
    <>
      {abierto && (
        <div
          onClick={alCerrar}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden animate-fadeIn"
        />
      )}

      <aside
        className={`fixed z-40 flex h-screen w-72 flex-col bg-white shadow-xl transition-transform duration-300 ease-out lg:static lg:translate-x-0 lg:shadow-none lg:border-r lg:border-aurea-border ${
          abierto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-center border-b border-aurea-border px-6 py-8">
          <img src="/logo-amplio.png" alt="Aurea Dental Clinic" className="h-16 object-contain" />
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          {enlaces
            .filter((enlace) => !enlace.admin || esAdmin)
            .map((enlace, indice) => {
              const Icono = enlace.icono
              return (
                <NavLink
                  key={enlace.ruta}
                  to={enlace.ruta}
                  onClick={alCerrar}
                  style={{ animationDelay: `${indice * 30}ms` }}
                  className={({ isActive }) =>
                    `flex animate-slideInLeft items-center gap-3 rounded-md px-4 py-3 text-sm font-medium transition-colors duration-200 ${
                      isActive
                        ? 'bg-aurea-gold text-white shadow-sm'
                        : 'text-aurea-goldDark hover:bg-aurea-cream'
                    }`
                  }
                >
                  <Icono className="text-base shrink-0" />
                  <span className="truncate">{enlace.etiqueta}</span>
                </NavLink>
              )
            })}
        </nav>

        <div className="border-t border-aurea-border px-6 py-4 text-center text-xs text-aurea-goldDark/60">
          Aurea Dental Clinic ERP © 2026
        </div>
      </aside>
    </>
  )
}