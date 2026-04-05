import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const BADGE = {
  listo:      'badge-listo',
  procesando: 'badge-procesando',
  publicado:  'badge-publicado',
  error:      'badge-error',
}

function formatFecha(iso) {
  const d = new Date(iso)
  return d.toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function ListaPublicaciones() {
  const [publicaciones, setPublicaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { fetchPublicaciones() }, [])

  async function fetchPublicaciones() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('publicaciones')
      .select('*, vehiculos(nombre)')
      .order('fecha_publicacion', { ascending: true })
    if (error) setError(error.message)
    else setPublicaciones(data)
    setLoading(false)
  }

  async function handleEliminar(id) {
    if (!confirm('¿Eliminar esta publicación?')) return
    const { error } = await supabase
      .from('publicaciones')
      .delete()
      .eq('id', id)
      .eq('estado', 'listo')
    if (error) { setError(error.message); return }
    fetchPublicaciones()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="screen-title" style={{ margin: 0 }}>Publicaciones programadas</h1>
        <button className="btn btn-primary btn-sm" onClick={fetchPublicaciones}>
          Actualizar
        </button>
      </div>

      {error && <div className="alert-error">{error}</div>}

      <div className="card">
        {loading ? (
          <p className="empty-msg">Cargando publicaciones...</p>
        ) : publicaciones.length === 0 ? (
          <p className="empty-msg">No hay publicaciones programadas aún.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Vehículo</th>
                  <th>Plataforma</th>
                  <th>Fecha</th>
                  <th>Caption</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {publicaciones.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.vehiculos?.nombre ?? '—'}</td>
                    <td style={{ textTransform: 'capitalize' }}>{p.plataforma}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatFecha(p.fecha_publicacion)}</td>
                    <td style={{ maxWidth: 220, color: p.caption ? '#333' : '#aaa' }}>
                      {p.caption || 'Generado por IA'}
                    </td>
                    <td>
                      <span className={`badge ${BADGE[p.estado] ?? 'badge-listo'}`}>
                        {p.estado}
                      </span>
                    </td>
                    <td>
                      {p.estado === 'listo' && (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleEliminar(p.id)}
                        >
                          Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
