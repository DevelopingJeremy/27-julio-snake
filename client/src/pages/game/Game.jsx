
import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../../game.css';

const GRID_SIZE = 20;
const INITIAL_SPEED = 150;
const INITIAL_DIRECTION = { x: 0, y: -1 }; // Moving Up
// Initial snake position (Head at index 0)
const INITIAL_SNAKE = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 }
];

const Game = ({ onBack }) => {
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [food, setFood] = useState({ x: 15, y: 5 });
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [nextDirection, setNextDirection] = useState(INITIAL_DIRECTION); // Prevent 180 turns in one tick
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false); // Press key to start/pause? Or auto start. Let's auto start.
  const gameLoopRef = useRef();

  // Generate random food not on snake
  const generateFood = useCallback((currentSnake) => {
    let newFood;
    let isOnSnake = true;
    while (isOnSnake) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      // eslint-disable-next-line no-loop-func
      isOnSnake = currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
    }
    return newFood;
  }, []);

  const handleDirectionChange = (newDir) => {
    // Prevent 180 degree turns
    // If we are moving vertically (y!=0) and new dir is vertical (y!=0) but opposite, ignore.
    if (direction.y !== 0 && newDir.y !== 0 && direction.y !== newDir.y) return;
    if (direction.x !== 0 && newDir.x !== 0 && direction.x !== newDir.x) return;
    
    // Simplification check logic:
    // If currently moving Y, only allow X changes
    if (direction.y !== 0 && newDir.x !== 0) setNextDirection(newDir);
    // If currently moving X, only allow Y changes
    if (direction.x !== 0 && newDir.y !== 0) setNextDirection(newDir);
    
    // Also allow changes if we are stopped (though in this game we are always moving after start)
    if (direction.x === 0 && direction.y === 0) setNextDirection(newDir);
  };

  // Handle Input
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          handleDirectionChange({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          handleDirectionChange({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          handleDirectionChange({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          handleDirectionChange({ x: 1, y: 0 });
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction]);

  // Game Loop
  const moveSnake = useCallback(() => {
    if (gameOver) return;

    setDirection(nextDirection);

    setSnake((prevSnake) => {
      const head = prevSnake[0];
      const newHead = {
        x: head.x + nextDirection.x,
        y: head.y + nextDirection.y
      };

      // Check Collision with Walls
      if (
        newHead.x < 0 ||
        newHead.x >= GRID_SIZE ||
        newHead.y < 0 ||
        newHead.y >= GRID_SIZE
      ) {
        setGameOver(true);
        return prevSnake;
      }

      // Check Collision with Self
      if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        setGameOver(true);
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // Check Food
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore(s => s + 10);
        setFood(generateFood(newSnake));
      } else {
        newSnake.pop(); 
      }

      return newSnake;
    });
  }, [nextDirection, food, gameOver, generateFood]);

  useEffect(() => {
    if (gameOver) return;
    gameLoopRef.current = setInterval(moveSnake, INITIAL_SPEED);
    return () => clearInterval(gameLoopRef.current);
  }, [moveSnake, gameOver]);

  // Restart
  const restart = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setNextDirection(INITIAL_DIRECTION);
    setScore(0);
    setGameOver(false);
    setFood(generateFood(INITIAL_SNAKE));
  };


  return (
    <div className="game-container">
      {/* HUD */}
      <div className="game-hud">
        <button className="btn" onClick={onBack}>
          Salir
        </button>
        <div className="game-score">
          Score: {score}
        </div>
      </div>

      {/* Game Board */}
      <div className={`game-board ${gameOver ? 'game-over' : ''}`}>
        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
          const x = i % GRID_SIZE;
          const y = Math.floor(i / GRID_SIZE);
          
          let isSnake = false;
          let isHead = false;
          let isFood = (food.x === x && food.y === y);

          const snakeIndex = snake.findIndex(s => s.x === x && s.y === y);
          if (snakeIndex !== -1) {
            isSnake = true;
            if (snakeIndex === 0) isHead = true;
          }

          let cellClass = 'game-cell';
          if (isHead) cellClass += ' is-head';
          else if (isSnake) cellClass += ' is-snake';
          else if (isFood) cellClass += ' is-food';

          return (
            <div key={i} className={cellClass} />
          );
        })}
        
        {/* Game Over Overlay */}
        {gameOver && (
          <div className="game-over-overlay">
            <h2 className="game-over-title">GAME OVER</h2>
            <p className="game-over-score">Final Score: {score}</p>
            <button className="btn btn-primary" onClick={restart}>Try Again</button>
          </div>
        )}
      </div>
      
      {/* Controls Hint */}
      <div className="game-controls-hint">
        Use Arrows or WASD to move
      </div>

      {/* Mobile Controls */}
      <div className="mobile-controls">
         <div className="control-btn control-up" onClick={() => handleDirectionChange({ x: 0, y: -1 })}>↑</div>
         <div className="control-btn control-left" onClick={() => handleDirectionChange({ x: -1, y: 0 })}>←</div>
         <div className="control-btn control-down" onClick={() => handleDirectionChange({ x: 0, y: 1 })}>↓</div>
         <div className="control-btn control-right" onClick={() => handleDirectionChange({ x: 1, y: 0 })}>→</div>
      </div>
    </div>
  );
};

export default Game;
