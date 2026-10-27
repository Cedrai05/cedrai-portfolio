import { BLOG_POSTS } from '@/lib/blog-catalog'
import { validWrittenSlug, WRITTEN_PREFIX } from '@/lib/native-blog'
import { listBlogKeys, readBlogJSON, writeBlogJSON } from '@/lib/blog-store'
const idsPrefix=`${WRITTEN_PREFIX}ids/`
const slugPrefix=`${WRITTEN_PREFIX}numbers/`
const legacyMax=Math.max(...BLOG_POSTS.map(post=>Number(post.slug.replace('tistory-',''))))
function validNumber(value:unknown):value is number { return typeof value==='number'&&Number.isSafeInteger(value)&&value>0 }
export async function slugForPostNumber(value:string) {
  if(!/^[0-9]{1,15}$/.test(value))return null
  const number=Number(value)
  if(!validNumber(number))return null
  const legacy=BLOG_POSTS.find(post=>post.number===number)
  if(legacy)return legacy.slug
  const claim=await readBlogJSON<{slug:string}>(`${idsPrefix}${number}.json`)
  return claim&&validWrittenSlug(claim.slug)?claim.slug:null
}
export async function numberForWrittenPost(slug:string):Promise<number> {
  if(!validWrittenSlug(slug))throw new Error('Invalid written post')
  const key=`${slugPrefix}${slug}.json`
  const current=await readBlogJSON<{number:number}>(key)
  if(current&&validNumber(current.number))return current.number
  const keys=await listBlogKeys(idsPrefix)
  let candidate=Math.max(legacyMax,...keys.map(key=>Number(key.slice(idsPrefix.length).replace(/\.json$/,''))).filter(validNumber))
  // Each number is claimed with an exclusive create, so simultaneous posts cannot collide.
  for(let attempt=0;attempt<100;attempt++) {
    candidate++
    try { await writeBlogJSON(`${idsPrefix}${candidate}.json`,{slug}) }
    catch(error) {
      const owner=await readBlogJSON<{slug:string}>(`${idsPrefix}${candidate}.json`)
      if(!owner)throw error
      if(owner.slug!==slug)continue
    }
    try { await writeBlogJSON(key,{number:candidate});return candidate }
    catch(error) {
      const winner=await readBlogJSON<{number:number}>(key)
      if(winner&&validNumber(winner.number))return winner.number
      throw error
    }
  }
  throw new Error('Could not assign a post number')
}
