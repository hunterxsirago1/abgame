import React from 'react';
import { FeedbackColor } from '../hooks/useGameState';

interface TileProps {
  char: string;
  feedback?: FeedbackColor;
  isFilled?: boolean;
  isCursor?: boolean;
  onClick?: () => void;
  animationDelay?: number;
}

const Tile: React.FC<TileProps> = ({ 
  char, 
  feedback, 
  isFilled, 
  isCursor, 
  onClick,
  animationDelay = 0 
}) => {
  const className = [
    'tile',
    isFilled ? 'filled' : '',
    isFilled && !feedback ? 'pop' : '',
    isCursor ? 'cursor' : '',
    feedback ? `flip ${feedback}` : ''
  ].join(' ').trim();

  return (
    <div 
      className={className} 
      onClick={onClick}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {char === ' ' ? '' : char}
    </div>
  );
};

export default Tile;
