// Plantillas de fases por tipo de proyecto
export const FASES_PILOTO = [
  { nombre: 'Visita técnica y toma de datos', dias: 4 },
  { nombre: 'Instalación sensores de medición', dias: 1 },
  { nombre: 'Periodo de medición base', dias: 21 },
  { nombre: 'Instalación equipo UAP + filtros adaptados', dias: 1 },
  { nombre: 'Análisis resultados', dias: 14 },
  { nombre: 'Informe final y propuesta proyecto definitivo', dias: 7 },
]

export const FASES_FINAL = [
  { nombre: 'Ingeniería y diseño', dias: 7 },
  { nombre: 'Pedido de materiales y filtros', dias: 1 },
  { nombre: 'Fabricación estructura', dias: 28 },
  { nombre: 'Instalación electrónica', dias: 10 },
  { nombre: 'Pruebas internas', dias: 3 },
  { nombre: 'Envío al cliente', dias: 1 },
  { nombre: 'Instalación y puesta en marcha', dias: 2 },
  { nombre: 'Seguimiento post-venta', dias: 28 },
]

// Valor DB (enum Supabase) → label visible en UI
export const ESTADOS_PROYECTO = [
  { value: 'anteproyecto',     label: 'Anteproyecto' },
  { value: 'visita_tecnica',   label: 'Visita técnica' },
  { value: 'propuesta_enviada',label: 'Propuesta enviada' },
  { value: 'piloto_activo',    label: 'Piloto activo' },
  { value: 'fabricacion',      label: 'Fabricación' },
  { value: 'instalacion',      label: 'Instalación' },
  { value: 'puesta_en_marcha', label: 'Puesta en marcha' },
  { value: 'post_venta',       label: 'Post-venta' },
  { value: 'mantenimiento',    label: 'Mantenimiento' },
  { value: 'cerrado',          label: 'Cerrado' },
]

export const TIPOS_PROYECTO = [
  { value: 'piloto',          label: 'Piloto' },
  { value: 'proyecto_final',  label: 'Proyecto Final' },
]

// Helpers: value ↔ label
export const estadoLabel = (value) =>
  ESTADOS_PROYECTO.find(e => e.value === value)?.label ?? value

export const tipoLabel = (value) =>
  TIPOS_PROYECTO.find(t => t.value === value)?.label ?? value

export const MODELOS_UAP = ['S', 'M', 'L', 'XL', 'XXL']

// Genera array de fases con fechas calculadas desde fecha_inicio
export function generarFases(tipo, fechaInicio) {
  const plantilla = tipo === 'piloto' ? FASES_PILOTO : FASES_FINAL
  const fases = []
  let cursor = new Date(fechaInicio)

  plantilla.forEach((f, i) => {
    const inicio = new Date(cursor)
    const fin = new Date(cursor)
    fin.setDate(fin.getDate() + f.dias - 1)
    fases.push({
      nombre: f.nombre,
      orden: i + 1,
      fecha_inicio_plan: inicio.toISOString().split('T')[0],
      fecha_fin_plan: fin.toISOString().split('T')[0],
      completada: false,
    })
    cursor = new Date(fin)
    cursor.setDate(cursor.getDate() + 1)
  })

  return fases
}

export function faseEstado(fase) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  if (fase.completada) return 'completada'
  if (fase.fecha_inicio_real && !fase.completada) return 'en_curso'
  if (fase.fecha_fin_plan && new Date(fase.fecha_fin_plan) < hoy) return 'vencida'
  return 'pendiente'
}
