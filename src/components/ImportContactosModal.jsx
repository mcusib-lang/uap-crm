import { useState, useCallback } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { X, Upload, FileText, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

// ── Campos destino ────────────────────────────────────────────────────────────
const CAMPOS_DESTINO = [
  { key: 'empresa',              label: 'Empresa',               required: true,  tipo: 'texto' },
  { key: 'nombre',               label: 'Nombre',                required: false, tipo: 'texto' },
  { key: 'segmento',             label: 'Segmento',              required: false, tipo: 'segmento' },
  { key: 'subsector',            label: 'Subsector',             required: false, tipo: 'texto' },
  { key: 'cargo',                label: 'Cargo',                 required: false, tipo: 'texto' },
  { key: 'email',                label: 'Email',                 required: false, tipo: 'texto' },
  { key: 'telefono',             label: 'Teléfono',              required: false, tipo: 'texto' },
  { key: 'web',                  label: 'Web',                   required: false, tipo: 'texto' },
  { key: 'ciudad',               label: 'Ciudad',                required: false, tipo: 'texto' },
  { key: 'provincia',            label: 'Provincia',             required: false, tipo: 'texto' },
  { key: 'comunidad',            label: 'Comunidad',             required: false, tipo: 'texto' },
  { key: 'estado',               label: 'Estado',                required: false, tipo: 'estado' },
  { key: 'fecha_ultimo_contacto',label: 'Últ. contacto',         required: false, tipo: 'fecha' },
  { key: 'proxima_accion',       label: 'Próxima acción',        required: false, tipo: 'texto' },
  { key: 'fecha_proxima_accion', label: 'Fecha próx. acción',    required: false, tipo: 'fecha' },
  { key: 'valor_estimado',       label: 'Valor estimado €',      required: false, tipo: 'numero' },
  { key: 'probabilidad_cierre',  label: 'Prob. cierre (%)',      required: false, tipo: 'numero' },
  { key: 'responsable',          label: 'Responsable',           required: false, tipo: 'responsable' },
  { key: 'notas',                label: 'Notas',                 required: false, tipo: 'texto' },
]

const SEGMENTOS = ['industrial', 'ayuntamiento', 'itv', 'otros']
const ESTADOS_VALIDOS = [
  'Nuevo Lead', 'Contactado', 'En conversación', 'Propuesta enviada',
  'Reunión agendada', 'Negociación', 'Cliente', 'Stand by', 'Descartado',
]

// ── Normalizadores ────────────────────────────────────────────────────────────
function normalizeSegmento(v) {
  if (!v) return null
  const s = v.toString().toLowerCase().trim()
  if (s.includes('industri')) return 'industrial'
  if (s.includes('ayunt') || s.includes('munici')) return 'ayuntamiento'
  if (s === 'itv') return 'itv'
  if (s.includes('otro')) return 'otros'
  return null
}

function normalizeEstado(v) {
  if (!v) return null
  const s = v.toString().trim()
  return ESTADOS_VALIDOS.find(e => e.toLowerCase() === s.toLowerCase()) || null
}

// Acepta dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd, yyyy/mm/dd
function normalizeFecha(v) {
  if (!v) return null
  const s = v.toString().trim()
  if (!s) return null

  // yyyy-mm-dd o yyyy/mm/dd
  const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
  if (isoMatch) {
    const [, y, m, d] = isoMatch
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // dd/mm/yyyy o dd-mm-yyyy
  const esMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
  if (esMatch) {
    const [, d, m, y] = esMatch
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // Número serial de Excel (días desde 1900-01-00)
  const serial = parseInt(s)
  if (!isNaN(serial) && serial > 40000 && serial < 60000) {
    const excelEpoch = new Date(1899, 11, 30)
    const date = new Date(excelEpoch.getTime() + serial * 86400000)
    return date.toISOString().split('T')[0]
  }

  return null
}

function normalizeNumero(v) {
  if (v === '' || v === null || v === undefined) return null
  const n = parseFloat(String(v).replace(',', '.').replace(/[^\d.-]/g, ''))
  return isNaN(n) ? null : n
}

// Intenta mapear un texto de responsable a un UUID por coincidencia parcial de nombre
function resolveResponsable(textoRaw, usuarios) {
  if (!textoRaw) return null
  const texto = textoRaw.toString().toLowerCase().trim()
  const match = usuarios.find(u => {
    const nombre = u.nombre.toLowerCase()
    return nombre.includes(texto) || texto.includes(nombre.split(' ')[0])
  })
  return match?.id || null
}

// ── Leer archivo ─────────────────────────────────────────────────────────────
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
        } catch (err) { reject(err) }
      }
      reader.onerror = reject
      reader.readAsArrayBuffer(file)
    } else {
      reject(new Error('Formato no admitido. Usa .csv o .xlsx'))
    }
  })
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export default function ImportContactosModal({ usuarios, onClose, onImported }) {
  const [paso, setPaso] = useState(1)
  const [filas, setFilas] = useState([])
  const [columnas, setColumnas] = useState([])
  const [mapeo, setMapeo] = useState({})          // { campo_destino: columna_origen }
  const [segmentoGlobal, setSegmentoGlobal] = useState('industrial')
  const [responsableId, setResponsableId] = useState('')
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)
  const [resultado, setResultado] = useState(null)

  // ── Paso 1 ────────────────────────────────────────────────────────────────
  const procesarArchivo = async (file) => {
    setError('')
    try {
      const data = await parseFile(file)
      if (!data.length) { setError('El archivo está vacío'); return }
      const cols = Object.keys(data[0])
      setColumnas(cols)
      setFilas(data)

      // Autodetectar mapeo
      const auto = {}
      for (const campo of CAMPOS_DESTINO) {
        const aliases = [campo.key, campo.label, campo.key.replace(/_/g, ' ')]
        const match = cols.find(c => {
          const cn = c.toLowerCase().replace(/[^a-z0-9áéíóúüñ]/gi, '')
          return aliases.some(a => {
            const an = a.toLowerCase().replace(/[^a-z0-9áéíóúüñ]/gi, '')
            return cn === an || cn.includes(an) || an.includes(cn)
          })
        })
        if (match) auto[campo.key] = match
      }
      setMapeo(auto)
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
    e.target.value = ''
  }

  // ── Paso 2 → importar ────────────────────────────────────────────────────
  const handleImportar = async () => {
    if (!mapeo.empresa) { setError('Debes mapear la columna Empresa'); return }
    setImporting(true); setError('')

    const get = (fila, key) => {
      const col = mapeo[key]
      return col ? String(fila[col] ?? '').trim() : ''
    }

    const registros = filas
      .map(fila => {
        const empresa = get(fila, 'empresa')
        if (!empresa) return null

        const seg = normalizeSegmento(get(fila, 'segmento')) || segmentoGlobal
        const est = normalizeEstado(get(fila, 'estado')) || 'Nuevo Lead'

        // Responsable: columna mapeada tiene prioridad; si no, el selector global
        const respTexto = get(fila, 'responsable')
        const respId = respTexto
          ? resolveResponsable(respTexto, usuarios)
          : (responsableId || null)

        return {
          empresa,
          nombre:                get(fila, 'nombre') || null,
          segmento:              seg,
          subsector:             get(fila, 'subsector') || null,
          cargo:                 get(fila, 'cargo') || null,
          email:                 get(fila, 'email') || null,
          telefono:              get(fila, 'telefono') || null,
          web:                   get(fila, 'web') || null,
          ciudad:                get(fila, 'ciudad') || null,
          provincia:             get(fila, 'provincia') || null,
          comunidad:             get(fila, 'comunidad') || null,
          estado:                est,
          fecha_ultimo_contacto: normalizeFecha(get(fila, 'fecha_ultimo_contacto')),
          proxima_accion:        get(fila, 'proxima_accion') || null,
          fecha_proxima_accion:  normalizeFecha(get(fila, 'fecha_proxima_accion')),
          valor_estimado:        normalizeNumero(get(fila, 'valor_estimado')),
          probabilidad_cierre:   normalizeNumero(get(fila, 'probabilidad_cierre')),
          notas:                 get(fila, 'notas') || null,
          responsable_id:        respId,
        }
      })
      .filter(Boolean)

    let insertados = 0, erroresCount = 0
    const BATCH = 50
    for (let i = 0; i < registros.length; i += BATCH) {
      const lote = registros.slice(i, i + BATCH)
      const { error: err } = await supabase.from('contactos').insert(lote)
      if (err) { console.error('Error en lote', i, err); erroresCount += lote.length }
      else insertados += lote.length
    }

    setImporting(false)
    setResultado({ ok: insertados, errores: erroresCount })
    setPaso(3)
  }

  // ── UI helpers ────────────────────────────────────────────────────────────
  const tieneSegmento = !!mapeo.segmento
  const tieneEstado   = !!mapeo.estado
  const preview       = filas.slice(0, 8)
  const totalValidos  = filas.filter(f => {
    const col = mapeo.empresa
    return col && String(f[col] ?? '').trim()
  }).length

  const sel = 'w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary bg-white'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col">

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

        {/* Indicador pasos */}
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

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto">

          {/* ── PASO 1 ── */}
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
                <p className="text-lg font-bold text-gray-700 mb-1">Arrastra tu archivo aquí</p>
                <p className="text-gray-400 text-sm mb-5">o haz clic para seleccionarlo</p>
                <label className="inline-flex items-center gap-2 bg-primary hover:bg-primary-medium text-white px-6 py-2.5 rounded-xl font-bold cursor-pointer transition-colors text-sm">
                  <FileText size={16} />Seleccionar archivo
                  <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onFileInput} />
                </label>
                <div className="mt-6 inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium px-4 py-2 rounded-xl">
                  <AlertTriangle size={14} />
                  La única columna obligatoria es <strong className="ml-1">Empresa</strong>
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

          {/* ── PASO 2 ── */}
          {paso === 2 && (
            <div className="p-5">
              <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-5">

                {/* Panel izquierdo: mapeo */}
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-gray-800 mb-2">Mapeo de columnas</h3>

                  {CAMPOS_DESTINO.map(({ key, label, required, tipo }) => (
                    <div key={key} className="flex items-center gap-2">
                      <div className="w-36 flex-shrink-0 flex items-center gap-1">
                        <span className="text-xs font-semibold text-gray-700 truncate">{label}</span>
                        {required && <span className="text-red-500 text-xs">*</span>}
                        {tipo === 'fecha' && <span className="text-gray-300 text-xs ml-auto">📅</span>}
                        {tipo === 'numero' && <span className="text-gray-300 text-xs ml-auto">#</span>}
                      </div>
                      <select
                        value={mapeo[key] || ''}
                        onChange={e => setMapeo(prev => {
                          const next = { ...prev }
                          if (e.target.value) next[key] = e.target.value
                          else delete next[key]
                          return next
                        })}
                        className={sel}
                      >
                        <option value="">— No importar —</option>
                        {columnas.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  ))}

                  {/* Segmento global */}
                  {!tieneSegmento && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <p className="text-xs font-bold text-amber-700 mb-1.5">
                        Sin columna de segmento — asignar a todos:
                      </p>
                      <select value={segmentoGlobal} onChange={e => setSegmentoGlobal(e.target.value)} className={sel}>
                        {SEGMENTOS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  )}

                  {/* Responsable global (sólo si no hay columna mapeada) */}
                  {!mapeo.responsable && (
                    <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                      <p className="text-xs font-bold text-gray-600 mb-1.5">Responsable global</p>
                      <select value={responsableId} onChange={e => setResponsableId(e.target.value)} className={sel}>
                        <option value="">— Sin asignar —</option>
                        {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                      </select>
                    </div>
                  )}

                  {mapeo.responsable && (
                    <p className="mt-2 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
                      El texto de la columna "<strong>{mapeo.responsable}</strong>" se mapeará automáticamente a usuarios por coincidencia de nombre.
                    </p>
                  )}

                  {!tieneEstado && (
                    <p className="mt-2 text-xs text-gray-400 flex items-center gap-1.5">
                      <CheckCircle2 size={11} className="text-green-500 flex-shrink-0" />
                      Sin columna de estado → se asigna <strong>Nuevo Lead</strong>
                    </p>
                  )}
                </div>

                {/* Panel derecho: vista previa */}
                <div>
                  <h3 className="text-sm font-bold text-gray-800 mb-2">
                    Vista previa
                    <span className="text-gray-400 font-normal ml-1">(primeras 8 filas)</span>
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          {columnas.map(c => (
                            <th key={c} className={`px-2 py-2 text-left font-bold whitespace-nowrap ${
                              Object.values(mapeo).includes(c) ? 'text-primary bg-blue-50' : 'text-gray-400'
                            }`}>
                              {c}
                              {Object.values(mapeo).includes(c) && (
                                <span className="ml-1 text-primary-dark">✓</span>
                              )}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {preview.map((fila, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            {columnas.map(c => (
                              <td key={c} className={`px-2 py-1.5 truncate max-w-32 ${
                                Object.values(mapeo).includes(c) ? 'text-gray-800 font-medium' : 'text-gray-400'
                              }`}>
                                {String(fila[c] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-1.5 text-xs text-gray-400">
                    {filas.length} filas en total · columnas resaltadas = mapeadas
                  </p>
                </div>
              </div>

              {/* Contador */}
              {!importing && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-blue-800 text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-blue-500 flex-shrink-0" />
                  Se van a importar <strong className="mx-1">{totalValidos}</strong> contactos
                  {totalValidos < filas.length && (
                    <span className="text-blue-500 font-normal">
                      ({filas.length - totalValidos} filas sin empresa serán omitidas)
                    </span>
                  )}
                </div>
              )}

              {error && (
                <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
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
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">¡Importación completada!</h3>
                  <p className="text-gray-500 text-lg">
                    <strong className="text-green-600 text-4xl block mb-1">{resultado.ok}</strong>
                    contactos importados correctamente
                  </p>
                  {resultado.errores > 0 && (
                    <p className="text-orange-600 text-sm mt-3">
                      {resultado.errores} filas no pudieron importarse (ver consola del navegador)
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle size={44} className="text-red-500" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Error en la importación</h3>
                  <p className="text-gray-500">No se importó ningún contacto. Revisa la consola del navegador.</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={() => paso > 1 && paso < 3 ? setPaso(p => p - 1) : onClose()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors text-sm"
          >
            {paso > 1 && paso < 3 && <ArrowLeft size={16} />}
            {paso === 3 ? 'Cerrar' : paso === 1 ? 'Cancelar' : 'Atrás'}
          </button>

          {paso === 1 && (
            <span className="text-sm text-gray-400">Selecciona un archivo para continuar</span>
          )}

          {paso === 2 && (
            <button
              onClick={handleImportar}
              disabled={!mapeo.empresa || importing || totalValidos === 0}
              className="flex items-center gap-2 bg-primary hover:bg-primary-medium text-white px-7 py-2.5 rounded-xl font-bold transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {importing
                ? <><Loader2 size={16} className="animate-spin" />Importando {totalValidos} contactos...</>
                : <>Importar {totalValidos} contactos <ArrowRight size={16} /></>
              }
            </button>
          )}

          {paso === 3 && resultado?.ok > 0 && (
            <button
              onClick={() => { onImported(); onClose() }}
              className="flex items-center gap-2 bg-primary hover:bg-primary-medium text-white px-6 py-2.5 rounded-xl font-bold transition-colors text-sm shadow-sm"
            >
              <CheckCircle2 size={16} />Ver contactos importados
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
