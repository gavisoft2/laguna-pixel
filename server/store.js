import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {newPlayer,advance,applyAction,publicState} from './game.js';
const testPlayer=now=>({...newPlayer(now),fin:208000,cash:0,pending:0,fish:[],fishCaughtAt:[],testSetup:2});
const digest=token=>createHash('sha256').update(token).digest('hex');
export class Store {
 constructor(pool,{finance=null,official=false,referrals=null}={}){this.pool=pool;this.finance=finance;this.official=official;this.referrals=referrals;}
 async init(){const schema=`
 CREATE TABLE IF NOT EXISTS players (id BIGINT PRIMARY KEY, name TEXT NOT NULL, state JSONB NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions (digest TEXT PRIMARY KEY, player_id BIGINT NOT NULL REFERENCES players(id), expires_at BIGINT NOT NULL);
 CREATE TABLE IF NOT EXISTS actions (player_id BIGINT NOT NULL REFERENCES players(id), request_id TEXT NOT NULL, payload JSONB NOT NULL, created_at BIGINT NOT NULL, PRIMARY KEY(player_id,request_id));
 CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
  ALTER TABLE players ADD COLUMN IF NOT EXISTS official_state JSONB;
  ALTER TABLE players ADD COLUMN IF NOT EXISTS admin_test_state JSONB;
  ALTER TABLE players ADD COLUMN IF NOT EXISTS referrer_id BIGINT REFERENCES players(id);
  CREATE INDEX IF NOT EXISTS players_referrer ON players(referrer_id);
  ALTER TABLE players ADD COLUMN IF NOT EXISTS registered_at BIGINT;
  ALTER TABLE players ADD COLUMN IF NOT EXISTS last_login_at BIGINT;
  ALTER TABLE players ADD COLUMN IF NOT EXISTS last_seen_at BIGINT;
  CREATE TABLE IF NOT EXISTS player_logins(id UUID PRIMARY KEY,player_id BIGINT NOT NULL REFERENCES players(id),created_at BIGINT NOT NULL);
  CREATE INDEX IF NOT EXISTS player_logins_time ON player_logins(created_at);
  CREATE INDEX IF NOT EXISTS players_last_seen ON players(last_seen_at);
 `;for(const sql of schema.split(';').filter(x=>x.trim()))await this.pool.query(sql);}
 async login(user,now=Date.now()){
  const token=randomBytes(32).toString('hex');
  const match=/^ref_([1-9]\d{0,15})$/.exec(user.startParam||''),parent=match?.[1]||null;
  await this.pool.query('INSERT INTO players(id,name,state,referrer_id,registered_at,last_login_at,last_seen_at) VALUES($1,$2,$3,(SELECT id FROM players WHERE id=$4 AND id<>$1),$5,$5,$5) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,last_login_at=EXCLUDED.last_login_at,last_seen_at=EXCLUDED.last_seen_at',[user.id,user.name,JSON.stringify(newPlayer(now)),parent,now]);
  await this.pool.query('INSERT INTO player_logins(id,player_id,created_at) VALUES($1,$2,$3)',[randomUUID(),user.id,now]);
  await this.pool.query('DELETE FROM sessions WHERE expires_at<$1',[now]);
  await this.pool.query('INSERT INTO sessions(digest,player_id,expires_at) VALUES($1,$2,$3)',[digest(token),user.id,now+86400000]);
  return {token,name:user.name,playerId:user.id,official:this.official,...await this.read(user.id,now)};
 }
 async identify(token,now=Date.now()){
  if(typeof token!=='string'||! /^[a-f0-9]{64}$/.test(token))return null;
  const r=await this.pool.query('SELECT player_id FROM sessions WHERE digest=$1 AND expires_at>$2',[digest(token),now]);const id=r.rows[0]?.player_id?.toString()||null;if(id)await this.pool.query('UPDATE players SET last_seen_at=$2 WHERE id=$1 AND (last_seen_at IS NULL OR last_seen_at<$3)',[id,now,now-60000]);return id;
 }
 async logout(token){if(typeof token==='string')await this.pool.query('DELETE FROM sessions WHERE digest=$1',[digest(token)]);}
 async transact(id,body,now,testMode=false){
  const client=await this.pool.connect();try{
   await client.query('BEGIN');const account=this.official&&!testMode?await this.finance.account(client,id):null;
   const row=await client.query('SELECT state,official_state,admin_test_state FROM players WHERE id=$1 FOR UPDATE',[id]);if(!row.rows[0])throw Error('Cuenta no disponible.');
   let input=testMode?row.rows[0].admin_test_state:this.official?row.rows[0].official_state:row.rows[0].state;
   if(testMode&&input?.testSetup!==2)input=testPlayer(now);
   if(!input){input=newPlayer(now);input.fin=0;input.cash=0;input.pending=0;input.fish=[];input.fishCaughtAt=[];}
   if(account){input.fin=Number(account.view_balance);input.cash=Number(account.cash_micros)/1e6;}
   const previousFin=input.fin,previousCash=input.cash;
   let state=advance(input,now),message='';
   if(body){
    if(typeof body.requestId!=='string'||! /^[a-f0-9-]{36}$/.test(body.requestId))throw Error('Identificador de operación inválido.');
    const requestKey=(testMode?'admin-test:':this.official?'official:':'')+body.requestId;
    const old=await client.query('SELECT payload FROM actions WHERE player_id=$1 AND request_id=$2',[id,requestKey]);
    if(old.rows.length){if(JSON.stringify(old.rows[0].payload)!==JSON.stringify(JSON.parse(JSON.stringify(body)))){
      // JSONB changes key order; compare canonical field/value entries instead.
      const canonical=x=>JSON.stringify(Object.entries(x).sort(([a],[b])=>a.localeCompare(b)));
      if(canonical(old.rows[0].payload)!==canonical(body))throw Error('La operación ya existe con otros datos.');
    }message='Operación ya procesada.';}
    else {if(testMode&&body.type==='resetTest'){state=testPlayer(now);message='Pruebas reiniciadas: 208,000 VIEW, sin peces, cebos ni CASH.';}else ({state,message}=applyAction(state,body,now));await client.query('INSERT INTO actions(player_id,request_id,payload,created_at) VALUES($1,$2,$3,$4)',[id,requestKey,JSON.stringify(body),now]);}
   }
   if(account){const viewDelta=state.fin-previousFin,cashDelta=Math.round((state.cash-previousCash)*1e6);if(viewDelta||cashDelta){await client.query('UPDATE finance_accounts SET view_balance=view_balance+$2,cash_micros=cash_micros+$3 WHERE player_id=$1',[id,String(viewDelta),String(cashDelta)]);await this.finance.event(client,id,'game:'+body.requestId,'game_'+body.type,viewDelta,cashDelta,0,now);}if(this.referrals&&body?.type==='collect'&&cashDelta>0)await this.referrals.accrue(client,id,'production:'+id+':'+body.requestId,cashDelta,now);state.cash=(Number(account.cash_micros)+cashDelta)/1e6;}
   await client.query('UPDATE players SET '+(testMode?'admin_test_state':this.official?'official_state':'state')+'=$2 WHERE id=$1',[id,JSON.stringify(state)]);await client.query('COMMIT');return {state:publicState(state),message,testMode};
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }
 read(id,now=Date.now(),testMode=false){return this.transact(id,null,now,testMode);}
 act(id,body,now=Date.now(),testMode=false){return this.transact(id,body,now,testMode);}
}
