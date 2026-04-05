import { useState } from 'react'
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
  const [tab, setTab] = useState('vehiculos')

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
      </header>
      <main className="app-main">
        {tab === 'vehiculos' && <Vehiculos />}
        {tab === 'programar' && <ProgramarPublicacion />}
        {tab === 'lista' && <ListaPublicaciones />}
      </main>
    </div>
  )
}
