'use client'

import { useCallback, useLayoutEffect, useState } from 'react'
import LoadingScreen from '@/components/LoadingScreen'
import ScrollReveal from '@/components/ScrollReveal'
import Hero from '@/components/Hero'
import Activities from '@/components/Skills'
import Contact from '@/components/Contact'
import Footer from '@/components/Footer'

export default function Home() {
  const [loaded, setLoaded] = useState(false)
  useLayoutEffect(() => {
    try {
      const timestamp = Number(sessionStorage.getItem('visited_at'))
      if (Date.now() - timestamp < 10 * 60 * 1000 || matchMedia('(prefers-reduced-motion: reduce)').matches) setLoaded(true)
    } catch { setLoaded(true) }
  }, [])
  const handleDone = useCallback(() => {
    try { sessionStorage.setItem('visited_at', String(Date.now())) } catch { /* Optional persistence. */ }
    setLoaded(true)
  }, [])
  return (
    <>
      {!loaded && <LoadingScreen onDone={handleDone} />}
      <main className="page-main" style={{ opacity: loaded ? 1 : 0, transition: 'opacity .4s ease' }}>

        <Hero />
        <ScrollReveal delay={50}><Activities /></ScrollReveal>
        <ScrollReveal delay={50}><Contact /></ScrollReveal>
        <Footer />
      </main>
    </>
  )
}
