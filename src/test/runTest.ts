import * as path from 'path';
import { runTests } from '@vscode/test-electron';
import * as cp from 'child_process';

async function main() {
	try {
		// The folder containing the Extension Manifest package.json
		// Passed to `--extensionDevelopmentPath`
		const extensionDevelopmentPath = path.resolve(__dirname, '../../');

		// The path to the extension test runner script
		// Passed to --extensionTestsPath
		const extensionTestsPath = path.resolve(__dirname, './suite');

		// Download VS Code, unzip it and run the integration test using Jest
		await runTests({ 
			extensionDevelopmentPath, 
			extensionTestsPath,
			launchArgs: ['--disable-extensions']
		});

		// Run Jest directly
		const jestExecutablePath = path.resolve(__dirname, '../../node_modules/.bin/jest');
		const options = {
			cwd: process.cwd(),
			stdio: 'inherit' as const
		};

		cp.spawnSync('node', [jestExecutablePath], options);
	} catch (err) {
		console.error('Failed to run tests', err);
		process.exit(1);
	}
}

main();
