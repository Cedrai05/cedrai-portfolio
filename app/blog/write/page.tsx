import type { Metadata } from 'next'
import BlogEditor from '@/components/blog/BlogEditor'
import '../blog.css'
export const metadata:Metadata={title:'글 작성 / Cédrai',robots:{index:false,follow:false}}
export default async function Page({searchParams}:{searchParams:Promise<{draft?:string}>}) {
  const {draft}=await searchParams
  return <BlogEditor draftSlug={typeof draft==='string'?draft:undefined}/>
}
