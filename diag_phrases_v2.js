const fs = require('fs');
const data = JSON.parse(fs.readFileSync('phrases.json', 'utf8'));

const testWordLimit = 10;
const testTotalLimit = 10;

const byWord = data.phrases.filter(p => p.split(' ').every(w => w.length <= testWordLimit));
const byTotal = data.phrases.filter(p => p.replace(/ /g, '').length <= testTotalLimit);

console.log(`Original count: ${data.phrases.length}`);
console.log(`Count with any word <= 10: ${byWord.length}`);
console.log(`Count with total phrase (no spaces) <= 10: ${byTotal.length}`);
