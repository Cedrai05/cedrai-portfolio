'use client'
import { createContext,useCallback,useContext,useEffect,useRef,useState } from 'react'
type Role='admin'|'club-member'|null
type AuthCtx={adminId:string|null;isAdmin:boolean;isMember:boolean;role:Role;ready:boolean;login:(id:string,password:string)=>Promise<string>;logout:()=>Promise<void>}
const AuthContext=createContext<AuthCtx>({adminId:null,isAdmin:false,isMember:false,role:null,ready:false,login:async()=>'',logout:async()=>{}})
export function AuthProvider({children}:{children:React.ReactNode}) {
  const [adminId,setAdminId]=useState<string|null>(null)
  const [role,setRole]=useState<Role>(null)
  const [ready,setReady]=useState(false)
  const generation=useRef(0)
  const channel=useRef<BroadcastChannel|null>(null)
  const apply=useCallback((data:{id?:string|null;role?:Role})=>{setAdminId(data.id??null);setRole(data.role==='admin'||data.role==='club-member'?data.role:null);setReady(true)},[])
  const refresh=useCallback(async()=>{
    const current=++generation.current
    try{const response=await fetch('/api/me',{cache:'no-store'});const data=await response.json();if(current===generation.current)apply(data)}
    catch{if(current===generation.current)apply({})}
  },[apply])
  useEffect(()=>{
    refresh()
    const visibility=()=>{if(!document.hidden)refresh()}
    const pageshow=(event:PageTransitionEvent)=>{if(event.persisted){generation.current++;apply({});refresh()}}
    window.addEventListener('pageshow',pageshow);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',visibility)
    if(typeof BroadcastChannel!=='undefined') {
      channel.current=new BroadcastChannel('cedrai-auth')
      channel.current.onmessage=event=>{if(event.data==='logout'){generation.current++;apply({})}else refresh()}
    }
    return()=>{generation.current++;window.removeEventListener('pageshow',pageshow);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',visibility);channel.current?.close()}
  },[refresh,apply])
  const login=async(id:string,password:string)=>{
    try {
      const response=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,password}),cache:'no-store'})
      const data=await response.json().catch(()=>({}))
      if(!response.ok)return data.error??'로그인에 실패했어요.'
      generation.current++;apply(data);channel.current?.postMessage('login');return ''
    } catch{return '서버에 연결할 수 없어요.'}
  }
  const logout=async()=>{
    generation.current++;apply({});channel.current?.postMessage('logout')
    await fetch('/api/logout',{method:'POST'}).catch(()=>{})
  }
  return <AuthContext.Provider value={{adminId,isAdmin:role==='admin',isMember:role==='club-member',role,ready,login,logout}}>{children}</AuthContext.Provider>
}
export const useAuth=()=>useContext(AuthContext)
