import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Save, Loader2, CheckCircle2, Plus, Trash2,
  AlertTriangle, Search, X, Package
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ESTADOS_PROYECTO, TIPOS_PROYECTO, MODELOS_UAP, faseEstado, estadoLabel, tipoLabel } from '../lib/proyectoFases'

const SEGMENTOS = ['industrial', 'ayuntamiento', 'itv', 'otros']
const TIPOS_GASTO = ['mano_obra', 'desplazamiento', 'sensor', 'instalacion', 'informe', 'subcontrata', 'otro']
const ESTADOS_MATERIAL = ['pendiente', 'pedido', 'en_tránsito', 'recibido', 'cancelado']

function toNum(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n }
function fmt(v) { return toNum(v).toLocaleString('es-ES', { maximumFractionDigits: 0 }) + ' €' }

const FASE_COLORS = {
  completada: { dot: 'bg-green-500 border-green-500', text: 'text-green-700', label: 'Completada', line: 'bg-green-400' },
  en_curso:   { dot: 'bg-blue-500 border-blue-500',  text: 'text-blue-700',  label: 'En curso',   line: 'bg-blue-300' },
  vencida:    { dot: 'bg-red-500 border-red-500',    text: 'text-red-600',   label: 'Vencida',    line: 'bg-red-300' },
  pendiente:  { dot: 'bg-gray-300 border-gray-300',  text: 'text-gray-400',  label: 'Pendiente',  line: 'bg-gray-200' },
}

