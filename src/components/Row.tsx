import React from 'react';
import Tile from './Tile';
import { FeedbackColor } from '../hooks/useGameState';

interface RowProps {
  targetPhrase: string;
  guess: string;
  feedback?: FeedbackColor[];
  isCurrent?: boolean;
  onTileClick?: (idx: number) => void;
  cursorIndex?: number;
  shouldShake?: boolean;
}

const Row: React.FC<RowProps> = ({ 
  targetPhrase, 
  guess, 
  feedback, 
  isCurrent, 
  onTileClick,
  cursorIndex,
  shouldShake
}) => {
  const words = targetPhrase.split(' ');
  let globalIdx = 0;

  const rowClasses = [
    'phrase-row',
    feedback ? 'revealed' : '',
    isCurrent ? 'current-input' : '',
    shouldShake ? 'shake' : ''
  ].join(' ').trim();

  return (
    <div className={rowClasses}>
      {words.map((word, wIdx) => {
        const wordTiles = [];
        for (let i = 0; i < word.length; i++) {
          const char = guess[globalIdx] || ' ';
          const f = feedback ? feedback[globalIdx] : undefined;
          const idx = globalIdx;
          
          wordTiles.push(
            <Tile 
              key={idx}
              char={char}
              feedback={f}
              isFilled={char !== ' '}
              isCursor={isCurrent && idx === cursorIndex}
              onClick={() => isCurrent && onTileClick?.(idx)}
              animationDelay={f ? i * 100 : 0}
            />
          );
          globalIdx++;
        }
        
        return (
          <div key={wIdx} className="word-group">
            {wordTiles}
          </div>
        );
      })}
    </div>
  );
};

export default Row;
