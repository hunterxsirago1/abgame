import React from 'react';
import { HelpIcon, CloseIcon } from './Icons';
import Tile from './Tile';

interface HelpModalProps {
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="help-modal-container" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose} aria-label="Close help">
          <CloseIcon />
        </button>
        
        <div className="help-modal-title">
          <HelpIcon size={28} />
          <span>How to play</span>
        </div>
        
        <p className="help-modal-text">
          Find the secret expression. After each attempt, the color of the letters will help you:
        </p>

        <div className="help-example">
          <div className="phrase-row">
            <div className="word-group">
                <Tile char="B" isFilled />
                <Tile char="Y" isFilled feedback="purple" />
            </div>
            <div className="word-group">
                <Tile char="F" isFilled />
                <Tile char="A" isFilled />
                <Tile char="R" isFilled />
            </div>
          </div>
          <p className="help-example-text">The letter Y is in the expression, but not in the first word.</p>
        </div>

        <div className="help-example">
          <div className="phrase-row">
            <div className="word-group">
                <Tile char="T" isFilled />
                <Tile char="O" isFilled feedback="green" />
            </div>
            <div className="word-group">
                <Tile char="Y" isFilled feedback="yellow" />
                <Tile char="O" isFilled />
                <Tile char="U" isFilled />
            </div>
          </div>
          <p className="help-example-text">The letter Y is in the second word, but in the wrong position. The letter O is in the correct position.</p>
        </div>

        <div className="help-example">
          <div className="phrase-row">
            <div className="word-group">
                <Tile char="N" isFilled feedback="green" />
                <Tile char="O" isFilled feedback="green" />
            </div>
            <div className="word-group">
                <Tile char="W" isFilled feedback="green" />
                <Tile char="A" isFilled feedback="green" />
                <Tile char="Y" isFilled feedback="green" />
            </div>
          </div>
          <p className="help-example-text">This is the expression.</p>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
