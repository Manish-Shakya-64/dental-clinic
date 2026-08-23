import dotenv from "dotenv";

// Loaded before any test file/module, so config/env.ts (which does `import "dotenv/config"`,
// a no-op once these vars already exist) sees the test configuration instead of requiring a real
// .env file. Uses a local MongoDB with a dedicated test database rather than mongodb-memory-server,
// since this environment's install-scripts policy blocks the mongod binary download.
dotenv.config({ path: ".env.test" });
