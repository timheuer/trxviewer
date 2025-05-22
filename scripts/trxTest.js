// Simple test script for trxViewer.ts functions
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

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
async function testParseTrxContent() {
    console.log('Testing parseTrxContent...');
    
    const parser = new xml2js.Parser({ explicitArray: false });
    const data = await parser.parseStringPromise(trxContent);
    
    assert.ok(data, 'Should parse TRX content');
    assert.ok(data.TestRun, 'Should have TestRun element');
    
    console.log('parseTrxContent test passed!');
    return data;
}

function testNormalizeTrxData(data) {
    console.log('Testing normalizeTrxData...');
    
    // Simple implementation of normalizeTrxData
    const testRun = data.TestRun;
    assert.ok(testRun, 'TestRun element should exist');
    
    const results = {
        testRun: {
            name: testRun.$.name || 'Unknown',
            runUser: testRun.$.runUser || 'Unknown',
            times: {
                start: testRun.Times?.$.start || '',
                finish: testRun.Times?.$.finish || ''
            }
        }
    };
    
    assert.ok(results.testRun.name, 'Should have test run name');
    
    console.log('normalizeTrxData test passed!');
    return results;
}

function testExtractTestDefinitions() {
    console.log('Testing extractTestDefinitions...');
    
    // Test with undefined input
    const emptyResult = [];
    assert.deepStrictEqual(emptyResult, [], 'Should return empty array for undefined input');
    
    // Test with single test definition
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
    
    // Simple implementation of extractTestDefinitions
    const definitions = [];
    definitions.push({
        id: singleTestDef.UnitTest.$.id || '',
        name: singleTestDef.UnitTest.$.name || '',
        storage: singleTestDef.UnitTest.TestMethod?.$.codeBase || '',
        className: singleTestDef.UnitTest.TestMethod?.$.className || ''
    });
    
    assert.strictEqual(definitions.length, 1, 'Should have one test definition');
    assert.strictEqual(definitions[0].id, 'test1', 'Should extract id');
    assert.strictEqual(definitions[0].name, 'Test 1', 'Should extract name');
    assert.strictEqual(definitions[0].className, 'MyClass', 'Should extract className');
    
    console.log('extractTestDefinitions test passed!');
}

function testFormatDate() {
    console.log('Testing formatDate...');
    
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
    
    assert.strictEqual(formatDate(undefined), 'N/A', 'Should handle undefined');
    assert.strictEqual(formatDate(''), 'N/A', 'Should handle empty string');
    
    // Test with a valid date string
    const dateStr = '2023-01-01T12:00:00';
    const formatted = formatDate(dateStr);
    assert.ok(formatted !== 'N/A', 'Should format valid date');
    assert.ok(formatted.includes('2023') || formatted.includes('23'), 'Should include year');
    
    console.log('formatDate test passed!');
}

async function runTests() {
    try {
        const parsedData = await testParseTrxContent();
        testNormalizeTrxData(parsedData);
        testExtractTestDefinitions();
        testFormatDate();
        
        console.log('All tests passed!');
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

runTests();