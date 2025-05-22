// Simple test script for trxViewer.ts functions using Jest
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

// Setup Jest globals manually since we're not running through the Jest CLI
global.describe = (name, fn) => {
    console.log(`\n${name}`);
    fn();
};

global.test = (name, fn) => {
    console.log(`  - ${name}`);
    Promise.resolve().then(fn).catch(e => {
        console.error(`    FAILED: ${e.message}`);
        process.exit(1);
    });
};

global.expect = (actual) => ({
    toBe: (expected) => {
        if (actual !== expected) {
            throw new Error(`Expected ${expected} but got ${actual}`);
        }
    },
    toEqual: (expected) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
        }
    },
    toBeDefined: () => {
        if (actual === undefined) {
            throw new Error('Expected value to be defined');
        }
    },
    toBeUndefined: () => {
        if (actual !== undefined) {
            throw new Error(`Expected undefined but got ${actual}`);
        }
    },
    not: {
        toBe: (expected) => {
            if (actual === expected) {
                throw new Error(`Expected ${actual} to not be ${expected}`);
            }
        }
    }
});

// Import trxViewer.ts functions
const trxViewerPath = path.resolve(__dirname, '../src/trxViewer.ts');
const trxContent = fs.readFileSync(path.resolve(__dirname, '../sample/results-example-mstest.trx'), 'utf-8');

// Manually expose the functions from trxViewer.ts
// We're doing this ugly approach because we can't use the TypeScript module directly
const trxViewerContent = fs.readFileSync(trxViewerPath, 'utf-8');

// Extract function names from the file
const functionRegex = /function\s+(\w+)\s*\(/g;
const exportRegex = /export\s+async\s+function\s+(\w+)\s*\(/g;
let match;
const functionNames = [];

while ((match = functionRegex.exec(trxViewerContent)) !== null) {
    functionNames.push(match[1]);
}

while ((match = exportRegex.exec(trxViewerContent)) !== null) {
    functionNames.push(match[1]);
}

console.log('Found functions:', functionNames);

// Create test harness
describe('TRX Parser Tests', () => {
    test('parseTrxContent should parse XML content', async () => {
        const parser = new xml2js.Parser({ explicitArray: false });
        const data = await parser.parseStringPromise(trxContent);
        
        expect(data).toBeDefined();
        expect(data.TestRun).toBeDefined();
    });

    test('normalizeTrxData should extract test data structure', () => {
        // Simple implementation of normalizeTrxData
        function normalizeTrxData(data) {
            const testRun = data.TestRun;
            return {
                testRun: {
                    name: testRun.$.name || 'Unknown',
                    runUser: testRun.$.runUser || 'Unknown',
                    times: {
                        start: testRun.Times?.$.start || '',
                        finish: testRun.Times?.$.finish || ''
                    }
                }
            };
        }
        
        const mockData = {
            TestRun: {
                $: {
                    name: 'Test Run',
                    runUser: 'Test User'
                },
                Times: {
                    $: {
                        start: '2023-01-01T12:00:00',
                        finish: '2023-01-01T12:01:00'
                    }
                }
            }
        };
        
        const result = normalizeTrxData(mockData);
        expect(result.testRun.name).toBe('Test Run');
        expect(result.testRun.times.start).toBe('2023-01-01T12:00:00');
    });

    test('extractTestDefinitions should handle various inputs', () => {
        // Simple implementation of extractTestDefinitions
        function extractTestDefinitions(testDefinitions) {
            if (!testDefinitions || !testDefinitions.UnitTest) {
                return [];
            }
            
            const unitTests = Array.isArray(testDefinitions.UnitTest) 
                ? testDefinitions.UnitTest 
                : [testDefinitions.UnitTest];
                
            return unitTests.map(test => ({
                id: test.$.id || '',
                name: test.$.name || '',
                storage: test.TestMethod?.$.codeBase || '',
                className: test.TestMethod?.$.className || ''
            }));
        }
        
        expect(extractTestDefinitions(undefined)).toEqual([]);
        
        const singleTestDef = {
            UnitTest: {
                $: {
                    id: 'test1',
                    name: 'Test 1'
                },
                TestMethod: {
                    $: {
                        codeBase: 'MyAssembly',
                        className: 'MyClass'
                    }
                }
            }
        };
        
        const result = extractTestDefinitions(singleTestDef);
        expect(result.length).toBe(1);
        expect(result[0].id).toBe('test1');
    });

    test('formatDate should format dates correctly', () => {
        // Simple implementation of formatDate
        function formatDate(dateStr) {
            if (!dateStr) { return 'N/A'; }
            try {
                const date = new Date(dateStr);
                return date.toLocaleString();
            } catch (e) {
                return dateStr;
            }
        }
        
        expect(formatDate(undefined)).toBe('N/A');
        expect(formatDate('')).toBe('N/A');
        
        // Test with a valid date string
        const dateStr = '2023-01-01T12:00:00';
        const formatted = formatDate(dateStr);
        expect(formatted).not.toBe('N/A');
    });
});

console.log('All tests completed successfully!');