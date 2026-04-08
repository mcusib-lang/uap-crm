import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, TrendingUp, UserCheck, Euro,
  AlertTriangle, Bell, Loader2, ArrowRight,
  X, ExternalLink, Target
} from 'lucide-react'
import { supabase } from '../lib/supabase'

const UMBRALES = {
  industrial: 7,
  itv: 7,
  otros: 7,
  ayuntamiento: 14,
}

const ESTADO_COLORS = {
  'Nuevo Lead':        'bg-gray-100 text-gray-700',
  'Contactado':        'bg-blue-100 text-blue-700',
  'En conversación':   'bg-indigo-100 text-indigo-700',
  'Propuesta enviada': 'bg-purple-100 text-purple-700',
  'Reunión agendada':  'bg-pink-100 text-pink-700',
  'Negociación':       'bg-orange-100 text-orange-700',
  'Cliente':           'bg-green-100 text-green-700',
  'Stand by':          'bg-yellow-100 text-yellow-700',
  'Descartado':        'bg-red-100 text-red-600',
}

const ESTADOS_NEGOCIACION = ['Negociación', 'Propuesta enviada', 'Reunión agendada']

function hoyMidnight() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function toNum(v) {
  const n = parseFloat(v)
  return isNaN(n) ? 0 : n
}

function fmtEur(v) {
  const n = toNum(v)
  if (n <= 0) return '—'
  return n.toLocaleString('es-ES', { maximumFractionDigits: 0 }) + ' €'
}

