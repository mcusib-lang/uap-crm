import { useState, useCallback } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { X, Upload, FileText, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

const CAMPOS_DESTINO = [
  { key: 'empresa',   label: 'Empresa',   required: true },
  { key: 'nombre',    label: 'Nombre',    required: false },
  { key: 'segmento',  label: 'Segmento',  required: false },
  { key: 'subsector', label: 'Subsector', required: false },
  { key: 'cargo',     label: 'Cargo',     required: false },
  { key: 'email',     label: 'Email',     required: false },
  { key: 'telefono',  label: 'Teléfono',  required: false },
  { key: 'ciudad',    label: 'Ciudad',    required: false },
  { key: 'provincia', label: 'Provincia', required: false },
  { key: 'estado',    label: 'Estado',    required: false },
  { key: 'notas',     label: 'Notas',     required: false },
]

const SEGMENTOS = ['industrial', 'ayuntamiento', 'itv', 'otros']
const ESTADOS_VALIDOS = [
  'Nuevo Lead', 'Contactado', 'En conversación', 'Propuesta enviada',
  'Reunión agendada', 'Negociación', 'Cliente', 'Stand by', 'Descartado',
]

function normalizeSegmento(v) {
  if (!v) return null
  const s = v.toString().toLowerCase().trim()
  if (s === 'industrial' || s === 'industria') return 'industrial'
  if (s === 'ayuntamiento' || s === 'municipio') return 'ayuntamiento'
  if (s === 'itv') return 'itv'
  if (s === 'otros' || s === 'otro') return 'otros'
  return null
}

function normalizeEstado(v) {
  if (!v) return null
  const s = v.toString().trim()
  return ESTADOS_VALIDOS.find(e => e.toLowerCase() === s.toLowerCase()) || null
}

function parseFile(file) {
  return new Promise((resolve, reject) => {
    const ext = file.name.split('.').pop().toLowerCase()
    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: result => resolve(result.data),
        error: err => reject(err),
      })
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader()
      reader.onload = e => {
        try {
          const wb = XLSX.read(e.target.result, { type: 'array' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const data = XLSX.utils.sheet_to_json(ws, { defval: '' })
          resolve(data)
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = reject
      reader.readAsArrayBuffer(file)
    } else {
      reject(new Error('Formato no admitido. Usa .csv o .xlsx'))
    }
  })
}

export default function ImportContactosModal({ usuarios, onClose, onImported }) {
  const [paso, setPaso] = useState(1)
  const [archivo, setArchivo] = useState(null)
  const [filas, setFilas] = useState([])
  const [columnas, setColumnas] = useState([])   // columnas detectadas en el archivo
  const [mapeo, setMapeo] = useState({})          // { campo_destino: columna_origen }
  const [segmentoGlobal, setSegmentoGlobal] = useState('industrial')
  const [responsableId, setResponsableId] = useState('')
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)
  const [resultado, setResultado] = useState(null)  // { ok, errores }

  // ── Paso 1: cargar archivo ─────────────────────────────────────────────────
  const procesarArchivo = async (file) => {
    setError('')
    setArchivo(file)
    try {
      const data = await parseFile(file)
      if (!data.length) { setError('El archivo está vacío'); return }
      const cols = Object.keys(data[0])
      setColumnas(cols)
      setFilas(data)
      // Autodetectar mapeo por similitud de nombre
      const autoMapeo = {}
      for (const campo of CAMPOS_DESTINO) {
        const match = cols.find(c =>
          c.toLowerCase().replace(/[^a-záéíóúüñ]/gi, '') ===
          campo.key.toLowerCase().replace(/[^a-záéíóúüñ]/gi, '') ||
          c.toLowerCase().includes(campo.key.toLowerCase()) ||
          c.toLowerCase().includes(campo.label.toLowerCase())
        )
        if (match) autoMapeo[campo.key] = match
      }
      setMapeo(autoMapeo)
      setPaso(2)
    } catch (e) {
      setError(e.message || 'Error leyendo el archivo')
    }
  }

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) procesarArchivo(file)
  }, [])

  const onFileInput = (e) => {
    const file = e.target.files[0]
    if (file) procesarArchivo(file)
  }

  // ── Paso 3: importar ───────────────────────────────────────────────────────
  const handleImportar = async () => {
    if (!mapeo.empresa) { setError('Debes mapear la columna Empresa'); return }
    setImporting(true); setError('')

    const registros = filas
      .map(fila => {
        const get = (key) => {
          const col = mapeo[key]
          return col ? String(fila[col] ?? '').trim() : ''
        }
        const empresa = get('empresa')
        if (!empresa) return null  // omitir filas sin empresa

        const seg = normalizeSegmento(get('segmento')) || segmentoGlobal
        const est = normalizeEstado(get('estado')) || 'Nuevo Lead'

        return {
          empresa,
          nombre:    get('nombre') || null,
          segmento:  seg,
          subsector: get('subsector') || null,
          cargo:     get('cargo') || null,
          email:     get('email') || null,
          telefono:  get('telefono') || null,
          ciudad:    get('ciudad') || null,
          provincia: get('provincia') || null,
          estado:    est,
          notas:     get('notas') || null,
          responsable_id: responsableId || null,
        }
      })
      .filter(Boolean)

    let insertados = 0
    let erroresCount = 0
    const BATCH = 50

    for (let i = 0; i < registros.length; i += BATCH) {
      const lote = registros.slice(i, i + BATCH)
      const { error: err } = await supabase.from('contactos').insert(lote)
      if (err) {
        console.error('Error en lote', i, err)
        erroresCount += lote.length
      } else {
        insertados += lote.length
      }
    }

    setImporting(false)
    setResultado({ ok: insertados, errores: erroresCount })
    setPaso(3)
  }

  // ── Helpers UI ─────────────────────────────────────────────────────────────
  const tieneSegmento = !!mapeo.segmento
  const tieneEstado   = !!mapeo.estado
  const preview = filas.slice(0, 5)

  const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white'
  const sel = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">

        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-primary-dark">Importar Contactos</h2>
            <p className="text-sm text-gray-400">
              {paso === 1 && 'Paso 1 de 3 — Seleccionar archivo'}
              {paso === 2 && `Paso 2 de 3 — Mapear columnas · ${filas.length} filas detectadas`}
              {paso === 3 && 'Paso 3 de 3 — Resultado'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Indicador de pasos */}
        <div className="flex items-center gap-2 px-6 py-3 bg-gray-50 border-b border-gray-100 flex-shrink-0">
          {[1, 2, 3].map(n => (
            <div key={n} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                paso > n ? 'bg-green-500 text-white' : paso === n ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {paso > n ? <CheckCircle2 size={14} /> : n}
              </div>
              <span className={`text-xs font-medium ${paso === n ? 'text-primary' : 'text-gray-400'}`}>
                {n === 1 ? 'Archivo' : n === 2 ? 'Columnas' : 'Importar'}
              </span>
              {n < 3 && <div className="w-8 h-px bg-gray-300 mx-1" />}
            </div>
          ))}
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto">

          {/* ── PASO 1: Subir archivo ── */}
          {paso === 1 && (
            <div className="p-8">
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
                  dragging ? 'border-primary bg-blue-50' : 'border-gray-300 hover:border-primary hover:bg-gray-50'
                }`}
              >
                <Upload size={44} className={`mx-auto mb-4 ${dragging ? 'text-primary' : 'text-gray-300'}`} />
                <p className="text-lg font-bold text-gray-700 mb-1">
                  Arrastra tu archivo aquí
                </p>
                <p className="text-gray-400 text-sm mb-4">o haz clic para seleccionarlo</p>
                <label className="inline-flex items-center gap-2 bg-primary hover:bg-primary-medium text-white px-6 py-2.5 rounded-xl font-bold cursor-pointer transition-colors text-sm">
                  <FileText size={16} />
                  Seleccionar archivo
                  <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onFileInput} />
                </label>
                <div className="mt-6 inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium px-4 py-2 rounded-xl">
                  <AlertTriangle size={14} />
                  La única columna obligatoria es <strong>Empresa</strong>
                </div>
                <p className="mt-3 text-xs text-gray-400">Formatos admitidos: .csv · .xlsx</p>
              </div>
              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                  <AlertTriangle size={16} />{error}
                </div>
              )}
            </div>
          )}

          {/* ── PASO 2: Mapear columnas ── */}
          {paso === 2 && (
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Mapeo de columnas */}
                <div>
                  <h3 className="text-base font-bold text-gray-800 mb-3">Mapeo de columnas</h3>
                  <div className="space-y-2">
                    {CAMPOS_DESTINO.map(({ key, label, required }) => (
                      <div key={key} className="flex items-center gap-3">
                        <div className="w-28 flex-shrink-0">
                          <span className="text-sm font-semibold text-gray-700">{label}</span>
                          {required && <span className="text-red-500 ml-0.5">*</span>}
                        </div>
                        <select
                          value={mapeo[key] || ''}
                          onChange={e => setMapeo(prev => ({ ...prev, [key]: e.target.value || undefined }))}
                          className={`flex-1 ${sel} text-xs`}
                        >
                          <option value="">— No importar —</option>
                          {columnas.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>

                  {/* Segmento global si no hay columna mapeada */}
                  {!tieneSegmento && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <p className="text-xs font-bold text-amber-700 mb-2">
                        Sin columna de segmento — asignar a todos:
                      </p>
                      <select value={segmentoGlobal} onChange={e => setSegmentoGlobal(e.target.value)} className={sel}>
                        {SEGMENTOS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  )}

                  {/* Responsable */}
                  <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                    <p className="text-xs font-bold text-gray-600 mb-2">Responsable (para todos los contactos)</p>
                    <select value={responsableId} onChange={e => setResponsableId(e.target.value)} className={sel}>
                      <option value="">— Sin asignar —</option>
                      {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                    </select>
                  </div>

                  {!tieneEstado && (
                    <p className="mt-3 text-xs text-gray-400 flex items-center gap-1.5">
                      <CheckCircle2 size={12} className="text-green-500" />
                      Sin columna de estado — se asignará <strong>Nuevo Lead</strong> por defecto
                    </p>
                  )}
                </div>

                {/* Vista previa */}
                <div>
                  <h3 className="text-base font-bold text-gray-800 mb-3">
                    Vista previa <span className="text-gray-400 font-normal text-sm">(primeras 5 filas)</span>
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          {columnas.slice(0, 6).map(c => (
                            <th key={c} className="px-2 py-2 text-left font-bold text-gray-500 truncate max-w-24">{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {preview.map((fila, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            {columnas.slice(0, 6).map(c => (
                              <td key={c} className="px-2 py-2 text-gray-600 truncate max-w-24">
                                {String(fila[c] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-xs text-gray-400">
                    {filas.length} filas en total · mostrando máx. 6 columnas
                  </p>
                </div>
              </div>

              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                  <AlertTriangle size={16} />{error}
                </div>
              )}
            </div>
          )}

          {/* ── PASO 3: Resultado ── */}
          {paso === 3 && resultado && (
            <div className="p-8 text-center">
              {resultado.ok > 0 ? (
                <>
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={44} className="text-green-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    ¡Importación completada!
                  </h3>
                  <p className="text-gray-500 text-lg mb-1">
                    <strong className="text-green-600 text-3xl">{resultado.ok}</strong> contactos importados correctamente
                  </p>
                  {resultado.errores > 0 && (
                    <p className="text-orange-600 text-sm mt-2">
                      {resultado.errores} filas no pudieron importarse (revisa la consola para más detalles)
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle size={44} className="text-red-500" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Error en la importación</h3>
                  <p className="text-gray-500">No se pudo importar ningún contacto. Revisa la consola para más detalles.</p>
                </>
              )}
            </div>
          )}

          {/* ── Confirmación previa (paso 2 → 3) ── */}
          {paso === 2 && !importing && (
            <div className="px-6 pb-2">
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-blue-800 text-sm font-medium flex items-center gap-2">
                <CheckCircle2 size={16} className="text-blue-500 flex-shrink-0" />
                Se van a importar <strong>
                  {filas.filter(f => {
                    const col = mapeo.empresa
                    return col && String(f[col] ?? '').trim()
                  }).length}
                </strong> contactos (filas con empresa no vacía)
              </div>
            </div>
          )}
        </div>

        {/* Footer con botones de navegación */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={() => paso > 1 && paso < 3 ? setPaso(p => p - 1) : onClose()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors text-sm"
          >
            {paso < 3 && paso > 1 && <ArrowLeft size={16} />}
            {paso === 3 ? 'Cerrar' : paso === 1 ? 'Cancelar' : 'Atrás'}
          </button>

          {paso === 1 && (
            <div className="text-sm text-gray-400">Selecciona un archivo para continuar</div>
          )}

          {paso === 2 && (
            <button
              onClick={handleImportar}
              disabled={!mapeo.empresa || importing}
              className="flex items-center gap-2 bg-primary hover:bg-primary-medium text-white px-6 py-2.5 rounded-xl font-bold transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {importing ? (
                <><Loader2 size={16} className="animate-spin" />Importando...</>
              ) : (
                <>Importar <ArrowRight size={16} /></>
              )}
            </button>
          )}

          {paso === 3 && resultado?.ok > 0 && (
            <button
              onClick={() => { onImported(); onClose() }}
              className="flex items-center gap-2 bg-primary hover:bg-primary-medium text-white px-6 py-2.5 rounded-xl font-bold transition-colors text-sm shadow-sm"
            >
              <CheckCircle2 size={16} />
              Ver contactos importados
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
