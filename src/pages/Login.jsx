import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wind, Loader2, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    supabase
      .from('usuarios')
      .select('*')
      .order('nombre')
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setUsuarios(data || [])
        setLoading(false)
      })
  }, [])

  const handleSelect = (usuario) => {
    login(usuario)
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-primary-medium to-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-xl mb-5">
            <Wind size={42} className="text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">UAP CRM</h1>
          <p className="text-blue-200 mt-2 text-lg">Universal Air Solutions S.L.</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-1">Selecciona tu usuario</h2>
          <p className="text-gray-500 mb-6 text-base">Elige tu perfil para acceder al CRM</p>

          {loading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={36} className="animate-spin text-primary" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4 text-sm">
              <strong>Error al conectar:</strong> {error}
              <p className="mt-1 text-xs text-red-500">Verifica que las tablas existen en Supabase (schema.sql)</p>
            </div>
          )}

          <div className="space-y-3">
            {usuarios.map((u) => (
              <button
                key={u.id}
                onClick={() => handleSelect(u)}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-100 hover:border-primary hover:bg-primary-light transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                  {u.nombre?.charAt(0)?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800 text-lg group-hover:text-primary-dark">
                    {u.nombre}
                  </div>
                  {u.email && (
                    <div className="text-sm text-gray-400">{u.email}</div>
                  )}
                </div>
                <ChevronRight size={20} className="text-gray-300 group-hover:text-primary transition-colors" />
              </button>
            ))}
          </div>

          {!loading && !error && usuarios.length === 0 && (
            <div className="text-center py-6">
              <p className="text-gray-500">No hay usuarios en la base de datos.</p>
              <p className="text-sm text-gray-400 mt-1">Ejecuta el schema.sql en Supabase primero.</p>
            </div>
          )}
        </div>

        <p className="text-center text-blue-200/60 text-sm mt-6">
          Universal Air Solutions S.L. &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