// ── Barra de probabilidad ──────────────────────────────────────────────────
function ProbBar({ prob }) {
  const p = toNum(prob)
  if (p <= 0) return <span className="text-gray-300 text-sm font-medium">—</span>
  const color = p >= 70 ? 'bg-green-500' : p >= 40 ? 'bg-orange-400' : 'bg-red-500'
  const textColor = p >= 70 ? 'text-green-700' : p >= 40 ? 'text-orange-600' : 'text-red-600'
  return (
    <div className="flex items-center gap-2 min-w-28">
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all`}
          style={{ width: `${Math.min(p, 100)}%` }}
        />
      </div>
      <span className={`text-sm font-bold ${textColor} w-9 text-right flex-shrink-0`}>{p}%</span>
    </div>
  )
}

// ── Modal de contactos por KPI ─────────────────────────────────────────────
function KpiModal({ titulo, icono: Icono, contactos, usuariosMap, onClose }) {
  const navigate = useNavigate()

  const ir = (id) => { onClose(); navigate(`/contacto/${id}`) }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            {Icono && <Icono size={22} className="text-primary" />}
            <div>
              <h2 className="text-lg font-bold text-primary-dark">{titulo}</h2>
              <p className="text-sm text-gray-400">{contactos.length} contacto{contactos.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 divide-y divide-gray-50 scrollbar-thin">
          {contactos.length === 0 ? (
            <p className="text-center text-gray-400 py-12">Sin contactos en esta categoría</p>
          ) : (
            contactos.map(c => {
              const resp = usuariosMap[c.responsable_id]
              const valor = toNum(c.valor_estimado)
              return (
                <div key={c.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-800 truncate">{c.nombre}</div>
                    <div className="text-sm text-gray-500 truncate">{c.empresa}</div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${ESTADO_COLORS[c.estado] || 'bg-gray-100 text-gray-600'}`}>
                        {c.estado}
                      </span>
                      {resp && <span className="text-xs text-gray-400">{resp.nombre}</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {valor > 0 && (
                      <div className="text-base font-bold text-gray-700">
                        {valor.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €
                      </div>
                    )}
                    <button
                      onClick={() => ir(c.id)}
                      className="mt-1 flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-dark transition-colors"
                    >
                      Ver ficha <ExternalLink size={11} />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

// ── Dashboard ──────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [contactos, setContactos] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      supabase.from('contactos').select('*'),
      supabase.from('usuarios').select('*'),
    ]).then(([{ data: conts }, { data: users }]) => {
      setContactos(conts || [])
      setUsuarios(users || [])
      setLoading(false)
    })
  }, [])

  const usuariosMap = usuarios.reduce((acc, u) => ({ ...acc, [u.id]: u }), {})

  const hoy = hoyMidnight()

  // ── KPI lists ──
  // Leads Activos: todos excepto Descartados
  const leadsActivosList = contactos.filter(c => c.estado !== 'Descartado')

  // En Negociación: Negociación + Propuesta enviada + Reunión agendada
  const negociacionList = contactos.filter(c => ESTADOS_NEGOCIACION.includes(c.estado))

  // Clientes activos
  const clientesList = contactos.filter(c => c.estado === 'Cliente')

  // Pipeline: todos excepto Descartados con valor > 0 ordenado desc
  const pipelineList = contactos
    .filter(c => c.estado !== 'Descartado' && toNum(c.valor_estimado) > 0)
    .sort((a, b) => toNum(b.valor_estimado) - toNum(a.valor_estimado))

  // Valor pipeline = suma todos excepto Descartados
  const valorPipeline = contactos
    .filter(c => c.estado !== 'Descartado')
    .reduce((sum, c) => sum + toNum(c.valor_estimado), 0)

  // ── Proyectos en negociación activa ──
  const proyectosActivos = contactos
    .filter(c => ESTADOS_NEGOCIACION.includes(c.estado) && toNum(c.valor_estimado) > 0)
    .sort((a, b) => toNum(b.valor_estimado) - toNum(a.valor_estimado))

  const valorPonderado = proyectosActivos
    .filter(c => toNum(c.probabilidad_cierre) > 0)
    .reduce((sum, c) => sum + toNum(c.valor_estimado) * toNum(c.probabilidad_cierre) / 100, 0)

  // ── Alertas rojas: acción vencida ──
  const alertasRojas = leadsActivosList.filter(c => {
    if (!c.fecha_proxima_accion) return false
    return new Date(c.fecha_proxima_accion) <= hoy
  })

  // ── Alertas naranjas: sin contacto reciente ──
  const idsRojos = new Set(alertasRojas.map(c => c.id))
  const alertasNaranjas = leadsActivosList.filter(c => {
    if (idsRojos.has(c.id)) return false
    const umbral = UMBRALES[c.segmento] || 7
    const ref = c.fecha_ultimo_contacto || c.created_at
    if (!ref) return false
    return Math.floor((hoy - new Date(ref)) / 86400000) > umbral
  })

  const kpis = [
    {
      key: 'leads',
      label: 'Leads Activos',
      value: leadsActivosList.length,
      icon: Users,
      bg: 'bg-blue-50', text: 'text-primary', border: 'border-l-primary',
      lista: leadsActivosList,
    },
    {
      key: 'negociacion',
      label: 'En Negociación / Propuesta',
      value: negociacionList.length,
      icon: TrendingUp,
      bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-l-purple-500',
      lista: negociacionList,
    },
    {
      key: 'clientes',
      label: 'Clientes Activos',
      value: clientesList.length,
      icon: UserCheck,
      bg: 'bg-green-50', text: 'text-green-600', border: 'border-l-green-500',
      lista: clientesList,
    },
    {
      key: 'pipeline',
      label: 'Valor Pipeline',
      value: valorPipeline > 0
        ? valorPipeline.toLocaleString('es-ES', { maximumFractionDigits: 0 }) + ' €'
        : '0 €',
      icon: Euro,
      bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-l-amber-500',
      lista: pipelineList,
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-96">
        <Loader2 size={40} className="animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary-dark">Dashboard</h1>
        <p className="text-gray-500 mt-1 text-base">
          Resumen comercial UAP —{' '}
          {new Date().toLocaleDateString('es-ES', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
        {kpis.map(({ key, label, value, icon: Icon, bg, text, border, lista }) => (
          <button
            key={key}
            onClick={() => setModal({ titulo: label, icono: Icon, contactos: lista })}
            className={`bg-white rounded-2xl shadow-sm border-l-4 ${border} p-6 text-left hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group w-full`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-500 font-medium text-sm">{label}</span>
              <div className={`p-2.5 rounded-xl ${bg} group-hover:scale-110 transition-transform`}>
                <Icon size={22} className={text} />
              </div>
            </div>
            <div className="text-4xl font-bold text-gray-800 tracking-tight">{value}</div>
            <div className="text-xs text-gray-300 mt-2 group-hover:text-primary transition-colors font-medium">
              Ver detalle →
            </div>
          </button>
        ))}
      </div>

      {/* ── Proyectos en negociación activa ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-purple-50 rounded-lg">
              <Target size={18} className="text-purple-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-800">Proyectos en Negociación Activa</h2>
              <p className="text-xs text-gray-400">{proyectosActivos.length} proyecto{proyectosActivos.length !== 1 ? 's' : ''} con valor asignado</p>
            </div>
          </div>
          {valorPonderado > 0 && (
            <div className="text-right">
              <div className="text-xs text-gray-400 font-medium">Valor esperado</div>
              <div className="text-xl font-bold text-purple-700">
                {valorPonderado.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €
              </div>
            </div>
          )}
        </div>

        {proyectosActivos.length === 0 ? (
          <p className="text-gray-400 text-center py-10">Sin proyectos en negociación con valor asignado</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Empresa / Contacto</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Responsable</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Estado</th>
                  <th className="text-right px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Valor €</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide min-w-40">Prob. cierre</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Próxima acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {proyectosActivos.map(c => {
                  const resp = usuariosMap[c.responsable_id]
                  return (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/contacto/${c.id}`)}
                      className="hover:bg-purple-50 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-gray-800">{c.empresa}</div>
                        <div className="text-sm text-gray-500">{c.nombre}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-gray-600">{resp?.nombre || '—'}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${ESTADO_COLORS[c.estado] || ''}`}>
                          {c.estado}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="font-bold text-gray-800 text-base">
                          {toNum(c.valor_estimado).toLocaleString('es-ES', { maximumFractionDigits: 0 })} €
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <ProbBar prob={c.probabilidad_cierre} />
                      </td>
                      <td className="px-5 py-4">
                        {c.proxima_accion ? (
                          <div>
                            <div className="text-sm text-gray-700 truncate max-w-48">{c.proxima_accion}</div>
                            {c.fecha_proxima_accion && (
                              <div className={`text-xs mt-0.5 font-medium ${new Date(c.fecha_proxima_accion) <= hoy ? 'text-red-500' : 'text-gray-400'}`}>
                                {new Date(c.fecha_proxima_accion).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300 text-sm">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alertas rojas */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 bg-red-50 border-b border-red-100">
            <div className="p-1.5 bg-red-100 rounded-lg">
              <AlertTriangle size={18} className="text-red-600" />
            </div>
            <h2 className="text-base font-bold text-red-800">Acciones Vencidas</h2>
            <span className="ml-auto bg-red-600 text-white text-xs font-bold rounded-full px-2.5 py-0.5">
              {alertasRojas.length}
            </span>
          </div>
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto scrollbar-thin">
            {alertasRojas.length === 0 ? (
              <p className="text-gray-400 text-center py-10">Sin acciones vencidas</p>
            ) : (
              alertasRojas.map(c => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/contacto/${c.id}`)}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-red-50 transition-colors text-left group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-800">{c.nombre}</div>
                    <div className="text-sm text-gray-500 truncate">{c.empresa}</div>
                    {c.proxima_accion && (
                      <div className="text-sm text-red-600 mt-0.5 truncate">{c.proxima_accion}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <div className="text-right">
                      <div className="text-sm font-bold text-red-600">
                        {new Date(c.fecha_proxima_accion).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                      </div>
                      <div className="text-xs text-gray-400">{c.estado}</div>
                    </div>
                    <ArrowRight size={16} className="text-gray-300 group-hover:text-red-400 transition-colors" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Alertas naranjas */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 bg-orange-50 border-b border-orange-100">
            <div className="p-1.5 bg-orange-100 rounded-lg">
              <Bell size={18} className="text-orange-600" />
            </div>
            <h2 className="text-base font-bold text-orange-800">Sin Contacto Reciente</h2>
            <span className="ml-auto bg-orange-500 text-white text-xs font-bold rounded-full px-2.5 py-0.5">
              {alertasNaranjas.length}
            </span>
          </div>
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto scrollbar-thin">
            {alertasNaranjas.length === 0 ? (
              <p className="text-gray-400 text-center py-10">Todos los contactos al día</p>
            ) : (
              alertasNaranjas.map(c => {
                const umbral = UMBRALES[c.segmento] || 7
                const ref = c.fecha_ultimo_contacto || c.created_at
                const dias = ref ? Math.floor((hoy - new Date(ref)) / 86400000) : null
                return (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/contacto/${c.id}`)}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-orange-50 transition-colors text-left group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-800">{c.nombre}</div>
                      <div className="text-sm text-gray-500 truncate">{c.empresa}</div>
                      <div className="text-xs text-gray-400 mt-0.5 capitalize">
                        {c.segmento} — umbral {umbral} días
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <div className="text-right">
                        <div className="text-sm font-bold text-orange-600">
                          {dias !== null ? `${dias} días` : 'Sin contacto'}
                        </div>
                        <div className="text-xs text-gray-400">{c.estado}</div>
                      </div>
                      <ArrowRight size={16} className="text-gray-300 group-hover:text-orange-400 transition-colors" />
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal KPI */}
      {modal && (
        <KpiModal
          titulo={modal.titulo}
          icono={modal.icono}
          contactos={modal.contactos}
          usuariosMap={usuariosMap}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
