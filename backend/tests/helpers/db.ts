import mongoose from "mongoose";
import { env } from "../../src/config/env.js";

export async function connectTestDb(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI);
  // Mongoose builds indexes in the background after connecting; without waiting for them, a fast
  // pair of writes in the same test (e.g. the double-booking check) can both land before the
  // partial unique index exists to reject the second one.
  await mongoose.connection.syncIndexes();
}

export async function clearTestDb(): Promise<void> {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
}

export async function disconnectTestDb(): Promise<void> {
  await mongoose.connection.close();
}
