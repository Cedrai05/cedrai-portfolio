import catalog from '@/data/blog-catalog.json'
const BLOG_URL = 'https://cedrai05.github.io'
export type BlogPost = { title: string; date: string; contentHtml: string; href: string }
export async function getBlogPost(id: string): Promise<BlogPost | null> {
  const post = catalog.posts.find(post => post.slug === `tistory-${id}`)
  if (!post || post.protected) return null
  try {
    const response = await fetch(`${BLOG_URL}/content/posts/${post.slug}.json`, { next: { revalidate: 300 } })
    if (!response.ok) return null
    const data = await response.json()
    if (data.visibility !== 'public' || typeof data.content !== 'string') return null
    const contentHtml = data.content.replaceAll('./content/media/', `${BLOG_URL}/content/media/`).replaceAll('href="?post=', `href="${BLOG_URL}/?post=`)
    return { title: post.title, date: post.date, contentHtml, href: `${BLOG_URL}/?post=${post.slug}` }
  } catch { return null }
}
