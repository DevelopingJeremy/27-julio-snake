
import React, { useState } from 'react';
import '../game.css';

const INITIAL_CHARACTERS = [
  { id: 'green', name: 'Original', color: '#22c55e', locked: false },
  { id: 'cyan', name: 'Cyber Blue', color: '#06b6d4', locked: true },
  { id: 'yellow', name: 'Electric Gold', color: '#eab308', locked: true },
  { id: 'purple', name: 'Void Purple', color: '#a855f7', locked: true },
];

const CharacterPreview = ({ color, locked }) => {
  return (
    <div className={`character-preview ${locked ? 'locked' : ''}`}>
      <div style={{ // Tail
        width: '20px', height: '20px', borderRadius: '4px', background: color, opacity: 0.6
      }} />
      <div style={{ // Body
        width: '20px', height: '20px', borderRadius: '4px', background: color, opacity: 0.8
      }} />
      <div style={{ // Head
        width: '20px', height: '20px', borderRadius: '4px', background: color,
        boxShadow: `0 0 10px ${color}`
      }} />
    </div>
  );
};

const Characters = ({ onBack }) => {
  const [characters, setCharacters] = useState(INITIAL_CHARACTERS);
  const [selectedChar, setSelectedChar] = useState(null); // The char attempting to unlock
  const [unlockCode, setUnlockCode] = useState('');
  const [error, setError] = useState('');

  const handleCharacterClick = (char) => {
    if (char.locked) {
      setSelectedChar(char);
      setUnlockCode('');
      setError('');
    } else {
      // Logic for selecting an unlocked character could go here
    }
  };

  const handleUnlock = () => {
    if (unlockCode === '2707') {
        const updatedChars = characters.map(c => 
            c.id === selectedChar.id ? { ...c, locked: false } : c
        );
        setCharacters(updatedChars);
        setSelectedChar(null);
    } else {
        setError('Código incorrecto');
    }
  };

  return (
    <div className="characters-container glass-panel">
      <h2 className="characters-title">Selección de Personajes</h2>

      <div className="characters-grid">
        {characters.map((char) => (
          <div key={char.id} 
          onClick={() => handleCharacterClick(char)}
          className="character-card"
          style={{
            background: char.locked ? 'rgba(255, 255, 255, 0.03)' : `rgba(${parseInt(char.color.slice(1,3),16)}, ${parseInt(char.color.slice(3,5),16)}, ${parseInt(char.color.slice(5,7),16)}, 0.1)`,
            border: `1px solid ${char.locked ? 'var(--glass-border)' : char.color}`,
            boxShadow: char.locked ? 'none' : `0 0 20px ${char.color}33`,
          }}
          >
             <div className="character-preview-container">
                <CharacterPreview color={char.color} locked={char.locked} />
             </div>

            <span className="character-name" style={{ 
               color: char.locked ? 'var(--text-secondary)' : '#fff'
            }}>
              {char.name}
            </span>

            {char.locked && (
               <div className="character-lock-icon">
                  🔒
               </div>
            )}
            
             <div className="character-status" style={{
                 color: char.locked ? '#ef4444' : char.color,
             }}>
                 {char.locked ? 'Bloqueado' : 'Seleccionado'}
             </div>
          </div>
        ))}
      </div>

      <button className="btn" onClick={onBack}>
        Volver
      </button>

      {/* Unlock Modal */}
      {selectedChar && (
          <div className="unlock-modal-overlay">
              <div className="unlock-modal glass-panel" style={{
                  boxShadow: `0 0 50px ${selectedChar.color}44`,
                  border: `1px solid ${selectedChar.color}`
              }}>
                  <h3 className="unlock-title">Desbloquear {selectedChar.name}</h3>
                  <p className="unlock-text">Ingrese el codigo para desbloquearlo</p>
                  
                  <input 
                    type="password" 
                    value={unlockCode}
                    onChange={(e) => setUnlockCode(e.target.value)}
                    placeholder="Código..."
                    className="unlock-input"
                  />
                  
                  {error && <p className="unlock-error">{error}</p>}

                  <div className="unlock-buttons">
                      <button className="btn" style={{ padding: '10px 20px', fontSize: '1rem' }} onClick={() => setSelectedChar(null)}>Cancelar</button>
                      <button className="btn btn-primary" style={{ padding: '10px 20px', fontSize: '1rem' }} onClick={handleUnlock}>Confirmar</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Characters;
