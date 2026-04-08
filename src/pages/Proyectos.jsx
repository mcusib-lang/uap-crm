import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Loader2, RefreshCw, AlertTriangle, Calendar, User, TrendingUp, Package } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { ESTADOS_PROYECTO } from '../lib/proyectoFases'
import NuevoProyectoModal from '../components/NuevoProyectoModal'

const COLUMN_STYLES = {
  'anteproyecto':      { border: 'border-gray-300',   bg: 'bg-gray-50',    header: 'text-gray-600' },
  'visita_tecnica':    { border: 'border-blue-300',    bg: 'bg-blue-50',    header: 'text-blue-700' },
  'propuesta_enviada': { border: 'border-indigo-300',  bg: 'bg-indigo-50',  header: 'text-indigo-700' },
  'piloto_activo':     { border: 'border-purple-300',  bg: 'bg-purple-50',  header: 'text-purple-700' },
  'fabricacion':       { border: 'border-orange-300',  bg: 'bg-orange-50',  header: 'text-orange-700' },
  'instalacion':       { border: 'border-pink-300',    bg: 'bg-pink-50',    header: 'text-pink-700' },
  'puesta_en_marcha':  { border: 'border-cyan-300',    bg: 'bg-cyan-50',    header: 'text-cyan-700' },
  'post_venta':        { border: 'border-teal-300',    bg: 'bg-teal-50',    header: 'text-teal-700' },
  'mantenimiento':     { border: 'border-yellow-300',  bg: 'bg-yellow-50',  header: 'text-yellow-700' },
  'cerrado':           { border: 'border-green-300',   bg: 'bg-green-50',   header: 'text-green-700' },
}

function toNum(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n }

