'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect,useRef,useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { BLOG_CATEGORIES,BLOG_TOPICS,postHref,type BlogPost } from '@/lib/blog-catalog'
import { findBlogTable, serializeBlogTable, type BlogTable } from '@/lib/blog-table'
import BlogTableEditor from '@/components/blog/BlogTableEditor'

type Draft=BlogPost&{updatedAt:string}
type TableSession={source:string;start:number;end:number;existing:boolean;table:BlogTable}
export default function BlogEditor({draftSlug,editSlug}:{draftSlug?:string;editSlug?:string}) {
  const {ready,isAdmin}=useAuth()
  const router=useRouter()
  const [slug,setSlug]=useState('')
  const [title,setTitle]=useState(''),[category,setCategory]=useState(BLOG_CATEGORIES[0]),[topic,setTopic]=useState(''),[summary,setSummary]=useState(''),[tags,setTags]=useState(''),[markdown,setMarkdown]=useState('')
  const [isSecret,setIsSecret]=useState(false),[assets,setAssets]=useState<string[]>([]),[drafts,setDrafts]=useState<Draft[]>([])
  const [removed,setRemoved]=useState<Draft|null>(null)
  const [preview,setPreview]=useState<string|null>(null),[status,setStatus]=useState(''),[busy,setBusy]=useState(false),[uploading,setUploading]=useState(false),[published,setPublished]=useState<string|null>(null)
  const [revision,setRevision]=useState<string|null>(null),[sourceReady,setSourceReady]=useState(!draftSlug&&!editSlug),[editHref,setEditHref]=useState('/blog')
  const [tableSession,setTableSession]=useState<TableSession|null>(null)
  const textarea=useRef<HTMLTextAreaElement>(null)
  useEffect(()=>{
    setSlug(editSlug||draftSlug||'blog-'+crypto.randomUUID())
    setTitle('');setCategory(BLOG_CATEGORIES[0]);setTopic('');setSummary('');setTags('');setMarkdown('');setIsSecret(false);setAssets([])
    setRevision(null);setSourceReady(!draftSlug&&!editSlug);setEditHref('/blog');setPreview(null);setPublished(null);setStatus('')
  },[draftSlug,editSlug])
  useEffect(()=>{
    if(!isAdmin){setPreview(null);setMarkdown('');setTableSession(null);return}
    const controller=new AbortController()
    fetch('/api/native-blog/drafts',{cache:'no-store',signal:controller.signal}).then(r=>r.json()).then(data=>setDrafts(data.posts||[])).catch(()=>{})
    const sourceSlug=editSlug||draftSlug
    if(sourceSlug)fetch(editSlug?`/api/native-blog/posts/${encodeURIComponent(editSlug)}/source`:`/api/native-blog/drafts/${encodeURIComponent(draftSlug!)}`,{cache:'no-store',signal:controller.signal}).then(async response=>{
      const data=await response.json();if(!response.ok)throw new Error(data.error)
      if(editSlug&&!/^[a-f0-9]{64}$/.test(data.revision))throw new Error('글 수정 정보를 불러오지 못했습니다. 페이지를 새로 열어 주세요.')
      const p=data.post;setTitle(p.title);setCategory(p.category);setTopic(p.topic||'');setSummary(p.summary||'');setTags(p.tags.join(', '));setMarkdown(data.markdown);setAssets(data.assets);setIsSecret(p.protected)
      if(editSlug){setRevision(data.revision);setEditHref(postHref(p))}
      setSourceReady(true)
    }).catch(error=>{if(!controller.signal.aborted)setStatus(error.message)})
    return()=>controller.abort()
  },[isAdmin,draftSlug,editSlug])
  function payload(mode:string){return {slug,title,category,topic,summary,tags:tags.split(',').map(tag=>tag.trim()).filter(Boolean),markdown,assets,isSecret,mode,revision}}
  async function save(mode:'preview'|'draft'|'publish'|'update') {
    if(!isAdmin||busy||uploading||!slug||!sourceReady||(editSlug&&mode==='draft')||(mode==='update'&&(!editSlug||!revision)))return
    setBusy(true);setStatus(mode==='preview'?'미리보기 준비 중…':mode==='draft'?'임시 저장 중…':mode==='update'?'수정 내용 저장 중…':'글을 업로드하는 중…')
    try {
      const response=await fetch('/api/native-blog/write',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload(mode)),cache:'no-store'})
      const data=await response.json();if(!response.ok)throw new Error(data.error||'저장하지 못했습니다.')
      if(mode==='preview'){setPreview(data.content);setStatus('')}
      else if(mode==='draft'){setStatus('임시 저장했습니다. 공개 목록에는 표시되지 않습니다.');history.replaceState(history.state,'',`/blog/write?draft=${slug}`);setDrafts(current=>[{...data.post,updatedAt:new Date().toISOString()},...current.filter(p=>p.slug!==slug)])}
      else {router.refresh();setDrafts(current=>current.filter(post=>post.slug!==slug));setPublished(data.href);setStatus(mode==='update'?'수정한 내용을 반영했습니다.':isSecret?'비밀글로 업로드했습니다.':'일반글로 업로드했습니다.')}
    }catch(error){setStatus((error as Error).message)}finally{setBusy(false)}
  }
  function insert(before:string,after=''){
    const field=textarea.current;if(!field)return
    const start=field.selectionStart,end=field.selectionEnd
    setMarkdown(current=>current.slice(0,start)+before+current.slice(start,end)+after+current.slice(end))
    setPreview(null);requestAnimationFrame(()=>{field.focus();field.setSelectionRange(start+before.length,end+before.length)})
  }
  function openTableEditor(){
    const field=textarea.current;if(!field)return
    const position=field.selectionEnd
    const source=field.value,found=findBlogTable(source,position)
    setTableSession(found?{source,start:found.start,end:found.end,existing:true,table:found}:{source,start:position,end:position,existing:false,table:{headers:['항목','내용','비고'],rows:[['','',''],['','','']],align:[null,null,null]}})
  }
  function applyTable(table:BlogTable){
    if(!tableSession)return
    const {source,start,end,existing}=tableSession
    if(textarea.current?.value!==source){setStatus('본문이 변경되었습니다. 표를 다시 열어 주세요.');setTableSession(null);return}
    const formatted=serializeBlogTable(table)
    const before=source.slice(0,start),after=source.slice(end)
    const leading=existing||!before||before.endsWith('\n\n')?'':before.endsWith('\n')?'\n':'\n\n'
    const trailing=existing?'':after.startsWith('\n\n')?'':after.startsWith('\n')?'\n':'\n\n'
    const next=before+leading+formatted+trailing+after
    const caret=before.length+leading.length+formatted.length
    setMarkdown(next)
    setPreview(null)
    setTableSession(null)
    requestAnimationFrame(()=>{textarea.current?.focus();textarea.current?.setSelectionRange(caret,caret)})
  }
  function deleteTable(){
    if(!tableSession?.existing)return
    if(textarea.current?.value!==tableSession.source){setStatus('본문이 변경되었습니다. 표를 다시 열어 주세요.');setTableSession(null);return}
    const before=tableSession.source.slice(0,tableSession.start).replace(/\n+$/,'')
    const after=tableSession.source.slice(tableSession.end).replace(/^\n+/,'')
    const separator=before&&after?'\n\n':''
    const next=before+separator+after
    const caret=before.length
    setMarkdown(next)
    setPreview(null)
    setTableSession(null)
    requestAnimationFrame(()=>{textarea.current?.focus();textarea.current?.setSelectionRange(caret,caret)})
  }
  async function addFiles(files:File[]){
    if(!isAdmin||uploading||published||!files.length)return
    setUploading(true);setStatus('첨부파일 업로드 중…')
    const lines:string[]=[],names:string[]=[]
    try {
      const configResponse=await fetch('/api/native-blog/upload',{cache:'no-store'});const config=await configResponse.json();if(!configResponse.ok)throw new Error(config.error)
      for(const file of files){
        const maxFileBytes=Number(config.maxFileBytes)||4*1024*1024
        if(file.size>maxFileBytes)throw new Error(`파일 하나당 ${Math.floor(maxFileBytes/1024/1024)}MB까지 업로드할 수 있습니다.`)
        const ext=file.name.split('.').pop()?.toLowerCase();if(!ext||!/^[a-z0-9]{1,10}$/.test(ext))throw new Error('확장자가 있는 파일을 선택해 주세요.')
        const digest=await crypto.subtle.digest('SHA-256',await file.arrayBuffer())
        const hash=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join(''),name=`${hash}.${ext}`
        const form=new FormData();form.set('file',file);form.set('name',name);const response=await fetch('/api/native-blog/upload',{method:'POST',body:form});if(!response.ok)throw new Error('첨부파일을 업로드하지 못했습니다.')
        names.push(name)
        const label=file.name.replace(/[\[\]\\]/g,'_')
        lines.push(`${file.type.startsWith('image/')&&!/\.svg$/i.test(file.name)?'!':''}[${label}](attachment:${name})`)
      }
      setStatus(`${files.length}개 파일을 본문에 추가했습니다.`)
    }catch(error){setStatus((error as Error).message)}finally{
      if(names.length){setAssets(current=>[...new Set([...current,...names])]);setMarkdown(current=>current+'\n\n'+lines.join('\n\n'));setPreview(null)}
      setUploading(false)
    }
  }
  async function removeDraft(draft:Draft,restore=false){
    if(!isAdmin||busy)return
    setBusy(true)
    try{
      const response=await fetch(`/api/native-blog/drafts/${draft.slug}`,{method:restore?'POST':'DELETE'})
      if(!response.ok)throw new Error('임시글을 변경하지 못했습니다.')
      if(restore){setDrafts(current=>[draft,...current]);setRemoved(null)}
      else{setDrafts(current=>current.filter(post=>post.slug!==draft.slug));setRemoved(draft);if(draft.slug===slug){setSlug('blog-'+crypto.randomUUID());setTitle('');setMarkdown('');setAssets([]);setPreview(null);history.replaceState(history.state,'','/blog/write')}}
    }catch(error){setStatus((error as Error).message)}finally{setBusy(false)}
  }
  const disabled=busy||uploading||Boolean(published)||!sourceReady
  return <div className="blog-page blog-page--writer"><main className="blog-editor blog-editor--archive">
    <div className="blog-editor__heading"><a className="article-back" href={editSlug?editHref:'/blog'}>← {editSlug?'글로 돌아가기':'FIELD NOTES'}</a><p className="small-label">THE SEALED DESK / CHAPTER 03</p><h1>The Writing Desk</h1><p>{editSlug?'글 수정':'새 글 작성'}</p></div>
    {!ready?<p>로그인 확인 중…</p>:!isAdmin?<div className="protected-form"><p>관리자만 글을 작성할 수 있습니다.</p><button type="button" onClick={()=>window.dispatchEvent(new Event('cedrai:open-login'))}>관리자 로그인</button></div>:<>
      {!sourceReady&&<p className="blog-editor__load-status" role="status">{status||'글 원본을 불러오는 중…'}</p>}
      <div className="blog-editor__fields"><div className="blog-editor__folio-heading"><span>✦ &nbsp; FIELD NOTES / {editSlug?'EDIT ENTRY':'NEW ENTRY'}</span><span>CÉDRAI'S ARCHIVE</span></div><label>제목<input value={title} maxLength={160} disabled={disabled} onChange={e=>setTitle(e.target.value)} required placeholder="글 제목을 입력해 주세요."/></label>
      <div className="blog-editor__row"><label>카테고리<select value={category} disabled={disabled} onChange={e=>{setCategory(e.target.value);setTopic('')}}>{BLOG_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label><label>주제{BLOG_TOPICS[category]?<select value={topic} disabled={disabled} onChange={e=>setTopic(e.target.value)}><option value="">선택 안 함</option>{BLOG_TOPICS[category].map(t=><option key={t}>{t}</option>)}</select>:<input value={topic} disabled={disabled} maxLength={60} onChange={e=>setTopic(e.target.value)} placeholder="선택 사항"/>}</label></div>
      <label>소개<input value={summary} disabled={disabled} maxLength={300} onChange={e=>setSummary(e.target.value)} placeholder="목록에 표시할 짧은 소개 (선택 사항)"/></label><label>태그<input value={tags} disabled={disabled} onChange={e=>setTags(e.target.value)} placeholder="쉼표로 구분해 주세요."/></label>
      <label className="blog-editor__secret"><input type="checkbox" checked={isSecret} disabled={disabled} onChange={e=>setIsSecret(e.target.checked)}/><span><strong>비밀글</strong><small>{isSecret?'로그인한 사용자만 읽을 수 있습니다.':'체크하지 않으면 로그인 없이 모두가 읽을 수 있습니다.'}</small></span></label>
      <div className="blog-editor__toolbar"><button type="button" disabled={disabled} onClick={()=>insert('## ')}>제목</button><button type="button" disabled={disabled} onClick={()=>insert('**','**')}>굵게</button><button type="button" disabled={disabled} onClick={()=>insert('```\n','\n```')}>코드</button><button type="button" disabled={disabled} onClick={()=>insert('- ')}>목록</button><button type="button" disabled={disabled} onClick={openTableEditor}>표</button><button type="button" disabled={disabled} onClick={()=>insert('[','](https://)')}>링크</button><label className="blog-editor__file" aria-disabled={disabled}><span aria-hidden="true">＋</span><span>이미지·첨부파일 추가</span><input type="file" aria-label="이미지·첨부파일 추가" multiple disabled={disabled} onChange={e=>{addFiles(Array.from(e.target.files||[]));e.target.value=''}}/></label></div>
      <label>본문<textarea ref={textarea} value={markdown} disabled={disabled} onChange={e=>{setMarkdown(e.target.value);setPreview(null)}} maxLength={500000} rows={20} placeholder="내용을 작성해 주세요. Markdown을 지원합니다."/></label><p className="blog-editor__hint">Enter는 줄바꿈, 빈 줄은 새 문단, **글자**는 굵게 표시됩니다. 표 버튼에서 셀과 행·열을 편집할 수 있습니다. 기존 표는 커서를 표 안에 놓고 표 버튼을 누르세요. 이미지와 첨부파일은 본문에 자동으로 추가됩니다. 파일 하나당 최대 4MB입니다.</p>
      <div className="blog-editor__actions"><button type="button" disabled={disabled||!title.trim()||!markdown.trim()} onClick={()=>save('preview')}>미리보기</button>{!editSlug&&<button type="button" disabled={disabled||!title.trim()||!markdown.trim()} onClick={()=>save('draft')}>임시 저장</button>}<button type="button" className="primary-button" disabled={disabled||!title.trim()||!markdown.trim()} onClick={()=>save(editSlug?'update':'publish')}>{busy?'처리 중…':editSlug?'수정 내용 저장':isSecret?'비밀글 업로드':'일반글 업로드'}</button></div>
      <p role="status" aria-live="polite">{status}</p>{published&&<div className="blog-editor__success"><Link href={published}>{editSlug?'수정한 글 보기':'업로드한 글 보기'} →</Link><a href="/blog/write">새 글 작성 →</a></div>}
      </div>
      {preview&&<section className="blog-editor__preview"><h2>미리보기</h2><div className="article-body" dangerouslySetInnerHTML={{__html:preview}}/></section>}
      {!editSlug&&drafts.length>0&&<section className="blog-editor__drafts"><h2>임시 저장한 글</h2>{drafts.map(draft=><div className="blog-editor__draft-row" key={draft.slug}><a href={`/blog/write?draft=${draft.slug}`}><span>{draft.title}</span><small>{draft.protected?'비밀글':'일반글'} · 이어서 작성 →</small></a><button type="button" disabled={busy} onClick={()=>removeDraft(draft)} aria-label={`${draft.title} 임시글 삭제`}>삭제</button></div>)}</section>}
      {removed&&<p className="blog-editor__undo">임시글을 삭제했습니다. <button type="button" disabled={busy} onClick={()=>removeDraft(removed,true)}>실행 취소</button></p>}
      {tableSession&&<BlogTableEditor initial={tableSession.table} existing={tableSession.existing} onApply={applyTable} onDelete={deleteTable} onClose={()=>setTableSession(null)}/>}
    </>}
  </main></div>
}
