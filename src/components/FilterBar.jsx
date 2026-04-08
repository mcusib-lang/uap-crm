import { useState, useEffect, useRef } from 'react'
import { SlidersHorizontal, ChevronDown, Check, X, RotateCcw } from 'lucide-react'
import { ESTADOS } from './KanbanBoard'

const SEGMENTOS_OPTS = [
  { value: '', label: 'Todos' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'ayuntamiento', label: 'Ayuntamiento' },
  { value: 'itv', label: 'ITV' },
  { value: 'otros', label: 'Otros' },
]

export const DEFAULT_FILTROS = {
  soloActivos: true,
  responsable: '',
  segmento: '',
  estados: ESTADOS.filter(e => e !== 'Descartado'),
}

function isDefault(filtros) {
  const def = DEFAULT_FILTROS
  return (
    filtros.soloActivos === def.soloActivos &&
    filtros.responsable === def.responsable &&
    filtros.segmento === def.segmento &&
    filtros.estados.length === def.estados.length &&
    def.estados.every(e => filtros.estados.includes(e))
  )
}

export default function FilterBar({
  usuarios,
  filtros,
  onChange,
  totalContactos,
  totalFiltrados,
  busqueda,
}) {
  const [estadosOpen, setEstadosOpen] = useState(false)
  const dropRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setEstadosOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggleEstado = (estado) => {
    const next = filtros.estados.includes(estado)
      ? filtros.estados.filter(e => e !== estado)
      : [...filtros.estados, estado]
    onChange({ ...filtros, estados: next })
  }

  const estadosLabel = () => {
    if (filtros.estados.length === 0) return 'Ningún estado'
    if (filtros.estados.length === ESTADOS.length) return 'Todos los estados'
    if (filtros.estados.length <= 2) return filtros.estados.join(', ')
    return `${filtros.estados.length} de ${ESTADOS.length} estados`
  }

  const busquedaActiva = busqueda.length >= 2

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">

      {/* Fila 1: Toggle + Responsable + Estado + Reset */}
      <div className="flex flex-wrap items-center gap-2.5">

        {/* Toggle "Ocultar leads sin gestionar" */}
        <button
          onClick={() => onChange({ ...filtros, soloActivos: !filtros.soloActivos })}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 font-bold text-sm transition-all select-none ${
            filtros.soloActivos
              ? 'bg-primary border-primary text-white shadow-sm'
              : 'bg-white border-gray-200 text-gray-600 hover:border-primary/40'
          }`}
        >
          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
            filtros.soloActivos
              ? 'bg-white border-white'
              : 'border-gray-400 bg-transparent'
          }`}>
            {filtros.soloActivos && (
              <Check size={11} className="text-primary" strokeWidth={3} />
            )}
          </div>
          {filtros.soloActivos ? 'Ocultar leads sin gestionar' : 'Mostrar todos los leads'}
        </button>

        {/* Responsable */}
        <select
          value={filtros.responsable}
          onChange={e => onChange({ ...filtros, responsable: e.target.value })}
          className={`border-2 rounded-xl px-3 py-2.5 text-sm font-semibold bg-white focus:outline-none transition-colors ${
            filtros.responsable ? 'border-primary text-primary' : 'border-gray-200 text-gray-700 hover:border-gray-300'
          }`}
        >
          <option value="">Todos los responsables</option>
          {usuarios.map(u => (
            <option key={u.id} value={u.id}>{u.nombre}</option>
          ))}
        </select>

        {/* Estado multi-select */}
        <div className="relative" ref={dropRef}>
          <button
            onClick={() => setEstadosOpen(o => !o)}
            className={`flex items-center gap-2 border-2 rounded-xl px-3 py-2.5 text-sm font-semibold bg-white focus:outline-none transition-colors ${
              filtros.estados.length !== DEFAULT_FILTROS.estados.length
                ? 'border-primary text-primary'
                : 'border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
          >
            <span>{estadosLabel()}</span>
            <ChevronDown size={14} className={`transition-transform flex-shrink-0 ${estadosOpen ? 'rotate-180' : ''}`} />
          </button>
          {estadosOpen && (
            <div className="absolute top-full left-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-40 w-56 py-1.5 max-h-72 overflow-y-auto scrollbar-thin">
              <div className="flex items-center justify-between px-3 py-1.5 mb-0.5 border-b border-gray-50">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Filtrar estados</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => onChange({ ...filtros, estados: [...ESTADOS] })}
                    className="text-xs text-primary font-bold hover:underline"
                  >Todos</button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={() => onChange({ ...filtros, estados: [] })}
                    className="text-xs text-gray-400 font-bold hover:underline"
                  >Ninguno</button>
                </div>
              </div>
              {ESTADOS.map(e => {
                const checked = filtros.estados.includes(e)
                return (
                  <label
                    key={e}
                    onClick={() => toggleEstado(e)}
                    className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer select-none"
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      checked ? 'bg-primary border-primary' : 'border-gray-300'
                    }`}>
                      {checked && <Check size={10} className="text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-sm text-gray-700">{e}</span>
                  </label>
                )
              })}
            </div>
          )}
        </div>

        {/* Reset — solo si filtros no son default */}
        {(!isDefault(filtros) || busquedaActiva) && (
          <button
            onClick={() => onChange(DEFAULT_FILTROS)}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 font-semibold transition-colors ml-1"
            title="Restablecer filtros"
          >
            <RotateCcw size={14} />
            Resetear
          </button>
        )}
      </div>

      {/* Fila 2: Chips de segmento */}
      <div className="flex flex-wrap gap-2">
        {SEGMENTOS_OPTS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onChange({ ...filtros, segmento: value })}
            className={`px-3.5 py-1.5 rounded-full text-sm font-bold transition-all border-2 ${
              filtros.segmento === value
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-primary hover:text-primary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Contador */}
      <div className="flex items-center gap-2 text-sm text-gray-400 pt-0.5">
        <SlidersHorizontal size={13} className="flex-shrink-0" />
        {busquedaActiva ? (
          <span>
            <span className="font-bold text-gray-700">{totalFiltrados}</span>
            {' '}resultado{totalFiltrados !== 1 ? 's' : ''} para{' '}
            <span className="font-bold text-primary">"{busqueda}"</span>
            {' '}· {totalContactos} contactos en total
          </span>
        ) : (
          <span>
            Mostrando{' '}
            <span className="font-bold text-gray-700">{totalFiltrados}</span>
            {' '}de{' '}
            <span className="font-bold text-gray-700">{totalContactos}</span>
            {' '}contactos
          </span>
        )}
      </div>
    </div>
  )
}
