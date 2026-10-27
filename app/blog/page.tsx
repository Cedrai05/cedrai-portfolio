import { permanentRedirect } from 'next/navigation'
import { postHref } from '@/lib/blog-catalog'
import type { Metadata } from 'next'
import BlogPage from '@/components/blog/BlogPage'
import { getBlogCatalog, getPostMetadata, getStoredArticle } from '@/lib/blog-repository'
import './blog.css'

type Props = { searchParams: Promise<{ post?: string | string[] }> }
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const slug = (await searchParams).post
  const post = typeof slug === 'string' ? await getPostMetadata(slug) : undefined
  return { title: post ? `${post.title} / Cédrai` : 'Cédrai / Field Notes', description: 'Cédrai의 개발, CTF, 보안 연구와 기록을 모은 기술 블로그.', alternates: { canonical: `https://www.cedrai.info${post?postHref(post):'/blog'}` } }
}
export default async function Page({ searchParams }: Props) {
  const value = (await searchParams).post
  const slug = typeof value === 'string' ? value : undefined
  const post = slug ? await getPostMetadata(slug) : undefined
  if(post && slug!==String(post.number))permanentRedirect(postHref(post))
  const posts = await getBlogCatalog()
  const publicPost = post && !post.protected ? await getStoredArticle(post.slug) : null
  return <>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" />
    <BlogPage key={post?.slug || slug || 'archive'} slug={post?.slug || slug} posts={posts} publicContent={publicPost?.content || null} />
  </>
}
