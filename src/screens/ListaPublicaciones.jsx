import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const PAGE_SIZE = 20

const BADGE = {
  listo:             'badge-listo',
  procesando:        'badge-procesando',
  publicado:         'badge-publicado',
  publicado_parcial: 'badge-parcial',
  error:             'badge-error',
}

const ESTADOS = ['listo', 'procesando', 'publicado', 'publicado_parcial', 'error']
const PLATAFORMAS = ['facebook', 'instagram', 'tiktok']

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
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroPlataforma, setFiltroPlataforma] = useState('todas')
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')
  const [pagina, setPagina] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)

  const hayFiltros = filtroEstado !== 'todos' || filtroPlataforma !== 'todas' || filtroDesde !== '' || filtroHasta !== ''

  useEffect(() => { fetchPublicaciones() }, [filtroEstado, filtroPlataforma, filtroDesde, filtroHasta, pagina])

  async function fetchPublicaciones() {
    setLoading(true)
    setError(null)

    // Count query
    let countQuery = supabase
      .from('publicaciones')
      .select('id', { count: 'exact', head: true })
    if (filtroEstado !== 'todos') countQuery = countQuery.eq('estado', filtroEstado)
    if (filtroPlataforma !== 'todas') countQuery = countQuery.eq('plataforma', filtroPlataforma)
    if (filtroDesde) countQuery = countQuery.gte('fecha_publicacion', filtroDesde + 'T00:00:00')
    if (filtroHasta) countQuery = countQuery.lte('fecha_publicacion', filtroHasta + 'T23:59:59')
    const { count } = await countQuery
    const total = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))
    setTotalPaginas(total)

    // Data query
    const start = (pagina - 1) * PAGE_SIZE
    const end = start + PAGE_SIZE - 1
    let dataQuery = supabase
      .from('publicaciones')
      .select('*, vehiculos(nombre)')
      .order('fecha_creacion', { ascending: false })
      .range(start, end)
    if (filtroEstado !== 'todos') dataQuery = dataQuery.eq('estado', filtroEstado)
    if (filtroPlataforma !== 'todas') dataQuery = dataQuery.eq('plataforma', filtroPlataforma)
    if (filtroDesde) dataQuery = dataQuery.gte('fecha_publicacion', filtroDesde + 'T00:00:00')
    if (filtroHasta) dataQuery = dataQuery.lte('fecha_publicacion', filtroHasta + 'T23:59:59')

    const { data, error } = await dataQuery
    if (error) setError(error.message)
    else setPublicaciones(data)
    setLoading(false)
  }

  function handleFiltroEstado(val) {
    setFiltroEstado(val)
    setPagina(1)
  }

  function handleFiltroPlataforma(val) {
    setFiltroPlataforma(val)
    setPagina(1)
  }

  function handleFiltroDesde(val) {
    setFiltroDesde(val)
    setPagina(1)
  }

  function handleFiltroHasta(val) {
    setFiltroHasta(val)
    setPagina(1)
  }

  function limpiarFiltros() {
    setFiltroEstado('todos')
    setFiltroPlataforma('todas')
    setFiltroDesde('')
    setFiltroHasta('')
    setPagina(1)
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 className="screen-title" style={{ margin: 0 }}>Publicaciones programadas</h1>
        <button className="btn btn-primary btn-sm" onClick={fetchPublicaciones}>
          Actualizar
        </button>
      </div>

      <div className="filters-bar">
        <div className="filter-group">
          <label className="filter-label">Estado</label>
          <select
            className="filter-select"
            value={filtroEstado}
            onChange={e => handleFiltroEstado(e.target.value)}
          >
            <option value="todos">Todos</option>
            {ESTADOS.map(e => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Plataforma</label>
          <select
            className="filter-select"
            value={filtroPlataforma}
            onChange={e => handleFiltroPlataforma(e.target.value)}
          >
            <option value="todas">Todas</option>
            {PLATAFORMAS.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Desde</label>
          <input
            type="date"
            className="filter-select"
            value={filtroDesde}
            onChange={e => handleFiltroDesde(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label className="filter-label">Hasta</label>
          <input
            type="date"
            className="filter-select"
            value={filtroHasta}
            onChange={e => handleFiltroHasta(e.target.value)}
          />
        </div>
        {hayFiltros && (
          <div className="filter-group">
            <button className="btn btn-warning btn-sm" onClick={limpiarFiltros}>
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {error && <div className="alert-error">{error}</div>}

      <div className="card">
        {loading ? (
          <p className="empty-msg">Cargando publicaciones...</p>
        ) : publicaciones.length === 0 ? (
          <p className="empty-msg">No hay publicaciones para los filtros seleccionados.</p>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Vehículo</th>
                    <th>Plataforma</th>
                    <th>Fecha</th>
                    <th>Caption</th>
                    <th>Estado</th>
                    <th>Resultado por cuenta</th>
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
                      <td style={{ maxWidth: 280, fontSize: '0.78em', color: '#666', lineHeight: 1.5 }}>
                        {p.resultado_detalle || '—'}
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

            {totalPaginas > 1 && (
              <div className="pagination">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setPagina(p => p - 1)}
                  disabled={pagina === 1}
                >
                  ← Anterior
                </button>
                <span className="page-info">Página {pagina} de {totalPaginas}</span>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setPagina(p => p + 1)}
                  disabled={pagina === totalPaginas}
                >
                  Siguiente →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
