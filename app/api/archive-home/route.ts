import { NextResponse } from 'next/server'
import { getAvailableBlogCatalog } from '@/lib/blog-repository'
import { CONTENT } from '@/lib/content'
import { isGithubConfigured, readFile } from '@/lib/github'
import type { ScheduleData, NowPost, Project } from '@/lib/data'
import { BLOG_TOPICS, topicFor } from '@/lib/blog-catalog'

export const dynamic = 'force-dynamic'

async function currentContent(kind: 'schedule' | 'now' | 'projects') {
  const definition = CONTENT[kind]
  if (!isGithubConfigured()) return definition.fallback
  try {
    const { content } = await readFile(definition.path)
    return content ? definition.sanitize(JSON.parse(content)) : definition.fallback
  } catch {
    return definition.fallback
  }
}

export async function GET() {
  try {
    const [blog, schedule, now, projects] = await Promise.all([
      getAvailableBlogCatalog(),
      currentContent('schedule'),
      currentContent('now'),
      currentContent('projects'),
    ])
    const nowPosts = now as NowPost[]
    const latestNow = Array.isArray(nowPosts)
      ? [...nowPosts].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null
      : null
    return NextResponse.json({
      storageUnavailable: blog.storageUnavailable,
      posts: blog.posts.map(post => ({
        slug: post.slug,
        number: post.number,
        title: post.title,
        category: post.category,
        topic: topicFor(post),
        date: post.date,
        summary: post.summary,
        protected: post.protected,
      })),
      topicGroups: BLOG_TOPICS,
      events: (schedule as ScheduleData).events,
      todos: (schedule as ScheduleData).todos,
      nowPosts,
      projects: projects as Project[],
      now: latestNow,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: '기록을 불러오지 못했습니다.' }, { status: 503 })
  }
}
