// Builds must already exist. All credentials and posts below are disposable local test data.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),{spawn}=require('node:child_process')
const base='http://127.0.0.1:8912',root=path.join(process.cwd(),'.private_uploads/native-blog')
const secret=crypto.randomBytes(32).toString('hex'),created=[],restore=[]
let server
async function seed(key,data){const p=path.join(root,key);await fs.mkdir(path.dirname(p),{recursive:true});try{restore.push([p,await fs.readFile(p)])}catch{created.push(p)}await fs.writeFile(p,data)}
async function request(route,{cookie,body,form,origin,token}={}){const headers={};if(cookie)headers.Cookie=cookie;if(body!==undefined)headers['Content-Type']='application/json';if(origin)headers.Origin=origin;else if(body!==undefined||form)headers.Origin=base;if(token)headers.Authorization='Bearer '+token;const r=await fetch(base+route,{method:body!==undefined||form?'POST':'GET',headers,body:body!==undefined?JSON.stringify(body):form,redirect:'manual'});const text=await r.text();let data;try{data=JSON.parse(text)}catch{data=text}return {status:r.status,data,headers:r.headers,text}}
async function login(id,password){const r=await request('/api/login',{body:{id,password}});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0]}
const uuid=()=>`blog-${crypto.randomUUID()}`
async function main(){
 const asset=crypto.randomBytes(24),name=crypto.createHash('sha256').update(asset).digest('hex')+'.png'
 await seed('blog-native/v1/assets/'+name,asset)
 await seed('blog-native/v1/posts/tistory-123.json',JSON.stringify({version:1,slug:'tistory-123',visibility:'protected',title:'Legacy test',content:'<p>SECRET_LEGACY_TEST_BODY</p><img data-native-src="'+name+'">',assets:[name],password:{hash:'legacy-verifier-must-not-leak'}}))
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','8912'],{env:{...process.env,ADMIN_ID:'local-admin',ADMIN_PASSWORD:'local-admin-password',CLUB_ID:'local-member',CLUB_PASSWORD:'local-member-password',ADMIN_SESSION_SECRET:secret,BLOB_READ_WRITE_TOKEN:'',BLOB_STORE_ID:'',VERCEL:''},stdio:'ignore'})
 for(let i=0;i<100;i++){try{if((await request('/api/me')).status===200)break}catch{}await new Promise(r=>setTimeout(r,100));if(i===99)throw Error('Local server did not start')}
 const admin=await login('local-admin','local-admin-password'),member=await login('local-member','local-member-password')
 assert.equal((await request('/api/me',{cookie:admin})).data.role,'admin');assert.equal((await request('/api/me',{cookie:member})).data.role,'club-member')
 const forged=Buffer.from('unknown-account').toString('base64url'),signed=forged+'.'+crypto.createHmac('sha256',secret).update(forged).digest('base64url')
 assert.equal((await request('/api/me',{cookie:'cedrai_session='+signed})).data.role,null)
 assert.equal((await request('/api/native-blog/posts/tistory-123')).status,401)
 for(const cookie of [admin,member]){const r=await request('/api/native-blog/posts/tistory-123',{cookie});assert.equal(r.status,200);assert(r.data.content.includes('SECRET_LEGACY_TEST_BODY'));assert(!r.text.includes('legacy-verifier'));assert(!r.data.ticket);assert(r.headers.get('cache-control').includes('no-store'))}
 assert.equal((await request('/api/native-blog/unlock',{body:{slug:'tistory-123',password:'any-old-password'}})).status,410)
 const assetPath='/api/native-blog/assets?slug=tistory-123&name='+name
 assert.equal((await request(assetPath)).status,401);assert.equal((await request(assetPath,{token:'old-ticket'})).status,401)
 assert.equal((await request(assetPath,{cookie:member})).status,200)
 assert.equal((await request('/api/native-blog/assets?preview=1&name='+name,{cookie:member})).status,403)
 assert.equal((await request('/api/native-blog/assets?preview=1&name='+name,{cookie:admin})).status,200)
 assert.equal((await request('/blog?post=tistory-123',{cookie:admin})).text.includes('SECRET_LEGACY_TEST_BODY'),false)
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
 assert.equal((await request('/api/native-blog/write',{cookie:admin,body:pub})).status,200)
 assert.equal((await request('/api/native-blog/write',{cookie:admin,body:pub})).status,200)
 assert.equal((await request('/api/native-blog/write',{cookie:admin,body:{...pub,title:'Changed'}})).status,409)
 const publicBody=await request('/api/native-blog/posts/'+pub.slug);assert.equal(publicBody.status,200);assert(publicBody.data.content.includes('PUBLIC_TEST_BODY'));assert(publicBody.data.content.includes('/api/native-blog/assets?slug='))
 assert.equal((await request('/api/native-blog/assets?slug='+pub.slug+'&name='+name)).status,200)
 assert.equal((await request('/api/native-blog/write',{cookie:admin,body:sec})).status,200)
 assert.equal((await request('/api/native-blog/posts/'+sec.slug)).status,401)
 assert.equal((await request('/api/native-blog/posts/'+sec.slug,{cookie:member})).status,200)
 assert.equal((await request('/api/blog-post?id='+sec.slug)).status,401)
 assert.equal((await request('/blog?post='+sec.slug)).text.includes('SECRET_NEW_TEST_BODY'),false)
 assert.equal((await request('/api/native-blog/assets?slug='+sec.slug+'&name='+name)).status,401)
 assert.equal((await request('/api/native-blog/write',{cookie:admin,body:draft})).status,200)
 assert.equal((await request('/api/native-blog/drafts/'+draft.slug,{cookie:admin})).status,200)
 assert.equal((await request('/api/native-blog/drafts/'+draft.slug,{cookie:member})).status,403)
 assert.equal((await request('/api/native-blog/posts/'+draft.slug)).status,404)
 const catalog=(await request('/api/native-blog/catalog')).data.posts
 assert.equal(catalog.filter(p=>p.slug===pub.slug).length,1);assert(!catalog.some(p=>p.slug===draft.slug));assert(!JSON.stringify(catalog).includes('SECRET_SUMMARY'));assert(!JSON.stringify(catalog).includes('SECRET_NEW_TEST_BODY'))
 const html=(await request('/blog?post='+pub.slug)).text;assert(html.includes('PUBLIC_TEST_BODY'))
 assert.equal((await request('/api/native-blog/write',{cookie:admin,body:{...draft,mode:'publish'}})).status,200)
 assert.equal((await request('/api/native-blog/posts/'+draft.slug)).status,200)
 const form=new FormData(),uploaded=Buffer.from('local upload test'),uploadedName=crypto.createHash('sha256').update(uploaded).digest('hex')+'.txt'
 form.set('file',new File([uploaded],'sample.txt'));form.set('name',uploadedName);created.push(path.join(root,'blog-native/v1/assets',uploadedName))
 assert.equal((await request('/api/native-blog/upload',{cookie:member,form})).status,403)
 assert.equal((await request('/api/native-blog/upload',{cookie:admin,form})).status,200)
 assert.equal((await request('/api/native-blog/posts/tistory-123',{cookie:admin+'.extra'})).status,401)
 console.log('Passed: admin/member/anonymous access, legacy and new secret bodies/assets, old password/ticket denial, draft privacy, public publish, immediate catalog updates, duplicate protection, Markdown sanitization, CSRF, upload permissions, unknown/suffixed sessions.')
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(async()=>{server?.kill('SIGTERM');for(const file of [...new Set(created)])await fs.rm(file,{force:true});for(const [file,data] of restore)await fs.writeFile(file,data)})
