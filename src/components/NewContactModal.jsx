import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const SEGMENTOS = ['industrial', 'ayuntamiento', 'itv', 'otros']

export default function NewContactModal({ usuarios, onClose, onCreated }) {
  const { user } = useAuth()
  const [form, setForm] = useState({
    nombre: '',
    empresa: '',
    segmento: 'industrial',
    subsector: '',
    cargo: '',
    email: '',
    telefono: '',
    ciudad: '',
    provincia: '',
    valor_estimado: '',
    responsable_id: user?.id || '',
    notas: '',
    estado: 'Nuevo Lead',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const set = (e) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nombre.trim() || !form.empresa.trim()) {
      setError('Nombre y empresa son obligatorios')
      return
    }
    setLoading(true)
    setError(null)

    const { error: err } = await supabase.from('contactos').insert([{
      nombre: form.nombre.trim(),
      empresa: form.empresa.trim(),
      segmento: form.segmento,
      subsector: form.subsector || null,
      cargo: form.cargo || null,
      email: form.email || null,
      telefono: form.telefono || null,
      ciudad: form.ciudad || null,
      provincia: form.provincia || null,
      valor_estimado: form.valor_estimado ? parseFloat(form.valor_estimado) : null,
      responsable_id: form.responsable_id || null,
      notas: form.notas || null,
      estado: 'Nuevo Lead',
    }])

    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      onCreated()
      onClose()
    }
  }

  const input = "w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-primary bg-white"
  const label = "block text-sm font-bold text-gray-600 mb-1"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h2 className="text-xl font-bold text-primary-dark">Nuevo Contacto</h2>
            <p className="text-sm text-gray-400">Estado inicial: Nuevo Lead</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={label}>Nombre *</label>
              <input name="nombre" value={form.nombre} onChange={set}
                className={input} placeholder="Nombre completo" autoFocus />
            </div>
            <div>
              <label className={label}>Empresa *</label>
              <input name="empresa" value={form.empresa} onChange={set}
                className={input} placeholder="Nombre de la empresa" />
            </div>
            <div>
              <label className={label}>Segmento</label>
              <select name="segmento" value={form.segmento} onChange={set} className={input}>
                {SEGMENTOS.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Subsector</label>
              <input name="subsector" value={form.subsector} onChange={set}
                className={input} placeholder="Subsector industrial, etc." />
            </div>
            <div>
              <label className={label}>Cargo</label>
              <input name="cargo" value={form.cargo} onChange={set}
                className={input} placeholder="Director, Gerente..." />
            </div>
            <div>
              <label className={label}>Email</label>
              <input name="email" type="email" value={form.email} onChange={set}
                className={input} placeholder="contacto@empresa.com" />
            </div>
            <div>
              <label className={label}>Teléfono</label>
              <input name="telefono" value={form.telefono} onChange={set}
                className={input} placeholder="+34 600 000 000" />
            </div>
            <div>
              <label className={label}>Ciudad</label>
              <input name="ciudad" value={form.ciudad} onChange={set}
                className={input} placeholder="Madrid, Barcelona..." />
            </div>
            <div>
              <label className={label}>Provincia</label>
              <input name="provincia" value={form.provincia} onChange={set}
                className={input} placeholder="Provincia" />
            </div>
            <div>
              <label className={label}>Valor estimado €</label>
              <input name="valor_estimado" type="number" value={form.valor_estimado}
                onChange={set} className={input} placeholder="0" min="0" step="100" />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Responsable</label>
              <select name="responsable_id" value={form.responsable_id} onChange={set} className={input}>
                <option value="">Sin asignar</option>
                {usuarios.map(u => (
                  <option key={u.id} value={u.id}>{u.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={label}>Notas iniciales</label>
            <textarea name="notas" value={form.notas} onChange={set}
              className={`${input} h-20 resize-none`} placeholder="Comentarios, contexto inicial..." />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3.5 rounded-xl border-2 border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors text-base"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3.5 rounded-xl bg-primary hover:bg-primary-medium text-white font-bold transition-colors text-base disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              Crear Contacto
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
