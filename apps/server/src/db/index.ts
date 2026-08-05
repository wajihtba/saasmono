import { drizzle } from 'drizzle-orm/node-postgres'

const DATABASE_URL = process.env.NODE_ENV === 'test' ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL

// Without connectionTimeoutMillis, a request that cannot get a pool connection
// waits forever: the HTTP call never resolves and never errors, so the UI just
// sits on a spinner with nothing in the console or the network tab. Time out
// instead, so exhaustion surfaces as a real error.
export const db = drizzle({
  connection: {
    connectionString: DATABASE_URL || '',
    max: 20,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  },
})
