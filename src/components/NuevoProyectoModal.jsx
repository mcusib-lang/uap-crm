import { useState, useEffect } from 'react'
import { X, Loader2, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { ESTADOS_PROYECTO, TIPOS_PROYECTO, MODELOS_UAP, generarFases } from '../lib/proyectoFases'

export default function NuevoProyectoModal({ usuarios, onClose, onCreated }) {
  const [contactos, setContactos] = useState([])
  const [busqContacto, setBusqContacto] = useState('')
  const [contactoSeleccionado, setContactoSeleccionado] = useState(null)
  const [showContactoList, setShowContactoList] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [form, setForm] = useState({
    nombre: '', tipo: 'piloto', modelo_uap: 'M', num_unidades: 1,
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_entrega_estimada: '', valor_venta: '',
    responsable_comercial: '', responsable_tecnico: '',
    estado: 'anteproyecto',
  })

  useEffect(() => {
    supabase.from('contactos').select('id, nombre, empresa').order('empresa')
      .then(({ data }) => setContactos(data || []))
  }, [])

  const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const contactosFiltrados = contactos.filter(c => {
    const q = busqContacto.toLowerCase()
    return !q || c.nombre?.toLowerCase().includes(q) || c.empresa?.toLowerCase().includes(q)
  }).slice(0, 8)

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.nombre.trim()) { setError('El nombre del proyecto es obligatorio'); return }
    setLoading(true); setError(null)

    const { data: proy, error: err } = await supabase.from('proyectos').insert([{
      nombre: form.nombre.trim(),
      cliente_id: contactoSeleccionado?.id || null,
      tipo: form.tipo,
      modelo_uap: form.modelo_uap || null,
      num_unidades: parseInt(form.num_unidades) || 1,
      estado: form.estado,
      fecha_inicio: form.fecha_inicio || null,
      fecha_entrega_estimada: form.fecha_entrega_estimada || null,
      valor_venta: form.valor_venta ? parseFloat(form.valor_venta) : null,
      responsable_comercial: form.responsable_comercial || null,
      responsable_tecnico: form.responsable_tecnico || null,
    }]).select().single()

    if (err) { setError(err.message); setLoading(false); return }

    // Generar fases automáticamente
    if (form.fecha_inicio) {
      const fases = generarFases(form.tipo, form.fecha_inicio)
      await supabase.from('fases_proyecto').insert(
        fases.map(f => ({ ...f, proyecto_id: proy.id }))
      )
    }

    onCreated(proy.id)
    onClose()
  }

  const inp = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-primary bg-white'
  const lbl = 'block text-sm font-bold text-gray-600 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h2 className="text-xl font-bold text-primary-dark">Nuevo Proyecto</h2>
            <p className="text-sm text-gray-400">Las fases se generan automáticamente según el tipo</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nombre */}
            <div className="sm:col-span-2">
              <label className={lbl}>Nombre del proyecto *</label>
              <input name="nombre" value={form.nombre} onChange={set} className={inp}
                placeholder="Ej. Proyecto UAP - Planta Neolith Castellón" autoFocus />
            </div>

            {/* Cliente con búsqueda */}
            <div className="sm:col-span-2">
              <label className={lbl}>Cliente (empresa)</label>
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={contactoSeleccionado ? `${contactoSeleccionado.nombre} — ${contactoSeleccionado.empresa}` : busqContacto}
                  onChange={e => {
                    setBusqContacto(e.target.value)
                    setContactoSeleccionado(null)
                    setShowContactoList(true)
                  }}
                  onFocus={() => setShowContactoList(true)}
                  className={`${inp} pl-10`}
                  placeholder="Buscar contacto o empresa..."
                />
                {contactoSeleccionado && (
                  <button type="button" onClick={() => { setContactoSeleccionado(null); setBusqContacto('') }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500">
                    <X size={16} />
                  </button>
                )}
                {showContactoList && !contactoSeleccionado && busqContacto.length >= 1 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl z-50 mt-1 max-h-48 overflow-y-auto">
                    {contactosFiltrados.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-gray-400">Sin resultados</p>
                    ) : contactosFiltrados.map(c => (
                      <button key={c.id} type="button"
                        onClick={() => { setContactoSeleccionado(c); setBusqContacto(''); setShowContactoList(false) }}
                        className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors">
                        <div className="font-semibold text-sm text-gray-800">{c.nombre}</div>
                        <div className="text-xs text-gray-500">{c.empresa}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tipo */}
            <div>
              <label className={lbl}>Tipo de proyecto</label>
              <div className="flex gap-2">
                {TIPOS_PROYECTO.map(({ value, label }) => (
                  <button key={value} type="button"
                    onClick={() => setForm(f => ({ ...f, tipo: value }))}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all ${
                      form.tipo === value
                        ? value === 'piloto' ? 'bg-purple-600 border-purple-600 text-white' : 'bg-primary border-primary text-white'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >{label}</button>
                ))}
              </div>
            </div>

            {/* Modelo UAP */}
            <div>
              <label className={lbl}>Modelo UAP</label>
              <div className="flex gap-1.5">
                {['S', 'M', 'L', 'XL', 'XXL'].map(m => (
                  <button key={m} type="button"
                    onClick={() => setForm(f => ({ ...f, modelo_uap: m }))}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all ${
                      form.modelo_uap === m
                        ? 'bg-primary-dark border-primary-dark text-white'
                        : 'border-gray-200 text-gray-600 hover:border-primary'
                    }`}
                  >{m}</button>
                ))}
              </div>
            </div>

            {/* Nº unidades */}
            <div>
              <label className={lbl}>Nº unidades</label>
              <input name="num_unidades" type="number" min="1" value={form.num_unidades} onChange={set} className={inp} />
            </div>

            {/* Estado inicial */}
            <div>
              <label className={lbl}>Estado inicial</label>
              <select name="estado" value={form.estado} onChange={set} className={inp}>
                {ESTADOS_PROYECTO.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>

            {/* Fechas */}
            <div>
              <label className={lbl}>Fecha inicio</label>
              <input name="fecha_inicio" type="date" value={form.fecha_inicio} onChange={set} className={inp} />
            </div>
            <div>
              <label className={lbl}>Fecha entrega estimada</label>
              <input name="fecha_entrega_estimada" type="date" value={form.fecha_entrega_estimada} onChange={set} className={inp} />
            </div>

            {/* Valor venta */}
            <div>
              <label className={lbl}>Valor venta €</label>
              <input name="valor_venta" type="number" min="0" step="100" value={form.valor_venta} onChange={set} className={inp} placeholder="0" />
            </div>

            {/* Responsables */}
            <div>
              <label className={lbl}>Resp. comercial</label>
              <select name="responsable_comercial" value={form.responsable_comercial} onChange={set} className={inp}>
                <option value="">Sin asignar</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Resp. técnico</label>
              <select name="responsable_tecnico" value={form.responsable_tecnico} onChange={set} className={inp}>
                <option value="">Sin asignar</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
              </select>
            </div>
          </div>

          {form.fecha_inicio && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-primary-dark">
              ✓ Se generarán automáticamente{' '}
              <strong>{form.tipo === 'piloto' ? '6 fases (piloto)' : '8 fases (proyecto final)'}</strong>
              {' '}con fechas calculadas desde {new Date(form.fecha_inicio).toLocaleDateString('es-ES')}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-6 py-3.5 rounded-xl border-2 border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors text-base">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-6 py-3.5 rounded-xl bg-primary hover:bg-primary-medium text-white font-bold transition-colors text-base disabled:opacity-60 flex items-center justify-center gap-2">
              {loading && <Loader2 size={18} className="animate-spin" />}
              Crear Proyecto
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
