import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as sinon from 'sinon';

// Import Jest
import { describe, test, beforeEach, afterEach, expect } from '@jest/globals';

// Import the trxViewer module to test its functions
// We need to use the require syntax to access private functions
const trxViewer = require('../../trxViewer');
import { getSampleFilePath, readSampleFile, createMockUri, createMockExtensionContext } from './testUtils';

describe('TRX Viewer Tests', () => {
    // Test setup
    let sandbox: sinon.SinonSandbox;
    
    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });
    
    afterEach(() => {
        sandbox.restore();
    });
    
    test('parseTrxContent should parse valid TRX file content', async () => {
        // Use the example TRX file from sample directory
        const trxContent = readSampleFile('results-example-mstest.trx');
        
        // Call the parseTrxContent function
        const result = await trxViewer.parseTrxContent(trxContent);
        
        // Assert that we got a valid result
        expect(result).toBeDefined();
        expect(result.TestRun).toBeDefined();
    });
    
    test('parseTrxContent should reject invalid content', async () => {
        // Create an invalid XML content
        const invalidContent = '<InvalidXML>This is not valid TRX</invalid>';
        
        // Test that it rejects the promise with an error
        await expect(trxViewer.parseTrxContent(invalidContent)).rejects.toThrow();
    });
    
    test('normalizeTrxData should extract correct structure', async () => {
        // First parse a sample file
        const trxContent = readSampleFile('results-example-mstest.trx');
        const parsedData = await trxViewer.parseTrxContent(trxContent);
        
        // Then normalize the data
        const normalizedData = trxViewer.normalizeTrxData(parsedData);
        
        // Check the structure
        expect(normalizedData.testRun).toBeDefined();
        expect(normalizedData.testDefinitions).toBeDefined();
        expect(normalizedData.testResults).toBeDefined();
        expect(Array.isArray(normalizedData.testDefinitions)).toBe(true);
        expect(Array.isArray(normalizedData.testResults)).toBe(true);
    });
    
    test('extractTestDefinitions should handle various inputs correctly', () => {
        // Test with undefined input
        const emptyResult = trxViewer.extractTestDefinitions(undefined);
        expect(emptyResult).toEqual([]);
        
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
        expect(singleResult.length).toBe(1);
        expect(singleResult[0].id).toBe('test1');
        expect(singleResult[0].name).toBe('Test 1');
        expect(singleResult[0].className).toBe('MyClass');
        
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
        expect(multiResult.length).toBe(2);
    });
    
    test('extractTestResults should handle various inputs correctly', () => {
        // Test with undefined input
        const emptyResult = trxViewer.extractTestResults(undefined);
        expect(emptyResult).toEqual([]);
        
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
        expect(singleResult.length).toBe(1);
        expect(singleResult[0].testId).toBe('test1');
        expect(singleResult[0].outcome).toBe('Passed');
        expect(singleResult[0].output).toBe('Test output');
        
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
        expect(errorResult[0].outcome).toBe('Failed');
        expect(errorResult[0].errorInfo).toBeDefined();
        expect(errorResult[0].errorInfo.message).toBe('Error message');
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
        
        expect(result.total).toBe('10');
        expect(result.passed).toBe('6');
        expect(result.failed).toBe('2');
        expect(result.notExecuted).toBe('2');
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
        
        expect(linked.length).toBe(3);
        expect(linked[0].name).toBe('Test 1');
        expect(linked[1].className).toBe('TestClass2');
        expect(linked[2].name).toBe('Unknown Test');
    });
    
    test('formatDate should format dates correctly', () => {
        expect(trxViewer.formatDate(undefined)).toBe('N/A');
        expect(trxViewer.formatDate('')).toBe('N/A');
        
        // Test with a valid date string - note that the exact formatted string depends on locale
        const dateStr = '2023-01-01T12:00:00';
        const formatted = trxViewer.formatDate(dateStr);
        expect(formatted).not.toBe('N/A');
        expect(formatted.includes('2023') || formatted.includes('23')).toBe(true);
    });
});