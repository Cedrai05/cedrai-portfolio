'use client'

import { usePathname } from 'next/navigation'
import { useLayoutEffect, useRef } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import Nav from '@/components/Nav'
import ProfileRail from '@/components/ProfileRail'

export default function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isWriting = pathname === '/blog/write'
  const destinationPath = useRef<string | null>(null)
  useLayoutEffect(() => {
    if (destinationPath.current !== pathname) return
    destinationPath.current = null
    // Reset only explicit cross-page clicks. Back/forward retain their saved position.
    window.scrollTo({ top: 0, behavior: 'instant' })
    const frame = requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'instant' }))
    return () => cancelAnimationFrame(frame)
  }, [pathname])
  function beforeNavigate(event: MouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const anchor = (event.target as Element).closest('a')
    if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return
    const destination = new URL(anchor.href, location.href)
    if (destination.origin !== location.origin) return
    if (destination.pathname === '/blog' && destination.hash === '#archive') {
      try { sessionStorage.setItem('cedrai-blog-return', '1') } catch { /* Optional persistence. */ }
    }
    if (destination.pathname !== pathname && !destination.hash) destinationPath.current = destination.pathname
    // The welcome sequence belongs to the first visit, not to returning from another page.
    if (pathname !== '/' && destination.pathname === '/') {
      try { sessionStorage.setItem('visited_at', String(Date.now())) } catch { /* Optional persistence. */ }
    }
  }
  return <>
    {!isWriting && <ProfileRail />}
    <div className="site-content" style={isWriting ? { marginLeft: 0 } : undefined} onClickCapture={beforeNavigate}>
      <Nav />
      <div key={pathname} className="route-content">{children}</div>
    </div>
  </>
}
