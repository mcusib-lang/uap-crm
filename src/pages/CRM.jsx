import { useState, useEffect, useRef } from 'react'
import { LayoutGrid, List, Plus, Loader2, RefreshCw, Search, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import KanbanBoard, { ESTADOS } from '../components/KanbanBoard'
import ContactList from '../components/ContactList'
import NewContactModal from '../components/NewContactModal'
import FilterBar, { DEFAULT_FILTROS } from '../components/FilterBar'

function loadFiltros() {
  try {
    const saved = localStorage.getItem('uap_filtros')
    if (saved) {
      const p = JSON.parse(saved)
      if (typeof p.soloActivos === 'boolean' && Array.isArray(p.estados)) return p
    }
  } catch {}
  return DEFAULT_FILTROS
}

export default function CRM() {
  const [vista, setVista] = useState('kanban')
  const [contactos, setContactos] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filtros, setFiltros] = useState(loadFiltros)
  const [busqueda, setBusqueda] = useState('')
  const searchRef = useRef(null)

  // Persistir filtros
  useEffect(() => {
    localStorage.setItem('uap_filtros', JSON.stringify(filtros))
  }, [filtros])

  // Ctrl+K → foco en buscador
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const fetchData = async () => {
    const [contsRes, usersRes] = await Promise.all([
      supabase.from('contactos').select('*').order('created_at', { ascending: false }),
      supabase.from('usuarios').select('*').order('nombre'),
    ])
    const users = usersRes.data || []
    const usersMap = users.reduce((acc, u) => ({ ...acc, [u.id]: u }), {})
    const conts = (contsRes.data || []).map(c => ({
      ...c,
      responsable_nombre: c.responsable_id ? usersMap[c.responsable_id]?.nombre || null : null,
    }))
    setContactos(conts)
    setUsuarios(users)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  // Aplicar filtros + búsqueda
  const contactosFiltrados = contactos.filter(c => {
    // Toggle: ocultar "Nuevo Lead" sin interacciones
    if (filtros.soloActivos && c.estado === 'Nuevo Lead' && !c.fecha_ultimo_contacto) return false

    // Responsable
    if (filtros.responsable && c.responsable_id !== filtros.responsable) return false

    // Segmento
    if (filtros.segmento && c.segmento !== filtros.segmento) return false

    // Estado
    if (filtros.estados.length > 0 && !filtros.estados.includes(c.estado)) return false

    // Búsqueda (mínimo 2 caracteres)
    if (busqueda.length >= 2) {
      const q = busqueda.toLowerCase()
      const campos = [c.nombre, c.empresa, c.email, c.telefono, c.ciudad, c.provincia, c.subsector, c.notas]
      if (!campos.some(f => f?.toLowerCase().includes(q))) return false
    }

    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-96">
        <Loader2 size={40} className="animate-spin text-primary" />
      </div>
    )
  }

  const sinResultados = contactosFiltrados.length === 0

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary-dark">CRM Comercial</h1>
          <p className="text-gray-500 mt-1">{contactos.length} contactos en base de datos</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors"
            title="Actualizar datos"
          >
            <RefreshCw size={18} />
          </button>
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setVista('kanban')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                vista === 'kanban' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <LayoutGrid size={16} />Kanban
            </button>
            <button
              onClick={() => setVista('lista')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                vista === 'lista' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <List size={16} />Lista
            </button>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-primary hover:bg-primary-medium text-white px-5 py-2.5 rounded-xl font-bold transition-colors text-base shadow-sm"
          >
            <Plus size={20} />Nuevo Contacto
          </button>
        </div>
      </div>

      {/* Buscador global */}
      <div className="relative mb-4">
        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          ref={searchRef}
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, empresa, email, teléfono, ciudad...  (Ctrl+K)"
          className="w-full border-2 border-gray-200 rounded-2xl pl-12 pr-12 py-4 text-base focus:outline-none focus:border-primary transition-colors shadow-sm bg-white"
        />
        {busqueda ? (
          <button
            onClick={() => setBusqueda('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            title="Limpiar búsqueda"
          >
            <X size={18} className="text-gray-400" />
          </button>
        ) : (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-300 font-mono select-none hidden sm:block">
            Ctrl+K
          </span>
        )}
      </div>

      {/* Barra de filtros */}
      <div className="mb-5">
        <FilterBar
          usuarios={usuarios}
          filtros={filtros}
          onChange={setFiltros}
          totalContactos={contactos.length}
          totalFiltrados={contactosFiltrados.length}
          busqueda={busqueda}
        />
      </div>

      {/* Sin resultados */}
      {sinResultados && (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
          <Search size={44} className="mx-auto mb-4 text-gray-200" />
          {busqueda.length >= 2 ? (
            <>
              <p className="text-gray-600 text-xl font-bold mb-1">
                Sin resultados para "{busqueda}"
              </p>
              <p className="text-gray-400 mb-5">
                No se encontraron contactos que coincidan con tu búsqueda
              </p>
              <button
                onClick={() => setBusqueda('')}
                className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-medium transition-colors"
              >
                Limpiar búsqueda
              </button>
            </>
          ) : (
            <>
              <p className="text-gray-600 text-xl font-bold mb-1">Sin contactos</p>
              <p className="text-gray-400">Ningún contacto coincide con los filtros activos</p>
            </>
          )}
        </div>
      )}

      {/* Contenido */}
      {!sinResultados && (
        vista === 'kanban' ? (
          <KanbanBoard contactos={contactosFiltrados} busqueda={busqueda} />
        ) : (
          <ContactList contactos={contactosFiltrados} usuarios={usuarios} busqueda={busqueda} />
        )
      )}

      {showModal && (
        <NewContactModal
          usuarios={usuarios}
          onClose={() => setShowModal(false)}
          onCreated={fetchData}
        />
      )}
    </div>
  )
}
