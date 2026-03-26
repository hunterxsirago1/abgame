import { useState, useEffect, useCallback, useRef } from 'react';
import { useGameState, todayKey, toDateKey } from './hooks/useGameState';
import { wordValidator } from './utils/WordValidator';
import Row from './components/Row';
import Keyboard from './components/Keyboard';
import CalendarView from './components/CalendarView';
import { HelpIcon, CalendarIcon, BackArrowIcon } from './components/Icons';

type View = 'home' | 'game' | 'calendar';

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
        if (key && key.startsWith('abgame_progress_')) {
            const dateStr = key.replace('abgame_progress_', '');
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

  const handleEnter = useCallback(async () => {
    const result = await game.submitGuess();
    if (result?.error) {
      showToast(result.error);
    } else if (result?.won) {
      setTimeout(() => setShowModal('win'), 2000);
    } else if (result?.lost) {
      setTimeout(() => setShowModal('lost'), 2000);
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
    setView('game');
  };

  const startUnlimited = () => {
    setIsUnlimited(true);
    // Generate a random date from the last 300 days (excluding today)
    const d = new Date();
    d.setDate(d.getDate() - (1 + Math.floor(Math.random() * 300)));
    setDateKey(toDateKey(d));
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
            <button className="action-link"><HelpIcon /> How to play</button>
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
            <button className="icon-btn">
              <HelpIcon />
            </button>
          </header>

          <main className="game-content" id="game-content" ref={scrollRef}>
            {game.guesses.map((g, i) => (
              <Row key={i} targetPhrase={game.targetPhrase} guess={g.phrase} feedback={g.feedback} />
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
          <div className="modal-container" onClick={e => e.stopPropagation()}>
             <div className="text-center">
                <div className="text-5xl mb-4">{showModal === 'win' ? '🏆' : '☕'}</div>
                <h2 className="text-2xl font-black mb-2">{showModal === 'win' ? 'CONGRATS!' : 'NICE TRY!'}</h2>
                <p className="text-dim mb-4">
                  {showModal === 'win' 
                    ? `You found the expression in ${game.guesses.length} attempts.`
                    : 'The expression was:'}
                </p>
                <p className="text-xl font-black tracking-widest mb-8">{game.targetPhrase}</p>
                <div className="flex flex-col gap-3">
                  {isUnlimited && (
                    <button 
                      className="play-button w-full" 
                      onClick={() => { setShowModal(null); startUnlimited(); }}
                    >
                      Play again
                    </button>
                  )}
                  <button className="action-link w-full text-center" onClick={() => { setShowModal(null); setView('home'); }}>
                    Back to home
                  </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
