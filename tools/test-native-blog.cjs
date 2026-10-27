// Builds must already exist. All credentials and posts below are disposable local test data.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),{spawn}=require('node:child_process')
const base='http://127.0.0.1:8912',root=path.join(process.cwd(),'.private_uploads/native-blog')
const secret=crypto.randomBytes(32).toString('hex'),created=[],restore=[]
let server
const numberedSlugs=new Set()
async function seed(key,data){const p=path.join(root,key);await fs.mkdir(path.dirname(p),{recursive:true});try{restore.push([p,await fs.readFile(p)])}catch{created.push(p)}await fs.writeFile(p,data)}
async function request(route,{cookie,body,form,origin,token}={}){const headers={};if(cookie)headers.Cookie=cookie;if(body!==undefined)headers['Content-Type']='application/json';if(origin)headers.Origin=origin;else if(body!==undefined||form)headers.Origin=base;if(token)headers.Authorization='Bearer '+token;const r=await fetch(base+route,{method:body!==undefined||form?'POST':'GET',headers,body:body!==undefined?JSON.stringify(body):form,redirect:'manual'});const text=await r.text();let data;try{data=JSON.parse(text)}catch{data=text}return {status:r.status,data,headers:r.headers,text}}
async function login(id,password){const r=await request('/api/login',{body:{id,password}});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0]}
const uuid=()=>{const slug=`blog-${crypto.randomUUID()}`;numberedSlugs.add(slug);for(const dir of ['posts','catalog','drafts','numbers'])created.push(path.join(root,'blog-native/v2',dir,slug+'.json'));return slug}
async function main(){
 const asset=crypto.randomBytes(24),name=crypto.createHash('sha256').update(asset).digest('hex')+'.png'
 await seed('blog-native/v1/assets/'+name,asset)
 await seed('blog-native/v1/posts/tistory-123.json',JSON.stringify({version:1,slug:'tistory-123',visibility:'protected',title:'Legacy test',content:'<p>SECRET_LEGACY_TEST_BODY</p><img data-native-src="'+name+'">',assets:[name],password:{hash:'legacy-verifier-must-not-leak'}}))
 await seed('blog-native/v1/posts/tistory-63.json',JSON.stringify({version:1,slug:'tistory-63',visibility:'private',title:'Major test',content:'<p>SECRET_MAJOR_TEST_BODY</p>',assets:[name]}))
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','8912'],{env:{...process.env,ADMIN_ID:'local-admin',ADMIN_PASSWORD:'local-admin-password',CLUB_ID:'local-member',CLUB_PASSWORD:'local-member-password',ADMIN_SESSION_SECRET:secret,BLOB_READ_WRITE_TOKEN:'',BLOB_STORE_ID:'',VERCEL:''},stdio:'ignore'})
 for(let i=0;i<100;i++){try{if((await request('/api/me')).status===200)break}catch{}await new Promise(r=>setTimeout(r,100));if(i===99)throw Error('Local server did not start')}
 const admin=await login('local-admin','local-admin-password'),member=await login('local-member','local-member-password')
 assert.equal((await request('/api/me',{cookie:admin})).data.role,'admin');assert.equal((await request('/api/me',{cookie:member})).data.role,'club-member')
 const forged=Buffer.from('unknown-account').toString('base64url'),signed=forged+'.'+crypto.createHmac('sha256',secret).update(forged).digest('base64url')
 assert.equal((await request('/api/me',{cookie:'cedrai_session='+signed})).data.role,null)
 assert.equal((await request('/api/native-blog/posts/tistory-123')).status,401)
 for(const cookie of [admin,member]){const r=await request('/api/native-blog/posts/tistory-123',{cookie});assert.equal(r.status,200);assert(r.data.content.includes('SECRET_LEGACY_TEST_BODY'));assert(!r.text.includes('legacy-verifier'));assert(!r.data.ticket);assert(r.headers.get('cache-control').includes('no-store'))}
 const major=(await request('/api/native-blog/catalog')).data.posts.filter(p=>p.sourceCategory==='Major/자료구조')
 assert.equal(major.length,7);assert(major.every(p=>p.category==='블로그/기술문서'&&p.topic==='Major'&&p.protected))
 assert.equal((await request('/api/native-blog/posts/tistory-63')).status,401)
 for(const cookie of [admin,member])assert.equal((await request('/api/native-blog/posts/tistory-63',{cookie})).status,200)
 assert.equal((await request('/blog?post=63')).text.includes('SECRET_MAJOR_TEST_BODY'),false)
 assert.equal((await request('/api/native-blog/posts/tistory-999999',{cookie:admin})).status,404)
 assert.equal((await request('/api/native-blog/unlock',{body:{slug:'tistory-123',password:'any-old-password'}})).status,410)
 const assetPath='/api/native-blog/assets?slug=tistory-123&name='+name
 assert.equal((await request(assetPath)).status,401);assert.equal((await request(assetPath,{token:'old-ticket'})).status,401)
 assert.equal((await request(assetPath,{cookie:member})).status,200)
 assert.equal((await request('/api/native-blog/assets?preview=1&name='+name,{cookie:member})).status,403)
 assert.equal((await request('/api/native-blog/assets?preview=1&name='+name,{cookie:admin})).status,200)
 assert.equal((await request('/blog?post=123',{cookie:admin})).text.includes('SECRET_LEGACY_TEST_BODY'),false)
 const oldLink=await request('/blog?post=tistory-63');assert.equal(oldLink.status,308);assert.equal(oldLink.headers.get('location'),'/blog?post=63')
 assert.equal((await request('/blog?post=63')).status,200)
 assert.equal((await request('/api/native-blog/posts/63')).status,401)
 assert.equal((await request('/api/native-blog/posts/63',{cookie:member})).status,200)
 const baseInput={title:'Local publishing test',category:'개발',topic:'Tests',summary:'Public summary',tags:['tests'],markdown:'# Test\n\nPUBLIC_TEST_BODY\n\n![picture](attachment:'+name+')\n\n<script>alert(1)</script>\n\n<a href="javascript:alert(1)">bad link</a>\n\n<img src="x" onerror="alert(1)">',assets:[name],isSecret:false,mode:'publish'}
 const pub={...baseInput,slug:uuid()}
 const sec={...baseInput,slug:uuid(),title:'Local members-only test',summary:'SECRET_SUMMARY',markdown:'SECRET_NEW_TEST_BODY\n\n![picture](attachment:'+name+')',isSecret:true}
 const draft={...baseInput,slug:uuid(),mode:'draft',markdown:'DRAFT_TEST_BODY',assets:[]}
 for(const input of [pub,sec,draft])for(const dir of ['posts','catalog','drafts'])created.push(path.join(root,'blog-native/v2',dir,input.slug+'.json'))
 assert.equal((await request('/api/native-blog/write',{body:pub})).status,403)
 assert.equal((await request('/api/native-blog/write',{cookie:member,body:pub})).status,403)
 assert.equal((await request('/api/native-blog/write',{cookie:admin,body:pub,origin:'https://evil.test'})).status,403)
 assert.equal((await request('/api/native-blog/write',{cookie:admin,body:{...pub,isSecret:'true'}})).status,400)
 assert.equal((await request('/api/native-blog/write',{cookie:admin,body:{...pub,title:''}})).status,400)
 const preview=await request('/api/native-blog/write',{cookie:admin,body:{...pub,mode:'preview'}})
 assert.equal(preview.status,200);assert(!preview.data.content.includes('<script'));assert(!preview.data.content.includes('onerror'));assert(!preview.data.content.includes('javascript:'))
 const published=await request('/api/native-blog/write',{cookie:admin,body:pub});assert.equal(published.status,200);assert.match(published.data.href,/^\/blog\?post=[0-9]+$/);assert(Number.isSafeInteger(published.data.post.number)&&published.data.post.number>123)
 assert.equal((await request('/api/native-blog/write',{cookie:admin,body:pub})).status,200)
 assert.equal((await request('/api/native-blog/write',{cookie:admin,body:{...pub,title:'Changed'}})).status,409)
 const publicBody=await request('/api/native-blog/posts/'+pub.slug);assert.equal(publicBody.status,200);assert(publicBody.data.content.includes('PUBLIC_TEST_BODY'));assert(publicBody.data.content.includes('/api/native-blog/assets?slug='))
 assert.equal((await request('/api/native-blog/assets?slug='+pub.slug+'&name='+name)).status,200)
 const secretPublished=await request('/api/native-blog/write',{cookie:admin,body:sec});assert.equal(secretPublished.status,200);assert.notEqual(secretPublished.data.post.number,published.data.post.number)
 assert.equal((await request('/api/native-blog/posts/'+sec.slug)).status,401)
 assert.equal((await request('/api/native-blog/posts/'+sec.slug,{cookie:member})).status,200)
 assert.equal((await request('/api/blog-post?id='+sec.slug)).status,401)
 assert.equal((await request(secretPublished.data.href)).text.includes('SECRET_NEW_TEST_BODY'),false)
 assert.equal((await request('/api/native-blog/assets?slug='+sec.slug+'&name='+name)).status,401)
 assert.equal((await request('/api/native-blog/write',{cookie:admin,body:draft})).status,200)
 assert.equal((await request('/api/native-blog/drafts/'+draft.slug,{cookie:admin})).status,200)
 assert.equal((await request('/api/native-blog/drafts/'+draft.slug,{cookie:member})).status,403)
 assert.equal((await request('/api/native-blog/posts/'+draft.slug)).status,404)
 const catalog=(await request('/api/native-blog/catalog')).data.posts
 assert.equal(catalog.filter(p=>p.slug===pub.slug).length,1);assert(!catalog.some(p=>p.slug===draft.slug));assert(!JSON.stringify(catalog).includes('SECRET_SUMMARY'));assert(!JSON.stringify(catalog).includes('SECRET_NEW_TEST_BODY'))
 const html=(await request(published.data.href)).text;assert(html.includes('PUBLIC_TEST_BODY'));assert(html.includes(`rel="canonical" href="https://www.cedrai.info${published.data.href}"`))
 const oldNative=await request('/blog?post='+pub.slug);assert.equal(oldNative.status,308);assert.equal(oldNative.headers.get('location'),published.data.href)
 const concurrent=await Promise.all([1,2].map(index=>request('/api/native-blog/write',{cookie:admin,body:{...baseInput,slug:uuid(),title:'Concurrent '+index}})))
 assert(concurrent.every(result=>result.status===200));assert.notEqual(concurrent[0].data.post.number,concurrent[1].data.post.number)
 assert.equal((await request('/api/native-blog/write',{cookie:admin,body:{...draft,mode:'publish'}})).status,200)
 assert.equal((await request('/api/native-blog/posts/'+draft.slug)).status,200)
 const form=new FormData(),uploaded=Buffer.from('local upload test'),uploadedName=crypto.createHash('sha256').update(uploaded).digest('hex')+'.txt'
 form.set('file',new File([uploaded],'sample.txt'));form.set('name',uploadedName);created.push(path.join(root,'blog-native/v1/assets',uploadedName))
 assert.equal((await request('/api/native-blog/upload',{cookie:member,form})).status,403)
 assert.equal((await request('/api/native-blog/upload',{cookie:admin,form})).status,200)
 assert.equal((await request('/api/native-blog/posts/tistory-123',{cookie:admin+'.extra'})).status,401)
 console.log('Passed: numeric URLs, legacy redirects, canonical links, collision-free concurrent numbering, admin/member/anonymous access, legacy and new secret bodies/assets, old password/ticket denial, draft privacy, public publish, immediate catalog updates, duplicate protection, Markdown sanitization, CSRF, upload permissions, unknown/suffixed sessions.')
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(async()=>{server?.kill('SIGTERM');const idDir=path.join(root,'blog-native/v2/ids');for(const file of await fs.readdir(idDir).catch(()=>[])){const target=path.join(idDir,file);const claim=JSON.parse(await fs.readFile(target,'utf8'));if(numberedSlugs.has(claim.slug))await fs.rm(target,{force:true})}for(const file of [...new Set(created)])await fs.rm(file,{force:true});for(const [file,data] of restore)await fs.writeFile(file,data)})
