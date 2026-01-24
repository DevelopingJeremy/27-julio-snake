
import '../../game.css';
import React from 'react';
import logo from '../../assets/logo.webp';

const Menu = ({ onStart, onCharacters }) => {
  return (
    <div className="full-screen-center glass-panel">
      <div className="menu-logo-container">
        <img src={logo} alt="27 de Julio" className="menu-logo" />
      </div>

      <div className="menu-buttons">
        <button className="btn btn-primary" onClick={onStart}>
          Jugar
        </button>
        <button className="btn" onClick={onCharacters}>
          Personajes
        </button>
      </div>

      <div className="menu-footer">
        Snake Game Experiment
      </div>
    </div>
  );
};

export default Menu;
