import { readBlogJSON } from '@/lib/blog-store'
export const BLOG_PREFIX = 'blog-native/v1/'
export const WRITTEN_PREFIX = 'blog-native/v2/'
export const validSlug = (slug: unknown): slug is string => typeof slug==='string' && /^(tistory-[1-9][0-9]*|blog-[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})$/.test(slug)
export const validWrittenSlug = (slug: unknown): slug is string => validSlug(slug) && slug.startsWith('blog-')
export const validAsset = (name: string) => /^[a-f0-9]{64}\.[a-z0-9]{1,10}$/.test(name)
export type NativePost = { version:1; slug:string; visibility:'protected'|'private'; title:string; content:string; assets:string[] }
export async function readNativePost(slug:string):Promise<NativePost|null> {
  if(!validSlug(slug)||!slug.startsWith('tistory-'))return null
  const post=await readBlogJSON<NativePost>(`${BLOG_PREFIX}posts/${slug}.json`)
  if(!post||post.version!==1||post.slug!==slug)return null
  // Legacy password verifiers are never used or returned by the account-based reader.
  return {version:1,slug:post.slug,visibility:post.visibility,title:post.title,content:post.content,assets:post.assets}
}
