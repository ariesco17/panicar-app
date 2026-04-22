import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Vehiculos() {
  const [vehiculos, setVehiculos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nombre: '', carpeta_drive_id: '' })
  const [editando, setEditando] = useState(null)
  const [formEdit, setFormEdit] = useState({ nombre: '', carpeta_drive_id: '', tiene_video: false })
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => { fetchVehiculos() }, [])

  async function fetchVehiculos() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('vehiculos')
      .select('*')
      .eq('activo', true)
      .order('fecha_creacion', { ascending: false })
    if (error) setError(error.message)
    else setVehiculos(data)
    setLoading(false)
  }

  async function handleAgregar(e) {
    e.preventDefault()
    if (!form.nombre.trim() || !form.carpeta_drive_id.trim()) return
    setSaving(true)
    setError(null)
    const { error } = await supabase.from('vehiculos').insert({
      nombre: form.nombre.trim(),
      carpeta_drive_id: form.carpeta_drive_id.trim(),
    })
    setSaving(false)
    if (error) { setError(error.message); return }
    setSuccess('Vehículo agregado correctamente.')
    setForm({ nombre: '', carpeta_drive_id: '' })
    setShowForm(false)
    fetchVehiculos()
    setTimeout(() => setSuccess(null), 4000)
  }

  function handleEditarClick(v) {
    setEditando(v.id)
    setFormEdit({ nombre: v.nombre, carpeta_drive_id: v.carpeta_drive_id, tiene_video: v.tiene_video ?? false })
    setShowForm(false)
    setError(null)
  }

  function handleCancelarEdicion() {
    setEditando(null)
    setFormEdit({ nombre: '', carpeta_drive_id: '', tiene_video: false })
  }

  async function handleGuardarEdicion(e) {
    e.preventDefault()
    if (!formEdit.nombre.trim() || !formEdit.carpeta_drive_id.trim()) return
    setSavingEdit(true)
    setError(null)
    const { error } = await supabase
      .from('vehiculos')
      .update({
        nombre: formEdit.nombre.trim(),
        carpeta_drive_id: formEdit.carpeta_drive_id.trim(),
        tiene_video: formEdit.tiene_video,
      })
      .eq('id', editando)
    setSavingEdit(false)
    if (error) { setError(error.message); return }
    setSuccess('Vehículo actualizado correctamente.')
    setEditando(null)
    fetchVehiculos()
    setTimeout(() => setSuccess(null), 4000)
  }

  async function handleVender(id) {
    if (!confirm('¿Marcar este vehículo como vendido?')) return
    const { error } = await supabase
      .from('vehiculos')
      .update({ activo: false })
      .eq('id', id)
    if (error) { setError(error.message); return }
    setSuccess('Vehículo marcado como vendido.')
    fetchVehiculos()
    setTimeout(() => setSuccess(null), 4000)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="screen-title" style={{ margin: 0 }}>Vehículos activos</h1>
        <button className="btn btn-primary" onClick={() => { setShowForm(v => !v); setEditando(null); setError(null) }}>
          {showForm ? 'Cancelar' : '+ Agregar vehículo'}
        </button>
      </div>

      {error   && <div className="alert-error">{error}</div>}
      {success && <div className="alert-success">{success}</div>}

      {showForm && (
        <div className="card">
          <p className="section-subtitle">Nuevo vehículo</p>
          <form onSubmit={handleAgregar}>
            <div className="form-group">
              <label>Nombre del vehículo</label>
              <input
                className="form-control"
                placeholder="Toyota Allion 2005 Blanco"
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label>ID de carpeta de Google Drive</label>
              <input
                className="form-control"
                placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                value={form.carpeta_drive_id}
                onChange={e => setForm(f => ({ ...f, carpeta_drive_id: e.target.value }))}
                required
              />
              <span className="hint">Puedes encontrarlo en la URL de la carpeta de Drive.</span>
            </div>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar vehículo'}
            </button>
          </form>
        </div>
      )}

      <div className="card">
        {loading ? (
          <p className="empty-msg">Cargando vehículos...</p>
        ) : vehiculos.length === 0 ? (
          <p className="empty-msg">No hay vehículos activos. ¡Agrega el primero!</p>
        ) : (
          vehiculos.map(v => (
            <div key={v.id}>
              <div className="vehiculo-item">
                <div>
                  <div className="vehiculo-nombre">{v.nombre}</div>
                  <div className="vehiculo-drive">Drive: {v.carpeta_drive_id}</div>
                  {v.tiene_video && (
                    <div style={{ fontSize: '0.78em', color: '#16a34a', marginTop: 2 }}>
                      Video disponible
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => editando === v.id ? handleCancelarEdicion() : handleEditarClick(v)}
                  >
                    {editando === v.id ? 'Cancelar' : 'Editar'}
                  </button>
                  <button
                    className="btn btn-warning btn-sm"
                    onClick={() => handleVender(v.id)}
                  >
                    Marcar como vendido
                  </button>
                </div>
              </div>

              {editando === v.id && (
                <div className="card" style={{ margin: '0 0 12px 0', background: '#f8fafc', borderTop: '2px solid #3b82f6' }}>
                  <p className="section-subtitle" style={{ marginBottom: 12 }}>Editar vehículo</p>
                  <form onSubmit={handleGuardarEdicion}>
                    <div className="form-group">
                      <label>Nombre del vehículo</label>
                      <input
                        className="form-control"
                        value={formEdit.nombre}
                        onChange={e => setFormEdit(f => ({ ...f, nombre: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>ID de carpeta de Google Drive</label>
                      <input
                        className="form-control"
                        value={formEdit.carpeta_drive_id}
                        onChange={e => setFormEdit(f => ({ ...f, carpeta_drive_id: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 400 }}>
                        <input
                          type="checkbox"
                          checked={formEdit.tiene_video}
                          onChange={e => setFormEdit(f => ({ ...f, tiene_video: e.target.checked }))}
                          style={{ width: 18, height: 18 }}
                        />
                        ¿Tiene video disponible en Drive?
                      </label>
                      <span className="hint">Activa esto si la carpeta Drive del vehículo contiene un archivo de video.</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-primary" type="submit" disabled={savingEdit}>
                        {savingEdit ? 'Guardando...' : 'Guardar cambios'}
                      </button>
                      <button className="btn btn-secondary" type="button" onClick={handleCancelarEdicion}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
