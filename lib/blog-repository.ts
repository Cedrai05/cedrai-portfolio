import { BLOG_POSTS, type BlogPost } from '@/lib/blog-catalog'
import { getBlogPost } from '@/lib/blog-post'
import { readNativePost, validSlug } from '@/lib/native-blog'
import { listWrittenMetadata, readWrittenPost, writtenMetadata } from '@/lib/blog-writing'
export async function getBlogCatalog():Promise<BlogPost[]> {
  return [...BLOG_POSTS,...await listWrittenMetadata()].sort((a,b)=>b.date.localeCompare(a.date)||b.slug.localeCompare(a.slug))
}
export async function getPostMetadata(slug:string) {
  if(!validSlug(slug))return null
  return BLOG_POSTS.find(post=>post.slug===slug)||await writtenMetadata(slug)
}
export async function getStoredArticle(slug:string) {
  const metadata=await getPostMetadata(slug)
  if(!metadata)return null
  if(slug.startsWith('blog-')) {
    const post=await readWrittenPost(slug)
    if(!post||post.metadata.slug!==slug||metadata.protected!==(post.visibility==='protected'))return null
    const content=metadata.protected?post.content:post.content.replace(/data-native-(src|href)="([a-f0-9]{64}\.[a-z0-9]{1,10})"/g,(_match,attr,name)=>post.assets.includes(name)?`${attr}="/api/native-blog/assets?slug=${slug}&amp;name=${name}"`:'')
    return {metadata,content,assets:post.assets,protected:metadata.protected}
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
