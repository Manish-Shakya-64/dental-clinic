import dns from "node:dns";
import { createApp } from "./app.js";
import { connectDB, closeDB } from "./config/db.js";
import { startScheduler } from "./jobs/scheduler.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";

// Node's own DNS resolver (c-ares) can end up pointed at a server that's unreachable for its
// query pattern (stale VPN/virtual-adapter entry, a local proxy that no longer listens, etc.)
// even though the OS resolver used by every other app on the machine is fine. That mismatch is
// what caused outbound SMTP connections to smtp.gmail.com to fail with "queryA ETIMEOUT".
//
// dns.setServers() alone isn't enough: it only repoints the shared default resolver used by the
// top-level dns.resolve*() functions. Libraries that construct their own `new dns.Resolver()`
// (nodemailer does exactly this per-lookup, see node_modules/nodemailer/lib/shared/index.js)
// get a fresh instance that reads the system's raw default servers, bypassing setServers()
// entirely. Patching the Resolver class itself so every instance — ours or a dependency's —
// picks up known-reliable public resolvers closes that gap.
const RELIABLE_DNS_SERVERS = ["8.8.8.8", "1.1.1.1", "8.8.4.4", "1.0.0.1"];
dns.setServers(RELIABLE_DNS_SERVERS);

class PinnedDnsResolver extends dns.Resolver {
  constructor(...args: ConstructorParameters<typeof dns.Resolver>) {
    super(...args);
    this.setServers(RELIABLE_DNS_SERVERS);
  }
}
dns.Resolver = PinnedDnsResolver;

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "Unhandled promise rejection");
  process.exit(1);
});

const start = async () => {
  await connectDB();
  startScheduler();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
  });

  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(() => {
      closeDB()
        .then(() => process.exit(0))
        .catch((err) => {
          logger.error({ err }, "Error closing MongoDB connection");
          process.exit(1);
        });
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

start().catch((err) => {
  logger.fatal({ err }, "Failed to start server");
  process.exit(1);
});
