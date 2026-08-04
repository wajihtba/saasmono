import { expo } from '@better-auth/expo'
import { betterAuth, type BetterAuthOptions } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
// import { nextCookies } from 'better-auth/next-js';
import { db } from '../db'
import { getBetterAuthSecret } from './secrets'

import { openAPI } from 'better-auth/plugins'

import { admin, anonymous, organization, username } from 'better-auth/plugins'
import * as schema from '../db/schema/auth'

// Parse CORS_ORIGIN to support multiple origins (comma-separated)
const getTrustedOrigins = (): string[] => {
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:9001'
  const webOrigins = corsOrigin.split(',').map((origin) => origin.trim())
  return [...webOrigins, 'mybettertapp://', 'exp://']
}

const betterAuthOptions: BetterAuthOptions = {
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: schema,
  }),
  secret: getBetterAuthSecret(),
  user: {
    additionalFields: {
      userType: {
        type: 'string',
        required: true,
        input: true,
      },
      lastName: {
        type: 'string',
        required: true,
        input: true,
      },
    },
  },
  trustedOrigins: getTrustedOrigins(),
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      domain: process.env.COOKIE_DOMAIN,
    },
  },
  plugins: [
    admin(),
    anonymous(),
    openAPI(),
    username(),
    organization(),

    expo(),

    // nextCookies(),
  ],
}

export const auth: ReturnType<typeof betterAuth> = betterAuth(betterAuthOptions)
