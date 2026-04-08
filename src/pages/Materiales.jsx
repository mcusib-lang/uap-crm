import { useState, useEffect, useRef } from 'react'
import { Plus, Loader2, Save, X, Package, TrendingUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function toNum(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n }

// ── Sparkline SVG ────────────────────────────────────────────────────────────
function Sparkline({ data }) {
  if (!data || data.length < 2) {
    return <span className="text-xs text-gray-300">Sin historial</span>
  }
  const W = 90, H = 36
  const prices = data.map(d => toNum(d.precio))
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const range = max - min || 1
  const pts = prices.map((p, i) => {
    const x = 4 + (i / (prices.length - 1)) * (W - 8)
    const y = H - 4 - ((p - min) / range) * (H - 8)
    return `${x},${y}`
  })
  const lastX = parseFloat(pts[pts.length - 1].split(',')[0])
  const lastY = parseFloat(pts[pts.length - 1].split(',')[1])
  const trend = prices[prices.length - 1] >= prices[0]
  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg width={W} height={H} className="overflow-visible">
        <polyline points={pts.join(' ')} fill="none"
          stroke={trend ? '#16a34a' : '#dc2626'} strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={lastX} cy={lastY} r="3"
          fill={trend ? '#16a34a' : '#dc2626'} />
      </svg>
      <div className="flex items-center gap-1 text-xs">
        <TrendingUp size={10} className={trend ? 'text-green-500' : 'text-red-500 rotate-180'} />
        <span className={trend ? 'text-green-600' : 'text-red-600'} style={{ fontSize: 10 }}>
          {prices[0].toLocaleString('es-ES')} → {prices[prices.length - 1].toLocaleString('es-ES')} €
        </span>
      </div>
    </div>
  )
}

// ── Tooltip precio con sparkline ─────────────────────────────────────────────
function PrecioCell({ material, historial, onEdit }) {
  const [show, setShow] = useState(false)
  const hist = historial[material.id] || []
  return (
    <div className="relative"
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <div className="font-bold text-gray-800 text-sm cursor-help">
        {toNum(material.precio_base).toLocaleString('es-ES', { maximumFractionDigits: 2 })} €
      </div>
      {show && hist.length >= 2 && (
        <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-xl p-3 z-50 w-40">
          <div className="text-xs font-bold text-gray-600 mb-2">Evolución precio</div>
          <Sparkline data={hist} />
          <div className="text-xs text-gray-400 mt-1 text-center">{hist.length} registros</div>
        </div>
      )}
    </div>
  )
}

