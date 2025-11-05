import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "@shared/schema";

/**
 * Defensive DB export: do not throw during module evaluation if DATABASE_URL
 * is not set. Instead export a top-level `db` variable which will either be
 * a proxy that rejects on use (so callers can fall back), or a real drizzle
 * instance when DATABASE_URL is present.
 *
 * This allows the server to start in development without DATABASE_URL.
 */
let db: any;

if (!process.env.DATABASE_URL) {
  // eslint-disable-next-line no-console
  console.warn("DATABASE_URL not set — database disabled; falling back to local store where appropriate.");
  const rejecter = () => Promise.reject(new Error("Database not configured (DATABASE_URL missing)"));
  const proxy: any = new Proxy({}, {
    get: () => rejecter,
    apply: () => rejecter(),
    construct: () => { throw new Error("Database not configured"); }
  });
  db = proxy;
} else {
  const sql = neon(process.env.DATABASE_URL);
  db = drizzle(sql, { schema });
}

export { db };
