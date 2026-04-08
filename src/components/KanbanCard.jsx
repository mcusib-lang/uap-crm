import { useNavigate } from 'react-router-dom'
import { Calendar, User, Clock } from 'lucide-react'

const SEGMENT_COLORS = {
  industrial: 'bg-blue-100 text-blue-800',
  ayuntamiento: 'bg-green-100 text-green-800',
  itv: 'bg-orange-100 text-orange-800',
  otros: 'bg-gray-100 text-gray-700',
}

const UMBRALES = {
  industrial: 7,
  itv: 7,
  otros: 7,
  ayuntamiento: 14,
}

function hl(text, query) {
  if (!text) return null
  if (!query || query.length < 2) return text
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="bg-yellow-200 text-yellow-900 rounded-sm not-italic">{part}</mark>
      : part
  )
}

export default function KanbanCard({ contacto, busqueda = '' }) {
  const navigate = useNavigate()

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  const diasDesdeContacto = contacto.fecha_ultimo_contacto
    ? Math.floor((hoy - new Date(contacto.fecha_ultimo_contacto)) / 86400000)
    : null

  const umbral = UMBRALES[contacto.segmento] || 7
  const diasEnRojo = diasDesdeContacto !== null && diasDesdeContacto > umbral

  const fechaVencida = contacto.fecha_proxima_accion
    ? new Date(contacto.fecha_proxima_accion) <= hoy
    : false

  return (
    <div
      onClick={() => navigate(`/contacto/${contacto.id}`)}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 cursor-pointer hover:shadow-md hover:border-primary transition-all"
    >
      {/* Nombre y empresa */}
      <div className="mb-2.5">
        <div className="font-bold text-gray-900 text-base leading-snug">
          {hl(contacto.nombre, busqueda)}
        </div>
        <div className="text-sm text-gray-500 font-medium mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap">
          {hl(contacto.empresa, busqueda)}
        </div>
      </div>

      {/* Badge segmento */}
      {contacto.segmento && (
        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold mb-2.5 capitalize ${
          SEGMENT_COLORS[contacto.segmento] || SEGMENT_COLORS.otros
        }`}>
          {contacto.segmento}
        </span>
      )}

      {/* Responsable */}
      {contacto.responsable_nombre && (
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1.5">
          <User size={11} />
          <span>{contacto.responsable_nombre}</span>
        </div>
      )}

      {/* Días desde último contacto */}
      {diasDesdeContacto !== null ? (
        <div className={`flex items-center gap-1.5 text-xs mb-2 font-medium ${
          diasEnRojo ? 'text-red-600' : 'text-gray-400'
        }`}>
          <Clock size={11} />
          <span>
            {diasDesdeContacto === 0
              ? 'Contactado hoy'
              : `Hace ${diasDesdeContacto} día${diasDesdeContacto !== 1 ? 's' : ''}`}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs mb-2 text-gray-300">
          <Clock size={11} />
          <span>Sin contacto</span>
        </div>
      )}

      {/* Próxima acción */}
      {contacto.proxima_accion && (
        <div className={`text-xs rounded-lg px-2.5 py-1.5 mt-1 border ${
          fechaVencida
            ? 'bg-red-50 text-red-700 border-red-100'
            : 'bg-primary-light text-primary-dark border-blue-100'
        }`}>
          <div className="font-semibold truncate">{contacto.proxima_accion}</div>
          {contacto.fecha_proxima_accion && (
            <div className="flex items-center gap-1 mt-0.5 opacity-75">
              <Calendar size={10} />
              {new Date(contacto.fecha_proxima_accion).toLocaleDateString('es-ES', {
                day: '2-digit', month: 'short'
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
