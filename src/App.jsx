import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Login from './screens/Login'
import Vehiculos from './screens/Vehiculos'
import ProgramarPublicacion from './screens/ProgramarPublicacion'
import ListaPublicaciones from './screens/ListaPublicaciones'
import './App.css'

const TABS = [
  { id: 'vehiculos', label: '🚗 Vehículos' },
  { id: 'programar', label: '📅 Programar' },
  { id: 'lista', label: '📋 Publicaciones' },
]

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = cargando
  const [tab, setTab] = useState('vehiculos')

  useEffect(() => {
    // Recuperar sesión existente al cargar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // Escuchar cambios de sesión (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Pantalla de carga mientras se verifica la sesión
  if (session === undefined) {
    return <div className="login-wrapper"><p style={{ color: '#fff' }}>Cargando...</p></div>
  }

  // Sin sesión → pantalla de login
  if (!session) {
    return <Login />
  }

  // Con sesión → app completa
  return (
    <div className="app">
      <header className="app-header">
        <div className="app-logo">PANICAR Autocentro</div>
        <nav className="app-nav">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`nav-btn ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <button
          className="btn-logout"
          onClick={() => supabase.auth.signOut()}
        >
          Cerrar sesión
        </button>
      </header>
      <main className="app-main">
        {tab === 'vehiculos' && <Vehiculos />}
        {tab === 'programar' && <ProgramarPublicacion />}
        {tab === 'lista' && <ListaPublicaciones />}
      </main>
    </div>
  )
}
