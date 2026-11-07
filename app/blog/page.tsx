import { Suspense } from 'react'
import BlogLoading from '@/components/blog/BlogLoading'
import type { BlogPost } from '@/lib/blog-catalog'
import { permanentRedirect } from 'next/navigation'
import { postHref } from '@/lib/blog-catalog'
import type { Metadata } from 'next'
import BlogPage from '@/components/blog/BlogPage'
import { getAvailableBlogCatalog, getPostMetadata, getStoredArticle } from '@/lib/blog-repository'

type Props = { searchParams: Promise<{ post?: string | string[]; saved?: string | string[] }> }
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const slug = (await searchParams).post
  let post:BlogPost|null|undefined
  try { post = typeof slug === 'string' ? await getPostMetadata(slug) : undefined }
  catch { post = undefined }
  return { title: post ? `${post.title} / Cédrai` : 'Cédrai / Field Notes', description: 'Cédrai의 개발, CTF, 보안 연구와 기록을 모은 기술 블로그.', alternates: { canonical: `https://www.cedrai.info${post?postHref(post):'/blog'}` } }
}
export default async function Page({ searchParams }: Props) {
  const params = await searchParams
  const value = params.post
  const slug = typeof value === 'string' ? value : undefined
  let post:BlogPost|null|undefined
  let storageUnavailable=false
  try { post = slug ? await getPostMetadata(slug) : undefined }
  catch { storageUnavailable=true }
  if(post && slug!==String(post.number))permanentRedirect(postHref(post))
  return <Suspense fallback={<BlogLoading />}><BlogContent post={post || undefined} slug={slug} returnSaved={params.saved==='1'} storageUnavailable={storageUnavailable} /></Suspense>
}

async function BlogContent({ post, slug, returnSaved, storageUnavailable }: { post?: BlogPost; slug?: string; returnSaved: boolean; storageUnavailable:boolean }) {
  const catalog = await getAvailableBlogCatalog()
  let publicContent:string|null=null
  if(post&&!post.protected) {
    try { publicContent=(await getStoredArticle(post.slug,post))?.content||null }
    catch { storageUnavailable=true }
  }
  return <BlogPage key={post?.slug || slug || 'archive'} slug={post?.slug || slug} posts={catalog.posts} publicContent={publicContent} returnSaved={returnSaved} storageUnavailable={storageUnavailable||catalog.storageUnavailable} />
}
