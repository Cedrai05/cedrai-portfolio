import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/', destination: '/archive/index.html' },
        { source: '/about', destination: '/archive/index.html' },
        { source: '/work', destination: '/archive/index.html' },
        { source: '/projects', destination: '/archive/index.html' },
        { source: '/blog', missing: [{ type: 'query', key: 'post' }], destination: '/archive/index.html' },
        { source: '/calendar', destination: '/archive/index.html' },
        { source: '/schedule', destination: '/archive/index.html' },
        { source: '/now', destination: '/archive/index.html' },
        { source: '/contact', destination: '/archive/index.html' },
      ],
      afterFiles: [],
      fallback: [],
    }
  },
  outputFileTracingIncludes: {
    '/api/blog-post': ['./public/blog-content/posts/*.json'],
    '/blog': ['./public/blog-content/posts/*.json'],
    '/activities/competitions/*': ['./public/blog-content/posts/*.json'],
  },
}

export default nextConfig
