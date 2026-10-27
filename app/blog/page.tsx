import type { Metadata } from 'next'
import BlogPage from '@/components/blog/BlogPage'
import { BLOG_POSTS } from '@/lib/blog-catalog'
import { getBlogPost } from '@/lib/blog-post'
import './blog.css'

type Props = { searchParams: Promise<{ post?: string | string[] }> }
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const slug = (await searchParams).post
  const post = typeof slug === 'string' ? BLOG_POSTS.find(post => post.slug === slug) : undefined
  return { title: post ? `${post.title} / Cédrai` : 'Cédrai / Field Notes', description: 'Cédrai의 개발, CTF, 보안 연구와 기록을 모은 기술 블로그.', alternates: { canonical: `https://www.cedrai.info/blog${post ? `?post=${post.slug}` : ''}` } }
}
export default async function Page({ searchParams }: Props) {
  const value = (await searchParams).post
  const slug = typeof value === 'string' ? value : undefined
  const post = slug ? BLOG_POSTS.find(post => post.slug === slug) : undefined
  const publicPost = post && !post.protected ? await getBlogPost(post.slug.replace('tistory-', '')) : null
  return <>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" />
    <BlogPage key={slug || 'archive'} slug={slug} publicContent={publicPost?.contentHtml || null} />
  </>
}
