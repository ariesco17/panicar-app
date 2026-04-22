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

const ESTADOS_POR_TAB = {
  activas:   ['listo', 'procesando'],
  historial: ['publicado', 'publicado_parcial'],
  errores:   ['error'],
}

const PLATAFORMAS = ['facebook', 'instagram', 'instagram_historia', 'tiktok']

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

  const [tabActiva, setTabActiva] = useState('activas')

  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroPlataforma, setFiltroPlataforma] = useState('todas')
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')
  const [filtroVehiculo, setFiltroVehiculo] = useState('')

  const [pagina, setPagina] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)

  const [vistaAgrupada, setVistaAgrupada] = useState(false)
  const [expandidos, setExpandidos] = useState(new Set())

  const estadosTab = ESTADOS_POR_TAB[tabActiva]
  const hayFiltros = filtroEstado !== 'todos' || filtroPlataforma !== 'todas' || filtroDesde !== '' || filtroHasta !== '' || filtroVehiculo !== ''

  useEffect(() => { fetchPublicaciones() }, [tabActiva, filtroEstado, filtroPlataforma, filtroDesde, filtroHasta, filtroVehiculo, pagina])

  async function fetchPublicaciones() {
    setLoading(true)
    setError(null)

    let vehiculoIds = null
    if (filtroVehiculo.trim()) {
      const { data: vehData } = await supabase
        .from('vehiculos')
        .select('id')
        .ilike('nombre', `%${filtroVehiculo.trim()}%`)
      if (!vehData || vehData.length === 0) {
        setPublicaciones([])
        setTotalPaginas(1)
        setLoading(false)
        return
      }
      vehiculoIds = vehData.map(v => v.id)
    }

    function applyFilters(q) {
      if (filtroEstado !== 'todos') {
        q = q.eq('estado', filtroEstado)
      } else {
        q = q.in('estado', estadosTab)
      }
      if (filtroPlataforma !== 'todas') q = q.eq('plataforma', filtroPlataforma)
      if (filtroDesde) q = q.gte('fecha_publicacion', filtroDesde + 'T00:00:00')
      if (filtroHasta) q = q.lte('fecha_publicacion', filtroHasta + 'T23:59:59')
      if (vehiculoIds) q = q.in('vehiculo_id', vehiculoIds)
      return q
    }

    let countQuery = supabase.from('publicaciones').select('id', { count: 'exact', head: true })
    countQuery = applyFilters(countQuery)
    const { count } = await countQuery
    const total = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))
    setTotalPaginas(total)

    const start = (pagina - 1) * PAGE_SIZE
    const end = start + PAGE_SIZE - 1
    let dataQuery = supabase
      .from('publicaciones')
      .select('*, vehiculos(nombre)')
      .order('fecha_publicacion', { ascending: false })
      .order('fecha_creacion', { ascending: false })
      .range(start, end)
    dataQuery = applyFilters(dataQuery)

    const { data, error } = await dataQuery
    if (error) setError(error.message)
    else setPublicaciones(data)
    setLoading(false)
  }

  function handleTabChange(tab) {
    setTabActiva(tab)
    setFiltroEstado('todos')
    setPagina(1)
    setExpandidos(new Set())
  }

  function handleFiltroEstado(val)      { setFiltroEstado(val);      setPagina(1) }
  function handleFiltroPlataforma(val)  { setFiltroPlataforma(val);  setPagina(1) }
  function handleFiltroDesde(val)       { setFiltroDesde(val);       setPagina(1) }
  function handleFiltroHasta(val)       { setFiltroHasta(val);       setPagina(1) }
  function handleFiltroVehiculo(val)    { setFiltroVehiculo(val);    setPagina(1) }

  function limpiarFiltros() {
    setFiltroEstado('todos')
    setFiltroPlataforma('todas')
    setFiltroDesde('')
    setFiltroHasta('')
    setFiltroVehiculo('')
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

  function toggleGrupo(nombre) {
    setExpandidos(prev => {
      const next = new Set(prev)
      if (next.has(nombre)) next.delete(nombre)
      else next.add(nombre)
      return next
    })
  }

  function agrupar(pubs) {
    const grupos = {}
    for (const p of pubs) {
      const key = p.vehiculos?.nombre ?? '—'
      if (!grupos[key]) grupos[key] = []
      grupos[key].push(p)
    }
    return Object.entries(grupos).sort(([a], [b]) => a.localeCompare(b))
  }

  function renderFilas(pubs) {
    const esTabErrores = tabActiva === 'errores'
    return pubs.map(p => (
      <tr key={p.id} style={esTabErrores ? { background: '#fff5f5' } : {}}>
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
        <td style={{
          maxWidth: esTabErrores ? 400 : 280,
          fontSize: esTabErrores ? '0.82em' : '0.78em',
          color: esTabErrores ? '#b91c1c' : '#666',
          lineHeight: 1.5,
          wordBreak: 'break-word',
        }}>
          {p.resultado_detalle || '—'}
        </td>
        <td>
          {p.estado === 'listo' && (
            <button className="btn btn-danger btn-sm" onClick={() => handleEliminar(p.id)}>
              Eliminar
            </button>
          )}
        </td>
      </tr>
    ))
  }

  function renderTabla() {
    if (loading) return <p className="empty-msg">Cargando publicaciones...</p>
    if (publicaciones.length === 0) return <p className="empty-msg">No hay publicaciones para los filtros seleccionados.</p>

    if (vistaAgrupada) {
      const grupos = agrupar(publicaciones)
      return (
        <>
          {grupos.map(([nombre, pubs]) => {
            const abierto = expandidos.has(nombre)
            return (
              <div key={nombre} style={{ marginBottom: 12 }}>
                <div
                  className="grupo-header"
                  onClick={() => toggleGrupo(nombre)}
                  style={{
                    cursor: 'pointer',
                    background: '#f0f4f8',
                    padding: '8px 14px',
                    borderRadius: 6,
                    fontWeight: 600,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    userSelect: 'none',
                  }}
                >
                  <span>{nombre} <span style={{ color: '#888', fontWeight: 400 }}>({pubs.length})</span></span>
                  <span style={{ fontSize: '0.85em', color: '#666' }}>{abierto ? '▲ Ocultar' : '▼ Ver'}</span>
                </div>
                {abierto && (
                  <div className="table-wrap" style={{ marginTop: 4 }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Vehículo</th><th>Plataforma</th><th>Fecha</th>
                          <th>Caption</th><th>Estado</th><th>Resultado por cuenta</th><th></th>
                        </tr>
                      </thead>
                      <tbody>{renderFilas(pubs)}</tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </>
      )
    }

    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Vehículo</th><th>Plataforma</th><th>Fecha</th>
              <th>Caption</th><th>Estado</th><th>Resultado por cuenta</th><th></th>
            </tr>
          </thead>
          <tbody>{renderFilas(publicaciones)}</tbody>
        </table>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h1 className="screen-title" style={{ margin: 0 }}>Publicaciones programadas</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn btn-sm ${!vistaAgrupada ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setVistaAgrupada(false)}
            title="Vista lista"
          >
            ≡ Lista
          </button>
          <button
            className={`btn btn-sm ${vistaAgrupada ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setVistaAgrupada(true)}
            title="Vista agrupada"
          >
            ⊞ Agrupada
          </button>
          <button className="btn btn-primary btn-sm" onClick={fetchPublicaciones}>
            Actualizar
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '2px solid #e2e8f0' }}>
        {[
          { key: 'activas',   label: 'Activas' },
          { key: 'historial', label: 'Historial' },
          { key: 'errores',   label: 'Errores' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            style={{
              padding: '8px 20px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: tabActiva === key ? 700 : 400,
              color: tabActiva === key ? (key === 'errores' ? '#dc2626' : '#2563eb') : '#666',
              borderBottom: tabActiva === key ? `2px solid ${key === 'errores' ? '#dc2626' : '#2563eb'}` : '2px solid transparent',
              marginBottom: -2,
              fontSize: '0.95em',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="filters-bar">
        {tabActiva !== 'errores' && (
          <div className="filter-group">
            <label className="filter-label">Estado</label>
            <select
              className="filter-select"
              value={filtroEstado}
              onChange={e => handleFiltroEstado(e.target.value)}
            >
              <option value="todos">Todos</option>
              {estadosTab.map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
        )}
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
          <label className="filter-label">Vehículo</label>
          <input
            type="text"
            className="filter-select"
            placeholder="Buscar..."
            value={filtroVehiculo}
            onChange={e => handleFiltroVehiculo(e.target.value)}
          />
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
        {renderTabla()}

        {!loading && publicaciones.length > 0 && totalPaginas > 1 && (
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
      </div>
    </div>
  )
}
