module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/test/**/*.test.(ts|js)'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testPathIgnorePatterns: ['/node_modules/', '/out/'],
  verbose: true,
  collectCoverage: true,
  coverageReporters: ['text', 'lcov'],
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: ['/node_modules/', '/out/'],
  setupFilesAfterEnv: ['<rootDir>/src/test/jest-setup.ts'],  moduleNameMapper: {
    '^vscode$': '<rootDir>/src/test/jest-setup.ts'
  },
  reporters: [
    "default",
    ["jest-junit", {
      outputDirectory: "reports",
      outputName: "junit.xml"
    }]
  ]
};