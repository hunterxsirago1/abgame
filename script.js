/**
 * Expresso Clone - Core Game Script
 */

const CONFIG = {
    MAX_ATTEMPTS: 6,
    COLORS: {
        GREEN: 'green',
        YELLOW: 'yellow',
        PURPLE: 'purple',
        GRAY: 'gray'
    }
};

class ExpressoGame {
    constructor() {
        this.phrases = [];
        this.dictionary = new Set();
        
        this.targetPhrase = "";
        this.words = [];
        this.currentAttempt = 0;
        this.currentGuess = "";
        this.history = []; // Array of {guess, feedback}
        this.keyboardState = {}; // { A: 'green', B: 'yellow', ... }
        this.status = "playing"; // playing, won, lost
        this.view = "home"; // home, game
        
        this.init();
    }

    async init() {
        await this.loadData();
        this.render();
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }

    async loadData() {
        try {
            const response = await fetch('data.json');
            const data = await response.json();
            this.phrases = data.phrases;
            this.dictionary = new Set(data.dictionary.map(w => w.toUpperCase()));
            // Ensure target words are in dictionary
            this.phrases.forEach(phrase => {
                phrase.split(' ').forEach(word => this.dictionary.add(word.toUpperCase()));
            });
        } catch (error) {
            console.error("Failed to load game data:", error);
            // Fallback
            this.phrases = ["FALLBACK PHRASE"];
            this.dictionary = new Set(["FALLBACK", "PHRASE"]);
        }
    }

    setRandomPhrase() {
        this.targetPhrase = this.phrases[Math.floor(Math.random() * this.phrases.length)].toUpperCase();
        this.words = this.targetPhrase.split(' ');
        this.reset();
    }