function Avatar({ nombre, size = 7 }) {
  if (!nombre) return null
  return (
    <div className={`w-${size} h-${size} rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}
      title={nombre}>
      {nombre.charAt(0).toUpperCase()}
    </div>
  )
}

function ProyectoCard({ proyecto, usuariosMap, contactosMap, fasesMap, materialesMap }) {
  const navigate = useNavigate()
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)

  const fases = fasesMap[proyecto.id] || []
  const totalFases = fases.length
  const completadas = fases.filter(f => f.completada).length
  const progreso = totalFases > 0 ? Math.round(completadas / totalFases * 100) : 0

  const diasRestantes = proyecto.fecha_entrega_estimada
    ? Math.ceil((new Date(proyecto.fecha_entrega_estimada) - hoy) / 86400000)
    : null

  const valorVenta = toNum(proyecto.valor_venta)
  const costeEst = toNum(proyecto.coste_estimado)
  const margen = valorVenta > 0 && costeEst > 0
    ? Math.round((valorVenta - costeEst) / valorVenta * 100)
    : null

  const materiales = materialesMap[proyecto.id] || []
  const tieneRetraso = materiales.some(m =>
    m.estado !== 'recibido' && m.estado !== 'cancelado' &&
    m.fecha_entrega_estimada && new Date(m.fecha_entrega_estimada) < hoy
  )

  const cliente = contactosMap[proyecto.cliente_id]
  const respComercial = usuariosMap[proyecto.responsable_comercial]
  const respTecnico = usuariosMap[proyecto.responsable_tecnico]

  return (
    <div
      onClick={() => navigate(`/proyectos/${proyecto.id}`)}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 cursor-pointer hover:shadow-md hover:border-primary transition-all"
    >
      {/* Alerta retraso */}
      {tieneRetraso && (
        <div className="flex items-center gap-1.5 bg-red-50 text-red-700 text-xs font-bold px-2.5 py-1.5 rounded-lg mb-2.5 border border-red-100">
          <AlertTriangle size={12} />
          Material con retraso
        </div>
      )}

      {/* Nombre + cliente */}
      <div className="mb-2">
        <div className="font-bold text-gray-900 text-base leading-snug">{proyecto.nombre}</div>
        {cliente && (
          <div className="text-sm text-gray-500 mt-0.5 truncate">{cliente.empresa || cliente.nombre}</div>
        )}
      </div>

      {/* Badge tipo */}
      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold mb-2.5 ${
        proyecto.tipo === 'piloto'
          ? 'bg-purple-100 text-purple-800'
          : proyecto.tipo === 'proyecto_final'
          ? 'bg-blue-100 text-blue-800'
          : 'bg-gray-100 text-gray-700'
      }`}>
        {proyecto.tipo === 'piloto' ? 'PILOTO' : proyecto.tipo === 'proyecto_final' ? 'PROYECTO FINAL' : (proyecto.tipo ?? '').toUpperCase()}
      </span>

      {/* Modelo + unidades */}
      {proyecto.modelo_uap && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
          <Package size={11} />
          <span>UAP {proyecto.modelo_uap} · {proyecto.num_unidades} ud.</span>
        </div>
      )}

      {/* Progreso */}
      {totalFases > 0 && (
        <div className="mb-2.5">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>{completadas}/{totalFases} fases</span>
            <span className="font-bold text-gray-600">{progreso}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className="bg-primary rounded-full h-1.5 transition-all"
              style={{ width: `${progreso}%` }}
            />
          </div>
        </div>
      )}

      {/* Fecha entrega */}
      {diasRestantes !== null && (
        <div className={`flex items-center gap-1.5 text-xs font-medium mb-2 ${
          diasRestantes < 0 ? 'text-red-600' : diasRestantes < 7 ? 'text-red-500' : 'text-gray-400'
        }`}>
          <Calendar size={11} />
          {diasRestantes < 0
            ? `Vencido hace ${Math.abs(diasRestantes)}d`
            : diasRestantes === 0
            ? 'Entrega hoy'
            : `${diasRestantes} días para entrega`}
        </div>
      )}

      {/* Responsables */}
      {(respComercial || respTecnico) && (
        <div className="flex items-center gap-1.5 mb-2">
          {respComercial && <Avatar nombre={respComercial.nombre} />}
          {respTecnico && respTecnico.id !== respComercial?.id && <Avatar nombre={respTecnico.nombre} />}
          <span className="text-xs text-gray-400 truncate">
            {[respComercial?.nombre, respTecnico?.nombre !== respComercial?.nombre && respTecnico?.nombre]
              .filter(Boolean).join(' · ')}
          </span>
        </div>
      )}

      {/* Valor + Margen */}
      {valorVenta > 0 && (
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
          <span className="text-sm font-bold text-gray-700">
            {valorVenta.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €
          </span>
          {margen !== null && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              margen >= 30 ? 'bg-green-100 text-green-700'
              : margen >= 15 ? 'bg-orange-100 text-orange-700'
              : 'bg-red-100 text-red-600'
            }`}>
              {margen}% margen
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default function Proyectos() {
  const navigate = useNavigate()
  const [proyectos, setProyectos] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [contactos, setContactos] = useState([])
  const [fases, setFases] = useState([])
  const [materiales, setMateriales] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const fetchData = async () => {
    const [pRes, uRes, cRes, fRes, mRes] = await Promise.all([
      supabase.from('proyectos').select('*').order('created_at', { ascending: false }),
      supabase.from('usuarios').select('*'),
      supabase.from('contactos').select('id, nombre, empresa'),
      supabase.from('fases_proyecto').select('proyecto_id, completada'),
      supabase.from('proyecto_materiales').select('proyecto_id, estado, fecha_entrega_estimada'),
    ])
    setProyectos(pRes.data || [])
    setUsuarios(uRes.data || [])
    setContactos(cRes.data || [])
    setFases(fRes.data || [])
    setMateriales(mRes.data || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const usuariosMap = usuarios.reduce((a, u) => ({ ...a, [u.id]: u }), {})
  const contactosMap = contactos.reduce((a, c) => ({ ...a, [c.id]: c }), {})
  const fasesMap = fases.reduce((a, f) => {
    a[f.proyecto_id] = [...(a[f.proyecto_id] || []), f]; return a
  }, {})
  const materialesMap = materiales.reduce((a, m) => {
    a[m.proyecto_id] = [...(a[m.proyecto_id] || []), m]; return a
  }, {})

  const grouped = ESTADOS_PROYECTO.reduce((acc, { value }) => {
    acc[value] = proyectos.filter(p => p.estado === value); return acc
  }, {})

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-96">
        <Loader2 size={40} className="animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary-dark">Proyectos</h1>
          <p className="text-gray-500 mt-1">{proyectos.length} proyectos en total</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchData}
            className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors" title="Actualizar">
            <RefreshCw size={18} />
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-primary hover:bg-primary-medium text-white px-5 py-2.5 rounded-xl font-bold transition-colors text-base shadow-sm">
            <Plus size={20} />Nuevo Proyecto
          </button>
        </div>
      </div>

      {/* Kanban horizontal */}
      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin" style={{ minHeight: '70vh' }}>
        {ESTADOS_PROYECTO.map(({ value, label }) => {
          const style = COLUMN_STYLES[value] || COLUMN_STYLES['anteproyecto']
          const items = grouped[value]
          const collapsed = items.length === 0

          if (collapsed) {
            return (
              <div key={value}
                className={`flex-shrink-0 w-12 rounded-2xl border-2 ${style.border} ${style.bg} flex flex-col items-center py-4 gap-2`}
                title={`${label} (vacío)`}>
                <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center bg-white/80 shadow-sm ${style.header} opacity-60`}>0</span>
                <span className={`text-xs font-bold ${style.header} opacity-40 select-none`}
                  style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', maxHeight: 140, overflow: 'hidden' }}>
                  {label}
                </span>
              </div>
            )
          }

          return (
            <div key={value}
              className={`flex-shrink-0 w-[268px] rounded-2xl border-2 ${style.border} ${style.bg} flex flex-col overflow-hidden`}>
              <div className="px-4 py-3 flex items-center justify-between flex-shrink-0">
                <span className={`font-bold text-sm ${style.header}`}>{label}</span>
                <span className="bg-white/80 text-gray-600 text-xs font-bold rounded-full px-2 py-0.5 shadow-sm">{items.length}</span>
              </div>
              <div className="flex-1 px-3 pb-3 space-y-2.5 overflow-y-auto scrollbar-thin">
                {items.map(p => (
                  <ProyectoCard
                    key={p.id} proyecto={p}
                    usuariosMap={usuariosMap} contactosMap={contactosMap}
                    fasesMap={fasesMap} materialesMap={materialesMap}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {showModal && (
        <NuevoProyectoModal
          usuarios={usuarios}
          onClose={() => setShowModal(false)}
          onCreated={(id) => { fetchData(); navigate(`/proyectos/${id}`) }}
        />
      )}
    </div>
  )
}
