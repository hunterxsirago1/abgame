const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'words_alpha.txt');
const outputFile = path.join(__dirname, 'dictionary.json');

console.log('Reading words_alpha.txt...');
const data = fs.readFileSync(inputFile, 'utf-8');

console.log('Processing words...');
const words = data.split(/\r?\n/)
    .map(word => word.trim().toLowerCase())
    .filter(word => word.length > 0 && /^[a-z]+$/.test(word));

const uniqueWords = [...new Set(words)];

console.log(`Extracted ${uniqueWords.length} unique words.`);

console.log('Writing dictionary.json...');
fs.writeFileSync(outputFile, JSON.stringify(uniqueWords));

console.log('Done!');
