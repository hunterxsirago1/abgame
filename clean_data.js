const fs = require('fs');

// Clean phrases.json
const phrasesRaw = JSON.parse(fs.readFileSync('phrases.json', 'utf8'));
const filteredPhrases = phrasesRaw.phrases.filter(p => p.replace(/ /g, '').length <= 10);
fs.writeFileSync('phrases.json', JSON.stringify({ phrases: filteredPhrases }, null, 2));

console.log(`phrases.json: ${phrasesRaw.phrases.length} -> ${filteredPhrases.length}`);

// Clean data.js
const dataJs = fs.readFileSync('data.js', 'utf8');
// This is a bit hacky but should work for this simple structure
const filteredDataJs = filteredPhrases.map(p => `    "${p.toLowerCase()}"`).join(',\n');
const newDataJs = `const phrases = [\n${filteredDataJs}\n];\n\nif (typeof module !== 'undefined') {\n    module.exports = { phrases };\n}`;
fs.writeFileSync('data.js', newDataJs);
