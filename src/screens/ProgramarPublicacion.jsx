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

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function ProgramarPublicacion() {
  const [vehiculos, setVehiculos] = useState([])
  const [form, setForm] = useState({
    vehiculo_id: '',
    plataforma: 'facebook',
    tipo_archivo: 'foto',
    fecha: todayISO(),
    hora: '09:00',
    caption: '',
  })
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

  async function handleGuardar(e) {
    e.preventDefault()
    setError(null)
    if (!form.vehiculo_id) { setError('Selecciona un vehículo.'); return }
    setSaving(true)
    const fecha_publicacion = new Date(`${form.fecha}T${form.hora}:00`).toISOString()
    const { error } = await supabase.from('publicaciones').insert({
      vehiculo_id: form.vehiculo_id,
      plataforma: form.plataforma,
      tipo_archivo: form.tipo_archivo,
      fecha_publicacion,
      caption: form.caption.trim() || null,
      estado: 'listo',
    })
    setSaving(false)
    if (error) { setError(error.message); return }
    setSuccess('Publicación programada correctamente.')
    setForm(f => ({ ...f, caption: '', fecha: todayISO(), hora: '09:00' }))
    setTimeout(() => setSuccess(null), 4000)
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

          <div className="form-row">
            <div className="form-group">
              <label>Fecha</label>
              <input
                type="date"
                className="form-control"
                value={form.fecha}
                min={todayISO()}
                onChange={e => setField('fecha', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Hora</label>
              <select
                className="form-control"
                value={form.hora}
                onChange={e => setField('hora', e.target.value)}
              >
                {TIME_OPTIONS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
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
            disabled={saving || vehiculos.length === 0}
          >
            {saving ? 'Guardando...' : 'Guardar publicación'}
          </button>
        </form>
      </div>
    </div>
  )
}
