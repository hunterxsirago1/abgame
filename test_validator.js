const fs = require('fs');
const WordValidator = require('./validator.js');

const validator = new WordValidator();

// Mock fetch for Node
global.fetch = async (url) => {
    return {
        json: async () => JSON.parse(fs.readFileSync(url, 'utf-8'))
    };
};

// Mock performance for Node
global.performance = {
    now: () => Date.now()
};

async function runTests() {
    console.log('--- Word Validation Test Suite ---');
    await validator.loadDictionary('dictionary.json');

    const testCases = [
        { input: "hand wand education", expected: true },
        { input: "Hand, wand education!", expected: true },
        { input: "hands played playing", expected: true },
        { input: "moving move moves", expected: true },
        { input: "asdfghjkl", expected: false },
        { input: "123", expected: false },
        { input: "don't it's", expected: true },
        { input: "  multiple   spaces  ", expected: true },
        { input: "", expected: false }
    ];

    let passed = 0;
    testCases.forEach((tc, i) => {
        const result = validator.validatePhrase(tc.input, { debug: true });
        const success = result === tc.expected;
        if (success) passed++;
        console.log(`Test ${i + 1}: [${tc.input}] -> ${result} (${success ? 'PASS' : 'FAIL'})`);
    });

    console.log(`\nResult: ${passed}/${testCases.length} tests passed.`);
}

runTests().catch(console.error);
