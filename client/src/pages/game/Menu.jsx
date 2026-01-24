
import React from 'react';

import logo from '../assets/logo.webp';

const Menu = ({ onStart, onCharacters }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full absolute inset-0 glass-panel" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      width: '100%'
    }}>
      <div style={{
        marginBottom: '3rem',
        filter: 'drop-shadow(0 0 30px rgba(34, 197, 94, 0.4))',
        animation: 'float 6s ease-in-out infinite'
      }}>
        <img src={logo} alt="27 de Julio" style={{ maxWidth: '80%', maxHeight: '200px', objectFit: 'contain' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '300px' }}>
        <button className="btn btn-primary" onClick={onStart}>
          Jugar
        </button>
        <button className="btn" onClick={onCharacters}>
          Personajes
        </button>
      </div>

      <div style={{
          position: 'absolute',
          bottom: '2rem',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          opacity: 0.6
      }}>
        Snake Game Experiment
      </div>
    </div>
  );
};

export default Menu;
