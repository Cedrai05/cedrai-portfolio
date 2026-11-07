import { unstable_cache } from 'next/cache'
import { BLOG_POSTS, prepareBlogContent, type BlogPost } from '@/lib/blog-catalog'
import { getBlogPost } from '@/lib/blog-post'
import { readNativePost, validSlug } from '@/lib/native-blog'
import { listWrittenMetadata, readWrittenPost, renderedWrittenContent } from '@/lib/blog-writing'
export const WRITTEN_CATALOG_TAG='written-blog-catalog'
const cachedWrittenMetadata=unstable_cache(listWrittenMetadata,['written-blog-catalog-v3',process.env.BLOB_STORE_ID||'local'],{revalidate:300,tags:[WRITTEN_CATALOG_TAG]})
export async function getBlogCatalog():Promise<BlogPost[]> {
  const written=await cachedWrittenMetadata()
  return [...BLOG_POSTS,...written.posts].sort((a,b)=>b.date.localeCompare(a.date)||b.slug.localeCompare(a.slug))
}
export async function getPostMetadata(value:string) {
  const number=/^[0-9]{1,15}$/.test(value)?Number(value):null
  const legacy=BLOG_POSTS.find(post=>post.slug===value||(number!==null&&post.number===number))
  if(legacy)return legacy
  if(number===null&&!validSlug(value))return null
  const written=await cachedWrittenMetadata()
  return written.posts.find(post=>post.slug===value||(number!==null&&post.number===number))||null
}
export async function getAvailableBlogCatalog():Promise<{posts:BlogPost[];storageUnavailable:boolean}> {
  try { const written=await cachedWrittenMetadata();return {posts:[...BLOG_POSTS,...written.posts].sort((a,b)=>b.date.localeCompare(a.date)||b.slug.localeCompare(a.slug)),storageUnavailable:written.storageUnavailable} }
  catch { return {posts:BLOG_POSTS,storageUnavailable:true} }
}
export async function getStoredArticle(value:string,knownMetadata?:BlogPost) {
  const metadata=knownMetadata??await getPostMetadata(value)
  if(!metadata)return null
  const slug=metadata.slug
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
