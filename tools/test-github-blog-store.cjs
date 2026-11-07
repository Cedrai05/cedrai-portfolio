// Production build required. GitHub and Blob credentials below are test-only.
const assert=require('node:assert/strict')
const crypto=require('node:crypto')
const http=require('node:http')
const {spawn}=require('node:child_process')

const site='http://127.0.0.1:8915'
const api='http://127.0.0.1:8914'
const files=new Map()
let mock,server
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data))}
function sealed(value,secret){
  const iv=crypto.randomBytes(12),key=crypto.createHash('sha256').update('cedrai-blog-storage-v1\0').update(secret).digest()
  const cipher=crypto.createCipheriv('aes-256-gcm',key,iv)
  const payload=Buffer.concat([cipher.update(value),cipher.final()])
  return Buffer.from(JSON.stringify({format:'cedrai-blog-aes-gcm-v1',iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),payload:payload.toString('base64')}))
}
async function mockGithub(req,res){
  const url=new URL(req.url,api)
  const blobPrefix='/repos/test/repo/git/blobs/'
  if(req.method==='GET'&&url.pathname.startsWith(blobPrefix)){
    const file=[...files.values()].find(value=>value.sha===url.pathname.slice(blobPrefix.length))
    return file?json(res,200,{encoding:'base64',content:file.data.toString('base64')}):json(res,404,{message:'Not Found'})
  }
  const prefix='/repos/test/repo/contents/'
  if(!url.pathname.startsWith(prefix))return json(res,404,{message:'Not Found'})
  const key=decodeURIComponent(url.pathname.slice(prefix.length))
  if(req.method==='GET'){
    const file=files.get(key)
    if(file)return json(res,200,{type:'file',name:key.split('/').at(-1),size:file.data.length,sha:file.sha,content:file.data.length>1024*1024?'':file.data.toString('base64'),encoding:file.data.length>1024*1024?'none':'base64'})
    const directory=key.replace(/\/$/,'')+'/'
    const names=[...files.keys()].filter(name=>name.startsWith(directory)&&!name.slice(directory.length).includes('/'))
    if(names.length)return json(res,200,names.map(name=>({type:'file',name:name.slice(directory.length),sha:files.get(name).sha})))
    return json(res,404,{message:'Not Found'})
  }
  if(req.method==='PUT'){
    const chunks=[];for await(const chunk of req)chunks.push(chunk)
    const body=JSON.parse(Buffer.concat(chunks).toString('utf8'))
    const previous=files.get(key)
    if((previous&&body.sha!==previous.sha)||(!previous&&body.sha))return json(res,409,{message:'Conflict'})
    const data=Buffer.from(body.content,'base64'),sha=crypto.createHash('sha1').update(data).digest('hex')
    files.set(key,{data,sha})
    return json(res,previous?200:201,{content:{sha},commit:{html_url:`${api}/commit/${sha}`}})
  }
  return json(res,405,{message:'Method Not Allowed'})
}
async function request(path,{cookie,body,form}={}){
  const headers={}
  if(cookie)headers.Cookie=cookie
  if(body!==undefined||form)headers.Origin=site
  if(body!==undefined)headers['Content-Type']='application/json'
  const response=await fetch(site+path,{method:body!==undefined||form?'POST':'GET',headers,body:body!==undefined?JSON.stringify(body):form,redirect:'manual'})
  const bytes=Buffer.from(await response.arrayBuffer())
  let data;try{data=JSON.parse(bytes.toString('utf8'))}catch{data=bytes.toString('utf8')}
  return {status:response.status,data,bytes,headers:response.headers}
}
async function main(){
  const testSecret=crypto.randomBytes(32).toString('hex')
  const seed=(key,data)=>files.set(key,{data,sha:crypto.createHash('sha1').update(data).digest('hex')})
  seed('data/native-blog/blog-native/v1/posts/tistory-123.json.sealed.json',sealed(Buffer.from(JSON.stringify({version:1,slug:'tistory-123',visibility:'protected',title:'Legacy test',content:'<p>GITHUB_LEGACY_BODY</p>',assets:[]})),testSecret))
  mock=http.createServer((req,res)=>{mockGithub(req,res).catch(error=>json(res,500,{error:error.message}))})
  await new Promise(resolve=>mock.listen(8914,'127.0.0.1',resolve))
  server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','8915'],{
    env:{...process.env,ADMIN_ID:'storage-test-admin',ADMIN_PASSWORD:'storage-test-password',ADMIN_SESSION_SECRET:testSecret,CLUB_ID:'storage-test-member',CLUB_PASSWORD:'storage-test-member-password',GITHUB_TOKEN:'test-token',GITHUB_REPO:'test/repo',GITHUB_BRANCH:'main',GITHUB_API_BASE:api,BLOB_READ_WRITE_TOKEN:'not-a-real-token',BLOB_STORE_ID:'mock-blocked-blob',VERCEL:''},stdio:'ignore'
  })
  for(let i=0;i<100;i++){try{if((await request('/api/me')).status===200)break}catch{}await new Promise(resolve=>setTimeout(resolve,100));if(i===99)throw new Error('Test site did not start')}
  const login=await request('/api/login',{body:{id:'storage-test-admin',password:'storage-test-password'}})
  assert.equal(login.status,200)
  const cookie=login.headers.get('set-cookie').split(';')[0]
  const config=await request('/api/native-blog/upload',{cookie})
  assert.equal(config.status,200);assert.equal(config.data.storage,'github')
  const asset=crypto.randomBytes(1100000)
  const name=crypto.createHash('sha256').update(asset).digest('hex')+'.png'
  const form=new FormData();form.set('file',new File([asset],'sample.png'));form.set('name',name)
  assert.equal((await request('/api/native-blog/upload',{cookie,form})).status,200)
  const slug='blog-'+crypto.randomUUID()
  const input={slug,title:'GitHub storage test',category:'개발',topic:'Tests',summary:'Public test',tags:[],markdown:`# PUBLIC_GITHUB_BODY\n\n**Bold**\n\n![Picture](attachment:${name})`,assets:[name],isSecret:false,mode:'publish'}
  const saved=await request('/api/native-blog/write',{cookie,body:input})
  assert.equal(saved.status,200,JSON.stringify(saved.data));assert(saved.data.post.number>=131)
  const catalog=await request('/api/native-blog/catalog')
  assert.equal(catalog.status,200);assert.equal(catalog.data.storageUnavailable,false)
  assert(catalog.data.posts.some(post=>post.slug===slug))
  const article=await request(saved.data.href)
  assert.equal(article.status,200);assert(article.data.includes('PUBLIC_GITHUB_BODY'))
  const body=await request('/api/native-blog/posts/'+slug)
  assert.equal(body.status,200);assert(body.data.content.includes('<strong>Bold</strong>'))
  const assetResponse=await request(`/api/native-blog/assets?slug=${slug}&name=${name}`)
  assert.equal(assetResponse.status,200);assert.deepEqual(assetResponse.bytes,asset)
  const source=await request(`/api/native-blog/posts/${slug}/source`,{cookie})
  assert.equal(source.status,200)
  const edited=await request('/api/native-blog/write',{cookie,body:{...input,mode:'update',revision:source.data.revision,markdown:'# EDITED_GITHUB_BODY'}})
  assert.equal(edited.status,200,JSON.stringify(edited.data))
  assert((await request('/api/native-blog/posts/'+slug)).data.content.includes('EDITED_GITHUB_BODY'))
  const secretSlug='blog-'+crypto.randomUUID()
  const secret=await request('/api/native-blog/write',{cookie,body:{...input,slug:secretSlug,title:'Secret test',markdown:'SECRET_GITHUB_BODY',assets:[],isSecret:true}})
  assert.equal(secret.status,200)
  assert.equal((await request('/api/native-blog/posts/'+secretSlug)).status,401)
  const member=await request('/api/login',{body:{id:'storage-test-member',password:'storage-test-member-password'}})
  const memberCookie=member.headers.get('set-cookie').split(';')[0]
  assert((await request('/api/native-blog/posts/'+secretSlug,{cookie:memberCookie})).data.content.includes('SECRET_GITHUB_BODY'))
  assert.equal((await request('/api/native-blog/posts/tistory-123')).status,401)
  assert((await request('/api/native-blog/posts/tistory-123',{cookie:memberCookie})).data.content.includes('GITHUB_LEGACY_BODY'))
  const inventory=await request('/api/native-blog/import-status',{cookie})
  assert.equal(inventory.status,200);assert(inventory.data.posts.includes('posts/tistory-123.json'))
  const concurrent=await Promise.all([1,2].map(index=>request('/api/native-blog/write',{cookie,body:{...input,slug:'blog-'+crypto.randomUUID(),title:'Concurrent '+index,markdown:'Concurrent post',assets:[]}})))
  assert(concurrent.every(item=>item.status===200),JSON.stringify(concurrent.map(item=>item.data)))
  assert.notEqual(concurrent[0].data.post.number,concurrent[1].data.post.number)
  for(const [key,file] of files){
    const value=file.data.toString('utf8')
    assert(!value.includes('PUBLIC_GITHUB_BODY')&&!value.includes('SECRET_GITHUB_BODY')&&!value.includes('Secret test'),key)
    assert.equal(JSON.parse(value).format,'cedrai-blog-aes-gcm-v1')
  }
  console.log('Passed: encrypted GitHub legacy and new posts, large assets, public and protected reads, edits, concurrent numbering, numeric URLs, and Blob-independent archive availability.')
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(async()=>{server?.kill('SIGTERM');if(mock)await new Promise(resolve=>mock.close(resolve))})
