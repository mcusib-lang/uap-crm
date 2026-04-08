import { useNavigate } from 'react-router-dom'
import { ChevronRight, Clock, Calendar } from 'lucide-react'

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
  if (!text) return '—'
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

// Los filtros se aplican en CRM.jsx antes de llegar aquí.
// ContactList solo recibe contactos ya filtrados y busqueda para highlighting.
export default function ContactList({ contactos, usuarios, busqueda = '' }) {
  const navigate = useNavigate()

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  const usersMap = usuarios.reduce((acc, u) => ({ ...acc, [u.id]: u }), {})

  const getDias = (c) => {
    if (!c.fecha_ultimo_contacto) return null
    return Math.floor((hoy - new Date(c.fecha_ultimo_contacto)) / 86400000)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-5 py-3.5 text-sm font-bold text-gray-500">Contacto</th>
              <th className="text-left px-5 py-3.5 text-sm font-bold text-gray-500">Segmento</th>
              <th className="text-left px-5 py-3.5 text-sm font-bold text-gray-500">Estado</th>
              <th className="text-left px-5 py-3.5 text-sm font-bold text-gray-500">Responsable</th>
              <th className="text-left px-5 py-3.5 text-sm font-bold text-gray-500">Último contacto</th>
              <th className="text-left px-5 py-3.5 text-sm font-bold text-gray-500">Próxima acción</th>
              <th className="px-5 py-3.5 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {contactos.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-gray-400 py-14 text-base">
                  No se encontraron contactos
                </td>
              </tr>
            ) : (
              contactos.map(c => {
                const dias = getDias(c)
                const umbral = UMBRALES[c.segmento] || 7
                const diasRojo = dias !== null && dias > umbral
                const resp = usersMap[c.responsable_id]
                const fechaVencida = c.fecha_proxima_accion
                  ? new Date(c.fecha_proxima_accion) <= hoy
                  : false

                return (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/contacto/${c.id}`)}
                    className="hover:bg-primary-light cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold text-gray-800">
                        {hl(c.nombre, busqueda)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {hl(c.empresa, busqueda)}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {c.segmento && (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                          SEGMENT_COLORS[c.segmento] || SEGMENT_COLORS.otros
                        }`}>
                          {c.segmento}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-gray-700">{c.estado}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-gray-600">
                        {resp?.nombre || c.responsable_nombre || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {dias !== null ? (
                        <span className={`flex items-center gap-1.5 text-sm font-medium ${diasRojo ? 'text-red-600' : 'text-gray-500'}`}>
                          <Clock size={14} />
                          {dias === 0 ? 'Hoy' : `Hace ${dias}d`}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {c.fecha_proxima_accion ? (
                        <span className={`flex items-center gap-1.5 text-sm font-medium ${fechaVencida ? 'text-red-600' : 'text-gray-600'}`}>
                          <Calendar size={14} />
                          {new Date(c.fecha_proxima_accion).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <ChevronRight size={18} className="text-gray-300" />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
