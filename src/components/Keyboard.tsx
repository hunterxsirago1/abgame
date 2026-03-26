import React from 'react';
import { FeedbackColor } from '../hooks/useGameState';
import { BackspaceIcon } from './Icons';

interface KeyboardProps {
  onKey: (key: string) => void;
  onDelete: () => void;
  onEnter: () => void;
  keyStates: Record<string, FeedbackColor>;
}

const Keyboard: React.FC<KeyboardProps> = ({ onKey, onDelete, onEnter, keyStates }) => {
  const rows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DEL']
  ];

  return (
    <div className="keyboard">
      {rows.map((row, i) => (
        <div key={i} className="kb-row">
          {row.map(key => {
            const status = keyStates[key] || '';
            const isWide = key === 'ENTER' || key === 'DEL';
            
            let label: React.ReactNode = key;
            let action = () => onKey(key);
            
            if (key === 'ENTER') {
              action = onEnter;
            } else if (key === 'DEL') {
              label = <BackspaceIcon />;
              action = onDelete;
            }

            return (
              <button 
                key={key}
                className={`key ${isWide ? 'wide' : ''} ${status}`}
                onClick={action}
              >
                {label}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default Keyboard;
