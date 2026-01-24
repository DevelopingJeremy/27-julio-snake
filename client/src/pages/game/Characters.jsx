
import React, { useState } from 'react';

const INITIAL_CHARACTERS = [
  { id: 'green', name: 'Original', color: '#22c55e', locked: false },
  { id: 'cyan', name: 'Cyber Blue', color: '#06b6d4', locked: true },
  { id: 'yellow', name: 'Electric Gold', color: '#eab308', locked: true },
  { id: 'purple', name: 'Void Purple', color: '#a855f7', locked: true },
];

const CharacterPreview = ({ color, locked }) => {
  return (
    <div style={{ display: 'flex', gap: '4px', opacity: locked ? 0.5 : 1, filter: locked ? 'grayscale(30%)' : 'none' }}>
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
      // For now, we just visually indicate it's the active one (maybe later)
    }
  };

  const handleUnlock = () => {
    // Simple hardcoded check for demo purposes
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
    <div className="glass-panel" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      width: '100%',
      padding: '2rem',
      position: 'relative'
    }}>
      <h2 style={{
        fontSize: '2.5rem',
        marginBottom: '2rem',
        color: 'var(--text-primary)',
        textTransform: 'uppercase',
        letterSpacing: '2px'
      }}>Selección de Personajes</h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '2rem',
        width: '100%',
        maxWidth: '1000px',
        marginBottom: '3rem'
      }}>
        {characters.map((char) => (
          <div key={char.id} 
          onClick={() => handleCharacterClick(char)}
          style={{
            background: char.locked ? 'rgba(255, 255, 255, 0.03)' : `rgba(${parseInt(char.color.slice(1,3),16)}, ${parseInt(char.color.slice(3,5),16)}, ${parseInt(char.color.slice(5,7),16)}, 0.1)`,
            border: `1px solid ${char.locked ? 'var(--glass-border)' : char.color}`,
            borderRadius: '16px',
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem',
            cursor: 'pointer', // Always pointer to indicate interactability
            boxShadow: char.locked ? 'none' : `0 0 20px ${char.color}33`,
            transition: 'transform 0.2s ease',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-5px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
             {/* Snake Preview */}
             <div style={{
                padding: '1rem',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '12px',
                width: '100%',
                display: 'flex',
                justifyContent: 'center'
             }}>
                <CharacterPreview color={char.color} locked={char.locked} />
             </div>

            <span style={{ 
              fontSize: '1.2rem', 
              fontWeight: '600',
              color: char.locked ? 'var(--text-secondary)' : '#fff'
            }}>
              {char.name}
            </span>

            {char.locked && (
               <div style={{
                   position: 'absolute',
                   top: '10px',
                   right: '10px',
                   background: 'rgba(0,0,0,0.6)',
                   borderRadius: '50%',
                   padding: '5px',
                   width: '30px',
                   height: '30px',
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center'
               }}>
                  🔒
               </div>
            )}
            
             <div style={{
                 fontSize: '0.9rem',
                 color: char.locked ? '#ef4444' : char.color,
                 fontWeight: 'bold',
                 textTransform: 'uppercase',
                 letterSpacing: '1px'
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
          <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(8px)',
              zIndex: 50,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
          }}>
              <div className="glass-panel" style={{
                  padding: '3rem',
                  maxWidth: '400px',
                  width: '90%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.5rem',
                  boxShadow: `0 0 50px ${selectedChar.color}44`,
                  border: `1px solid ${selectedChar.color}`
              }}>
                  <h3 style={{ fontSize: '1.5rem', textAlign: 'center' }}>Desbloquear {selectedChar.name}</h3>
                  <p style={{ textAlign: 'center', color: '#a3a3a3' }}>Ingrese el codigo para desbloquearlo</p>
                  
                  <input 
                    type="password" 
                    value={unlockCode}
                    onChange={(e) => setUnlockCode(e.target.value)}
                    placeholder="Código..."
                    style={{
                        padding: '12px',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '1.1rem',
                        outline: 'none',
                        textAlign: 'center'
                    }}
                  />
                  
                  {error && <p style={{ color: '#ef4444', textAlign: 'center', fontSize: '0.9rem' }}>{error}</p>}

                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
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
