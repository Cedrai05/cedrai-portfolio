import type { Metadata } from 'next'
import './globals.css'
import localFont from 'next/font/local'
import SiteShell from '@/components/SiteShell'

const inter = localFont({ src: './fonts/inter-latin.woff2', variable: '--font-inter', weight: '100 900', display: 'swap' })
const hack = localFont({ src: [{ path: './fonts/hack-regular.woff2', weight: '400' }, { path: './fonts/hack-bold.woff2', weight: '700' }], variable: '--font-hack', display: 'swap' })

export const metadata: Metadata = {
  title: 'Cédrai_',
  description: 'Computer Engineering · CTF · Forensics · Web Hacking · Security · Python',
  keywords: ['CTF', 'Forensics', 'Security', 'Python', 'Portfolio'],
}

import { AuthProvider } from '@/lib/auth-context'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className={`${inter.variable} ${hack.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try { document.documentElement.dataset.theme = localStorage.getItem('theme') === 'light' ? 'light' : 'dark' } catch {}` }} />
      </head>
      <body>
        <AuthProvider>
          <SiteShell>{children}</SiteShell>
        </AuthProvider>
      </body>
    </html>
  )
}
