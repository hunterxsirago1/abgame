const fs = require('fs');
const data = JSON.parse(fs.readFileSync('phrases.json', 'utf8'));

const testWordLimit = 10;
const testTotalLimit = 10;

const byWord = data.phrases.filter(p => p.split(' ').every(w => w.length <= testWordLimit));
const byTotal = data.phrases.filter(p => p.replace(/ /g, '').length <= testTotalLimit);

console.log(`Original: ${data.phrases.length}`);
console.log(`Filtered by word length <= ${testWordLimit}: ${byWord.length}`);
console.log(`Filtered by total length <= ${testTotalLimit}: ${byTotal.length}`);

// Sample some filtered by word
console.log("\nSample by word (first 10):", byWord.slice(0, 10));
// Sample some filtered by total
console.log("\nSample by total (first 10):", byTotal.slice(0, 10));
