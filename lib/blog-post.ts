import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { BLOG_POSTS, postHref, prepareBlogContent } from '@/lib/blog-catalog'
export type BlogPost = { title: string; date: string; contentHtml: string; href: string }
export async function getBlogPost(id: string): Promise<BlogPost | null> {
  const post = BLOG_POSTS.find(post => post.slug === `tistory-${id}`)
  if (!post || post.protected) return null
  try {
    const data = JSON.parse(await readFile(path.join(process.cwd(), 'public/blog-content/posts', `${post.slug}.json`), 'utf8'))
    if (data.visibility !== 'public' || typeof data.content !== 'string') return null
    return { title: post.title, date: post.date, contentHtml: prepareBlogContent(data.content), href: postHref(post) }
  } catch { return null }
}
