import {createHash,randomBytes} from 'node:crypto';
import {newPlayer,advance,applyAction,publicState} from './game.js';
const digest=token=>createHash('sha256').update(token).digest('hex');
export class Store {
 constructor(pool){this.pool=pool;}
 async init(){const schema=`
 CREATE TABLE IF NOT EXISTS players (id BIGINT PRIMARY KEY, name TEXT NOT NULL, state JSONB NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions (digest TEXT PRIMARY KEY, player_id BIGINT NOT NULL REFERENCES players(id), expires_at BIGINT NOT NULL);
 CREATE TABLE IF NOT EXISTS actions (player_id BIGINT NOT NULL REFERENCES players(id), request_id TEXT NOT NULL, payload JSONB NOT NULL, created_at BIGINT NOT NULL, PRIMARY KEY(player_id,request_id));
 CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
 `;for(const sql of schema.split(';').filter(x=>x.trim()))await this.pool.query(sql);}
 async login(user,now=Date.now()){
  const token=randomBytes(32).toString('hex');
  await this.pool.query('INSERT INTO players(id,name,state) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name',[user.id,user.name,JSON.stringify(newPlayer(now))]);
  await this.pool.query('DELETE FROM sessions WHERE expires_at<$1',[now]);
  await this.pool.query('INSERT INTO sessions(digest,player_id,expires_at) VALUES($1,$2,$3)',[digest(token),user.id,now+86400000]);
  return {token,name:user.name,...await this.read(user.id,now)};
 }
 async identify(token,now=Date.now()){
  if(typeof token!=='string'||! /^[a-f0-9]{64}$/.test(token))return null;
  const r=await this.pool.query('SELECT player_id FROM sessions WHERE digest=$1 AND expires_at>$2',[digest(token),now]);return r.rows[0]?.player_id?.toString()||null;
 }
 async logout(token){if(typeof token==='string')await this.pool.query('DELETE FROM sessions WHERE digest=$1',[digest(token)]);}
 async transact(id,body,now){
  const client=await this.pool.connect();try{
   await client.query('BEGIN');const row=await client.query('SELECT state FROM players WHERE id=$1 FOR UPDATE',[id]);if(!row.rows[0])throw Error('Cuenta no disponible.');
   let state=advance(row.rows[0].state,now),message='';
   if(body){
    if(typeof body.requestId!=='string'||! /^[a-f0-9-]{36}$/.test(body.requestId))throw Error('Identificador de operación inválido.');
    const old=await client.query('SELECT payload FROM actions WHERE player_id=$1 AND request_id=$2',[id,body.requestId]);
    if(old.rows.length){if(JSON.stringify(old.rows[0].payload)!==JSON.stringify(JSON.parse(JSON.stringify(body)))){
      // JSONB changes key order; compare canonical field/value entries instead.
      const canonical=x=>JSON.stringify(Object.entries(x).sort(([a],[b])=>a.localeCompare(b)));
      if(canonical(old.rows[0].payload)!==canonical(body))throw Error('La operación ya existe con otros datos.');
    }message='Operación ya procesada.';}
    else {({state,message}=applyAction(state,body,now));await client.query('INSERT INTO actions(player_id,request_id,payload,created_at) VALUES($1,$2,$3,$4)',[id,body.requestId,JSON.stringify(body),now]);}
   }
   await client.query('UPDATE players SET state=$2 WHERE id=$1',[id,JSON.stringify(state)]);await client.query('COMMIT');return {state:publicState(state),message};
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }
 read(id,now=Date.now()){return this.transact(id,null,now);}
 act(id,body,now=Date.now()){return this.transact(id,body,now);}
}
