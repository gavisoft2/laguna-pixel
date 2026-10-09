const apiBase=location.hostname==='gavisoft2.github.io'?'https://aqua-view.onrender.com':'';
let token=null;let queue=Promise.resolve();
export let testMode=false;
export function switchTestMode(enabled){return enqueue(async()=>{const data=await request(enabled?'/api/admin/test/state':'/api/state');testMode=enabled;return data;});}
export let serverConfig={official:false,paymentsEnabled:false};
export function financeOnline(route,body){return enqueue(async()=>{try{return await request('/api/finance/'+route,body);}catch(e){if(body&&e.message.startsWith('No hay conexión'))return request('/api/finance/'+route,body);throw e;}});}
export function groupTaskOnline(claim=false){return enqueue(()=>request('/api/tasks/group'+(claim?'/claim':''),claim?{}:undefined));}
export function discoverGroupOnline(){return enqueue(()=>request('/api/tasks/group/discover'));}
export function referralsOnline(collect=false){return enqueue(()=>request('/api/referrals'+(collect?'/collect':''),collect?{}:undefined));}
async function request(path,body,timeoutMs=15000){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),timeoutMs);
 try{const response=await fetch(apiBase+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:controller.signal,cache:'no-store'});if(!response.headers.get('content-type')?.includes('application/json'))throw Error('El servidor está iniciando.');const data=await response.json();if(!response.ok)throw Error(data.error||'Error del servidor.');return data;}
 catch(e){if(e.name==='AbortError'||e instanceof TypeError)throw Error('No hay conexión con el servidor. Reintenta sin cerrar el juego.');throw e;}finally{clearTimeout(timeout);}
}
export async function detectOnline(onProgress=()=>{}){
 if(location.protocol==='file:'||(location.hostname==='localhost'&&new URLSearchParams(location.search).get('demo')==='1'))return false;
 const deadline=Date.now()+90000;onProgress('Conectando con Aqua View…');
 while(Date.now()<deadline){try{const result=await request('/api/config',undefined,Math.min(15000,Math.max(1,deadline-Date.now())));if(result.online!==true)throw Error('Configuración online no disponible.');serverConfig=result;onProgress('Conectado. Tu aventura está lista.');return true;}
 catch{if(Date.now()>=deadline)break;onProgress('Preparando tu estanque… Entraremos automáticamente cuando el servidor esté listo.');await new Promise(resolve=>setTimeout(resolve,1500));}}
 const message='No pudimos conectar todavía. Pulsa Entrar para reintentar sin actualizar la página.';onProgress(message);throw Error(message);
}
export async function loginOnline(initData){const data=await request('/api/login',{initData});token=data.token;return data;}
export function readOnline(){const path=testMode?'/api/admin/test/state':'/api/state';return enqueue(()=>request(path));}
function enqueue(fn){const next=queue.then(fn);queue=next.catch(()=>{});return next;}
export function actOnline(type,fields={}){const path=testMode?'/api/admin/test/action':'/api/action',body={...fields,type,requestId:crypto.randomUUID()};return enqueue(async()=>{
 // Reuse the key after an ambiguous network failure: the server never applies it twice.
 try{return await request(path,body);}catch(e){if(e.message.startsWith('No hay conexión'))return request(path,body);throw e;}
});}
export async function logoutOnline(){try{await enqueue(()=>request('/api/logout',{}));}finally{token=null;testMode=false;}}

export function adminOnline(section='summary',page=0){return enqueue(()=>request('/api/admin/reports?section='+encodeURIComponent(section)+'&page='+page));}