    reset() {
        this.currentAttempt = 0;
        this.currentGuess = "";
        this.history = [];
        this.keyboardState = {};
        this.status = "playing";
        this.render();
    }

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
        const maxLength = this.targetPhrase.replace(/ /g, '').length;
        if (this.currentGuess.length < maxLength) {
            this.currentGuess += letter.toUpperCase();
            this.render();
        }
    }

    removeLetter() {
        if (this.currentGuess.length > 0) {
            this.currentGuess = this.currentGuess.slice(0, -1);
            this.render();
        }
    }

    isValidGuess() {
        // Split currentGuess back into words based on targetPhrase structure
        let chars = this.currentGuess.split('');
        let guessWords = [];
        this.words.forEach(w => {
            guessWords.push(chars.splice(0, w.length).join(''));
        });

        // Check each word in dictionary
        for (let word of guessWords) {
            if (!this.dictionary.has(word)) {
                return false;
            }
        }
        return true;
    }

    submitGuess() {
        const maxLength = this.targetPhrase.replace(/ /g, '').length;
        if (this.currentGuess.length < maxLength) {
            this.triggerShake();
            return;
        }

        if (!this.isValidGuess()) {
            this.showMessage("Not in word list");
            this.triggerShake();
            return;
        }

        const feedback = this.calculateFeedback(this.currentGuess);
        this.updateKeyboardState(this.currentGuess, feedback);
        
        const guessObj = { guess: this.currentGuess, feedback };
        this.history.push(guessObj);
        
        // Trigger animations before updating state fully
        this.animateFeedback(this.currentAttempt);

        if (this.currentGuess === this.targetPhrase.replace(/ /g, '')) {
            this.status = "won";
            setTimeout(() => this.showModal('win'), 2500);
        }

        setTimeout(() => {
            this.currentAttempt++;
            this.currentGuess = "";
            this.render();
        }, 1500); // Wait for animations
    }

    triggerShake() {
        const row = document.querySelectorAll('.phrase-row')[this.currentAttempt];
        if (row) {
            row.classList.add('shake');
            setTimeout(() => row.classList.remove('shake'), 500);
        }
    }

    showMessage(msg) {
        // Simple toast or just console for now, but let's do a simple overlay
        const toast = document.createElement('div');
        toast.textContent = msg;
        toast.style.cssText = `
            position: fixed; top: 10%; left: 50%; transform: translateX(-50%);
            background: #eee; color: #333; padding: 10px 20px; border-radius: 5px;
            font-weight: 800; z-index: 2000; animation: pop 0.2s ease-out;
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    }

    updateKeyboardState(guess, feedback) {
        const priority = { [CONFIG.COLORS.GREEN]: 4, [CONFIG.COLORS.YELLOW]: 3, [CONFIG.COLORS.PURPLE]: 2, [CONFIG.COLORS.GRAY]: 1 };
        
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
                // We'll update colors via CSS classes as soon as they flip halfway
                setTimeout(() => {
                    const feedback = this.history[rowIdx].feedback[i];
                    tile.classList.add(feedback);
                    tile.parentElement.parentElement.classList.add('revealed');
                }, 300);
            }, i * 100);
        });
    }

    calculateFeedback(guess) {
        const targetClean = this.targetPhrase.replace(/ /g, '');
        const targetWords = this.words;
        const guessLetters = guess.split('');
        
        const targetIndices = [];
        targetWords.forEach((word, wIdx) => {
            for (let i = 0; i < word.length; i++) {
                targetIndices.push({ char: word[i], wordIdx: wIdx, posInWord: i, used: false });
            }
        });

        const guessMap = guessLetters.map((char, i) => ({ char, feedback: CONFIG.COLORS.GRAY }));

        // Pass 1: Green (Exact match in phrase position)
        guessMap.forEach((g, i) => {
            if (g.char === targetIndices[i].char) {
                g.feedback = CONFIG.COLORS.GREEN;
                targetIndices[i].used = true;
            }
        });

        // Pass 2: Yellow (Correct character in the correct word, but wrong position)
        guessMap.forEach((g, i) => {
            if (g.feedback !== CONFIG.COLORS.GRAY) return;
            
            const currentWordIdx = targetIndices[i].wordIdx;
            // Look for this character UNUSED in the SAME WORD
            const matchInWord = targetIndices.find(t => 
                !t.used && t.char === g.char && t.wordIdx === currentWordIdx
            );

            if (matchInWord) {
                g.feedback = CONFIG.COLORS.YELLOW;
                matchInWord.used = true;
            }
        });

        // Pass 3: Purple (Correct character but located in a DIFFERENT word)
        guessMap.forEach((g, i) => {
            if (g.feedback !== CONFIG.COLORS.GRAY) return;

            // Look for this character UNUSED ANYWHERE in the phrase
            const matchElsewhere = targetIndices.find(t => !t.used && t.char === g.char);
            if (matchElsewhere) {
                g.feedback = CONFIG.COLORS.PURPLE;
                matchElsewhere.used = true;
            }
        });

        return guessMap.map(g => g.feedback);
    }

    render() {
        const root = document.getElementById('app');
        if (this.view === 'home') {
            root.innerHTML = this.renderHome();
        } else {
            root.innerHTML = this.renderGame();
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
                    <button class="play-button" onclick="game.startGame()">Play</button>
                </div>
                
                <div class="secondary-actions">
                    <a href="#" class="action-link"><span class="material-symbols-rounded">calendar_month</span> Previous games</a>
                    <a href="#" class="action-link"><span class="material-symbols-rounded">chat_bubble</span> Feedback</a>
                    <a href="#" class="action-link"><span class="material-symbols-rounded">language</span> Language</a>
                </div>
            </div>
        `;
    }

    renderGame() {
        return `
            <div class="game-view">
                <div class="header">
                    <button class="icon-btn" onclick="game.setView('home')">
                        <span class="material-symbols-rounded">arrow_back</span>
                    </button>
                    <div style="font-weight: 800; letter-spacing: 1px;">EXPRESSO</div>
                    <button class="icon-btn">
                        <span class="material-symbols-rounded">help</span>
                    </button>
                </div>
                
                <div class="game-content">
                    ${this.renderGrid()}
                </div>
                
                ${this.renderKeyboard()}
            </div>
        `;
    }

    renderGrid() {
        let rows = "";
        
        // Only render past guesses
        this.history.forEach((attempt, i) => {
            rows += `<div class="phrase-row revealed">${this.renderRow(attempt.guess, attempt.feedback)}</div>`;
        });

        // Only render ONE current input row (if still playing)
        if (this.status === 'playing') {
            rows += `<div class="phrase-row current-input">${this.renderRow(this.currentGuess)}</div>`;
        }

        return rows;
    }

    renderRow(guess, feedback = null) {
        let html = "";
        let charIdx = 0;
        
        this.words.forEach((word, wIdx) => {
            html += `<div class="word-group">`;
            for (let i = 0; i < word.length; i++) {
                const char = guess[charIdx] || "";
                const color = feedback ? feedback[charIdx] : "";
                const isFilled = char !== "";
                html += `<div class="tile ${isFilled ? 'filled' : ''} ${color}">${char}</div>`;
                charIdx++;
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
        rows.forEach((row, i) => {
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

    startGame() {
        this.view = 'game';
        this.setRandomPhrase();
        this.render();
    }

    setView(view) {
        this.view = view;
        this.render();
    }

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
                    <p style="color: var(--text-dim);">You found the expression in ${this.history.length} attempts.</p>
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
                    <button class="play-button" style="width: 100%;" onclick="game.closeModal()">Try again</button>
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
