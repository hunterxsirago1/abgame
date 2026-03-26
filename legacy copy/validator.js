/**
 * High-performance English word validation module
 * Supports 370k+ words and lightweight morphological normalization.
 */

class WordValidator {
    constructor() {
        this.dictionary = new Set();
        this.isLoaded = false;
        this.debug = false;
    }

    /**
     * Load dictionary from JSON file
     * @param {string} url - URL or path to dictionary.json
     */
    async loadDictionary(url = 'dictionary.json') {
        const perf = typeof performance !== 'undefined' ? performance : { now: Date.now };
        const start = perf.now();
        try {
            const response = await fetch(url);
            const words = await response.json();
            this.dictionary = new Set(words);
            this.isLoaded = true;
            const end = perf.now();
            console.log(`Validator: Loaded ${this.dictionary.size} words in ${(end - start).toFixed(2)}ms`);
        } catch (error) {
            console.error('Validator: Failed to load dictionary:', error);
            throw error;
        }
    }

    /**
     * Validate a single word using exact match and morphological rules
     * @param {string} word - Processed word
     * @returns {boolean}
     */
    checkWord(word) {
        if (!this.isLoaded) return true; // Fail-safe (allow if not loaded yet)
        
        // 1. Exact match
        if (this.dictionary.has(word)) return true;

        // 2. Morphological handling (lightweight stemming)
        
        // Plurals: -s, -es
        if (word.endsWith('s')) {
            if (this.dictionary.has(word.slice(0, -1))) return true; // hands -> hand
            if (word.endsWith('es') && this.dictionary.has(word.slice(0, -2))) return true; // buses -> bus
        }

        // Past tense: -ed
        if (word.endsWith('ed')) {
            if (this.dictionary.has(word.slice(0, -2))) return true; // played -> play
            if (this.dictionary.has(word.slice(0, -1))) return true; // liked -> like
        }

        // Gerund: -ing
        if (word.endsWith('ing')) {
            const base = word.slice(0, -3);
            if (this.dictionary.has(base)) return true; // playing -> play
            if (this.dictionary.has(base + 'e')) return true; // moving -> move
        }

        if (this.debug) console.log(`Validator: Failed word [${word}]`);
        return false;
    }

    /**
     * Validate an entire phrase
     * @param {string} input - Raw input string
     * @param {Object} options - { debug: boolean }
     * @returns {boolean}
     */
    validatePhrase(input, { debug = false } = {}) {
        return this.getInvalidToken(input, { debug }) === null;
    }

    /**
     * Find the first invalid token in a phrase
     * @param {string} input 
     * @param {Object} options 
     * @returns {string|null} - The first invalid word or null
     */
    getInvalidToken(input, { debug = false } = {}) {
        this.debug = debug;
        if (!input || typeof input !== 'string') return null;

        const normalized = input.normalize('NFKD').toLowerCase();
        
        const tokens = normalized
            .replace(/[^\w\s']/g, '')
            .trim()
            .split(/\s+/);

        if (tokens.length === 0 || tokens[0] === '') return null;

        for (const token of tokens) {
            if (/^\d+$/.test(token) || token === "") continue;
            if (!this.checkWord(token)) return token;
        }

        return null;
    }

    /**
     * Get the underlying dictionary Set
     * @returns {Set}
     */
    getDictionary() {
        return this.dictionary;
    }
}

// Global instance for browser
if (typeof window !== 'undefined') {
    window.validator = new WordValidator();
}

// Node.js export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WordValidator;
}
