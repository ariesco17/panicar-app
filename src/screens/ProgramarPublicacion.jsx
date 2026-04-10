import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const PLATAFORMAS = [
  { value: 'facebook',  label: 'Facebook',  disabled: false },
  { value: 'instagram', label: 'Instagram', disabled: false },
  { value: 'tiktok',    label: 'TikTok',    disabled: false },
  { value: 'youtube',   label: 'YouTube (próximamente)', disabled: true },
]

function buildTimeOptions() {
  const options = []
  for (let h = 0; h < 24; h++) {
    for (let m of [0, 30]) {
      const hh = String(h).padStart(2, '0')
      const mm = String(m).padStart(2, '0')
      options.push(`${hh}:${mm}`)
    }
  }
  return options
}

const TIME_OPTIONS = buildTimeOptions()

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]
const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function todayStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function CalendarioMultiDia({ seleccionados, onToggle, mesActual, onMesCambiar }) {
  const hoy = todayStr()
  const now = new Date()
  const minYear = now.getFullYear()
  const minMonth = now.getMonth()

  const { year, month } = mesActual
  const primerDia = new Date(year, month, 1).getDay()
  const diasEnMes = new Date(year, month + 1, 0).getDate()

  const esMesAnteriorAlActual = year < minYear || (year === minYear && month <= minMonth)

  const celdas = []
  for (let i = 0; i < primerDia; i++) {
    celdas.push(null)
  }
  for (let d = 1; d <= diasEnMes; d++) {
    celdas.push(d)
  }

  return (
    <div className="calendar-wrap">
      <div className="calendar-header">
        <button
          type="button"
          className="cal-nav-btn"
          onClick={() => onMesCambiar(-1)}
          disabled={esMesAnteriorAlActual}
        >
          ◀
        </button>
        <span className="cal-titulo">{MESES[month]} {year}</span>
        <button
          type="button"
          className="cal-nav-btn"
          onClick={() => onMesCambiar(1)}
        >
          ▶
        </button>
      </div>

      <div className="calendar-grid">
        {DIAS_SEMANA.map(d => (
          <div key={d} className="cal-dia-nombre">{d}</div>
        ))}
        {celdas.map((dia, idx) => {
          if (dia === null) {
            return <div key={`empty-${idx}`} className="cal-day cal-day-empty" />
          }
          const dateStr = toDateStr(year, month, dia)
          const isPast = dateStr < hoy
          const isSelected = seleccionados.has(dateStr)
          return (
            <div
              key={dateStr}
              className={`cal-day${isSelected ? ' selected' : ''}${isPast ? ' disabled' : ''}`}
              onClick={() => !isPast && onToggle(dateStr)}
            >
              {dia}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ProgramarPublicacion() {
  const [vehiculos, setVehiculos] = useState([])
  const [form, setForm] = useState({
    vehiculo_id: '',
    plataforma: 'facebook',
    tipo_archivo: 'foto',
    hora: '09:00',
    caption: '',
  })
  const now = new Date()
  const [mesActual, setMesActual] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [diasSeleccionados, setDiasSeleccionados] = useState(new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    supabase
      .from('vehiculos')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre')
      .then(({ data }) => {
        if (data) {
          setVehiculos(data)
          if (data.length > 0) setForm(f => ({ ...f, vehiculo_id: data[0].id }))
        }
      })
  }, [])

  function setField(key, value) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function toggleDia(dateStr) {
    setDiasSeleccionados(prev => {
      const next = new Set(prev)
      if (next.has(dateStr)) next.delete(dateStr)
      else next.add(dateStr)
      return next
    })
  }

  function cambiarMes(delta) {
    setMesActual(prev => {
      let m = prev.month + delta
      let y = prev.year
      if (m < 0) { m = 11; y-- }
      if (m > 11) { m = 0; y++ }
      return { year: y, month: m }
    })
  }

  async function handleGuardar(e) {
    e.preventDefault()
    setError(null)
    if (!form.vehiculo_id) { setError('Selecciona un vehículo.'); return }
    if (diasSeleccionados.size === 0) { setError('Selecciona al menos un día en el calendario.'); return }

    setSaving(true)
    const inserts = [...diasSeleccionados].sort().map(dia => ({
      vehiculo_id: form.vehiculo_id,
      plataforma: form.plataforma,
      tipo_archivo: form.tipo_archivo,
      fecha_publicacion: new Date(`${dia}T${form.hora}:00`).toISOString(),
      caption: form.caption.trim() || null,
      estado: 'listo',
    }))

    const { error } = await supabase.from('publicaciones').insert(inserts)
    setSaving(false)
    if (error) { setError(error.message); return }

    const count = inserts.length
    setSuccess(`Se programaron ${count} publicación${count !== 1 ? 'es' : ''} correctamente.`)
    setDiasSeleccionados(new Set())
    setForm(f => ({ ...f, caption: '', hora: '09:00' }))
    setTimeout(() => setSuccess(null), 5000)
  }

  return (
    <div>
      <h1 className="screen-title">Programar publicación</h1>

      {error   && <div className="alert-error">{error}</div>}
      {success && <div className="alert-success">{success}</div>}

      <div className="card">
        <form onSubmit={handleGuardar}>
          <div className="form-group">
            <label>Vehículo</label>
            <select
              className="form-control"
              value={form.vehiculo_id}
              onChange={e => setField('vehiculo_id', e.target.value)}
              required
            >
              {vehiculos.length === 0 && <option value="">Sin vehículos activos</option>}
              {vehiculos.map(v => (
                <option key={v.id} value={v.id}>{v.nombre}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Plataforma</label>
            <select
              className="form-control"
              value={form.plataforma}
              onChange={e => setField('plataforma', e.target.value)}
            >
              {PLATAFORMAS.map(p => (
                <option key={p.value} value={p.value} disabled={p.disabled}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>¿Qué deseas publicar?</label>
            <select
              className="form-control"
              value={form.tipo_archivo}
              onChange={e => setField('tipo_archivo', e.target.value)}
            >
              <option value="foto">Foto</option>
              <option value="video">Video</option>
            </select>
          </div>

          <div className="form-group">
            <label>Horario diario</label>
            <select
              className="form-control"
              value={form.hora}
              onChange={e => setField('hora', e.target.value)}
            >
              {TIME_OPTIONS.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <span className="hint">Hora a la que se publicará en cada día seleccionado.</span>
          </div>

          <div className="form-group">
            <label>Días de publicación</label>
            <CalendarioMultiDia
              seleccionados={diasSeleccionados}
              onToggle={toggleDia}
              mesActual={mesActual}
              onMesCambiar={cambiarMes}
            />
            {diasSeleccionados.size > 0 && (
              <span className="selected-count">
                {diasSeleccionados.size} día{diasSeleccionados.size !== 1 ? 's' : ''} seleccionado{diasSeleccionados.size !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="form-group">
            <label>Caption</label>
            <textarea
              className="form-control"
              placeholder="La IA generará el texto automáticamente"
              value={form.caption}
              onChange={e => setField('caption', e.target.value)}
            />
            <span className="hint">Si lo dejas vacío, la IA generará el texto automáticamente.</span>
          </div>

          <button
            className="btn btn-primary"
            type="submit"
            disabled={saving || vehiculos.length === 0 || diasSeleccionados.size === 0}
          >
            {saving ? 'Guardando...' : `Guardar ${diasSeleccionados.size > 0 ? diasSeleccionados.size + ' publicación' + (diasSeleccionados.size !== 1 ? 'es' : '') : 'publicación'}`}
          </button>
        </form>
      </div>
    </div>
  )
}
