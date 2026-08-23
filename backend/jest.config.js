/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { useESM: true }],
  },
  setupFiles: ["<rootDir>/tests/jest.setup.ts"],
  testMatch: ["**/tests/**/*.test.ts"],
  testTimeout: 30000,
  // Test files share one real MongoDB test database (see tests/jest.setup.ts) rather than isolated
  // per-worker instances, so they must run serially — parallel files would wipe each other's data
  // via clearTestDb() mid-test.
  maxWorkers: 1,
};
