import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Save, ArrowLeft, Phone, Mail, Globe,
  Loader2, Plus, MessageSquare, CheckCircle2
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ESTADOS } from '../components/KanbanBoard'

const SEGMENTOS = ['industrial', 'ayuntamiento', 'itv', 'otros']

const TIPOS = [
  { value: 'llamada',  label: 'Llamada',   emoji: '📞' },
  { value: 'email',   label: 'Email',     emoji: '📧' },
  { value: 'reunión', label: 'Reunión',   emoji: '🎥' },
  { value: 'whatsapp',label: 'WhatsApp',  emoji: '💬' },
  { value: 'visita',  label: 'Visita',    emoji: '🚗' },
  { value: 'otro',    label: 'Otro',      emoji: '📝' },
]

const SEGMENT_COLORS = {
  industrial: 'bg-blue-100 text-blue-800',
  ayuntamiento: 'bg-green-100 text-green-800',
  itv: 'bg-orange-100 text-orange-800',
  otros: 'bg-gray-100 text-gray-700',
}

export default function ContactDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [contacto, setContacto] = useState(null)
  const [interacciones, setInteracciones] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({})
  const [estadoOriginal, setEstadoOriginal] = useState('')

  const [inter, setInter] = useState({
    tipo: 'llamada',
    resumen: '',
    proxima_accion: '',
    fecha_proxima_accion: '',
  })
  const [savingInter, setSavingInter] = useState(false)
  const [savedInter, setSavedInter] = useState(false)

  useEffect(() => { fetchAll() }, [id])

  const fetchAll = async () => {
    const [cRes, iRes, uRes] = await Promise.all([
      supabase.from('contactos').select('*').eq('id', id).single(),
      supabase.from('interacciones')
        .select('*, usuarios(nombre)')
        .eq('contacto_id', id)
        .order('created_at', { ascending: false }),
      supabase.from('usuarios').select('*').order('nombre'),
    ])
    if (cRes.data) {
      setContacto(cRes.data)
      setForm(cRes.data)
      setEstadoOriginal(cRes.data.estado)
    }
    setInteracciones(iRes.data || [])
    setUsuarios(uRes.data || [])
    setLoading(false)
  }

  const setF = (e) => {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleGuardar = async () => {
    setSaving(true)
    const updates = {
      nombre: form.nombre,
      empresa: form.empresa,
      segmento: form.segmento,
      subsector: form.subsector || null,
      cargo: form.cargo || null,
      email: form.email || null,
      telefono: form.telefono || null,
      ciudad: form.ciudad || null,
      provincia: form.provincia || null,
      comunidad: form.comunidad || null,
      web: form.web || null,
      zbe: form.zbe || false,
      valor_estimado: form.valor_estimado ? parseFloat(form.valor_estimado) : null,
      probabilidad_cierre: form.probabilidad_cierre ? parseFloat(form.probabilidad_cierre) : null,
      responsable_id: form.responsable_id || null,
      estado: form.estado,
      notas: form.notas || null,
    }

    await supabase.from('contactos').update(updates).eq('id', id)

    if (form.estado !== estadoOriginal) {
      await supabase.from('historial_estados').insert([{
        contacto_id: id,
        estado_anterior: estadoOriginal,
        estado_nuevo: form.estado,
        usuario_id: user?.id || null,
      }])
      setEstadoOriginal(form.estado)
    }

    setContacto(prev => ({ ...prev, ...updates }))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleRegistrar = async () => {
    if (!inter.resumen.trim()) return
    setSavingInter(true)

    const hoy = new Date().toISOString().split('T')[0]

    await supabase.from('interacciones').insert([{
      contacto_id: id,
      usuario_id: user?.id || null,
      tipo: inter.tipo,
      resumen: inter.resumen.trim(),
      proxima_accion: inter.proxima_accion || null,
      fecha_proxima_accion: inter.fecha_proxima_accion || null,
    }])

    const contactoUpdates = { fecha_ultimo_contacto: hoy }
    if (inter.proxima_accion) contactoUpdates.proxima_accion = inter.proxima_accion
    if (inter.fecha_proxima_accion) contactoUpdates.fecha_proxima_accion = inter.fecha_proxima_accion

    await supabase.from('contactos').update(contactoUpdates).eq('id', id)

    setInter({ tipo: 'llamada', resumen: '', proxima_accion: '', fecha_proxima_accion: '' })
    setSavingInter(false)
    setSavedInter(true)
    setTimeout(() => setSavedInter(false), 2000)
    fetchAll()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 size={40} className="animate-spin text-primary" />
      </div>
    )
  }

  if (!contacto) {
    return (
      <div className="p-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-primary mb-4">
          <ArrowLeft size={20} /> Volver
        </button>
        <p className="text-gray-500">Contacto no encontrado.</p>
      </div>
    )
  }

  const inp = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:border-primary bg-white"
  const lbl = "block text-sm font-bold text-gray-500 mb-1"

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0"
        >
          <ArrowLeft size={22} className="text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-primary-dark truncate">{contacto.nombre}</h1>
            {contacto.segmento && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize flex-shrink-0 ${
                SEGMENT_COLORS[contacto.segmento] || SEGMENT_COLORS.otros
              }`}>
                {contacto.segmento}
              </span>
            )}
          </div>
          <p className="text-gray-500 text-base">{contacto.empresa} — <span className="text-primary font-medium">{contacto.estado}</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Panel izquierdo — datos editables */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-5">Datos del Contacto</h2>

            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Nombre</label>
                  <input name="nombre" value={form.nombre || ''} onChange={setF} className={inp} />
                </div>
                <div>
                  <label className={lbl}>Empresa</label>
                  <input name="empresa" value={form.empresa || ''} onChange={setF} className={inp} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Segmento</label>
                  <select name="segmento" value={form.segmento || 'industrial'} onChange={setF} className={inp}>
                    {SEGMENTOS.map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Subsector</label>
                  <input name="subsector" value={form.subsector || ''} onChange={setF} className={inp} />
                </div>
              </div>

              <div>
                <label className={lbl}>Cargo</label>
                <input name="cargo" value={form.cargo || ''} onChange={setF} className={inp} />
              </div>

              <div>
                <label className={lbl}>Email</label>
                <div className="flex gap-2">
                  <input name="email" type="email" value={form.email || ''} onChange={setF} className={inp} />
                  {form.email && (
                    <a href={`mailto:${form.email}`}
                      className="flex-shrink-0 p-2.5 bg-blue-50 text-primary rounded-xl hover:bg-primary-light transition-colors"
                      title="Enviar email">
                      <Mail size={20} />
                    </a>
                  )}
                </div>
              </div>

              <div>
                <label className={lbl}>Teléfono</label>
                <div className="flex gap-2">
                  <input name="telefono" value={form.telefono || ''} onChange={setF} className={inp} />
                  {form.telefono && (
                    <a href={`tel:${form.telefono}`}
                      className="flex-shrink-0 p-2.5 bg-blue-50 text-primary rounded-xl hover:bg-primary-light transition-colors"
                      title="Llamar">
                      <Phone size={20} />
                    </a>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Ciudad</label>
                  <input name="ciudad" value={form.ciudad || ''} onChange={setF} className={inp} />
                </div>
                <div>
                  <label className={lbl}>Provincia</label>
                  <input name="provincia" value={form.provincia || ''} onChange={setF} className={inp} />
                </div>
              </div>

              <div>
                <label className={lbl}>Comunidad Autónoma</label>
                <input name="comunidad" value={form.comunidad || ''} onChange={setF} className={inp} />
              </div>

              <div>
                <label className={lbl}>Web</label>
                <div className="flex gap-2">
                  <input name="web" value={form.web || ''} onChange={setF} className={inp} placeholder="https://" />
                  {form.web && (
                    <a href={form.web} target="_blank" rel="noreferrer"
                      className="flex-shrink-0 p-2.5 bg-blue-50 text-primary rounded-xl hover:bg-primary-light transition-colors"
                      title="Abrir web">
                      <Globe size={20} />
                    </a>
                  )}
                </div>
              </div>

              {/* ZBE solo para ayuntamientos */}
              {form.segmento === 'ayuntamiento' && (
                <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                  <input
                    type="checkbox"
                    id="zbe"
                    name="zbe"
                    checked={form.zbe || false}
                    onChange={setF}
                    className="w-5 h-5 rounded accent-green-600 cursor-pointer"
                  />
                  <label htmlFor="zbe" className="font-bold text-green-800 cursor-pointer text-base">
                    Zona de Bajas Emisiones (ZBE)
                  </label>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Valor estimado €</label>
                  <input name="valor_estimado" type="number" value={form.valor_estimado || ''}
                    onChange={setF} className={inp} min="0" step="500" />
                </div>
                <div>
                  <label className={lbl}>Prob. cierre %</label>
                  <input name="probabilidad_cierre" type="number" value={form.probabilidad_cierre || ''}
                    onChange={setF} className={inp} min="0" max="100" step="5" />
                </div>
              </div>

              <div>
                <label className={lbl}>Responsable</label>
                <select name="responsable_id" value={form.responsable_id || ''} onChange={setF} className={inp}>
                  <option value="">Sin asignar</option>
                  {usuarios.map(u => (
                    <option key={u.id} value={u.id}>{u.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={lbl}>Estado</label>
                <select name="estado" value={form.estado || 'Nuevo Lead'} onChange={setF} className={inp}>
                  {ESTADOS.map(e => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
                {form.estado !== estadoOriginal && (
                  <p className="text-xs text-amber-600 mt-1 font-medium">
                    Cambio pendiente de guardar: {estadoOriginal} → {form.estado}
                  </p>
                )}
              </div>

              <div>
                <label className={lbl}>Notas</label>
                <textarea name="notas" value={form.notas || ''} onChange={setF}
                  className={`${inp} h-20 resize-none`} />
              </div>

              <button
                onClick={handleGuardar}
                disabled={saving}
                className={`w-full font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all text-base ${
                  saved
                    ? 'bg-green-500 text-white'
                    : 'bg-primary hover:bg-primary-medium text-white disabled:opacity-60'
                }`}
              >
                {saving ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : saved ? (
                  <CheckCircle2 size={20} />
                ) : (
                  <Save size={20} />
                )}
                {saved ? 'Guardado' : saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>

        {/* Panel derecho — interacciones */}
        <div className="lg:col-span-3 space-y-6">
          {/* Formulario nueva interacción */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Registrar Interacción</h2>

            <div className="space-y-4">
              {/* Selector de tipo */}
              <div>
                <label className={lbl}>Tipo</label>
                <div className="flex flex-wrap gap-2">
                  {TIPOS.map(({ value, label, emoji }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setInter(n => ({ ...n, tipo: value }))}
                      className={`px-3.5 py-2 rounded-xl text-sm font-bold transition-all ${
                        inter.tipo === value
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {emoji} {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={lbl}>Resumen *</label>
                <textarea
                  value={inter.resumen}
                  onChange={e => setInter(n => ({ ...n, resumen: e.target.value }))}
                  className={`${inp} h-24 resize-none`}
                  placeholder="Describe brevemente la interacción..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Próxima acción</label>
                  <input
                    value={inter.proxima_accion}
                    onChange={e => setInter(n => ({ ...n, proxima_accion: e.target.value }))}
                    className={inp}
                    placeholder="Qué hay que hacer..."
                  />
                </div>
                <div>
                  <label className={lbl}>Fecha próxima acción</label>
                  <input
                    type="date"
                    value={inter.fecha_proxima_accion}
                    onChange={e => setInter(n => ({ ...n, fecha_proxima_accion: e.target.value }))}
                    className={inp}
                  />
                </div>
              </div>

              <button
                onClick={handleRegistrar}
                disabled={savingInter || !inter.resumen.trim()}
                className={`w-full font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all text-base ${
                  savedInter
                    ? 'bg-green-500 text-white'
                    : 'bg-primary-dark hover:bg-primary text-white disabled:opacity-50'
                }`}
              >
                {savingInter ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : savedInter ? (
                  <CheckCircle2 size={20} />
                ) : (
                  <Plus size={20} />
                )}
                {savedInter ? 'Registrado' : savingInter ? 'Guardando...' : 'Registrar Interacción'}
              </button>
            </div>
          </div>

          {/* Timeline de interacciones */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-5">
              Historial
              <span className="ml-2 bg-gray-100 text-gray-500 text-sm font-bold rounded-full px-2.5 py-0.5">
                {interacciones.length}
              </span>
            </h2>

            {interacciones.length === 0 ? (
              <div className="text-center py-10">
                <MessageSquare size={40} className="mx-auto mb-3 text-gray-200" />
                <p className="text-gray-400 text-base">Sin interacciones registradas todavía</p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-gray-100" />
                <div className="space-y-5">
                  {interacciones.map((item) => {
                    const tipo = TIPOS.find(t => t.value === item.tipo)
                    return (
                      <div key={item.id} className="relative flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary-light border-2 border-white shadow-sm flex items-center justify-center text-lg flex-shrink-0 z-10">
                          {tipo?.emoji || '📝'}
                        </div>
                        <div className="flex-1 bg-gray-50 rounded-xl p-4 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <span className="font-bold text-gray-800 capitalize">
                                {tipo?.label || item.tipo}
                              </span>
                              {item.usuarios?.nombre && (
                                <span className="text-sm text-gray-400 ml-2">
                                  por {item.usuarios.nombre}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-400 flex-shrink-0">
                              {new Date(item.created_at).toLocaleDateString('es-ES', {
                                day: '2-digit', month: 'short', year: 'numeric',
                              })}
                              {' '}
                              {new Date(item.created_at).toLocaleTimeString('es-ES', {
                                hour: '2-digit', minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-gray-700 text-sm leading-relaxed">{item.resumen}</p>
                          {item.proxima_accion && (
                            <div className="mt-2.5 flex items-start gap-1.5 text-xs text-primary-dark bg-primary-light rounded-lg px-3 py-2">
                              <span className="text-base leading-none mt-0.5">→</span>
                              <span>
                                <strong>Próxima:</strong> {item.proxima_accion}
                                {item.fecha_proxima_accion && (
                                  <span className="text-primary-medium ml-1">
                                    ({new Date(item.fecha_proxima_accion).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })})
                                  </span>
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
