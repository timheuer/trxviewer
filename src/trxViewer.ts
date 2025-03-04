// Generated by Copilot
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as xml2js from 'xml2js';
import * as path from 'path';

/**
 * View a TRX file in a webview panel
 */
export async function viewTrxFile(
    uri: vscode.Uri,
    context: { extensionUri?: vscode.Uri },
    existingPanel?: vscode.WebviewPanel
): Promise<void> {
    try {
        // Verify file exists
        try {
            await vscode.workspace.fs.stat(uri);
        } catch (error) {
            throw new Error(`File not found: ${uri.fsPath}`);
        }

        // Read and validate TRX file content
        const trxContent = await fs.promises.readFile(uri.fsPath, 'utf-8');
        if (!trxContent.includes('<TestRun')) {
            throw new Error('Invalid TRX file: Missing TestRun element');
        }

        // Create or reuse the webview panel
        const panel = existingPanel || vscode.window.createWebviewPanel(
            'trxViewer',
            `TRX Viewer: ${path.basename(uri.fsPath)}`,
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: context.extensionUri ? [context.extensionUri] : []
            }
        );

        // Parse and render TRX content
        const trxData = await parseTrxContent(trxContent);
        const htmlContent = generateHtmlContent(trxData);
        panel.webview.html = htmlContent;

        // Handle webview messages
        panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'error':
                        vscode.window.showErrorMessage(message.text);
                        return;
                    case 'info':
                        vscode.window.showInformationMessage(message.text);
                        return;
                }
            },
            undefined,
            context.extensionUri ? [] : undefined
        );

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Error opening TRX file: ${errorMessage}`, 'Show Details').then(selection => {
            if (selection === 'Show Details') {
                vscode.window.showErrorMessage(`Detailed error: ${errorMessage}\nFile: ${uri.fsPath}`, { modal: true });
            }
        });
        throw error;
    }
}

/**
 * Parse TRX content into a structured object
 */
async function parseTrxContent(content: string): Promise<any> {
    try {
        const parser = new xml2js.Parser({ explicitArray: false });
        return new Promise((resolve, reject) => {
            parser.parseString(content, (err: Error | null, result: any) => {
                if (err) {
                    reject(new Error(`Failed to parse TRX XML: ${err.message}`));
                } else {
                    resolve(normalizeTrxData(result));
                }
            });
        });
    } catch (error) {
        throw new Error(`Failed to parse TRX file: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Normalize and extract important data from the TRX structure
 */
function normalizeTrxData(data: any): any {
    const testRun = data.TestRun;
    if (!testRun) {
        throw new Error('Invalid TRX format: TestRun element not found');
    }

    const results = {
        testRun: {
            name: testRun.$.name || 'Unknown',
            runUser: testRun.$.runUser || 'Unknown',
            times: {
                start: testRun.Times?.$.start || '',
                finish: testRun.Times?.$.finish || ''
            },
            counters: extractCounters(testRun.ResultSummary?.Counters)
        },
        testDefinitions: extractTestDefinitions(testRun.TestDefinitions),
        testResults: extractTestResults(testRun.Results)
    };

    // Link test results with their definitions
    results.testResults = linkTestResultsWithDefinitions(results.testResults, results.testDefinitions);

    return results;
}

/**
 * Extract test counters from TRX data
 */
function extractCounters(counters: any): any {
    if (!counters || !counters.$) {
        return {
            total: '0',
            executed: '0',
            passed: '0',
            failed: '0',
            error: '0',
            timeout: '0',
            aborted: '0',
            inconclusive: '0',
            notExecuted: '0'
        };
    }

    return {
        total: counters.$.total || '0',
        executed: counters.$.executed || '0',
        passed: counters.$.passed || '0',
        failed: counters.$.failed || '0',
        error: counters.$.error || '0',
        timeout: counters.$.timeout || '0',
        aborted: counters.$.aborted || '0',
        inconclusive: counters.$.inconclusive || '0',
        passedButRunAborted: counters.$.passedButRunAborted || '0',
        notRunnable: counters.$.notRunnable || '0',
        notExecuted: counters.$.notExecuted || '0',
        disconnected: counters.$.disconnected || '0',
        warning: counters.$.warning || '0',
        completed: counters.$.completed || '0',
        inProgress: counters.$.inProgress || '0',
        pending: counters.$.pending || '0'
    };
}