// ── Modal nuevo material ──────────────────────────────────────────────────────
function NuevoMaterialModal({ categorias, onClose, onCreated }) {
  const [form, setForm] = useState({
    nombre: '', categoria: '', proveedor: '', precio_base: '',
    plazo_entrega_dias: '', stock_actual: '', stock_minimo: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return }
    setLoading(true)
    const { error: err } = await supabase.from('materiales').insert([{
      nombre: form.nombre.trim(),
      categoria: form.categoria || 'General',
      proveedor: form.proveedor || null,
      precio_base: form.precio_base ? parseFloat(form.precio_base) : 0,
      plazo_entrega_dias: form.plazo_entrega_dias ? parseInt(form.plazo_entrega_dias) : 0,
      stock_actual: form.stock_actual ? parseFloat(form.stock_actual) : 0,
      stock_minimo: form.stock_minimo ? parseFloat(form.stock_minimo) : 0,
    }])
    if (err) { setError(err.message); setLoading(false) }
    else { onCreated(); onClose() }
  }

  const inp = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-primary bg-white'
  const lbl = 'block text-sm font-bold text-gray-600 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-primary-dark">Nuevo Material</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-3">
          <div>
            <label className={lbl}>Nombre *</label>
            <input name="nombre" value={form.nombre} onChange={set} className={inp} placeholder="Filtro HEPA H14" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Categoría</label>
              <input name="categoria" value={form.categoria} onChange={set} className={inp} placeholder="Filtros, Electrónica..." list="cats" />
              <datalist id="cats">{categorias.map(c => <option key={c} value={c} />)}</datalist>
            </div>
            <div>
              <label className={lbl}>Proveedor</label>
              <input name="proveedor" value={form.proveedor} onChange={set} className={inp} placeholder="Camfil, Siemens..." />
            </div>
            <div>
              <label className={lbl}>Precio base €</label>
              <input name="precio_base" type="number" min="0" step="0.01" value={form.precio_base} onChange={set} className={inp} placeholder="0" />
            </div>
            <div>
              <label className={lbl}>Plazo entrega (días)</label>
              <input name="plazo_entrega_dias" type="number" min="0" value={form.plazo_entrega_dias} onChange={set} className={inp} placeholder="0" />
            </div>
            <div>
              <label className={lbl}>Stock actual</label>
              <input name="stock_actual" type="number" min="0" step="0.01" value={form.stock_actual} onChange={set} className={inp} placeholder="0" />
            </div>
            <div>
              <label className={lbl}>Stock mínimo</label>
              <input name="stock_minimo" type="number" min="0" step="0.01" value={form.stock_minimo} onChange={set} className={inp} placeholder="0" />
            </div>
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {loading && <Loader2 size={16} className="animate-spin" />}Crear Material
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function Materiales() {
  const { user } = useAuth()
  const [materiales, setMateriales] = useState([])
  const [historial, setHistorial] = useState({})   // { material_id: [...] }
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filtroCat, setFiltroCat] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [savingId, setSavingId] = useState(null)

  const fetchData = async () => {
    const [mRes, hRes] = await Promise.all([
      supabase.from('materiales').select('*').order('nombre'),
      supabase.from('historial_precios').select('material_id, precio, fecha').order('fecha'),
    ])
    setMateriales(mRes.data || [])
    // Agrupar historial por material_id (últimas 5)
    const h = {}
    ;(hRes.data || []).forEach(r => {
      h[r.material_id] = [...(h[r.material_id] || []), r]
    })
    // Keep last 5
    Object.keys(h).forEach(k => { h[k] = h[k].slice(-5) })
    setHistorial(h)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const categorias = [...new Set(materiales.map(m => m.categoria).filter(Boolean))].sort()

  const filtrados = materiales.filter(m => !filtroCat || m.categoria === filtroCat)

  const startEdit = (m) => {
    setEditingId(m.id)
    setEditForm({ ...m })
  }

  const cancelEdit = () => { setEditingId(null); setEditForm({}) }

  const saveEdit = async () => {
    setSavingId(editForm.id)
    const original = materiales.find(m => m.id === editForm.id)
    const precioChanged = parseFloat(editForm.precio_base) !== parseFloat(original.precio_base)

    await supabase.from('materiales').update({
      nombre: editForm.nombre,
      categoria: editForm.categoria || 'General',
      proveedor: editForm.proveedor || null,
      precio_base: parseFloat(editForm.precio_base) || 0,
      plazo_entrega_dias: parseInt(editForm.plazo_entrega_dias) || 0,
      stock_actual: parseFloat(editForm.stock_actual) || 0,
      stock_minimo: parseFloat(editForm.stock_minimo) || 0,
    }).eq('id', editForm.id)

    // Registrar en historial si cambió el precio
    if (precioChanged && editForm.precio_base) {
      await supabase.from('historial_precios').insert([{
        material_id: editForm.id,
        precio: parseFloat(editForm.precio_base),
        fecha: new Date().toISOString().split('T')[0],
        usuario_id: user?.id || null,
      }])
    }

    setMateriales(prev => prev.map(m => m.id === editForm.id ? { ...m, ...editForm } : m))
    setSavingId(null)
    setEditingId(null)
    if (precioChanged) fetchData() // Refrescar historial
  }

  const eF = e => setEditForm(f => ({ ...f, [e.target.name]: e.target.value }))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-96">
        <Loader2 size={40} className="animate-spin text-primary" />
      </div>
    )
  }

  const cellInput = 'w-full border border-blue-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-primary bg-white'

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary-dark">Catálogo de Materiales</h1>
          <p className="text-gray-500 mt-1">{materiales.length} materiales · {categorias.length} categorías</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary-medium text-white px-5 py-2.5 rounded-xl font-bold transition-colors text-base shadow-sm">
          <Plus size={20} />Nuevo Material
        </button>
      </div>

      {/* Chips de categoría */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button onClick={() => setFiltroCat('')}
          className={`px-3.5 py-1.5 rounded-full text-sm font-bold transition-all border-2 ${!filtroCat ? 'bg-primary text-white border-primary shadow-sm' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-primary hover:text-primary'}`}>
          Todos ({materiales.length})
        </button>
        {categorias.map(cat => {
          const n = materiales.filter(m => m.categoria === cat).length
          return (
            <button key={cat} onClick={() => setFiltroCat(cat)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-bold transition-all border-2 ${filtroCat === cat ? 'bg-primary text-white border-primary shadow-sm' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-primary hover:text-primary'}`}>
              {cat} ({n})
            </button>
          )
        })}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3.5 text-sm font-bold text-gray-500">Nombre</th>
                <th className="text-left px-5 py-3.5 text-sm font-bold text-gray-500">Categoría</th>
                <th className="text-left px-5 py-3.5 text-sm font-bold text-gray-500">Proveedor</th>
                <th className="text-left px-5 py-3.5 text-sm font-bold text-gray-500">Precio base</th>
                <th className="text-left px-5 py-3.5 text-sm font-bold text-gray-500">Plazo (días)</th>
                <th className="text-left px-5 py-3.5 text-sm font-bold text-gray-500">Stock</th>
                <th className="text-left px-5 py-3.5 text-sm font-bold text-gray-500">Evolución precio</th>
                <th className="px-5 py-3.5 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-gray-400 py-14">
                    <Package size={36} className="mx-auto mb-3 text-gray-200" />
                    Sin materiales en esta categoría
                  </td>
                </tr>
              ) : filtrados.map(m => {
                const isEditing = editingId === m.id
                const stockBajo = toNum(m.stock_actual) <= toNum(m.stock_minimo)
                const stockAlerta = !stockBajo && toNum(m.stock_actual) === toNum(m.stock_minimo) + 1

                if (isEditing) {
                  return (
                    <tr key={m.id} className="bg-blue-50">
                      <td className="px-3 py-2">
                        <input name="nombre" value={editForm.nombre || ''} onChange={eF} className={cellInput} /></td>
                      <td className="px-3 py-2">
                        <input name="categoria" value={editForm.categoria || ''} onChange={eF} className={cellInput} list="cats-edit" />
                        <datalist id="cats-edit">{categorias.map(c => <option key={c} value={c} />)}</datalist>
                      </td>
                      <td className="px-3 py-2">
                        <input name="proveedor" value={editForm.proveedor || ''} onChange={eF} className={cellInput} /></td>
                      <td className="px-3 py-2">
                        <input name="precio_base" type="number" min="0" step="0.01" value={editForm.precio_base || ''} onChange={eF} className={cellInput} /></td>
                      <td className="px-3 py-2">
                        <input name="plazo_entrega_dias" type="number" min="0" value={editForm.plazo_entrega_dias || ''} onChange={eF} className={cellInput} /></td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1.5">
                          <input name="stock_actual" type="number" min="0" step="0.01" value={editForm.stock_actual || ''} onChange={eF} className={cellInput} placeholder="Real" />
                          <input name="stock_minimo" type="number" min="0" step="0.01" value={editForm.stock_minimo || ''} onChange={eF} className={cellInput} placeholder="Mín" />
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Sparkline data={historial[m.id]} />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <button onClick={saveEdit} disabled={savingId === m.id}
                            className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-medium transition-colors">
                            {savingId === m.id ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                            Guardar
                          </button>
                          <button onClick={cancelEdit}
                            className="px-2 py-1.5 text-gray-400 hover:text-red-500 transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                }

                return (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-gray-800">{m.nombre}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-gray-600">{m.categoria || '—'}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-gray-600">{m.proveedor || '—'}</span>
                    </td>
                    <td className="px-5 py-4">
                      <PrecioCell material={m} historial={historial} />
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-gray-600">{m.plazo_entrega_dias ?? '—'}d</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${stockBajo ? 'text-red-600' : stockAlerta ? 'text-orange-500' : 'text-gray-700'}`}>
                          {toNum(m.stock_actual)}
                        </span>
                        <span className="text-xs text-gray-400">/ mín {toNum(m.stock_minimo)}</span>
                        {stockBajo && (
                          <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Stock bajo</span>
                        )}
                        {stockAlerta && !stockBajo && (
                          <span className="text-xs font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">Alerta</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Sparkline data={historial[m.id]} />
                    </td>
                    <td className="px-5 py-4">
                      <button onClick={() => startEdit(m)}
                        className="px-3 py-1.5 text-xs font-bold text-primary border border-primary/30 rounded-lg hover:bg-primary hover:text-white transition-colors">
                        Editar
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <NuevoMaterialModal
          categorias={categorias}
          onClose={() => setShowModal(false)}
          onCreated={() => { fetchData(); setShowModal(false) }}
        />
      )}
    </div>
  )
}
