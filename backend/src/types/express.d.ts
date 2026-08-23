import { RequestUser } from "./auth.types.js";

declare global {
  namespace Express {
    interface Request {
      user?: RequestUser;
      requestId?: string;
      validated?: {
        body?: unknown;
        query?: unknown;
        params?: unknown;
      };
    }
  }
}

export {};
