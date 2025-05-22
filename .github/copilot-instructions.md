This is a TypeScript based repository for a Visual Studio Code extension that parses and displays TRX test report structure data in a more visually pleasing way. Please follow these guidelines when contributing:

## Code Standards

### Required Before Each Commit

- Run `npm run lint` before committing any changes to ensure proper code formatting
- This will run eslint on all files to maintain consistent style

### Development Flow

- Build: `npm run compile`

## Repository Structure

- `src/`: The core codebase for the extension
- `scripts/`: Helpful scripts for repository activity only
- `sample/`: Sample TRX files for validation
- `resources/`: Deployable or referencable resources for documentation or package metadata
- `src/tests`: Tests

## Key Guidelines

1. Follow TypeScript best practices and idiomatic patterns
2. Maintain existing code structure and organization
3. Avoid arbitrarily updating key dependencies like the vscode engine versions if avoidable