import catalog from '@/data/blog-catalog.json'

export type BlogPost = { slug:string; title:string; category:string; sourceCategory:string; date:string; readTime:string; summary:string; tags:string[]; protected:boolean; topic?:string }
export const BLOG_POSTS: BlogPost[] = catalog.posts.map(post => ({...post,readTime:post.protected?'MEMBERS ONLY':post.readTime,summary:post.protected?'로그인한 사용자만 읽을 수 있습니다.':post.summary}))
export const BLOG_CATEGORIES = ["개발", "CTF/Wargame", "Bug Bounty", "블로그/기술문서", "논문/컨퍼런스", "공모전/자격증"]
export const BLOG_TOPICS: Record<string, string[]> = {
  "CTF/Wargame": ["BTLO", "CTF", "Dreamhack"],
  "블로그/기술문서": ["Forensic", "Linux", "Reversing", "Web-hacking", "seKUrity", "Major"],
  "논문/컨퍼런스": ["Forensic", "Linux", "Reversing", "Web-hacking"],
}
const overrides: Record<string, { topic: string }> = {
  "tistory-28": { topic: "Forensic" }, // 디지털 포렌식 현황과 대응 방안 정리
  "tistory-43": { topic: "Dreamhack" }, // Track_the_file
}

export function topicFor(post: BlogPost) {
  if (post.topic) return post.topic
  const parts = post.sourceCategory.toLowerCase().split(/\s*\/\s*/)
  if (post.category === '블로그/기술문서' && parts.some(part => ['seku', 'sekurity'].includes(part))) return 'seKUrity'
  const topics = BLOG_TOPICS[post.category] || []
  return topics.find(topic => parts.includes(topic.toLowerCase())) || overrides[post.slug]?.topic || ''
}

export const postHref = (slug: string) => `/blog?post=${encodeURIComponent(slug)}`
export const dateText = (date: string) => date.replaceAll('-', '.')
export const prepareBlogContent = (content: string) => content.replaceAll('./content/media/', '/blog-content/media/').replaceAll('href="?post=', 'href="/blog?post=')
