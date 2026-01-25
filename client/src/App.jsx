import { useState } from 'react'
import Menu from './pages/game/Menu'
import Game from './pages/game/Game'
import Characters from './pages/game/Characters'
import Chat from './pages/chat/chat'

function App() {
  const [view, setView] = useState('menu') // 'menu', 'game', 'characters', 'chat'

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
        <Characters onBack={() => setView('menu')} onChat={() => setView('chat')} />
      )}

      {view === 'chat' && (
        <Chat onBack={() => setView('menu')} />
      )}
    </div>
  )
}

export default App
