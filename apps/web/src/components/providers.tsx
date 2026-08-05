'use client'

import { queryClient } from '@/utils/orpc'
import { DirectionProvider, Toaster } from '@repo/ui'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from './theme-provider'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {/* Radix reads direction from here; without it every primitive lays out LTR */}
      <DirectionProvider dir="rtl">
        <QueryClientProvider client={queryClient}>
          {children}
          <ReactQueryDevtools />
        </QueryClientProvider>
        <Toaster richColors />
      </DirectionProvider>
    </ThemeProvider>
  )
}
