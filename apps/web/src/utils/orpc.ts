import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import { QueryCache, QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { AppRouterClient } from '../../../server/src/routers/index'

/** An authorization failure is not going to succeed on a retry. */
const isAuthError = (error: unknown) => {
  const status = (error as { status?: number; code?: string })?.status
  const code = (error as { code?: string })?.code
  return status === 401 || status === 403 || code === 'UNAUTHORIZED' || code === 'FORBIDDEN'
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => !isAuthError(error) && failureCount < 3,
    },
    mutations: {
      retry: false,
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      // A page a role may not open redirects on its own; a toast on top of that
      // is noise.
      if (isAuthError(error)) return
      toast.error(`Error: ${error.message}`, {
        action: {
          label: 'retry',
          onClick: () => {
            queryClient.invalidateQueries()
          },
        },
      })
    },
  }),
})

export const link = new RPCLink({
  url: `${process.env.NEXT_PUBLIC_SERVER_URL}/rpc`,
  fetch(url, options) {
    return fetch(url, {
      ...options,
      credentials: 'include',
    })
  },
  headers: async () => {
    if (typeof window !== 'undefined') {
      return {}
    }

    const { headers } = await import('next/headers')
    return Object.fromEntries(await headers())
  },
})

export const client: AppRouterClient = createORPCClient(link)

export const orpc = createTanstackQueryUtils(client)
