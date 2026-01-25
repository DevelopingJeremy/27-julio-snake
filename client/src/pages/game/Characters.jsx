import '../../game.css';
import React, { useState } from 'react';
import { BACKEND_URL } from '../../includes/constantes.js';

// Map frontend IDs to DB IDs if necessary, or use numerical IDs directly.
// DB: 1=Original, 2=Blue, 3=Gold, 4=Purple
const INITIAL_CHARACTERS = [
  { id: 1, name: 'Original', color: '#22c55e', locked: false }, // Generally this one doesn't need login, but maybe we want to allow "login" as guest/original too? 
                                                                 // User request implied only "selecting" characters logs you in? 
                                                                 // "al momento de abrir el selector de personajes y digitar el codigo entramos al chat con ese usuario"
  { id: 2, name: 'Cyber Blue', color: '#06b6d4', locked: true },
  { id: 3, name: 'Electric Gold', color: '#eab308', locked: true },
  { id: 4, name: 'Void Purple', color: '#a855f7', locked: true },
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

const Characters = ({ onBack, onChat }) => {
  const [characters, setCharacters] = useState(INITIAL_CHARACTERS);
  const [selectedChar, setSelectedChar] = useState(null); 
  const [unlockCode, setUnlockCode] = useState('');
  const [error, setError] = useState('');

  const handleCharacterClick = (char) => {
    // If locked, open modal to login
    if (char.locked) {
      setSelectedChar(char);
      setUnlockCode('');
      setError('');
    } else {
       // If not locked (like the Green one), we might want to auto-login as guest or just let them use it?
       // For now, let's assume the user wants the secure flow for locked ones mainly.
       // But consistency implies we should probably login for any selection if we want chat identity.
       // Let's stick to the request: "digitar el codigo entramos" -> implies locked ones.
       // We can add a "Select" button for open ones later if needed.
    }
  };

  const handleUnlock = async () => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                characterId: selectedChar.id, 
                code: unlockCode 
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Login successful
            sessionStorage.setItem('chat_token', data.token);
            const updatedChars = characters.map(c => 
                c.id === selectedChar.id ? { ...c, locked: false } : c
            );
            setCharacters(updatedChars);
            setSelectedChar(null);
            
            // Redirect to chat
            if (onChat) onChat();
        } else {
            setError(data.message || 'Error de autenticación');
        }
    } catch (err) {
        setError('Error de conexión');
    }
  };

  return (
    <>
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
        </div>

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
                        <button className="btn" style={{ padding: '8px 12px', fontSize: '0.9rem', width: 'auto' }} onClick={() => setSelectedChar(null)}>Cancelar</button>
                        <button className="btn btn-primary" style={{ padding: '8px 12px', fontSize: '0.9rem', width: 'auto' }} onClick={handleUnlock}>Confirmar</button>
                    </div>
                </div>
            </div>
        )}
    </>
  );
};

export default Characters;
