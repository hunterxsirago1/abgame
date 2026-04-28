import { useState, useEffect, useCallback } from 'react';
import { wordValidator } from '../utils/WordValidator';
import { phrases } from '../data/phrases';

export type FeedbackColor = 'green' | 'yellow' | 'purple' | 'gray';

export interface Guess {
  phrase: string;
  feedback: FeedbackColor[];
  isRevealing?: boolean;
}

export interface GameProgress {
  status: 'playing' | 'won' | 'lost';
  attempts: number;
  guesses: Guess[];
  lastPlayedDate?: string;
}

const MAX_ATTEMPTS = 999; // Effectively unlimited as requested
const STORAGE_KEY = 'abgame_progress';

// Date Helpers
export const toDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const todayKey = () => toDateKey(new Date());


// Phrase Mapping
const EPOCH = new Date('2024-01-01T00:00:00Z');

export const getPhraseForDate = (dateKey: string) => {
  const targetDate = new Date(dateKey + 'T00:00:00Z');
  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

  // No access to future dates
  if (targetDate > today) return null;

  const total = phrases.length;
  if (total === 0) return null;

  // Calculate days since Epoch for a stable index
  const diffTime = targetDate.getTime() - EPOCH.getTime();
  const dayIndex = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Deterministic "shuffle" mapping
  // We use a linear congruential generator pattern to pick a non-sequential index
  // 31337 is prime, 7 is offset, total is the mod
  const phraseIndex = Math.abs((dayIndex * 31337 + 7) % total);
  
  return phrases[phraseIndex].toUpperCase();
};

