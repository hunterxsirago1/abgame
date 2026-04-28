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
  isRevealing?: boolean;
}

const Row: React.FC<RowProps> = ({ 
  targetPhrase, 
  guess, 
  feedback, 
  isCurrent, 
  onTileClick,
  cursorIndex,
  shouldShake,
  isRevealing = false
}) => {
  const words = targetPhrase.split(' ');
  let wordStartIdx = 0;

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
          const charIdx = wordStartIdx + i;
          const char = guess[charIdx] || ' ';
          const f = feedback ? feedback[charIdx] : undefined;
          
          wordTiles.push(
            <Tile 
              key={`${wIdx}-${i}`}
              char={char}
              feedback={f}
              isFilled={char !== ' '}
              isCursor={isCurrent && charIdx === cursorIndex}
              onClick={() => isCurrent && onTileClick?.(charIdx)}
              animationDelay={f ? charIdx * 100 : 0}
              isRevealing={isRevealing}
            />
          );
        }
        wordStartIdx += word.length;
        
        return (
          <div key={wIdx} className="word-group">
            {wordTiles}
            {/* Add extra space after word group except for the last word */}
          </div>
        );
      })}
    </div>
  );
};

export default Row;