/**
 * Extract test definitions from TRX data
 */
function extractTestDefinitions(testDefs: any): any[] {
    const definitions = [];
    if (!testDefs || !testDefs.UnitTest) {
        return [];
    }

    const unitTests = Array.isArray(testDefs.UnitTest)
        ? testDefs.UnitTest
        : [testDefs.UnitTest];

    for (const test of unitTests) {
        definitions.push({
            id: test.$.id || '',
            name: test.$.name || '',
            storage: test.TestMethod?.$.codeBase || '',
            className: test.TestMethod?.$.className || ''
        });
    }

    return definitions;
}

/**
 * Extract test results from TRX data
 */
function extractTestResults(results: any): any[] {
    const testResults = [];
    if (!results || !results.UnitTestResult) {
        return [];
    }

    const unitResults = Array.isArray(results.UnitTestResult)
        ? results.UnitTestResult
        : [results.UnitTestResult];

    for (const result of unitResults) {
        let errorInfo = null;
        if (result.Output?.ErrorInfo) {
            errorInfo = {
                message: result.Output.ErrorInfo.Message || '',
                stackTrace: result.Output.ErrorInfo.StackTrace || ''
            };
        }

        let output = null;
        if (result.Output?.StdOut) {
            output = result.Output.StdOut;
        }

        testResults.push({
            testId: result.$.testId || '',
            outcome: result.$.outcome || '',
            duration: result.$.duration || '',
            startTime: result.$.startTime || '',
            endTime: result.$.endTime || '',
            errorInfo,
            output
        });
    }

    return testResults;
}

/**
 * Link test results with their test definitions
 */
function linkTestResultsWithDefinitions(results: any[], definitions: any[]): any[] {
    return results.map(result => {
        const testDef = definitions.find(def => def.id === result.testId);
        return {
            ...result,
            name: testDef ? testDef.name : 'Unknown Test',
            className: testDef ? testDef.className : ''
        };
    });
}

/**
 * Format date string from TRX format to a more readable format
 */
function formatDate(dateStr: string): string {
    if (!dateStr) return 'N/A';
    try {
        const date = new Date(dateStr);
        return date.toLocaleString();
    } catch (e) {
        return dateStr;
    }
}

/**
 * Generate HTML content for the test results
 */
