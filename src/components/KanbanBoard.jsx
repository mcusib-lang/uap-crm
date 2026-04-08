import KanbanCard from './KanbanCard'

export const ESTADOS = [
  'Nuevo Lead',
  'Contactado',
  'En conversación',
  'Propuesta enviada',
  'Reunión agendada',
  'Negociación',
  'Cliente',
  'Stand by',
  'Descartado',
]

const COLUMN_STYLES = {
  'Nuevo Lead':        { border: 'border-gray-300',   bg: 'bg-gray-50',    header: 'text-gray-600' },
  'Contactado':        { border: 'border-blue-300',   bg: 'bg-blue-50',    header: 'text-blue-700' },
  'En conversación':   { border: 'border-indigo-300', bg: 'bg-indigo-50',  header: 'text-indigo-700' },
  'Propuesta enviada': { border: 'border-purple-300', bg: 'bg-purple-50',  header: 'text-purple-700' },
  'Reunión agendada':  { border: 'border-pink-300',   bg: 'bg-pink-50',    header: 'text-pink-700' },
  'Negociación':       { border: 'border-orange-300', bg: 'bg-orange-50',  header: 'text-orange-700' },
  'Cliente':           { border: 'border-green-300',  bg: 'bg-green-50',   header: 'text-green-700' },
  'Stand by':          { border: 'border-yellow-300', bg: 'bg-yellow-50',  header: 'text-yellow-700' },
  'Descartado':        { border: 'border-red-200',    bg: 'bg-red-50',     header: 'text-red-500' },
}

export default function KanbanBoard({ contactos, busqueda = '' }) {
  const grouped = ESTADOS.reduce((acc, estado) => {
    acc[estado] = contactos.filter(c => c.estado === estado)
    return acc
  }, {})

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin" style={{ minHeight: '65vh' }}>
      {ESTADOS.map(estado => {
        const style = COLUMN_STYLES[estado]
        const items = grouped[estado]
        const collapsed = items.length === 0

        if (collapsed) {
          // Columna colapsada: solo cabecera estrecha con texto vertical
          return (
            <div
              key={estado}
              className={`flex-shrink-0 w-12 rounded-2xl border-2 ${style.border} ${style.bg} flex flex-col items-center py-4 gap-3`}
              title={`${estado} (vacío)`}
            >
              <span className={`text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center bg-white/80 shadow-sm ${style.header} opacity-70`}>
                0
              </span>
              <span
                className={`text-xs font-bold ${style.header} opacity-50 select-none`}
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', maxHeight: '160px', overflow: 'hidden' }}
              >
                {estado}
              </span>
            </div>
          )
        }

        // Columna normal con tarjetas
        return (
          <div
            key={estado}
            className={`flex-shrink-0 w-[272px] rounded-2xl border-2 ${style.border} ${style.bg} flex flex-col overflow-hidden`}
          >
            <div className="px-4 py-3 flex items-center justify-between flex-shrink-0">
              <span className={`font-bold text-sm ${style.header}`}>{estado}</span>
              <span className="bg-white/80 text-gray-600 text-xs font-bold rounded-full px-2 py-0.5 shadow-sm">
                {items.length}
              </span>
            </div>
            <div className="flex-1 px-3 pb-3 space-y-2.5 overflow-y-auto scrollbar-thin">
              {items.map(c => (
                <KanbanCard key={c.id} contacto={c} busqueda={busqueda} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
