export default {
    testEnvironment: 'node',
    transform: {},
    moduleFileExtensions: ['js', 'json'],
    testMatch: ['**/tests/**/*.test.js'],
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/cli/**'
    ],
    coverageDirectory: 'coverage',
    verbose: true
};
