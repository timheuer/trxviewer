import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as sinon from 'sinon';

// Import the trxViewer module to test its functions
// We need to use the require syntax to access private functions
const trxViewer = require('../../trxViewer');
import { getSampleFilePath, readSampleFile, createMockUri, createMockExtensionContext } from './testUtils';

suite('TRX Viewer Tests', () => {
    // Test setup
    let sandbox: sinon.SinonSandbox;
    
    setup(() => {
        sandbox = sinon.createSandbox();
    });
    
    teardown(() => {
        sandbox.restore();
    });
    
    test('parseTrxContent should parse valid TRX file content', async () => {
        // Use the example TRX file from sample directory
        const trxContent = readSampleFile('results-example-mstest.trx');
        
        // Call the parseTrxContent function
        const result = await trxViewer.parseTrxContent(trxContent);
        
        // Assert that we got a valid result
        assert.ok(result, 'Result should not be null or undefined');
        assert.ok(result.TestRun, 'Result should have TestRun');
    });
    
    test('parseTrxContent should reject invalid content', async () => {
        // Create an invalid XML content
        const invalidContent = '<InvalidXML>This is not valid TRX</invalid>';
        
        // Test that it rejects the promise with an error
        await assert.rejects(
            async () => await trxViewer.parseTrxContent(invalidContent),
            (err) => {
                assert.ok(err instanceof Error);
                return true;
            },
            'Should reject with an error for invalid XML'
        );
    });
    
    test('normalizeTrxData should extract correct structure', async () => {
        // First parse a sample file
        const trxContent = readSampleFile('results-example-mstest.trx');
        const parsedData = await trxViewer.parseTrxContent(trxContent);
        
        // Then normalize the data
        const normalizedData = trxViewer.normalizeTrxData(parsedData);
        
        // Check the structure
        assert.ok(normalizedData.testRun, 'Should have testRun property');
        assert.ok(normalizedData.testDefinitions, 'Should have testDefinitions property');
        assert.ok(normalizedData.testResults, 'Should have testResults property');
        assert.ok(Array.isArray(normalizedData.testDefinitions), 'testDefinitions should be an array');
        assert.ok(Array.isArray(normalizedData.testResults), 'testResults should be an array');
    });
    
    test('extractTestDefinitions should handle various inputs correctly', () => {
        // Test with undefined input
        const emptyResult = trxViewer.extractTestDefinitions(undefined);
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
        const singleResult = trxViewer.extractTestDefinitions(singleTestDef);
        assert.strictEqual(singleResult.length, 1, 'Should have one test definition');
        assert.strictEqual(singleResult[0].id, 'test1', 'Should extract id');
        assert.strictEqual(singleResult[0].name, 'Test 1', 'Should extract name');
        assert.strictEqual(singleResult[0].className, 'MyClass', 'Should extract className');
        
        // Test with multiple test definitions
        const multiTestDef = {
            UnitTest: [
                {
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
                },
                {
                    $: {
                        id: 'test2',
                        name: 'Test 2'
                    },
                    TestMethod: {
                        $: {
                            codeBase: 'MyAssembly',
                            className: 'MyClass'
                        }
                    }
                }
            ]
        };
        const multiResult = trxViewer.extractTestDefinitions(multiTestDef);
        assert.strictEqual(multiResult.length, 2, 'Should have two test definitions');
    });
    
    test('extractTestResults should handle various inputs correctly', () => {
        // Test with undefined input
        const emptyResult = trxViewer.extractTestResults(undefined);
        assert.deepStrictEqual(emptyResult, [], 'Should return empty array for undefined input');
        
        // Test with single test result
        const singleTestResult = {
            UnitTestResult: {
                $: {
                    testId: 'test1',
                    outcome: 'Passed',
                    duration: '00:00:01',
                    startTime: '2023-01-01',
                    endTime: '2023-01-01'
                },
                Output: {
                    StdOut: 'Test output'
                }
            }
        };
        const singleResult = trxViewer.extractTestResults(singleTestResult);
        assert.strictEqual(singleResult.length, 1, 'Should have one test result');
        assert.strictEqual(singleResult[0].testId, 'test1', 'Should extract testId');
        assert.strictEqual(singleResult[0].outcome, 'Passed', 'Should extract outcome');
        assert.strictEqual(singleResult[0].output, 'Test output', 'Should extract output');
        
        // Test with error info
        const errorTestResult = {
            UnitTestResult: {
                $: {
                    testId: 'test1',
                    outcome: 'Failed',
                    duration: '00:00:01',
                    startTime: '2023-01-01',
                    endTime: '2023-01-01'
                },
                Output: {
                    ErrorInfo: {
                        Message: 'Error message',
                        StackTrace: 'Stack trace'
                    }
                }
            }
        };
        const errorResult = trxViewer.extractTestResults(errorTestResult);
        assert.strictEqual(errorResult[0].outcome, 'Failed', 'Should extract error outcome');
        assert.ok(errorResult[0].errorInfo, 'Should have errorInfo');
        assert.strictEqual(errorResult[0].errorInfo.message, 'Error message', 'Should extract error message');
    });
    
    test('extractCounters should extract correct counters', () => {
        const counters = {
            $: {
                total: '10',
                executed: '8',
                passed: '6',
                failed: '2',
                error: '0',
                timeout: '0',
                aborted: '0',
                inconclusive: '0',
                passedButRunAborted: '0',
                notRunnable: '0',
                notExecuted: '2',
                disconnected: '0',
                warning: '0',
                completed: '8',
                inProgress: '0',
                pending: '0'
            }
        };
        
        const result = trxViewer.extractCounters(counters);
        
        assert.strictEqual(result.total, '10', 'Should extract total');
        assert.strictEqual(result.passed, '6', 'Should extract passed');
        assert.strictEqual(result.failed, '2', 'Should extract failed');
        assert.strictEqual(result.notExecuted, '2', 'Should extract notExecuted');
    });
    
    test('linkTestResultsWithDefinitions should link results with definitions', () => {
        const definitions = [
            { id: 'test1', name: 'Test 1', className: 'TestClass1' },
            { id: 'test2', name: 'Test 2', className: 'TestClass2' }
        ];
        
        const results = [
            { testId: 'test1', outcome: 'Passed' },
            { testId: 'test2', outcome: 'Failed' },
            { testId: 'test3', outcome: 'Not Found' }
        ];
        
        const linked = trxViewer.linkTestResultsWithDefinitions(results, definitions);
        
        assert.strictEqual(linked.length, 3, 'Should have same number of results');
        assert.strictEqual(linked[0].name, 'Test 1', 'Should get name from definition');
        assert.strictEqual(linked[1].className, 'TestClass2', 'Should get className from definition');
        assert.strictEqual(linked[2].name, 'Unknown Test', 'Should use default name for unknown test');
    });
    
    test('formatDate should format dates correctly', () => {
        assert.strictEqual(trxViewer.formatDate(undefined), 'N/A', 'Should handle undefined');
        assert.strictEqual(trxViewer.formatDate(''), 'N/A', 'Should handle empty string');
        
        // Test with a valid date string - note that the exact formatted string depends on locale
        const dateStr = '2023-01-01T12:00:00';
        const formatted = trxViewer.formatDate(dateStr);
        assert.ok(formatted !== 'N/A', 'Should format valid date');
        assert.ok(formatted.includes('2023'), 'Should include year');
    });
});