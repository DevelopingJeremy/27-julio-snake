import { useState } from 'react'
import Menu from './pages/game/Menu'
import Game from './pages/game/Game'
import Characters from './pages/game/Characters'

function App() {
  const [view, setView] = useState('menu') // 'menu', 'game', 'characters'

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      {view === 'menu' && (
        <Menu 
          onStart={() => setView('game')} 
          onCharacters={() => setView('characters')} 
        />
      )}
      
      {view === 'game' && (
        <Game onBack={() => setView('menu')} />
      )}
      
      {view === 'characters' && (
        <Characters onBack={() => setView('menu')} />
      )}
    </div>
  )
}

export default App