// ── Timeline visual horizontal ──────────────────────────────────────────────
function TimelineVisual({ fases }) {
  if (!fases.length) return null
  return (
    <div className="overflow-x-auto pb-2 mb-4 scrollbar-thin">
      <div className="flex items-center min-w-max px-2">
        {fases.map((f, i) => {
          const est = faseEstado(f)
          const c = FASE_COLORS[est]
          return (
            <div key={f.id} className="flex items-center">
              {/* Línea antes (excepto primer punto) */}
              {i > 0 && (
                <div className={`h-0.5 w-8 ${FASE_COLORS[faseEstado(fases[i-1])].line}`} />
              )}
              {/* Punto + label */}
              <div className="flex flex-col items-center gap-1 group">
                <div className={`w-4 h-4 rounded-full border-2 ${c.dot} transition-all group-hover:scale-125`} title={f.nombre} />
                <span className={`text-xs font-bold ${c.text} max-w-16 text-center leading-tight`}
                  style={{ fontSize: '10px' }}>
                  {i + 1}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      {/* Leyenda */}
      <div className="flex gap-4 mt-2 flex-wrap px-2">
        {Object.entries(FASE_COLORS).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${v.dot}`} />
            <span className="text-xs text-gray-500">{v.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ProyectoDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [proyecto, setProyecto] = useState(null)
  const [form, setForm] = useState({})
  const [fases, setFases] = useState([])
  const [pmats, setPmats] = useState([])        // proyecto_materiales
  const [gastos, setGastos] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [contactos, setContactos] = useState([])
  const [catalogoMats, setCatalogoMats] = useState([])  // catálogo materiales
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [demandaTotal, setDemandaTotal] = useState({})

  // Material search
  const [busqMat, setBusqMat] = useState('')
  const [showMatList, setShowMatList] = useState(false)

  // Nuevo gasto
  const [gastoForm, setGastoForm] = useState({ tipo: 'mano_obra', descripcion: '', importe: '', fecha: new Date().toISOString().split('T')[0], responsable_id: '' })
  const [showGastoForm, setShowGastoForm] = useState(false)

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)

  const fetchAll = useCallback(async () => {
    const [pRes, fRes, pmRes, gRes, uRes, cRes, mRes, actProyRes, allPmRes] = await Promise.all([
      supabase.from('proyectos').select('*').eq('id', id).single(),
      supabase.from('fases_proyecto').select('*').eq('proyecto_id', id).order('orden'),
      supabase.from('proyecto_materiales').select('*').eq('proyecto_id', id).order('created_at'),
      supabase.from('proyecto_gastos').select('*').eq('proyecto_id', id).order('fecha'),
      supabase.from('usuarios').select('*').order('nombre'),
      supabase.from('contactos').select('id, nombre, empresa').order('empresa'),
      supabase.from('materiales').select('*').order('nombre'),
      supabase.from('proyectos').select('id').neq('estado', 'cerrado'),
      supabase.from('proyecto_materiales').select('material_id, cantidad, proyecto_id'),
    ])
    if (pRes.data) { setProyecto(pRes.data); setForm(pRes.data) }
    setFases(fRes.data || [])
    setPmats(pmRes.data || [])
    setGastos(gRes.data || [])
    setUsuarios(uRes.data || [])
    setContactos(cRes.data || [])
    setCatalogoMats(mRes.data || [])
    // Calcular demanda total por material en proyectos activos
    const activeIds = new Set((actProyRes.data || []).map(p => p.id))
    const dem = {}
    for (const pm of (allPmRes.data || [])) {
      if (activeIds.has(pm.proyecto_id) && pm.material_id) {
        dem[pm.material_id] = (dem[pm.material_id] || 0) + toNum(pm.cantidad)
      }
    }
    setDemandaTotal(dem)
    setLoading(false)
  }, [id])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Coste real calculado ──────────────────────────────────────────────────
  const costeMats = pmats.reduce((s, m) => s + toNum(m.precio_real || m.precio_estimado) * toNum(m.cantidad), 0)
  const costeGastos = gastos.reduce((s, g) => s + toNum(g.importe), 0)
  const costeTotalReal = costeMats + costeGastos
  const valorVenta = toNum(form.valor_venta)
  const margenEur = valorVenta - costeTotalReal
  const margenPct = valorVenta > 0 ? Math.round(margenEur / valorVenta * 100) : null

  // ── Guardar proyecto ──────────────────────────────────────────────────────
  const handleGuardar = async () => {
    setSaving(true)
    const updates = {
      nombre: form.nombre, cliente_id: form.cliente_id || null,
      tipo: form.tipo, modelo_uap: form.modelo_uap || null,
      num_unidades: parseInt(form.num_unidades) || 1, estado: form.estado,
      fecha_inicio: form.fecha_inicio || null,
      fecha_entrega_estimada: form.fecha_entrega_estimada || null,
      fecha_entrega_real: form.fecha_entrega_real || null,
      valor_venta: form.valor_venta ? parseFloat(form.valor_venta) : null,
      coste_estimado: form.coste_estimado ? parseFloat(form.coste_estimado) : null,
      coste_real: costeTotalReal,
      responsable_comercial: form.responsable_comercial || null,
      responsable_tecnico: form.responsable_tecnico || null,
      notas: form.notas || null,
    }
    await supabase.from('proyectos').update(updates).eq('id', id)
    setProyecto(prev => ({ ...prev, ...updates }))
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  // ── Fase: toggle completada ───────────────────────────────────────────────
  const toggleFase = async (fase) => {
    const nuevaCompletada = !fase.completada
    const updates = {
      completada: nuevaCompletada,
      fecha_fin_real: nuevaCompletada ? new Date().toISOString().split('T')[0] : null,
    }
    await supabase.from('fases_proyecto').update(updates).eq('id', fase.id)
    setFases(prev => prev.map(f => f.id === fase.id ? { ...f, ...updates } : f))
  }

  // ── Fase: actualizar campo ────────────────────────────────────────────────
  const updateFase = async (faseId, field, value) => {
    await supabase.from('fases_proyecto').update({ [field]: value || null }).eq('id', faseId)
    setFases(prev => prev.map(f => f.id === faseId ? { ...f, [field]: value } : f))
  }

  // ── Eliminar proyecto ─────────────────────────────────────────────────────
  const handleDeleteProyecto = async () => {
    await supabase.from('proyectos').delete().eq('id', id)
    navigate('/proyectos')
  }

  // ── Materiales: añadir del catálogo ──────────────────────────────────────
  const addMaterial = async (mat) => {
    // Si ya existe, incrementar cantidad
    const existing = pmats.find(m => m.material_id === mat.id)
    if (existing) {
      updatePmat(existing.id, 'cantidad', toNum(existing.cantidad) + 1)
      setBusqMat(''); setShowMatList(false)
      return
    }
    const { data } = await supabase.from('proyecto_materiales').insert([{
      proyecto_id: id, material_id: mat.id, nombre_material: mat.nombre,
      cantidad: 1, precio_estimado: mat.precio_base || 0,
      proveedor: mat.proveedor || '', estado: 'pendiente',
    }]).select().single()
    if (data) setPmats(prev => [...prev, data])
    setBusqMat(''); setShowMatList(false)
  }

  // ── Materiales: actualizar campo inline ──────────────────────────────────
  const updatePmat = async (pmId, field, value) => {
    setPmats(prev => prev.map(m => m.id === pmId ? { ...m, [field]: value } : m))
    await supabase.from('proyecto_materiales').update({ [field]: value || null }).eq('id', pmId)
  }

  // ── Materiales: eliminar ──────────────────────────────────────────────────
  const deletePmat = async (pmId) => {
    await supabase.from('proyecto_materiales').delete().eq('id', pmId)
    setPmats(prev => prev.filter(m => m.id !== pmId))
  }

  // ── Gastos: añadir ────────────────────────────────────────────────────────
  const addGasto = async () => {
    if (!gastoForm.importe) return
    const { data } = await supabase.from('proyecto_gastos').insert([{
      proyecto_id: id, tipo: gastoForm.tipo,
      descripcion: gastoForm.descripcion || null,
      importe: parseFloat(gastoForm.importe),
      fecha: gastoForm.fecha || null,
      responsable_id: gastoForm.responsable_id || null,
    }]).select().single()
    if (data) setGastos(prev => [...prev, data])
    setGastoForm({ tipo: 'mano_obra', descripcion: '', importe: '', fecha: new Date().toISOString().split('T')[0], responsable_id: '' })
    setShowGastoForm(false)
  }

  // ── Gastos: eliminar ──────────────────────────────────────────────────────
  const deleteGasto = async (gId) => {
    await supabase.from('proyecto_gastos').delete().eq('id', gId)
    setGastos(prev => prev.filter(g => g.id !== gId))
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-96"><Loader2 size={40} className="animate-spin text-primary" /></div>
  }
  if (!proyecto) {
    return <div className="p-6"><button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500"><ArrowLeft size={20} />Volver</button><p className="mt-4 text-gray-500">Proyecto no encontrado.</p></div>
  }

  const catalogoMap = catalogoMats.reduce((a, m) => ({ ...a, [m.id]: m }), {})
  const matsFiltrados = catalogoMats.filter(m => busqMat.length >= 1 && m.nombre?.toLowerCase().includes(busqMat.toLowerCase())).slice(0, 8)

  const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-white'
  const lbl = 'block text-xs font-bold text-gray-500 mb-1'

  return (
    <>
    <div className="p-4 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/proyectos')}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0">
          <ArrowLeft size={22} className="text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-primary-dark truncate">{proyecto.nombre}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex-shrink-0 ${
              proyecto.tipo === 'piloto' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
            }`}>
              {proyecto.tipo === 'piloto' ? 'PILOTO' : proyecto.tipo === 'proyecto_final' ? 'PROYECTO FINAL' : tipoLabel(proyecto.tipo).toUpperCase()}
            </span>
          </div>
          <p className="text-gray-500 text-sm">{proyecto.estado} · UAP {proyecto.modelo_uap} · {proyecto.num_unidades} ud.</p>
        </div>
      </div>

      {/* 3 paneles */}
      <div className="grid grid-cols-1 lg:grid-cols-[18rem_1fr_20rem] gap-5">

        {/* ── PANEL IZQUIERDO: Datos generales ─────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 overflow-y-auto max-h-[calc(100vh-160px)]">
          <h2 className="text-base font-bold text-gray-800 mb-4">Datos del Proyecto</h2>
          <div className="space-y-3">
            <div><label className={lbl}>Nombre</label>
              <input value={form.nombre || ''} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className={inp} /></div>

            <div><label className={lbl}>Cliente</label>
              <select value={form.cliente_id || ''} onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))} className={inp}>
                <option value="">Sin cliente asignado</option>
                {contactos.map(c => <option key={c.id} value={c.id}>{c.empresa || c.nombre}</option>)}
              </select></div>

            <div><label className={lbl}>Tipo</label>
              <div className="flex gap-1.5">
                {TIPOS_PROYECTO.map(({ value, label }) => (
                  <button key={value} type="button" onClick={() => setForm(f => ({ ...f, tipo: value }))}
                    className={`flex-1 py-2 rounded-xl font-bold text-xs border-2 transition-all ${
                      form.tipo === value
                        ? value === 'piloto' ? 'bg-purple-600 border-purple-600 text-white' : 'bg-primary border-primary text-white'
                        : 'border-gray-200 text-gray-600'
                    }`}>
                    {label}
                  </button>
                ))}
              </div></div>

            <div className="grid grid-cols-2 gap-2">
              <div><label className={lbl}>Modelo UAP</label>
                <select value={form.modelo_uap || ''} onChange={e => setForm(f => ({ ...f, modelo_uap: e.target.value }))} className={inp}>
                  <option value="">—</option>
                  {MODELOS_UAP.map(m => <option key={m} value={m}>{m}</option>)}
                </select></div>
              <div><label className={lbl}>Nº unidades</label>
                <input type="number" min="1" value={form.num_unidades || 1}
                  onChange={e => setForm(f => ({ ...f, num_unidades: e.target.value }))} className={inp} /></div>
            </div>

            <div><label className={lbl}>Estado</label>
              <select value={form.estado || 'anteproyecto'} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))} className={inp}>
                {ESTADOS_PROYECTO.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
              </select></div>

            <div className="grid grid-cols-1 gap-2">
              <div><label className={lbl}>Fecha inicio</label>
                <input type="date" value={form.fecha_inicio || ''} onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))} className={inp} /></div>
              <div><label className={lbl}>Fecha entrega estimada</label>
                <input type="date" value={form.fecha_entrega_estimada || ''} onChange={e => setForm(f => ({ ...f, fecha_entrega_estimada: e.target.value }))} className={inp} /></div>
              <div><label className={lbl}>Fecha entrega real</label>
                <input type="date" value={form.fecha_entrega_real || ''} onChange={e => setForm(f => ({ ...f, fecha_entrega_real: e.target.value }))} className={inp} /></div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <div><label className={lbl}>Valor venta €</label>
                <input type="number" min="0" step="100" value={form.valor_venta || ''} onChange={e => setForm(f => ({ ...f, valor_venta: e.target.value }))} className={inp} /></div>
              <div><label className={lbl}>Coste estimado €</label>
                <input type="number" min="0" step="100" value={form.coste_estimado || ''} onChange={e => setForm(f => ({ ...f, coste_estimado: e.target.value }))} className={inp} /></div>
              <div><label className={lbl}>Coste real (calculado)</label>
                <div className="px-3 py-2.5 text-sm font-bold text-gray-700 bg-gray-50 rounded-xl border border-gray-100">
                  {fmt(costeTotalReal)}
                </div></div>
            </div>

            <div><label className={lbl}>Resp. comercial</label>
              <select value={form.responsable_comercial || ''} onChange={e => setForm(f => ({ ...f, responsable_comercial: e.target.value }))} className={inp}>
                <option value="">Sin asignar</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
              </select></div>

            <div><label className={lbl}>Resp. técnico</label>
              <select value={form.responsable_tecnico || ''} onChange={e => setForm(f => ({ ...f, responsable_tecnico: e.target.value }))} className={inp}>
                <option value="">Sin asignar</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
              </select></div>

            <div><label className={lbl}>Notas</label>
              <textarea value={form.notas || ''} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                className={`${inp} h-20 resize-none`} /></div>

            <button onClick={handleGuardar} disabled={saving}
              className={`w-full font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm transition-all ${
                saved ? 'bg-green-500 text-white' : 'bg-primary hover:bg-primary-medium text-white disabled:opacity-60'
              }`}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
              {saved ? 'Guardado' : saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
            <button onClick={() => setShowDeleteConfirm(true)}
              className="w-full mt-1 text-red-400 hover:text-red-600 text-sm font-medium py-2 transition-colors text-center">
              Eliminar proyecto
            </button>
          </div>
        </div>

        {/* ── PANEL CENTRAL: Fases ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 overflow-y-auto max-h-[calc(100vh-160px)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-800">Línea de Tiempo de Fases</h2>
            <div className="text-xs text-gray-400 font-medium">
              {fases.filter(f => f.completada).length}/{fases.length} completadas
            </div>
          </div>

          <TimelineVisual fases={fases} />

          <div className="space-y-3">
            {fases.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Sin fases definidas</p>
            ) : fases.map(fase => {
              const est = faseEstado(fase)
              const c = FASE_COLORS[est]
              return (
                <div key={fase.id} className={`rounded-xl border-2 p-3.5 transition-all ${
                  est === 'completada' ? 'border-green-200 bg-green-50'
                  : est === 'en_curso' ? 'border-blue-200 bg-blue-50'
                  : est === 'vencida' ? 'border-red-200 bg-red-50'
                  : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button onClick={() => toggleFase(fase)}
                      className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        fase.completada ? 'bg-green-500 border-green-500' : 'border-gray-400 hover:border-green-400 bg-white'
                      }`}>
                      {fase.completada && <CheckCircle2 size={13} className="text-white" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className={`font-bold text-sm ${fase.completada ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                          {fase.orden}. {fase.nombre}
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${c.text} bg-white/80`}>
                          {c.label}
                        </span>
                      </div>

                      {/* Fechas */}
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <div className="text-xs text-gray-400 mb-0.5">Inicio plan</div>
                          <input type="date" value={fase.fecha_inicio_plan || ''}
                            onChange={e => updateFase(fase.id, 'fecha_inicio_plan', e.target.value)}
                            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary bg-white" />
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-0.5">Fin plan</div>
                          <input type="date" value={fase.fecha_fin_plan || ''}
                            onChange={e => updateFase(fase.id, 'fecha_fin_plan', e.target.value)}
                            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary bg-white" />
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-0.5">Inicio real</div>
                          <input type="date" value={fase.fecha_inicio_real || ''}
                            onChange={e => updateFase(fase.id, 'fecha_inicio_real', e.target.value)}
                            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary bg-white" />
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-0.5">Fin real</div>
                          <input type="date" value={fase.fecha_fin_real || ''}
                            onChange={e => updateFase(fase.id, 'fecha_fin_real', e.target.value)}
                            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary bg-white" />
                        </div>
                      </div>

                      {/* Responsable + notas */}
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <div className="text-xs text-gray-400 mb-0.5">Responsable</div>
                          <select value={fase.responsable_id || ''}
                            onChange={e => updateFase(fase.id, 'responsable_id', e.target.value)}
                            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary bg-white">
                            <option value="">—</option>
                            {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                          </select>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-0.5">Notas</div>
                          <input value={fase.notas || ''}
                            onChange={e => updateFase(fase.id, 'notas', e.target.value)}
                            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary bg-white"
                            placeholder="Observaciones..." />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── PANEL DERECHO: Materiales + Gastos + Costes ──────────────────── */}
        <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-160px)]">

          {/* Materiales */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-800">Materiales</h2>
              <span className="text-xs text-gray-400">{pmats.length} items</span>
            </div>

            {/* Buscador catálogo */}
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={busqMat}
                onChange={e => { setBusqMat(e.target.value); setShowMatList(true) }}
                onFocus={() => setShowMatList(true)}
                onBlur={() => setTimeout(() => setShowMatList(false), 200)}
                placeholder="Buscar en catálogo y añadir..."
                className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-primary"
              />
              {showMatList && busqMat.length >= 1 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl z-40 mt-1 max-h-44 overflow-y-auto">
                  {matsFiltrados.length === 0 ? (
                    <p className="px-3 py-2.5 text-xs text-gray-400">Sin resultados en catálogo</p>
                  ) : matsFiltrados.map(m => (
                    <button key={m.id} type="button" onMouseDown={() => addMaterial(m)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-gray-800">{m.nombre}</div>
                          <div className="text-xs text-gray-400">{m.categoria} · {m.proveedor || '—'}</div>
                        </div>
                        <div className="text-right ml-2">
                          <div className="text-xs font-bold text-gray-700">{m.precio_base?.toLocaleString('es-ES')} €</div>
                          <div className="text-xs text-gray-400">{m.plazo_entrega_dias}d plazo</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Lista materiales del proyecto */}
            <div className="space-y-2">
              {pmats.length === 0 ? (
                <p className="text-gray-400 text-xs text-center py-4">Sin materiales añadidos</p>
              ) : pmats.map(m => {
                const vencido = m.estado !== 'recibido' && m.estado !== 'cancelado'
                  && m.fecha_entrega_estimada && new Date(m.fecha_entrega_estimada) < hoy
                return (
                  <div key={m.id} className={`rounded-xl border p-3 text-xs ${vencido ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'}`}>
                    {vencido && (
                      <div className="flex items-center gap-1 text-red-600 font-bold mb-1.5">
                        <AlertTriangle size={11} />Retraso en entrega
                      </div>
                    )}
                    {(() => {
                      if (!m.material_id) return null
                      const cat = catalogoMap[m.material_id]
                      if (!cat) return null
                      const stockDisp = toNum(cat.stock_actual)
                      const demanda = toNum(demandaTotal[m.material_id])
                      if (demanda <= stockDisp) return null
                      return (
                        <div className="flex items-center gap-1 text-orange-700 font-bold text-xs bg-orange-50 border border-orange-200 rounded-lg px-2 py-1 mb-1.5">
                          <AlertTriangle size={11} />
                          Stock insuficiente: tienes {stockDisp}, necesitas {demanda}. Faltan {demanda - stockDisp} ud.
                        </div>
                      )
                    })()}
                    <div className="font-bold text-sm text-gray-800 mb-2">{m.nombre_material || '—'}</div>
                    <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                      <div>
                        <div className="text-gray-400 mb-0.5">Cantidad</div>
                        <input type="number" min="0" value={m.cantidad || ''}
                          onChange={e => updatePmat(m.id, 'cantidad', e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-primary bg-white" />
                      </div>
                      <div>
                        <div className="text-gray-400 mb-0.5">P. estimado €</div>
                        <input type="number" min="0" value={m.precio_estimado || ''}
                          onChange={e => updatePmat(m.id, 'precio_estimado', e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-primary bg-white" />
                      </div>
                      <div>
                        <div className="text-gray-400 mb-0.5">P. real €</div>
                        <input type="number" min="0" value={m.precio_real || ''}
                          onChange={e => updatePmat(m.id, 'precio_real', e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-primary bg-white" />
                      </div>
                      <div>
                        <div className="text-gray-400 mb-0.5">Estado</div>
                        <select value={m.estado || 'pendiente'}
                          onChange={e => updatePmat(m.id, 'estado', e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-primary bg-white">
                          {ESTADOS_MATERIAL.map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                      </div>
                      <div>
                        <div className="text-gray-400 mb-0.5">F. pedido</div>
                        <input type="date" value={m.fecha_pedido || ''}
                          onChange={e => updatePmat(m.id, 'fecha_pedido', e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-primary bg-white" />
                      </div>
                      <div>
                        <div className={`mb-0.5 ${vencido ? 'text-red-600 font-bold' : 'text-gray-400'}`}>F. entrega est.</div>
                        <input type="date" value={m.fecha_entrega_estimada || ''}
                          onChange={e => updatePmat(m.id, 'fecha_entrega_estimada', e.target.value)}
                          className={`w-full border rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-primary bg-white ${vencido ? 'border-red-300' : 'border-gray-200'}`} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-gray-700">
                        Subtotal: {(toNum(m.precio_real || m.precio_estimado) * toNum(m.cantidad)).toLocaleString('es-ES', { maximumFractionDigits: 0 })} €
                      </div>
                      <button onClick={() => deletePmat(m.id)}
                        className="p-1 text-gray-300 hover:text-red-500 transition-colors rounded">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Gastos adicionales */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-800">Gastos Adicionales</h2>
              <button onClick={() => setShowGastoForm(f => !f)}
                className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-dark transition-colors">
                <Plus size={14} />Añadir
              </button>
            </div>

            {showGastoForm && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs text-gray-500 mb-0.5">Tipo</div>
                    <select value={gastoForm.tipo} onChange={e => setGastoForm(f => ({ ...f, tipo: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-primary bg-white">
                      {TIPOS_GASTO.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-0.5">Importe €</div>
                    <input type="number" min="0" value={gastoForm.importe}
                      onChange={e => setGastoForm(f => ({ ...f, importe: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-primary bg-white"
                      placeholder="0" />
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Descripción</div>
                  <input value={gastoForm.descripcion}
                    onChange={e => setGastoForm(f => ({ ...f, descripcion: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-primary bg-white"
                    placeholder="Descripción del gasto..." />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs text-gray-500 mb-0.5">Fecha</div>
                    <input type="date" value={gastoForm.fecha}
                      onChange={e => setGastoForm(f => ({ ...f, fecha: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-primary bg-white" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-0.5">Responsable</div>
                    <select value={gastoForm.responsable_id}
                      onChange={e => setGastoForm(f => ({ ...f, responsable_id: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-primary bg-white">
                      <option value="">—</option>
                      {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={addGasto}
                  className="w-full bg-primary text-white text-xs font-bold py-2 rounded-lg hover:bg-primary-medium transition-colors">
                  Registrar gasto
                </button>
              </div>
            )}

            <div className="space-y-1.5">
              {gastos.length === 0 ? (
                <p className="text-gray-400 text-xs text-center py-3">Sin gastos registrados</p>
              ) : gastos.map(g => (
                <div key={g.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-gray-700 capitalize">{g.tipo?.replace('_', ' ')}</div>
                    {g.descripcion && <div className="text-xs text-gray-500 truncate">{g.descripcion}</div>}
                    <div className="text-xs text-gray-400">{g.fecha ? new Date(g.fecha).toLocaleDateString('es-ES') : '—'}</div>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-sm font-bold text-gray-800">{toNum(g.importe).toLocaleString('es-ES')} €</span>
                    <button onClick={() => deleteGasto(g.id)}
                      className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resumen de costes */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h2 className="text-base font-bold text-gray-800 mb-3">Resumen Económico</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Coste materiales</span>
                <span className="font-semibold">{fmt(costeMats)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Gastos adicionales</span>
                <span className="font-semibold">{fmt(costeGastos)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-800 border-t border-gray-100 pt-2">
                <span>Coste total real</span>
                <span>{fmt(costeTotalReal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Valor venta</span>
                <span className="font-semibold">{fmt(valorVenta)}</span>
              </div>

              {/* Margen */}
              {valorVenta > 0 && (
                <div className={`flex justify-between font-bold text-base border-t border-gray-100 pt-2 rounded-xl px-3 py-2.5 -mx-3 ${
                  margenPct === null ? 'bg-gray-50 text-gray-500'
                  : margenPct >= 30 ? 'bg-green-50 text-green-700'
                  : margenPct >= 15 ? 'bg-orange-50 text-orange-700'
                  : 'bg-red-50 text-red-600'
                }`}>
                  <span>Margen</span>
                  <span>
                    {fmt(margenEur)}
                    {margenPct !== null && <span className="ml-2 text-sm">({margenPct}%)</span>}
                  </span>
                </div>
              )}
            </div>

            <button onClick={handleGuardar} disabled={saving}
              className="w-full mt-4 bg-primary-dark hover:bg-primary text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Actualizar coste real
            </button>
          </div>
        </div>
      </div>
    </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-xl flex-shrink-0">
                <AlertTriangle size={22} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Eliminar proyecto</h3>
            </div>
            <p className="text-gray-700 text-sm mb-1">¿Eliminar <strong>{proyecto.nombre}</strong>?</p>
            <p className="text-gray-500 text-sm mb-5">Esta acción no se puede deshacer. Se eliminarán también todas sus fases, materiales y gastos.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleDeleteProyecto}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors">
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
