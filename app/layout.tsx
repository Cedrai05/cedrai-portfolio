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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: `try { const house = localStorage.getItem('cedrai-house'); document.documentElement.dataset.house = ['slytherin','gryffindor','ravenclaw','hufflepuff'].includes(house) ? house : 'slytherin'; document.documentElement.dataset.theme = 'dark' } catch { document.documentElement.dataset.house = 'slytherin'; document.documentElement.dataset.theme = 'dark' }` }} />
      </head>
      <body>
        <AuthProvider>
          <SiteShell>{children}</SiteShell>
        </AuthProvider>
      </body>
    </html>
  )
}