export const useGameState = (dateKey: string) => {
  const [targetPhrase, setTargetPhrase] = useState<string>('');
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [inputState, setInputState] = useState({ phrase: '', cursor: 0 });
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keyboardState, setKeyboardState] = useState<Record<string, FeedbackColor>>({});
  const [shouldShake, setShouldShake] = useState(false);

  const currentGuess = inputState.phrase;
  const cursorIndex = inputState.cursor;

  const setCursorIndex = (cursor: number) => {
    setInputState(prev => ({ ...prev, cursor }));
  };

  // Initialize game for a date
  useEffect(() => {
    const phrase = getPhraseForDate(dateKey);
    if (phrase) {
      setTargetPhrase(phrase);
      // Load progress
      const saved = localStorage.getItem(`${STORAGE_KEY}_${dateKey}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setGuesses(parsed.guesses || []);
        setStatus(parsed.status || 'playing');
        
        // Rebuild keyboard state from history
        const newKeyboardState: Record<string, FeedbackColor> = {};
        parsed.guesses.forEach((g: Guess) => {
          updateKeyboardMap(g.phrase.replace(/ /g, ''), g.feedback, newKeyboardState);
        });
        setKeyboardState(newKeyboardState);
      } else {
        setGuesses([]);
        setStatus('playing');
        setKeyboardState({});
      }
      setInputState({
        phrase: ' '.repeat(phrase.replace(/ /g, '').length),
        cursor: 0
      });
      setIsSubmitting(false);

    } else {
      setTargetPhrase('');
      setGuesses([]);
      setStatus('playing');
      setKeyboardState({});
      setInputState({ phrase: '', cursor: 0 });
      setIsSubmitting(false);
    }
  }, [dateKey]);

  const updateKeyboardMap = (guess: string, feedback: FeedbackColor[], map: Record<string, FeedbackColor>) => {
    const priority: Record<FeedbackColor, number> = { green: 4, yellow: 3, purple: 2, gray: 1 };
    guess.split('').forEach((char, i) => {
      const currentStatus = map[char];
      const newStatus = feedback[i];
      if (!currentStatus || priority[newStatus] > priority[currentStatus]) {
        map[char] = newStatus;
      }
    });
  };

  const calculateFeedback = (guess: string, targetPhrase: string): FeedbackColor[] => {
    const targetIndices: { char: string; wordIdx: number; used: boolean }[] = [];
    const targetWords = targetPhrase.split(' ');
    
    targetWords.forEach((word, wIdx) => {
      for (let i = 0; i < word.length; i++) {
        targetIndices.push({ char: word[i].toUpperCase(), wordIdx: wIdx, used: false });
      }
    });

    const result: FeedbackColor[] = new Array(guess.length).fill('gray');
    const guessLetters = guess.toUpperCase().split('');

    // 1. Green
    guessLetters.forEach((char, i) => {
      if (char === targetIndices[i].char) {
        result[i] = 'green';
        targetIndices[i].used = true;
      }
    });

    // 2. Yellow (In same word)
    guessLetters.forEach((char, i) => {
      if (result[i] !== 'gray') return;
      const currentWordIdx = targetIndices[i].wordIdx;
      const match = targetIndices.find(t => !t.used && t.char === char && t.wordIdx === currentWordIdx);
      if (match) {
        result[i] = 'yellow';
        match.used = true;
      }
    });

    // 3. Purple (Elsewhere in phrase)
    guessLetters.forEach((char, i) => {
      if (result[i] !== 'gray') return;
      const match = targetIndices.find(t => !t.used && t.char === char);
      if (match) {
        result[i] = 'purple';
        match.used = true;
      }
    });

    return result;
  };

  const addLetter = useCallback((letter: string) => {
    if (status !== 'playing') return;
    const maxLength = targetPhrase.replace(/ /g, '').length;
    
    setInputState(prev => {
      const chars = prev.phrase.split('');
      chars[prev.cursor] = letter.toUpperCase();
      return {
        phrase: chars.join(''),
        cursor: prev.cursor < maxLength - 1 ? prev.cursor + 1 : prev.cursor
      };
    });
  }, [status, isSubmitting, targetPhrase]);

  const removeLetter = useCallback(() => {
    if (status !== 'playing') return;
    
    setInputState(prev => {
      const chars = prev.phrase.split('');
      let newCursor = prev.cursor;
      
      if (chars[prev.cursor] !== ' ') {
        chars[prev.cursor] = ' ';
        // Stay at same position
      } else if (prev.cursor > 0) {
        newCursor = prev.cursor - 1;
        chars[newCursor] = ' ';
      }
      
      return {
        phrase: chars.join(''),
        cursor: newCursor
      };
    });
  }, [status, isSubmitting]);

  const submitGuess = async () => {
    if (status !== 'playing' || isSubmitting) return;
    
    if (currentGuess.includes(' ')) {
      setShouldShake(true);
      setTimeout(() => setShouldShake(false), 500);
      return { error: 'Phrase incomplete' };
    }

    // Validation
    const words = targetPhrase.split(' ');
    let tempGuess = currentGuess;
    const guessWords = words.map(w => {
      const word = tempGuess.slice(0, w.length);
      tempGuess = tempGuess.slice(w.length);
      return word;
    });

    const invalidWord = wordValidator.getInvalidToken(guessWords.join(' '));
    if (invalidWord) {
      setShouldShake(true);
      setTimeout(() => setShouldShake(false), 500);
      return { error: `${invalidWord.toUpperCase()} not in dictionary` };
    }

    setIsSubmitting(true);
    
    const feedback = calculateFeedback(currentGuess, targetPhrase);
    const phraseLength = targetPhrase.replace(/ /g, '').length;
    const revealDuration = (phraseLength * 100) + 650;

    const won = currentGuess === targetPhrase.replace(/ /g, '');
    const lost = guesses.length + 1 >= MAX_ATTEMPTS; // Not really reachable but for consistency
    const newStatus = won ? 'won' : lost ? 'lost' : 'playing';

    const newGuess: Guess = { phrase: currentGuess, feedback, isRevealing: true };
    const newGuesses = [...guesses, newGuess];
    
    // 1. Move guess to history and reset input IMMEDIATELY
    setGuesses(newGuesses);
    setInputState({
      phrase: ' '.repeat(phraseLength),
      cursor: 0
    });
    
    // 2. Update keyboard state immediately for "fast" feel
    const newKeyboardState = { ...keyboardState };
    updateKeyboardMap(currentGuess, feedback, newKeyboardState);
    setKeyboardState(newKeyboardState);

    // 3. Set a timeout to clear the "revealing" state for this specific guess
    setTimeout(() => {
      setGuesses(prev => prev.map((g, idx) => 
        idx === prev.length - 1 ? { ...g, isRevealing: false } : g
      ));
      
      if (won || lost) {
        setStatus(newStatus);
      }
      
      setIsSubmitting(false);
    }, revealDuration);

    // Persist immediately
    localStorage.setItem(`${STORAGE_KEY}_${dateKey}`, JSON.stringify({
      guesses: newGuesses.map(g => ({ ...g, isRevealing: false })), // Don't save transient state
      status: newStatus
    }));

    return { success: true, won, lost, delay: revealDuration, finalGuesses: newGuesses };
  };

  return {
    dateKey,
    targetPhrase,
    guesses,
    currentGuess,
    cursorIndex,
    setCursorIndex,
    status,
    isSubmitting,
    keyboardState,
    shouldShake,
    addLetter,
    removeLetter,
    submitGuess,
    MAX_ATTEMPTS
  };
};
