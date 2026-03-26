import { useState, useEffect, useCallback } from 'react';
import { wordValidator } from '../utils/WordValidator';
import { phrases } from '../data/phrases';

export type FeedbackColor = 'green' | 'yellow' | 'purple' | 'gray';

export interface Guess {
  phrase: string;
  feedback: FeedbackColor[];
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

const addDays = (date: Date, n: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

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
  const [currentGuess, setCurrentGuess] = useState<string>('');
  const [cursorIndex, setCursorIndex] = useState<number>(0);
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keyboardState, setKeyboardState] = useState<Record<string, FeedbackColor>>({});
  const [shouldShake, setShouldShake] = useState(false);

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
      setCurrentGuess(' '.repeat(phrase.replace(/ /g, '').length));
      setCursorIndex(0);
      console.log(`[DEV] Target phrase for ${dateKey}: ${phrase}`);
    } else {
      setTargetPhrase('');
      setGuesses([]);
      setStatus('playing');
      setKeyboardState({});
      setCurrentGuess('');
      setCursorIndex(0);
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
    if (status !== 'playing' || isSubmitting) return;
    const maxLength = targetPhrase.replace(/ /g, '').length;
    
    setCurrentGuess(prev => {
      const chars = prev.split('');
      chars[cursorIndex] = letter.toUpperCase();
      return chars.join('');
    });

    setCursorIndex(prev => (prev < maxLength - 1 ? prev + 1 : prev));
  }, [status, isSubmitting, targetPhrase, cursorIndex]);

  const removeLetter = useCallback(() => {
    if (status !== 'playing' || isSubmitting) return;
    
    setCurrentGuess(prev => {
      const chars = prev.split('');
      if (chars[cursorIndex] !== ' ') {
        chars[cursorIndex] = ' ';
        return chars.join('');
      } else if (cursorIndex > 0) {
        setCursorIndex(prevIdx => prevIdx - 1);
        chars[cursorIndex - 1] = ' ';
        return chars.join('');
      }
      return prev;
    });
  }, [status, isSubmitting, cursorIndex]);

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
    const newGuess: Guess = { phrase: currentGuess, feedback };
    const newGuesses = [...guesses, newGuess];
    
    // Animate would happen in UI, but we update state after potential delay
    // For now, update immediately or simulate delay
    
    const won = currentGuess === targetPhrase.replace(/ /g, '');
    const lost = false; // Never lost as requested
    const newStatus = won ? 'won' : lost ? 'lost' : 'playing';

    // Update Keyboard
    const newKeyboardState = { ...keyboardState };
    updateKeyboardMap(currentGuess, feedback, newKeyboardState);
    
    // Save
    setGuesses(newGuesses);
    setStatus(newStatus);
    setKeyboardState(newKeyboardState);
    setCurrentGuess(' '.repeat(targetPhrase.replace(/ /g, '').length));
    setCursorIndex(0);
    setIsSubmitting(false);

    localStorage.setItem(`${STORAGE_KEY}_${dateKey}`, JSON.stringify({
      guesses: newGuesses,
      status: newStatus
    }));

    return { success: true, won, lost };
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
