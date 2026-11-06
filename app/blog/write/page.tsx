import type { Metadata } from 'next'
import BlogEditor from '@/components/blog/BlogEditor'
export const metadata:Metadata={title:'글 작성·수정 / Cédrai',robots:{index:false,follow:false}}
export default async function Page({searchParams}:{searchParams:Promise<{draft?:string;edit?:string}>}) {
  const {draft,edit}=await searchParams
  const editSlug=typeof edit==='string'?edit:undefined
  return <BlogEditor editSlug={editSlug} draftSlug={!editSlug&&typeof draft==='string'?draft:undefined}/>
}
