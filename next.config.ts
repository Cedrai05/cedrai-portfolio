import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/blog-post': ['./public/blog-content/posts/*.json'],
    '/blog': ['./public/blog-content/posts/*.json'],
    '/activities/competitions/*': ['./public/blog-content/posts/*.json'],
  },
}

export default nextConfig
