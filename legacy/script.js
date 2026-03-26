/**
 * Expresso Clone - Core Game Script with Calendar System
 */

const CONFIG = {
    MAX_ATTEMPTS: 6,
    COLORS: {
        GREEN: 'green',
        YELLOW: 'yellow',
        PURPLE: 'purple',
        GRAY: 'gray'
    },
    // How many phrases to reserve for future dates (from today forward)
    FUTURE_RESERVE: 30
};

// ─── Date Helpers ────────────────────────────────────────────────────────────

function toDateKey(date) {
    // Returns "YYYY-MM-DD" in LOCAL time
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function fromDateKey(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function todayKey() {
    return toDateKey(new Date());
}

function addDays(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
}

// ─── Phrase → Date Assignment ─────────────────────────────────────────────────
// phrases[0] = oldest past date, phrases[N-FUTURE_RESERVE-1] = yesterday,
// phrases[N-FUTURE_RESERVE] = today, ..., phrases[N-1] = today+29

function buildCalendar(phrases) {
    // Total phrases available
    const total = phrases.length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Index that maps to TODAY
    const todayIndex = total - CONFIG.FUTURE_RESERVE;

    const calendar = {}; // dateKey -> { phrase, index }

    phrases.forEach((phrase, i) => {
        const dayOffset = i - todayIndex; // negative = past, 0 = today, positive = future
        const date = addDays(today, dayOffset);
        const key = toDateKey(date);
        calendar[key] = { phrase: phrase.toUpperCase(), index: i };
    });

    return { calendar, todayIndex };
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

const STORAGE_KEY = 'expresso_progress';

function loadProgress() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
        return {};
    }
}

function saveProgress(progress) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

// progress[dateKey] = { status: 'completed'|'attempted', attempts: number }

// ─── Main Game Class ──────────────────────────────────────────────────────────

class ExpressoGame {
    constructor() {
        this.phrases = [];
        this.dictionary = new Set();
        this.calendar = {};       // dateKey -> { phrase, index }
        this.todayIndex = 0;
        this.progress = {};       // dateKey -> { status, attempts }

        this.targetPhrase = "";
        this.words = [];
        this.currentAttempt = 0;
        this.currentGuess = "";
        this.cursorIndex = 0;
        this.history = [];
        this.keyboardState = {};
        this.status = "playing";
        this.view = "home";       // home, game, calendar
        this.isSubmitting = false;

        // Which date is currently being played (null = unlimited/random)
        this.playingDate = null;

        // For unlimited mode: track which past phrases have been used this session
        this.unlimitedUsed = new Set();

        this.init();
    }

    async init() {
        await this.loadData();
        this.progress = loadProgress();
        this.checkUrlParam();
        this.render();
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('popstate', () => this.checkUrlParam());
    }

    checkUrlParam() {
        const params = new URLSearchParams(window.location.search);
        const dateParam = params.get('date');
        if (dateParam && this.calendar[dateParam]) {
            const key = dateParam;
            const today = todayKey();
            const isFuture = key > today;
            if (!isFuture) {
                this.startDateGame(key);
                return;
            }
        }
        // No valid date param — show home
        if (this.view !== 'game') {
            this.view = 'home';
            this.render();
        }
    }

    async loadData() {
        try {
            this.phrases = window.phrases || [];

            if (window.validator) {
                await window.validator.loadDictionary('dictionary.json');
                this.dictionary = window.validator.getDictionary();
            } else {
                try {
                    const dictResponse = await fetch('dictionary.json');
                    const dictData = await dictResponse.json();
                    this.dictionary = new Set(dictData.map(w => w.toUpperCase()));
                } catch (e) {
                    console.error("Failed to load dictionary fallback:", e);
                    this.dictionary = new Set();
                }
            }

            const { calendar, todayIndex } = buildCalendar(this.phrases);
            this.calendar = calendar;
            this.todayIndex = todayIndex;

        } catch (error) {
            console.error("Failed to load game data:", error);
            this.dictionary = new Set();
        }
    }

    // ── Game Start Methods ──────────────────────────────────────────────────

    startGame() {
        // Play today's phrase
        this.startDateGame(todayKey());
    }

    startDateGame(dateKey) {
        const entry = this.calendar[dateKey];
        if (!entry) return;

        this.playingDate = dateKey;
        this.view = 'game';
        this.targetPhrase = entry.phrase;
        this.words = this.targetPhrase.split(' ');

        const maxLength = this.targetPhrase.replace(/ /g, '').length;
        this.currentAttempt = 0;
        this.currentGuess = " ".repeat(maxLength);
        this.cursorIndex = 0;
        this.history = [];
        this.keyboardState = {};
        this.status = "playing";
        this.isSubmitting = false;

        // Update URL param
        history.pushState({}, '', `?date=${dateKey}`);

        this.render();
        console.log(`%c Playing: ${dateKey} → ${this.targetPhrase}`, "color: #06b6d4; font-weight: bold;");
    }

    startUnlimited() {
        // Pick a random past/today phrase not yet used this session
        const today = todayKey();
        const available = Object.keys(this.calendar).filter(key => {
            return key <= today && !this.unlimitedUsed.has(key);
        });

        if (available.length === 0) {
            // Reset session if all used
            this.unlimitedUsed.clear();
            available.push(...Object.keys(this.calendar).filter(k => k <= today));
        }

        const randomKey = available[Math.floor(Math.random() * available.length)];
        this.unlimitedUsed.add(randomKey);

        this.playingDate = null; // Don't track progress for unlimited
        this.view = 'game';
        this.targetPhrase = this.calendar[randomKey].phrase;
        this.words = this.targetPhrase.split(' ');

        const maxLength = this.targetPhrase.replace(/ /g, '').length;
        this.currentAttempt = 0;
        this.currentGuess = " ".repeat(maxLength);
        this.cursorIndex = 0;
        this.history = [];
        this.keyboardState = {};
        this.status = "playing";
        this.isSubmitting = false;

        history.pushState({}, '', window.location.pathname);
        this.render();
        console.log(`%c Unlimited: ${randomKey} → ${this.targetPhrase}`, "color: #818cf8; font-weight: bold;");
    }

    // ── Input Handling ──────────────────────────────────────────────────────

    handleKeyDown(e) {
        if (this.view !== 'game' || this.status !== 'playing') return;

        if (e.key === 'Backspace') {
            this.removeLetter();
        } else if (e.key === 'Enter') {
            this.submitGuess();
        } else if (/^[a-zA-Z]$/.test(e.key)) {
            this.addLetter(e.key);
        }
    }

    addLetter(letter) {
        if (this.status !== 'playing' || this.isSubmitting) return;
        const maxLength = this.targetPhrase.replace(/ /g, '').length;

        const isFirstLetter = this.currentGuess.trim() === '';

        let chars = this.currentGuess.split('');
        chars[this.cursorIndex] = letter.toUpperCase();
        this.currentGuess = chars.join('');

        if (this.cursorIndex < maxLength - 1) {
            this.cursorIndex++;
        }
        this.render();

        if (isFirstLetter) {
            const content = document.getElementById('game-content');
            if (content) content.scrollTop = content.scrollHeight;
        }
    }

    removeLetter() {
        if (this.status !== 'playing' || this.isSubmitting) return;
        let chars = this.currentGuess.split('');

        if (chars[this.cursorIndex] !== " ") {
            chars[this.cursorIndex] = " ";
        } else if (this.cursorIndex > 0) {
            this.cursorIndex--;
            chars[this.cursorIndex] = " ";
        }

        this.currentGuess = chars.join('');
        this.render();
    }

    setCursor(idx) {
        if (this.status !== 'playing' || this.isSubmitting) return;
        this.cursorIndex = idx;
        this.render();
    }

    getInvalidWord() {
        let chars = this.currentGuess.split('');
        let guessWords = [];
        this.words.forEach(w => {
            guessWords.push(chars.splice(0, w.length).join(''));
        });

        const reconstructedPhrase = guessWords.join(' ');

        if (window.validator && window.validator.isLoaded) {
            return window.validator.getInvalidToken(reconstructedPhrase, { debug: true });
        }

        for (const word of guessWords) {
            if (!this.dictionary.has(word.toUpperCase())) return word;
        }
        return null;
    }

    submitGuess() {
        if (this.status !== 'playing' || this.isSubmitting) return;
        this.isSubmitting = true;

        if (this.currentGuess.includes(' ')) {
            this.showMessage("Phrase incomplete");
            this.triggerShake();
            setTimeout(() => { this.isSubmitting = false; }, 500);
            return;
        }

        const invalidWord = this.getInvalidWord();
        if (invalidWord) {
            this.showMessage(`${invalidWord.toUpperCase()} not in word list`);
            this.triggerShake();
            setTimeout(() => { this.isSubmitting = false; }, 500);
            return;
        }

        const feedback = this.calculateFeedback(this.currentGuess);
        this.updateKeyboardState(this.currentGuess, feedback);

        const guessObj = { guess: this.currentGuess, feedback };
        this.history.push(guessObj);

        this.animateFeedback(this.currentAttempt);

        const won = this.currentGuess === this.targetPhrase.replace(/ /g, '');
        const lost = !won && this.history.length >= CONFIG.MAX_ATTEMPTS;

        if (won) {
            this.status = "won";
            this.saveProgressForDate('completed');
            setTimeout(() => this.showModal('win'), 2500);
        } else if (lost) {
            this.status = "lost";
            this.saveProgressForDate('attempted');
            setTimeout(() => this.showModal('lose'), 2500);
        } else {
            this.saveProgressForDate('attempted');
        }

        const totalLetters = this.targetPhrase.replace(/ /g, '').length;
        const animationDelay = (totalLetters - 1) * 100 + 600 + 100;

        setTimeout(() => {
            this.currentAttempt++;
            const maxLength = this.targetPhrase.replace(/ /g, '').length;
            this.currentGuess = " ".repeat(maxLength);
            this.cursorIndex = 0;
            this.isSubmitting = false;

            const content = document.getElementById('game-content');
            const scrollTop = content ? content.scrollTop : null;

            this.render();

            const newContent = document.getElementById('game-content');
            if (newContent && scrollTop !== null) newContent.scrollTop = scrollTop;
        }, animationDelay);
    }

    saveProgressForDate(status) {
        if (!this.playingDate) return; // Don't save unlimited games
        const existing = this.progress[this.playingDate];
        // Only upgrade: attempted -> completed, never downgrade
        if (!existing || (existing.status !== 'completed' && status === 'completed') || !existing.status) {
            this.progress[this.playingDate] = {
                status,
                attempts: this.history.length
            };
            saveProgress(this.progress);
        }
    }

    // ── Animations & UI helpers ──────────────────────────────────────────────

    triggerShake() {
        const row = document.querySelectorAll('.phrase-row')[this.currentAttempt];
        if (row) {
            row.classList.add('shake');
            setTimeout(() => row.classList.remove('shake'), 500);
        }
    }

    showMessage(msg) {
        const container = document.getElementById('toast-container');
        if (!container) return;
        if (Array.from(container.children).some(child => child.textContent === msg)) return;

        const toast = document.createElement('div');
        toast.className = 'game-toast';
        toast.textContent = msg;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 1500);
    }

    updateKeyboardState(guess, feedback) {
        const priority = {
            [CONFIG.COLORS.GREEN]: 4,
            [CONFIG.COLORS.YELLOW]: 3,
            [CONFIG.COLORS.PURPLE]: 2,
            [CONFIG.COLORS.GRAY]: 1
        };

        guess.split('').forEach((char, i) => {
            const currentStatus = this.keyboardState[char];
            const newStatus = feedback[i];
            if (!currentStatus || priority[newStatus] > priority[currentStatus]) {
                this.keyboardState[char] = newStatus;
            }
        });
    }

    animateFeedback(rowIdx) {
        const rowElement = document.querySelectorAll('.phrase-row')[rowIdx];
        const tiles = rowElement.querySelectorAll('.tile');

        tiles.forEach((tile, i) => {
            setTimeout(() => {
                tile.classList.add('flip');
                setTimeout(() => {
                    const feedback = this.history[rowIdx].feedback[i];
                    tile.classList.add(feedback);
                    tile.parentElement.parentElement.classList.add('revealed');
                }, 300);
            }, i * 100);
        });
    }

    calculateFeedback(guess) {
        const targetWords = this.words;
        const guessLetters = guess.split('');

        const targetIndices = [];
        targetWords.forEach((word, wIdx) => {
            for (let i = 0; i < word.length; i++) {
                targetIndices.push({ char: word[i], wordIdx: wIdx, posInWord: i, used: false });
            }
        });

        const guessMap = guessLetters.map((char) => ({ char, feedback: CONFIG.COLORS.GRAY }));

        guessMap.forEach((g, i) => {
            if (g.char === targetIndices[i].char) {
                g.feedback = CONFIG.COLORS.GREEN;
                targetIndices[i].used = true;
            }
        });

        guessMap.forEach((g, i) => {
            if (g.feedback !== CONFIG.COLORS.GRAY) return;
            const currentWordIdx = targetIndices[i].wordIdx;
            const matchInWord = targetIndices.find(t =>
                !t.used && t.char === g.char && t.wordIdx === currentWordIdx
            );
            if (matchInWord) {
                g.feedback = CONFIG.COLORS.YELLOW;
                matchInWord.used = true;
            }
        });

        guessMap.forEach((g, i) => {
            if (g.feedback !== CONFIG.COLORS.GRAY) return;
            const matchElsewhere = targetIndices.find(t => !t.used && t.char === g.char);
            if (matchElsewhere) {
                g.feedback = CONFIG.COLORS.PURPLE;
                matchElsewhere.used = true;
            }
        });

        return guessMap.map(g => g.feedback);
    }

    // ── Render ──────────────────────────────────────────────────────────────

    render() {
        const root = document.getElementById('app');

        const content = document.getElementById('game-content');
        const scrollTop = content ? content.scrollTop : null;

        if (this.view === 'home') {
            root.innerHTML = this.renderHome();
        } else if (this.view === 'calendar') {
            root.innerHTML = this.renderCalendarView();
        } else {
            root.innerHTML = this.renderGame();
        }

        if (scrollTop !== null) {
            const newContent = document.getElementById('game-content');
            if (newContent) newContent.scrollTop = scrollTop;
        }
    }

    renderHome() {
        const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        return `
            <div class="home-view">
                <div class="logo-container">
                    <div class="logo-cell green"></div>
                    <div class="logo-cell yellow"></div>
                    <div class="logo-cell purple"></div>
                    <div class="logo-cell purple"></div>
                    <div class="logo-cell gray"></div>
                    <div class="logo-cell green"></div>
                </div>
                <h1 class="home-title">EXPRESSO</h1>
                <p class="home-subtitle" style="margin-bottom: 2rem;">Find the secret expression</p>

                <div class="daily-section" style="background: var(--surface-color); padding: 1.5rem; border-radius: 16px; width: 100%;">
                    <h3 style="margin-bottom: 0.5rem;">Daily game</h3>
                    <p style="color: var(--text-dim); margin-bottom: 1.5rem;">${date}</p>
                    <button class="play-button" onclick="game.startGame()">Play today</button>
                </div>

                <div class="daily-section" style="background: var(--surface-color); padding: 1.5rem; border-radius: 16px; width: 100%; margin-top: -0.5rem;">
                    <h3 style="margin-bottom: 0.5rem;">Unlimited</h3>
                    <p style="color: var(--text-dim); margin-bottom: 1.5rem;">Play random past expressions</p>
                    <button class="play-button" style="background: var(--color-purple); box-shadow: 0 4px 14px rgba(129,140,248,0.4);" onclick="game.startUnlimited()">Play unlimited</button>
                </div>

                <div class="secondary-actions">
                    <a href="#" class="action-link" onclick="event.preventDefault(); game.setView('calendar')">
                        <span class="material-symbols-rounded">calendar_month</span> Previous games
                    </a>
                    <a href="#" class="action-link"><span class="material-symbols-rounded">chat_bubble</span> Feedback</a>
                    <a href="#" class="action-link"><span class="material-symbols-rounded">language</span> Language</a>
                </div>
            </div>
        `;
    }

    renderCalendarView() {
        const today = todayKey();
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);

        // Build list of all past + today dates (sorted descending)
        const playableDates = Object.keys(this.calendar)
            .filter(k => k <= today)
            .sort((a, b) => b.localeCompare(a));

        // Group by month
        const months = {};
        playableDates.forEach(key => {
            const d = fromDateKey(key);
            const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const monthLabel = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            if (!months[monthKey]) months[monthKey] = { label: monthLabel, days: [] };
            months[monthKey].days.push(key);
        });

        let html = `
            <div class="calendar-view">
                <div class="header">
                    <button class="icon-btn" onclick="game.setView('home')">
                        <span class="material-symbols-rounded">arrow_back</span>
                    </button>
                    <div style="font-weight: 800; letter-spacing: 1px;">PREVIOUS GAMES</div>
                    <div style="width: 40px;"></div>
                </div>
                <div class="calendar-content">
        `;

        Object.keys(months).sort((a, b) => b.localeCompare(a)).forEach(monthKey => {
            const { label, days } = months[monthKey];
            html += `<div class="cal-month-label">${label}</div>`;
            html += `<div class="cal-grid">`;

            days.forEach(dateKey => {
                const d = fromDateKey(dateKey);
                const dayNum = d.getDate();
                const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
                const prog = this.progress[dateKey];
                const isToday = dateKey === today;

                let statusClass = '';
                let statusIcon = '';
                if (prog?.status === 'completed') {
                    statusClass = 'cal-day--completed';
                    statusIcon = '<span class="cal-status-dot green-dot"></span>';
                } else if (prog?.status === 'attempted') {
                    statusClass = 'cal-day--attempted';
                    statusIcon = '<span class="cal-status-dot yellow-dot"></span>';
                }

                const todayBadge = isToday ? '<span class="cal-today-badge">TODAY</span>' : '';

                html += `
                    <div class="cal-day ${statusClass} ${isToday ? 'cal-day--today' : ''}"
                         onclick="game.startDateGame('${dateKey}')">
                        <div class="cal-day-top">
                            <span class="cal-weekday">${weekday}</span>
                            ${todayBadge}
                            ${statusIcon}
                        </div>
                        <span class="cal-daynum">${dayNum}</span>
                        ${prog ? `<span class="cal-attempts">${prog.attempts} guess${prog.attempts !== 1 ? 'es' : ''}</span>` : '<span class="cal-attempts">Not played</span>'}
                    </div>
                `;
            });

            html += `</div>`;
        });

        html += `</div></div>`;
        return html;
    }

    renderGame() {
        const isUnlimited = this.playingDate === null;
        const dateLabel = this.playingDate
            ? fromDateKey(this.playingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : 'Unlimited';

        return `
            <div class="game-view">
                <div class="header">
                    <button class="icon-btn" onclick="game.setView('home')">
                        <span class="material-symbols-rounded">arrow_back</span>
                    </button>
                    <div style="display:flex; flex-direction:column; align-items:center; gap:2px;">
                        <div style="font-weight: 800; letter-spacing: 1px;">EXPRESSO</div>
                        <div style="font-size: 0.7rem; color: var(--text-dim); font-weight: 600;">${isUnlimited ? '∞ Unlimited' : dateLabel}</div>
                    </div>
                    <button class="icon-btn">
                        <span class="material-symbols-rounded">help</span>
                    </button>
                </div>

                <div class="game-content" id="game-content">
                    ${this.renderGrid()}
                </div>

                ${this.renderKeyboard()}
            </div>
        `;
    }

    renderGrid() {
        let rows = "";

        this.history.forEach((attempt, i) => {
            rows += `<div class="phrase-row revealed">${this.renderRow(attempt.guess, attempt.feedback)}</div>`;
        });

        if (this.status === 'playing') {
            rows += `<div class="phrase-row current-input">${this.renderRow(this.currentGuess, null, true)}</div>`;
        }

        return rows;
    }

    renderRow(guess, feedback = null, isCurrentRow = false) {
        let html = "";
        let globalCharIdx = 0;

        this.words.forEach((word) => {
            html += `<div class="word-group">`;
            for (let i = 0; i < word.length; i++) {
                const char = guess[globalCharIdx] || "";
                const color = feedback ? feedback[globalCharIdx] : "";
                const isFilled = char !== "" && char !== " ";
                const isCursor = isCurrentRow && globalCharIdx === this.cursorIndex;
                const clickHandler = isCurrentRow ? `onclick="game.setCursor(${globalCharIdx})"` : "";

                html += `<div class="tile ${isFilled ? 'filled' : ''} ${isCursor ? 'cursor' : ''} ${color}" ${clickHandler}>
                    ${char === " " ? "" : char}
                </div>`;
                globalCharIdx++;
            }
            html += `</div>`;
        });

        return html;
    }

    renderKeyboard() {
        const rows = [
            ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
            ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'DEL'],
            ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'ENTER']
        ];

        let html = `<div class="keyboard">`;
        rows.forEach((row) => {
            html += `<div class="kb-row">`;
            row.forEach(key => {
                let classList = "key";
                if (key === 'ENTER' || key === 'DEL') classList += " wide";

                const status = this.keyboardState[key] || "";
                if (status) classList += " " + status;

                const action = key === 'ENTER' ? 'game.submitGuess()' :
                    key === 'DEL' ? 'game.removeLetter()' :
                        `game.addLetter('${key}')`;

                let label = key;
                if (key === 'DEL') label = '<span class="material-symbols-rounded">backspace</span>';

                html += `<button class="${classList}" onclick="${action}">${label}</button>`;
            });
            html += `</div>`;
        });
        html += `</div>`;
        return html;
    }

    // ── View Management ──────────────────────────────────────────────────────

    setView(view) {
        this.view = view;
        if (view === 'home') history.pushState({}, '', window.location.pathname);
        this.render();
    }

    // ── Modals ───────────────────────────────────────────────────────────────

    showModal(type) {
        const overlay = document.getElementById('modal-overlay');
        const container = document.getElementById('modal-container');

        overlay.classList.remove('hidden');
        container.classList.remove('hidden');

        if (type === 'win') {
            container.innerHTML = `
                <div style="text-align: center;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🏆</div>
                    <h2 style="margin-bottom: 0.5rem; font-size: 1.5rem;">Congrats!</h2>
                    <p style="color: var(--text-dim);">You found the expression in ${this.history.length} attempt${this.history.length !== 1 ? 's' : ''}.</p>
                    <p style="font-weight: 800; margin: 1.5rem 0; font-size: 1.25rem; letter-spacing: 1px;">${this.targetPhrase}</p>
                    <button class="play-button" style="width: 100%;" onclick="game.closeModal()">Awesome</button>
                    <button class="action-link" style="width: 100%; justify-content: center; margin-top: 1rem; border: none; background: none; font-family: inherit; cursor: pointer;">
                        <span class="material-symbols-rounded">share</span> Share results
                    </button>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div style="text-align: center;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">☕</div>
                    <h2 style="margin-bottom: 0.5rem; font-size: 1.5rem;">Nice try!</h2>
                    <p style="color: var(--text-dim); margin-bottom: 1rem;">The expression was:</p>
                    <p style="font-weight: 800; margin-bottom: 2rem; font-size: 1.25rem; letter-spacing: 1px;">${this.targetPhrase}</p>
                    <button class="play-button" style="width: 100%;" onclick="game.closeModal()">Back to home</button>
                </div>
            `;
        }
    }

    closeModal() {
        document.getElementById('modal-overlay').classList.add('hidden');
        document.getElementById('modal-container').classList.add('hidden');
        this.setView('home');
    }
}

window.game = new ExpressoGame();