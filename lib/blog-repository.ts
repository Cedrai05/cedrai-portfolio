import { unstable_cache } from 'next/cache'
import { BLOG_POSTS, prepareBlogContent, type BlogPost } from '@/lib/blog-catalog'
import { getBlogPost } from '@/lib/blog-post'
import { readNativePost, validSlug } from '@/lib/native-blog'
import { listWrittenMetadata, readWrittenPost, renderedWrittenContent } from '@/lib/blog-writing'
import { isBlogPostDeleted, listDeletedBlogSlugs } from '@/lib/blog-deletion'
export const WRITTEN_CATALOG_TAG='written-blog-catalog'
const cachedWrittenMetadata=unstable_cache(listWrittenMetadata,['written-blog-catalog-v4',process.env.GITHUB_REPO||'local'],{revalidate:300,tags:[WRITTEN_CATALOG_TAG]})
const cachedDeletedSlugs=unstable_cache(listDeletedBlogSlugs,['deleted-blog-posts-v1',process.env.GITHUB_REPO||'local'],{revalidate:300,tags:[WRITTEN_CATALOG_TAG]})
export async function getBlogCatalog():Promise<BlogPost[]> {
  const [written,deleted]=await Promise.all([cachedWrittenMetadata(),cachedDeletedSlugs()])
  return [...BLOG_POSTS,...written.posts].filter(post=>!deleted.includes(post.slug)).sort((a,b)=>b.date.localeCompare(a.date)||b.slug.localeCompare(a.slug))
}
export async function getPostMetadata(value:string) {
  const number=/^[0-9]{1,15}$/.test(value)?Number(value):null
  const legacy=BLOG_POSTS.find(post=>post.slug===value||(number!==null&&post.number===number))
  if(legacy)return await isBlogPostDeleted(legacy.slug)?null:legacy
  if(number===null&&!validSlug(value))return null
  const written=await cachedWrittenMetadata()
  const post=written.posts.find(post=>post.slug===value||(number!==null&&post.number===number))
  return post&&!await isBlogPostDeleted(post.slug)?post:null
}
export async function getAvailableBlogCatalog():Promise<{posts:BlogPost[];storageUnavailable:boolean}> {
  // If deletion records cannot be loaded, do not show potentially deleted posts.
  let deleted:string[]
  try { deleted=await cachedDeletedSlugs() } catch { return {posts:[],storageUnavailable:true} }
  try { const written=await cachedWrittenMetadata();return {posts:[...BLOG_POSTS,...written.posts].filter(post=>!deleted.includes(post.slug)).sort((a,b)=>b.date.localeCompare(a.date)||b.slug.localeCompare(a.slug)),storageUnavailable:written.storageUnavailable} }
  catch { return {posts:BLOG_POSTS.filter(post=>!deleted.includes(post.slug)),storageUnavailable:true} }
}
export async function getStoredArticle(value:string,knownMetadata?:BlogPost) {
  const metadata=knownMetadata??await getPostMetadata(value)
  if(!metadata)return null
  const slug=metadata.slug
  if(await isBlogPostDeleted(slug))return null
  if(slug.startsWith('blog-')) {
    const post=await readWrittenPost(slug)
    if(!post||post.metadata.slug!==slug||metadata.protected!==(post.visibility==='protected'))return null
    const rendered=renderedWrittenContent(post)
    const content=metadata.protected?rendered:rendered.replace(/data-native-(src|href)="([a-f0-9]{64}\.[a-z0-9]{1,10})"/g,(_match,attr,name)=>post.assets.includes(name)?`${attr}="/api/native-blog/assets?slug=${slug}&amp;name=${name}"`:'')
    return {metadata,content:prepareBlogContent(content),assets:post.assets,protected:metadata.protected}
  }
  if(metadata.protected) {
    const post=await readNativePost(slug)
    // A private archive becomes readable only after explicitly listing it as a secret post.
    if(!post||!['protected','private'].includes(post.visibility))return null
    return {metadata,content:post.content,assets:post.assets,protected:true}
  }
  const post=await getBlogPost(slug.replace('tistory-',''))
  return post ? {metadata,content:post.contentHtml,assets:[],protected:false} : null
}