function generateHtmlContent(data: any): string {
    // Calculate summary stats
    const totalTests = parseInt(data.testRun.counters.total) || 0;
    const passedTests = parseInt(data.testRun.counters.passed) || 0;
    const failedTests = parseInt(data.testRun.counters.failed) || 0;
    const notExecuted = parseInt(data.testRun.counters.notExecuted) || 0;

    // Calculate pass percentage for progress bar
    const passPercentage = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(2) : '0';

    // Group tests by outcome
    const passedTestResults = data.testResults.filter((t: any) => t.outcome === 'Passed');
    const failedTestResults = data.testResults.filter((t: any) => t.outcome === 'Failed');
    const otherTestResults = data.testResults.filter((t: any) =>
        t.outcome !== 'Passed' && t.outcome !== 'Failed');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TRX Viewer</title>
    <style>
        body {
            font-family: var(--vscode-font-family, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif);
            padding: 1rem;
            color: var(--vscode-editor-foreground, #333);
            background-color: var(--vscode-editor-background, #fff);
            line-height: 1.5;
        }
        
        .header {
            margin-bottom: 1rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid var(--vscode-panel-border, #ddd);
        }
        
        h1, h2, h3, h4 {
            color: var(--vscode-titleBar-activeForeground, #333);
            margin-top: 0;
        }
        
        .summary {
            display: flex;
            flex-wrap: wrap;
            gap: 1rem;
            margin-bottom: 1rem;
        }
        
        .summary-box {
            border-radius: 4px;
            padding: 0.75rem;
            flex: 1 1 300px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            background-color: var(--vscode-editor-background, #fff);
            border: 1px solid var(--vscode-panel-border, #eee);
        }
        
        .stats-container {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
        }
        
        .stat-card {
            padding: 1rem;
            border-radius: 4px;
            text-align: center;
            flex: 1 1 150px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        
        .stat-card.total {
            background-color: var(--vscode-badge-background, #007acc);
            color: var(--vscode-badge-foreground, white);
        }
        
        .stat-card.passed {
            background-color: var(--vscode-testing-iconPassed, #388a34);
            color: white;
        }
        
        .stat-card.failed {
            background-color: var(--vscode-testing-iconFailed, #e51400);
            color: white;
        }
        
        .stat-card.other {
            background-color: var(--vscode-testing-iconSkipped, #848484);
            color: white;
        }
        
        .stat-value {
            font-size: 2rem;
            font-weight: bold;
        }
        
        .stat-label {
            text-transform: uppercase;
            font-size: 0.9rem;
        }
        
        .progress-bar {
            width: 100%;
            height: 20px;
            background-color: var(--vscode-progressBar-background, #e6e6e6);
            border-radius: 10px;
            overflow: hidden;
            margin: 1rem 0;
        }
        
        .progress {
            height: 100%;
            background-color: var(--vscode-testing-iconPassed, #388a34);
            width: ${passPercentage}%;
            transition: width 0.5s ease;
        }
        
        .progress-label {
            text-align: center;
            margin-top: 0.25rem;
            font-size: 0.9rem;
        }
        
        .test-section {
            margin: 1.5rem 0;
        }
        
        .collapsible {
            cursor: pointer;
            padding: 0.5rem;
            background-color: var(--vscode-titleBar-inactiveBackground, #f3f3f3);
            border: none;
            text-align: left;
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: bold;
            border-radius: 4px;
        }
        
        .collapsible:hover {
            background-color: var(--vscode-list-hoverBackground, #e8e8e8);
        }
        
        .content {
            overflow: hidden;
            max-height: 0;
            transition: max-height 0.3s ease;
        }
        
        .content.show {
            max-height: 2000px;
            transition: max-height 1s ease;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1rem;
        }
        
        th, td {
            padding: 0.75rem;
            text-align: left;
            border-bottom: 1px solid var(--vscode-panel-border, #eee);
        }
        
        th {
            background-color: var(--vscode-editor-background, #f9f9f9);
            font-weight: bold;
        }
        
        tr.failed {
            background-color: var(--vscode-inputValidation-errorBackground, rgba(229, 20, 0, 0.1));
        }
        
        tr.passed {
            background-color: var(--vscode-inputValidation-infoBackground, rgba(56, 138, 52, 0.1));
        }
        
        .error-message {
            padding: 1rem;
            background-color: var(--vscode-inputValidation-errorBackground, rgba(229, 20, 0, 0.1));
            border-left: 4px solid var(--vscode-testing-iconFailed, #e51400);
            margin: 0.5rem 0;
            white-space: pre-wrap;
            overflow-x: auto;
        }
        
        .test-output {
            padding: 0.75rem;
            background-color: var(--vscode-textCodeBlock-background, #f5f5f5);
            border: 1px solid var(--vscode-panel-border, #ddd);
            border-radius: 3px;
            white-space: pre-wrap;
            font-family: var(--vscode-editor-font-family, monospace);
            font-size: 0.9rem;
            overflow-x: auto;
            margin-top: 0.5rem;
        }
        
        .duration {
            font-family: var(--vscode-editor-font-family, monospace);
            color: var(--vscode-descriptionForeground, #717171);
        }
        
        .badge {
            display: inline-block;
            padding: 0.25rem 0.5rem;
            font-size: 0.8rem;
            border-radius: 3px;
            margin-left: 0.5rem;
        }
        
        .badge-passed {
            background-color: var(--vscode-testing-iconPassed, #388a34);
            color: white;
        }
        
        .badge-failed {
            background-color: var(--vscode-testing-iconFailed, #e51400);
            color: white;
        }
        
        .badge-other {
            background-color: var(--vscode-testing-iconSkipped, #848484);
            color: white;
        }
        
        .stack-trace {
            font-family: var(--vscode-editor-font-family, monospace);
            white-space: pre-wrap;
            overflow-x: auto;
            font-size: 0.9rem;
            padding: 0.75rem;
            background-color: var(--vscode-textCodeBlock-background, #f5f5f5);
            border: 1px solid var(--vscode-panel-border, #ddd);
            border-radius: 3px;
            margin-top: 0.5rem;
        }
        
        .test-details {
            padding: 1rem;
            margin: 0.5rem 0;
            border-radius: 4px;
            border: 1px solid var(--vscode-panel-border, #eee);
        }
        
        .test-name {
            font-weight: bold;
            margin-bottom: 0.5rem;
        }
        
        .test-info {
            color: var(--vscode-descriptionForeground, #717171);
            margin-bottom: 0.5rem;
        }
        
        .expand-all-button {
            background-color: var(--vscode-button-background, #007acc);
            color: var(--vscode-button-foreground, white);
            border: none;
            padding: 0.5rem 1rem;
            cursor: pointer;
            border-radius: 3px;
            margin: 0.5rem 0;
        }
        
        .expand-all-button:hover {
            background-color: var(--vscode-button-hoverBackground, #006bb3);
        }
        
        .collapsed-icon::after {
            content: "▶";
            font-size: 0.8rem;
            margin-left: 0.25rem;
        }
        
        .expanded-icon::after {
            content: "▼";
            font-size: 0.8rem;
            margin-left: 0.25rem;
        }

        .test-collapsible {
            width: 100%;
            text-align: left;
            padding: 0.75rem;
            background-color: var(--vscode-editor-background, #fff);
            border: none;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .test-header {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            flex: 1;
        }

        .test-details {
            margin: 0.5rem 0;
            border: 1px solid var(--vscode-panel-border, #eee);
            border-radius: 4px;
            overflow: hidden;
        }

        .test-content {
            padding: 1rem;
            border-top: 1px solid var(--vscode-panel-border, #eee);
        }

        .test-collapsible:hover {
            background-color: var(--vscode-list-hoverBackground, #f0f0f0);
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>TRX Test Results</h1>
        <p><strong>Run:</strong> ${data.testRun.name}</p>
        <p><strong>Started:</strong> ${formatDate(data.testRun.times.start)} <strong>Finished:</strong> ${formatDate(data.testRun.times.finish)}</p>
        <p><strong>Run by:</strong> ${data.testRun.runUser}</p>
    </div>
    
    <div class="summary">
        <div class="summary-box">
            <h2>Summary</h2>
            <div class="stats-container">
                <div class="stat-card total">
                    <span class="stat-value">${totalTests}</span>
                    <span class="stat-label">Total</span>
                </div>
                <div class="stat-card passed">
                    <span class="stat-value">${passedTests}</span>
                    <span class="stat-label">Passed</span>
                </div>
                <div class="stat-card failed">
                    <span class="stat-value">${failedTests}</span>
                    <span class="stat-label">Failed</span>
                </div>
                <div class="stat-card other">
                    <span class="stat-value">${otherTestResults.length}</span>
                    <span class="stat-label">Other</span>
                </div>
            </div>
            <div class="progress-bar">
                <div class="progress"></div>
            </div>
            <div class="progress-label">${passPercentage}% Passed</div>
        </div>
    </div>
    
    <button id="expandAllButton" class="expand-all-button">Expand All Sections</button>
    
    <!-- Failed Tests Section -->
    <div class="test-section">
        <button class="collapsible">
            <span>Failed Tests (${failedTestResults.length})</span>
            <span class="collapsed-icon"></span>
        </button>
        <div class="content">
            ${failedTestResults.length === 0 ?
            '<p style="padding: 1rem;">No failed tests</p>' :
            generateTestList(failedTestResults)
        }
        </div>
    </div>
    
    <!-- Passed Tests Section -->
    <div class="test-section">
        <button class="collapsible">
            <span>Passed Tests (${passedTestResults.length})</span>
            <span class="collapsed-icon"></span>
        </button>
        <div class="content">
            ${passedTestResults.length === 0 ?
            '<p style="padding: 1rem;">No passed tests</p>' :
            generateTestList(passedTestResults)
        }
        </div>
    </div>
    
    <!-- Other Tests Section -->
    <div class="test-section">
        <button class="collapsible">
            <span>Other Tests (${otherTestResults.length})</span>
            <span class="collapsed-icon"></span>
        </button>
        <div class="content">
            ${otherTestResults.length === 0 ?
            '<p style="padding: 1rem;">No other tests</p>' :
            generateTestList(otherTestResults)
        }
        </div>
    </div>
    
    <script>
        function initializeCollapsible(button) {
            button.addEventListener('click', function(e) {
                e.stopPropagation();
                const content = this.nextElementSibling;
                const icon = this.querySelector('span:last-child');
                
                if (content.classList.contains('show')) {
                    content.classList.remove('show');
                    icon.classList.remove('expanded-icon');
                    icon.classList.add('collapsed-icon');
                } else {
                    content.classList.add('show');
                    icon.classList.remove('collapsed-icon');
                    icon.classList.add('expanded-icon');
                }
            });
        }

        // Initialize all collapsibles
        document.querySelectorAll('.collapsible').forEach(initializeCollapsible);

        // Update expanded/collapsed icons for initial state
        document.querySelectorAll('.content.show').forEach(content => {
            const button = content.previousElementSibling;
            if (button && button.classList.contains('collapsible')) {
                const icon = button.querySelector('span:last-child');
                icon.classList.remove('collapsed-icon');
                icon.classList.add('expanded-icon');
            }
        });

        // Expand all button functionality
        const expandAllButton = document.getElementById('expandAllButton');
        let allExpanded = false;
        
        expandAllButton.addEventListener('click', function() {
            allExpanded = !allExpanded;
            const allContents = document.querySelectorAll('.content');
            const allButtons = document.querySelectorAll('.collapsible');
            
            allContents.forEach(content => {
                if (allExpanded) {
                    content.classList.add('show');
                } else {
                    content.classList.remove('show');
                }
            });

            allButtons.forEach(button => {
                const icon = button.querySelector('span:last-child');
                if (allExpanded) {
                    icon.classList.remove('collapsed-icon');
                    icon.classList.add('expanded-icon');
                } else {
                    icon.classList.remove('expanded-icon');
                    icon.classList.add('collapsed-icon');
                }
            });
            
            this.textContent = allExpanded ? 'Collapse All Sections' : 'Expand All Sections';
        });

        // Expand failed tests by default
        window.addEventListener('DOMContentLoaded', () => {
            const failedTestsSection = document.querySelector('.test-section');
            if (${failedTestResults.length} > 0 && failedTestsSection) {
                const sectionButton = failedTestsSection.querySelector('.collapsible');
                const sectionContent = failedTestsSection.querySelector('.content');
                
                sectionContent.classList.add('show');
                const icon = sectionButton.querySelector('span:last-child');
                icon.classList.remove('collapsed-icon');
                icon.classList.add('expanded-icon');
            }
        });
    </script>
</body>
</html>`;
}

/**
 * Generate HTML for a list of test results
 */
function generateTestList(tests: any[]): string {
    if (!tests || tests.length === 0) {
        return '<p>No tests found.</p>';
    }

    let html = '';
    for (const test of tests) {
        const testClass = test.outcome.toLowerCase();
        const testId = `test-${Math.random().toString(36).substr(2, 9)}`;
        const isFailedTest = test.outcome === 'Failed';

        html += `<div class="test-details">
            <button class="collapsible test-collapsible">
                <div class="test-header">
                    <span class="test-name">${escapeHtmlAll(test.name)}</span>
                    <span class="badge badge-${testClass}">${test.outcome}</span>
                </div>
                <span class="collapsed-icon"></span>
            </button>
            <div class="content test-content${isFailedTest ? ' show' : ''}" id="${testId}">
                <div class="test-info">
                    <div>Class: ${escapeHtmlAll(test.className)}</div>
                    <div>Duration: <span class="duration">${formatDuration(test.duration)}</span></div>
                </div>`;

        if (test.errorInfo) {
            html += `
                <button class="collapsible section-collapsible${isFailedTest ? ' show' : ''}">
                    <span>Error Details</span>
                    <span class="collapsed-icon"></span>
                </button>
                <div class="content section-content${isFailedTest ? ' show' : ''}">
                    <div class="error-message">${escapeHtmlPreserveLinks(test.errorInfo.message)}</div>
                    ${test.errorInfo.stackTrace ?
                    `<div class="stack-trace">${escapeHtmlPreserveLinks(test.errorInfo.stackTrace)}</div>` :
                    ''}
                </div>`;
        }

        if (test.output) {
            html += `
                <button class="collapsible section-collapsible">
                    <span>Output</span>
                    <span class="collapsed-icon"></span>
                </button>
                <div class="content section-content">
                    <div class="test-output">${escapeHtmlPreserveLinks(test.output)}</div>
                </div>`;
        }

        html += `</div></div>`;
    }

    return html;
}

/**
 * Format duration from TRX format to a more readable format
 */
function formatDuration(durationStr: string): string {
    if (!durationStr) return 'N/A';

    // If the duration is in the format "00:00:00.0000000"
    if (/^\d{2}:\d{2}:\d{2}/.test(durationStr)) {
        return durationStr;
    }

    // Otherwise, assume it's in the .NET TimeSpan format
    try {
        // TimeSpan format usually has the form "days.hours:minutes:seconds.fractional"
        // We'll try to parse it to milliseconds
        const matches = durationStr.match(/^(?:(\d+)\.)?(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?$/);
        if (!matches) return durationStr;

        const days = matches[1] ? parseInt(matches[1]) : 0;
        const hours = parseInt(matches[2]) + (days * 24);
        const minutes = parseInt(matches[3]);
        const seconds = parseInt(matches[4]);
        const ms = matches[5] ? parseInt(matches[5].substring(0, 3)) : 0;

        // Format the duration in a readable way
        if (hours > 0) {
            return `${hours}h ${minutes}m ${seconds}.${ms}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}.${ms}s`;
        } else {
            return `${seconds}.${ms}s`;
        }
    } catch (e) {
        return durationStr;
    }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Escape HTML special characters and preserve URLs as clickable links
 */
function escapeHtmlPreserveLinks(text: string): string {
    if (!text) return '';
    // First escape HTML
    const escaped = escapeHtml(text);

    // Then convert URLs to clickable links
    return escaped.replace(
        /(https?:\/\/[^\s<]+|www\.[^\s<]+\.[^\s<]+)/gi,
        (url) => `<a href="${url.startsWith('www.') ? 'http://' + url : url}" target="_blank">${url}</a>`
    );
}

/**
 * Escape HTML special characters and URLs without making them clickable
 */
function escapeHtmlAll(text: string): string {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/https?:\/\/[^\s<]+|www\.[^\s<]+\.[^\s<]+/gi, (url) => {
            return url.replace(/[:/.]/g, (char) => `&#${char.charCodeAt(0)};`);
        });
}