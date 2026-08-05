import Providers from '@/components/providers'
import type { Metadata } from 'next'
import { Inter, JetBrains_Mono, Noto_Sans_Arabic } from 'next/font/google'
import '../index.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin', 'latin-ext'],
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
})

// Self-hosted so the browser doesn't block first paint on fonts.googleapis.com.
// Only the weights the app actually uses — the old <link> pulled all 9.
const notoSansArabic = Noto_Sans_Arabic({
  variable: '--font-noto-arabic',
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'منارة - منصة إدارة المؤسسات التعليمية',
  description: 'منصة شاملة لإدارة المؤسسات التعليمية من الروضة إلى التعليم العالي. تقنيات حديثة لتطوير التعليم وتسهيل الإدارة.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // Add `font-sans` to the body className to actually apply Inter + Noto Sans
    // Arabic. Left off deliberately: the app has always rendered in the system
    // font, and turning it on reflows the landing hero.
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${notoSansArabic.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
