import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, LogOut, Wind, Briefcase, Package } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/crm', icon: Users, label: 'CRM' },
    { to: '/proyectos', icon: Briefcase, label: 'Proyectos' },
    { to: '/materiales', icon: Package, label: 'Catálogo' },
  ]

  return (
    <div className="flex flex-col h-full bg-primary-dark text-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-blue-900">
        <div className="bg-primary rounded-xl p-2 shadow-lg">
          <Wind size={26} className="text-white" />
        </div>
        <div>
          <div className="font-bold text-lg leading-tight tracking-wide">UAP CRM</div>
          <div className="text-xs text-blue-300 leading-tight">Universal Air Solutions</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-all ${
                isActive
                  ? 'bg-primary text-white shadow-md'
                  : 'text-blue-200 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User info & logout */}
      <div className="px-4 py-4 border-t border-blue-900">
        <div className="flex items-center gap-3 px-4 py-3 mb-1">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center font-bold text-base shadow-md flex-shrink-0">
            {user?.nombre?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{user?.nombre}</div>
            <div className="text-xs text-blue-300 truncate">{user?.email || 'Comercial UAP'}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-blue-200 hover:bg-white/10 hover:text-white transition-all text-base"
        >
          <LogOut size={20} />
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
