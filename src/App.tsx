import { useState, useEffect, useCallback, useRef } from 'react';
import { useGameState, todayKey, toDateKey, Guess } from './hooks/useGameState';
import { wordValidator } from './utils/WordValidator';
import Row from './components/Row';
import Keyboard from './components/Keyboard';
import CalendarView from './components/CalendarView';
import HelpModal from './components/HelpModal';
import { HelpIcon, CalendarIcon, BackArrowIcon } from './components/Icons';

type View = 'home' | 'game' | 'calendar';

const STORAGE_KEY = 'abgame_progress';

const MiniGrid: React.FC<{ guesses: Guess[], targetPhrase: string }> = ({ guesses, targetPhrase }) => {
  const words = targetPhrase.split(' ');

  return (
    <div className="mini-grid">
      {guesses.map((g, i) => (
        <div key={i} className="mini-row">
          {words.map((word, wordIdx) => {
            const wordStartIdx = words.slice(0, wordIdx).join('').length;
            const wordLetters = word.split('');
            return (
              <div key={wordIdx} className="word-group" style={{ gap: '2px', padding: '0 4px' }}>
                {wordLetters.map((_, charIdx) => {
                  const absoluteIdx = wordStartIdx + charIdx;
                  const feedback = g.feedback[absoluteIdx];
                  return <div key={charIdx} className={`mini-tile ${feedback || 'gray'}`} />;
                })}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

function App() {
  const [view, setView] = useState<View>('home');
  const [loading, setLoading] = useState(true);

  // Get initial date from URL param or default to today
  const getInitialDate = () => {
    const params = new URLSearchParams(window.location.search);
    const dateParam = params.get('date');
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      // Basic future check
      const target = new Date(dateParam + 'T00:00:00Z');
      const now = new Date();
      const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
      if (target <= today) return dateParam;
    }
    return todayKey();
  };

  const [dateKey, setDateKey] = useState<string>(getInitialDate());
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<'win' | 'lost' | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [allProgress, setAllProgress] = useState<Record<string, { status: string; attempts: number }>>({});

  // Sync URL with dateKey
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('date') !== dateKey) {
      params.set('date', dateKey);
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [dateKey]);

  // Scan localStorage for all progress
  const loadAllProgress = useCallback(() => {
    const progress: Record<string, { status: string; attempts: number }> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY + '_')) {
        const dateStr = key.replace(STORAGE_KEY + '_', '');
        try {
          const saved = JSON.parse(localStorage.getItem(key) || '{}');
          progress[dateStr] = {
            status: saved.status,
            attempts: saved.guesses?.length || 0
          };
        } catch (e) { /* ignore */ }
      }
    }
    setAllProgress(progress);
  }, []);

  useEffect(() => {
    loadAllProgress();
  }, [view, loadAllProgress]);

  const game = useGameState(dateKey);
  const scrollRef = useRef<HTMLElement>(null);

  // Auto-scroll to current row
  useEffect(() => {
    if (view === 'game' && scrollRef.current) {
      const rows = scrollRef.current.querySelectorAll('.phrase-row');
      const activeRow = rows[game.guesses.length];
      if (activeRow) {
        activeRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [game.guesses.length, view]);

  useEffect(() => {
    wordValidator.loadDictionary().finally(() => {
      setLoading(false);
    });
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const [finalResult, setFinalResult] = useState<{ guesses: Guess[] } | null>(null);

  const handleEnter = useCallback(async () => {
    const result = await game.submitGuess();
    if (result?.error) {
      showToast(result.error);
    } else if (result?.success) {
      if (result.won || result.lost) {
        setFinalResult({ guesses: result.finalGuesses || [] });
      }
      
      // Wait for animation delay
      if (result.delay) {
        await new Promise(resolve => setTimeout(resolve, result.delay));
      }

      if (result.won) {
        setShowModal('win');
      } else if (result.lost) {
        setShowModal('lost');
      }
    }
  }, [game.submitGuess]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (view !== 'game' || showModal) return;

      const key = e.key.toUpperCase();
      if (/^[A-Z]$/.test(key)) {
        game.addLetter(key);
      } else if (e.key === 'Backspace') {
        game.removeLetter();
      } else if (e.key === 'Enter') {
        handleEnter();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, showModal, game.addLetter, game.removeLetter, handleEnter]);

  const startToday = () => {
    setIsUnlimited(false);
    setDateKey(todayKey());
    setFinalResult(null);
    setView('game');
  };

  const startUnlimited = () => {
    setIsUnlimited(true);

    // Create a pool of dates from the last 365 days
    const pool: string[] = [];
    const now = new Date();
    for (let i = 1; i <= 365; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = toDateKey(d);

      // Filter out completed dates (won or lost)
      const progress = allProgress[key];
      if (!progress || (progress.status !== 'won' && progress.status !== 'lost')) {
        pool.push(key);
      }
    }

    let selectedDate: string;
    if (pool.length > 0) {
      selectedDate = pool[Math.floor(Math.random() * pool.length)];
    } else {
      // Fallback: fully random date from last 1000 days if pool is empty
      const d = new Date(now);
      d.setDate(d.getDate() - (1 + Math.floor(Math.random() * 1000)));
      selectedDate = toDateKey(d);
    }

    setDateKey(selectedDate);
    setFinalResult(null);
    setView('game');
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0e1525] text-white">
        <div className="text-2xl font-bold animate-pulse">Loading AB Game...</div>
      </div>
    );
  }

  return (
    <div id="app">
      {view === 'home' && (
        <div className="home-view">
          <div className="logo-container">
            <div className="logo-cell green"></div>
            <div className="logo-cell yellow"></div>
            <div className="logo-cell purple"></div>
            <div className="logo-cell purple"></div>
            <div className="logo-cell gray"></div>
            <div className="logo-cell green"></div>
          </div>
          <h1 className="home-title">AB GAME</h1>
          <p className="home-subtitle" style={{ marginBottom: '2rem' }}>Guess the secret expression</p>

          <div className="daily-section">
            <h3>Daily game</h3>
            <p className="text-dim">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            <button className="play-button" onClick={startToday}>Play today</button>
          </div>

          <div className="daily-section" style={{ marginTop: '1rem' }}>
            <h3>Unlimited</h3>
            <p className="text-dim">Play random past expressions</p>
            <button
              className="play-button"
              style={{ backgroundColor: 'var(--color-purple)', boxShadow: '0 4px 14px rgba(129,140,248,0.4)' }}
              onClick={startUnlimited}
            >
              Play unlimited
            </button>
          </div>

          <div className="secondary-actions">
            <button className="action-link" onClick={() => setView('calendar')}>
              <CalendarIcon /> Previous games
            </button>
            <button className="action-link" onClick={() => setShowHelp(true)}>
              <HelpIcon /> How to play
            </button>
          </div>
        </div>
      )}

      {view === 'calendar' && (
        <CalendarView
          onBack={() => setView('home')}
          onSelectDate={(date) => {
            setIsUnlimited(false);
            setDateKey(date);
            setView('game');
          }}
          progress={allProgress}
        />
      )}

      {view === 'game' && (
        <div className="game-view" key={dateKey}>
          <header className="header">
            <button className="icon-btn" onClick={() => setView('home')}>
              <BackArrowIcon />
            </button>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2">
                <div className="font-extrabold tracking-widest text-sm">AB GAME</div>
                {isUnlimited && <span className="bg-indigo-600 text-[10px] px-2 py-0.5 rounded-full font-black text-white">UNLIMITED</span>}
              </div>
              <div className="text-[10px] text-dim font-bold">{dateKey}</div>
            </div>
            <button className="icon-btn" onClick={() => setShowHelp(true)}>
              <HelpIcon />
            </button>
          </header>

          <main className="game-content" id="game-content" ref={scrollRef}>
            {game.guesses.map((g, i) => (
              <Row key={i} targetPhrase={game.targetPhrase} guess={g.phrase} feedback={g.feedback} isRevealing={g.isRevealing} />
            ))}
            {game.status === 'playing' && (
              <Row
                targetPhrase={game.targetPhrase}
                guess={game.currentGuess}
                isCurrent
                onTileClick={game.setCursorIndex}
                cursorIndex={game.cursorIndex}
                shouldShake={game.shouldShake}
              />
            )}

            {game.status !== 'playing' && (
              <div className="game-end-actions">
                <MiniGrid guesses={game.guesses} targetPhrase={game.targetPhrase} />
                {isUnlimited && (
                  <button
                    className="btn btn-primary"
                    style={{ marginTop: '1.5rem', minWidth: '200px' }}
                    onClick={() => {
                      if (isUnlimited) {
                        startUnlimited();
                      } else {
                        setView('home');
                      }
                    }}
                  >
                    Play Again
                  </button>
                )}
              </div>
            )}

            {/* Empty rows if game not finished */}
            {game.status === 'playing' && Array.from({ length: 5 - game.guesses.length }).map((_, i) => (
              <div key={i} className="phrase-row">
                {/* Empty rows placeholder */}
              </div>
            ))}
          </main>

          <Keyboard
            onKey={game.addLetter}
            onDelete={game.removeLetter}
            onEnter={handleEnter}
            keyStates={game.keyboardState}
          />
        </div>
      )}

      {toast && <div className="game-toast">{toast}</div>}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(null)}>
          <div className="modal-container" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <h2 className="text-2xl font-black mb-6">{showModal === 'win' ? 'Congrats!' : 'Almost!'}</h2>

              {showModal === 'win' ? (
                <>
                  <p className="text-xl mb-6">
                    You got it in <strong>{finalResult?.guesses.length || game.guesses.length}</strong> guesses.
                  </p>
                  <MiniGrid guesses={finalResult?.guesses || game.guesses} targetPhrase={game.targetPhrase} />
                </>
              ) : (
                <>
                  <p className="text-dim mb-4">The expression was:</p>
                  <p className="text-xl font-black tracking-widest mb-8">{game.targetPhrase}</p>
                </>
              )}

              <div className="flex flex-col gap-4 mt-8">
                {isUnlimited && (
                  <button
                    className="btn btn-primary w-full"
                    onClick={() => {
                      if (isUnlimited) {
                        startUnlimited();
                      } else {
                        setView('home');
                      }
                      setShowModal(null);
                    }}
                  >
                    Play Again
                  </button>
                )}
                <button className="btn btn-secondary w-full" onClick={() => {
                  if (!isUnlimited) setView('home');
                  setShowModal(null);
                }}>
                  {isUnlimited ? 'Close' : 'Go Home'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}

export default App;
