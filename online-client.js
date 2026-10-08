let token=null;let queue=Promise.resolve();
async function request(path,body){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
 try{const response=await fetch(path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:controller.signal,cache:'no-store'});const data=await response.json();if(!response.ok)throw Error(data.error||'Error del servidor.');return data;}
 catch(e){if(e.name==='AbortError'||e instanceof TypeError)throw Error('No hay conexión con el servidor. Reintenta sin cerrar el juego.');throw e;}finally{clearTimeout(timeout);}
}
export async function detectOnline(){
 // GitHub Pages keeps the independent local demo. All other hosts require the API.
 if(location.hostname.endsWith('.github.io')||location.protocol==='file:'||(location.hostname==='localhost'&&new URLSearchParams(location.search).get('demo')==='1'))return false;
 const result=await request('/api/config');if(result.online!==true)throw Error('Configuración online no disponible.');return true;
}
export async function loginOnline(initData){const data=await request('/api/login',{initData});token=data.token;return data;}
export function readOnline(){return enqueue(()=>request('/api/state'));}
function enqueue(fn){const next=queue.then(fn);queue=next.catch(()=>{});return next;}
export function actOnline(type,fields={}){const body={...fields,type,requestId:crypto.randomUUID()};return enqueue(async()=>{
 // Reuse the key after an ambiguous network failure: the server never applies it twice.
 try{return await request('/api/action',body);}catch(e){if(e.message.startsWith('No hay conexión'))return request('/api/action',body);throw e;}
});}
export async function logoutOnline(){try{await enqueue(()=>request('/api/logout',{}));}finally{token=null;}}
