import { validSlug, WRITTEN_PREFIX } from '@/lib/native-blog'
import { listBlogKeys, readBlogJSON, writeBlogJSON } from '@/lib/blog-store'

const prefix=`${WRITTEN_PREFIX}deleted/`

export async function isBlogPostDeleted(slug:string) {
  if(!validSlug(slug))return false
  return Boolean(await readBlogJSON(`${prefix}${slug}.json`))
}

export async function listDeletedBlogSlugs() {
  const keys=await listBlogKeys(prefix)
  return keys.map(key=>key.slice(prefix.length,-'.json'.length)).filter(validSlug)
}

// Keep the source and number reservation so deletion cannot reuse an old URL.
export async function markBlogPostDeleted(slug:string) {
  if(!validSlug(slug))throw new Error('Invalid blog slug')
  await writeBlogJSON(`${prefix}${slug}.json`,{slug,deletedAt:new Date().toISOString()},true)
}
