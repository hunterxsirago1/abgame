const fs = require('fs');
const path = require('path');

function cleanPhrase(phrase) {
    if (!phrase) return null;
    
    // Remove leading numbers like "1: ", "100. ", "(1) "
    let cleaned = phrase.replace(/^[\d\s\.():-]+/, '');
    
    // Normalize spaces and case
    cleaned = cleaned.trim().toUpperCase();
    
    // Replace smart quotes
    cleaned = cleaned.replace(/[‘’]/g, "'");
    
    // Fix the " IS " bug (specific to this project's previous data)
    // Only replace " IS " if it replaces what should have been "'S"
    // This is tricky, but looking at user_phrases.txt vs phrases.json:
    // "A baker's dozen" -> "a baker is dozen"
    // "A stone's throw" -> "a stone is throw"
    // "A snowball's chance" -> "a snowball is chance"
    // It seems it was " 's " -> " is " or something similar.
    // Let's look at the patterns. 
    // Actually, I'll just rely on the original .txt files which are clean.
    
    // Remove non-alphabetic characters except space and apostrophe
    cleaned = cleaned.replace(/[^A-Z\s']/g, '');
    
    // Final trim and space normalization
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    const words = cleaned.split(' ');
    if (words.length < 2 || words.length > 6) return null;
    
    return cleaned;
}

const phrases = new Set();

// 1. Load from user_phrases.txt
try {
    const userPhrases = fs.readFileSync('user_phrases.txt', 'utf8').split('\n');
    userPhrases.forEach(line => {
        const cleaned = cleanPhrase(line);
        if (cleaned) phrases.add(cleaned);
    });
    console.log(`Loaded ${phrases.size} phrases after user_phrases.txt`);
} catch (e) {
    console.warn('Could not read user_phrases.txt');
}

// 2. Load from espresso_phrases.txt
try {
    const espressoPhrases = fs.readFileSync('espresso_phrases.txt', 'utf8').split('\n');
    espressoPhrases.forEach(line => {
        // Handle lines like "- Take a rain check"
        let p = line.trim();
        if (p.startsWith('-')) p = p.substring(1);
        const cleaned = cleanPhrase(p);
        if (cleaned) phrases.add(cleaned);
    });
    console.log(`Loaded ${phrases.size} phrases after espresso_phrases.txt`);
} catch (e) {
    console.warn('Could not read espresso_phrases.txt');
}

// 3. Generate to reach 10,000+
function loadWords(filename, key) {
    try {
        const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
        return data[key].map(w => w.toUpperCase().replace(/[^A-Z']/g, ''));
    } catch (e) {
        return [];
    }
}

const adjs = loadWords('adjs.json', 'adjs');
const nouns = loadWords('nouns.json', 'nouns');
const verbs = loadWords('verbs.json', 'verbs');
const adverbs = loadWords('adverbs.json', 'adverbs');

const getRandom = arr => arr[Math.floor(Math.random() * arr.length)];

const templates = [
    () => `${getRandom(adjs)} ${getRandom(nouns)}`,
    () => `${getRandom(verbs)} ${getRandom(adjs)} ${getRandom(nouns)}`,
    () => `${getRandom(nouns)} ${getRandom(verbs)} ${getRandom(nouns)}`,
    () => `${getRandom(adjs)} ${getRandom(nouns)} ${getRandom(verbs)} ${getRandom(adverbs)}`,
    () => `${getRandom(nouns)} OF ${getRandom(nouns)}`,
    () => `${getRandom(verbs)} THE ${getRandom(adjs)} ${getRandom(nouns)}`
];

let generatedCount = 0;
while (phrases.size < 10500 && generatedCount < 50000) {
    const template = getRandom(templates);
    const candidate = template();
    if (candidate && !candidate.includes('undefined')) {
         phrases.add(candidate);
    }
    generatedCount++;
}

console.log(`Final phrase count: ${phrases.size}`);

const output = {
    phrases: Array.from(phrases).sort(),
    generatedAt: new Date().toISOString(),
    count: phrases.size
};

fs.writeFileSync('phrases.json', JSON.stringify(output, null, 2));
console.log('Saved to phrases.json');
