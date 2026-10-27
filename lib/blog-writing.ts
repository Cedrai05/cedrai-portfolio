import { createHash } from 'node:crypto'
import { marked, Renderer } from 'marked'
import sanitizeHtml from 'sanitize-html'
import { BLOG_CATEGORIES, BLOG_TOPICS, type BlogPost } from '@/lib/blog-catalog'
import { validAsset, validWrittenSlug, WRITTEN_PREFIX } from '@/lib/native-blog'
import { readBlogJSON, writeBlogJSON, listBlogKeys } from '@/lib/blog-store'
export type StoredPost = { version:2; metadata:BlogPost; content:string; markdown:string; assets:string[]; visibility:'public'|'protected'; createdAt:string; updatedAt:string; fingerprint:string; archivedAt?:string }
export class BlogInputError extends Error { constructor(message:string, public status=400) { super(message) } }
export type WritingInput = {slug:string;title:string;category:string;topic:string;summary:string;tags:string[];markdown:string;assets:string[];isSecret:boolean}
function string(value:unknown,max:number,label:string) { if(typeof value!=='string'||value.length>max)throw new BlogInputError(`${label} 입력을 확인해 주세요.`);return value.trim() }
export function validateWriting(value:unknown):WritingInput {
  if(!value||typeof value!=='object')throw new BlogInputError('글 입력을 확인해 주세요.')
  const input=value as Record<string,unknown>
  if(!validWrittenSlug(input.slug))throw new BlogInputError('글 주소가 올바르지 않습니다.')
  const title=string(input.title,160,'제목'), category=string(input.category,40,'카테고리'),topic=string(input.topic??'',60,'주제'),summary=string(input.summary??'',300,'소개'),markdown=string(input.markdown,500000,'본문')
  if(!title||!markdown)throw new BlogInputError('제목과 본문을 입력해 주세요.')
  if(!BLOG_CATEGORIES.includes(category)||(BLOG_TOPICS[category]&&topic&&!BLOG_TOPICS[category].includes(topic)))throw new BlogInputError('카테고리와 주제를 확인해 주세요.')
  if(typeof input.isSecret!=='boolean')throw new BlogInputError('비밀글 설정을 확인해 주세요.')
  if(!Array.isArray(input.tags)||input.tags.length>20||input.tags.some(tag=>typeof tag!=='string'||tag.length>40))throw new BlogInputError('태그는 40자 이내로 20개까지 입력해 주세요.')
  if(!Array.isArray(input.assets)||input.assets.length>100||input.assets.some(name=>typeof name!=='string'||!validAsset(name)))throw new BlogInputError('첨부파일을 확인해 주세요.')
  return {slug:input.slug,title,category,topic,summary,markdown,isSecret:input.isSecret,tags:[...new Set(input.tags.map(tag=>(tag as string).trim()).filter(Boolean))],assets:[...new Set(input.assets as string[])]}
}
const escape=(text:string)=>text.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!))
export function renderBlogMarkdown(input:WritingInput,preview=false) {
  const assets=new Set(input.assets)
  const renderer=new Renderer()
  renderer.image=({href,text,title})=>{
    const name=href.startsWith('attachment:')?href.slice(11):null
    if(name&&!assets.has(name))throw new BlogInputError('본문에서 사용한 첨부 이미지를 업로드해 주세요.')
    return `<img ${name?`data-native-src="${name}"`:`src="${escape(href)}"`} alt="${escape(text)}"${title?` title="${escape(title)}"`:''}>`
  }
  renderer.link=({href,tokens,title})=>{
    const name=href.startsWith('attachment:')?href.slice(11):null
    if(name&&!assets.has(name))throw new BlogInputError('본문에서 사용한 첨부파일을 업로드해 주세요.')
    return `<a ${name?`data-native-href="${name}" download`: `href="${escape(href)}"`}${title?` title="${escape(title)}"`:''}>${renderer.parser.parseInline(tokens)}</a>`
  }
  const raw=marked.parse(input.markdown,{renderer,gfm:true,async:false}) as string
  const clean=sanitizeHtml(raw,{
    allowedTags:[...sanitizeHtml.defaults.allowedTags,'img','details','summary','del','mark'],
    allowedAttributes:{a:['href','title','rel','download','data-native-href','referrerpolicy'],img:['src','alt','title','loading','decoding','referrerpolicy','data-native-src'],code:['class'],th:['colspan','rowspan'],td:['colspan','rowspan'],ol:['start']},
    allowedSchemes:['http','https','mailto'],allowedSchemesByTag:{img:['https']},allowProtocolRelative:false,
    transformTags:{
      a:(_tag,attributes)=>{ const attrs:Record<string,string>={...attributes,rel:'noopener noreferrer',referrerpolicy:'no-referrer'};if(attrs['data-native-href']&&!assets.has(attrs['data-native-href']))delete attrs['data-native-href'];return {tagName:'a',attribs:attrs} },
      img:(_tag,attributes)=>{ const attrs:Record<string,string>={...attributes,loading:'lazy',decoding:'async',referrerpolicy:'no-referrer'};if(attrs['data-native-src']&&!assets.has(attrs['data-native-src']))delete attrs['data-native-src'];return {tagName:'img',attribs:attrs} },
    },
  })
  const content=`<div class="tistory-content">${clean}</div>`
  return preview ? content.replace(/data-native-(src|href)="([a-f0-9]{64}\.[a-z0-9]{1,10})"/g,(_match,attr,name)=>`${attr}="/api/native-blog/assets?preview=1&amp;name=${name}"`) : content
}
export function metadataFromStored(post:StoredPost):BlogPost {
  const m=post.metadata
  return {slug:m.slug,title:m.title,category:m.category,topic:m.topic||'',sourceCategory:m.sourceCategory||'',date:m.date,readTime:m.readTime,summary:post.visibility==='protected'?'로그인한 사용자만 읽을 수 있습니다.':m.summary,tags:m.tags,protected:post.visibility==='protected'}
}
export async function readWrittenPost(slug:string,draft=false) {
  if(!validWrittenSlug(slug))return null
  return readBlogJSON<StoredPost>(`${WRITTEN_PREFIX}${draft?'drafts':'posts'}/${slug}.json`)
}
export async function writtenMetadata(slug:string) {
  if(!validWrittenSlug(slug))return null
  const post=await readBlogJSON<BlogPost>(`${WRITTEN_PREFIX}catalog/${slug}.json`)
  return post?.protected?{...post,summary:'로그인한 사용자만 읽을 수 있습니다.'}:post
}
export async function listWrittenMetadata() {
  const keys=await listBlogKeys(`${WRITTEN_PREFIX}catalog/`)
  const result=await Promise.all(keys.map(key=>readBlogJSON<BlogPost>(key)))
  return result.filter((post):post is BlogPost=>Boolean(post&&validWrittenSlug(post.slug))).map(post=>post.protected?{...post,summary:'로그인한 사용자만 읽을 수 있습니다.'}:post)
}
export async function listDrafts() {
  const keys=await listBlogKeys(`${WRITTEN_PREFIX}drafts/`)
  const drafts=await Promise.all(keys.map(async key=>{
    const draft=await readBlogJSON<StoredPost>(key)
    if(!draft||draft.archivedAt||await writtenMetadata(draft.metadata.slug))return null
    return {...metadataFromStored(draft),updatedAt:draft.updatedAt}
  }))
  return drafts.filter(post=>post!==null).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))
}
export async function saveWriting(input:WritingInput,publish:boolean) {
  const fingerprint=createHash('sha256').update(JSON.stringify(input)).digest('hex')
  const existing=await readWrittenPost(input.slug)
  if(existing) {
    if(!publish||existing.fingerprint!==fingerprint)throw new BlogInputError('이미 업로드한 글입니다.',409)
    const metadata=metadataFromStored(existing)
    if(!await writtenMetadata(input.slug))await writeBlogJSON(`${WRITTEN_PREFIX}catalog/${input.slug}.json`,metadata)
    return metadata
  }
  const now=new Date().toISOString()
  const visibility=input.isSecret?'protected':'public'
  const metadata:BlogPost={slug:input.slug,title:input.title,category:input.category,topic:input.topic,sourceCategory:input.topic?`${input.category} / ${input.topic}`:input.category,date:new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date()),readTime:`${Math.max(1,Math.ceil(input.markdown.length/700))} MIN READ`,summary:input.summary,tags:input.tags,protected:input.isSecret}
  const record:StoredPost={version:2,metadata,visibility,markdown:input.markdown,content:renderBlogMarkdown(input),assets:input.assets,createdAt:now,updatedAt:now,fingerprint}
  await writeBlogJSON(`${WRITTEN_PREFIX}${publish?'posts':'drafts'}/${input.slug}.json`,record,!publish)
  if(publish)await writeBlogJSON(`${WRITTEN_PREFIX}catalog/${input.slug}.json`,metadataFromStored(record))
  return metadataFromStored(record)
}
