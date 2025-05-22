# TRX Viewer Tests

This directory contains tests for the TRX Viewer extension.

## Test Structure

- `runTest.ts`: Entry point for VS Code extension tests, downloads and launches VS Code.
- `suite/index.ts`: Test runner that loads all test files.
- `suite/extension.test.ts`: Tests for extension activation and commands.
- `suite/trxViewer.test.ts`: Tests for TRX parsing and processing functions.
- `suite/integration.test.ts`: Integration tests between different modules.
- `suite/testUtils.ts`: Common test utilities and mocks.

## Alternative Testing Methods

Since the VS Code test framework requires internet access to download VS Code, we provide alternative methods for running tests:

1. **Direct Function Tests**:
   - `scripts/trxTest.js`: Tests the core TRX parsing functions directly without VS Code dependencies.
   - Run with `npm run test:trx`.

2. **Local VS Code Mocked Tests**:
   - `scripts/localTest.js`: Runs tests with a mocked VS Code API, no download required.
   - Run with `npm run test:local`.

## Running Tests

- Full VS Code tests: `npm test`
- Local tests with mocked VS Code API: `npm run test:local`
- Direct TRX function tests: `npm run test:trx`

## Test Coverage

The tests cover:

- Parsing and normalizing TRX file content
- Extracting test definitions, results, and counters
- Extension activation and command registration
- Extension command handlers
- Custom editor provider functionality

## Adding Tests

When adding new tests:

1. Add unit tests for any new functions in `suite/trxViewer.test.ts`.
2. Add integration tests for interactions between components in `suite/integration.test.ts`.
3. For VS Code API changes, add tests in `suite/extension.test.ts`.
4. Consider updating the direct test script in `scripts/trxTest.js` for critical functions.
