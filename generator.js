const fs = require('fs');
const path = require('path');

function loadWords(filename, key) {
    try {
        const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
        return data[key].map(w => w.toLowerCase());
    } catch (e) {
        console.error(`Error loading ${filename}:`, e);
        return [];
    }
}

const adjs = loadWords('adjs.json', 'adjs');
const nouns = loadWords('nouns.json', 'nouns');
const verbs = loadWords('verbs.json', 'verbs');
const adverbs = loadWords('adverbs.json', 'adverbs');

const getRandom = arr => arr[Math.floor(Math.random() * arr.length)];

// Curated base set for grounding
const curated = [
    "bright future ahead",
    "silent banana theory",
    "coding is art",
    "coffee breaks matter",
    "lost in translation",
    "mountain peak sunrise",
    "ocean wave crash",
    "keyboard warrior spirit",
    "urban jungle life",
    "digital nomad dreams",
    "zen meditation flow",
    "parallel universe logic",
    "quantum entanglement state",
    "retro gaming vibes",
    "cyberpunk city lights",
    "vintage photo memory",
    "hand wand education",
    "expresso cup steam"
];

function generatePhrase() {
    const templates = [
        () => `${getRandom(adjs)} ${getRandom(nouns)}`,
        () => `${getRandom(verbs)} ${getRandom(adjs)} ${getRandom(nouns)}`,
        () => `${getRandom(nouns)} ${getRandom(verbs)} ${getRandom(nouns)}`,
        () => `${getRandom(adjs)} ${getRandom(nouns)} ${getRandom(verbs)} ${getRandom(adverbs)}`,
        () => `${getRandom(nouns)} of ${getRandom(nouns)}`,
        () => `${getRandom(verbs)} the ${getRandom(adjs)} ${getRandom(nouns)}`,
        () => `${getRandom(curated)}`
    ];

    return getRandom(templates)();
}

const phrases = new Set();
// Seed with curated
curated.forEach(p => phrases.add(p.toUpperCase()));

let attempts = 0;
const targetCount = 10000;
console.log(`Generating ${targetCount} phrases...`);

while (phrases.size < targetCount && attempts < targetCount * 10) {
    const candidate = generatePhrase().toUpperCase();
    // Basic filter: min 2 words, max 6 words
    const wordCount = candidate.split(' ').length;
    if (wordCount >= 2 && wordCount <= 6) {
        phrases.add(candidate);
    }
    attempts++;
}

const output = {
    phrases: Array.from(phrases),
    generatedAt: new Date().toISOString(),
    count: phrases.size
};

fs.writeFileSync('phrases.json', JSON.stringify(output, null, 2));
console.log(`Successfully generated ${phrases.size} phrases in phrases.json.`);
