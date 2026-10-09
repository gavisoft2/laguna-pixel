// Read-only reporting over the official economy. Never return sessions or secrets.
export async function adminReport(pool,section='summary',page=0,now=Date.now()){
 if(!['summary','players','deposits','withdrawals','logins','events'].includes(section))throw Error('Sección inválida.');
 if(!Number.isInteger(page)||page<0||page>100000)throw Error('Página inválida.');
 if(section==='summary'){
  const players=await pool.query('SELECT count(*) AS total,count(*) FILTER(WHERE last_seen_at>=$1) AS active_today,count(*) FILTER(WHERE registered_at>=$1) AS new_today FROM players',[now-86400000]);
  const deposits=await pool.query("SELECT network,status,count(*) AS count,sum(units)::text AS units,sum(view_amount)::text AS view_amount FROM crypto_deposits GROUP BY network,status");
  const withdrawals=await pool.query('SELECT network,status,count(*) AS count,sum(net_units)::text AS units FROM finance_withdrawals GROUP BY network,status');
  return {players:players.rows[0],deposits:deposits.rows,withdrawals:withdrawals.rows,generatedAt:now};
 }
 const queries={
  players:'SELECT p.id::text,p.name,p.registered_at,p.last_login_at,p.last_seen_at,p.referrer_id::text,COALESCE(a.view_balance,0)::text AS view_balance,COALESCE(a.cash_micros,0)::text AS cash_micros,COALESCE(a.held_cash_micros,0)::text AS held_cash_micros,COALESCE(jsonb_array_length(p.official_state->\'fish\'),0) AS fish_count,(SELECT count(*) FROM crypto_deposits d WHERE d.player_id=p.id AND d.status=\'paid\') AS confirmed_deposits FROM players p LEFT JOIN finance_accounts a ON a.player_id=p.id ORDER BY p.last_login_at DESC NULLS LAST,p.id DESC',
  deposits:"SELECT d.*,p.name,r.hash,r.created_at AS confirmed_at FROM crypto_deposits d JOIN players p ON p.id=d.player_id LEFT JOIN crypto_receipts r ON r.reference=d.id AND r.kind='deposit' ORDER BY d.created_at DESC,d.id DESC",
  withdrawals:"SELECT w.*,p.name,r.hash,r.created_at AS paid_at FROM finance_withdrawals w JOIN players p ON p.id=w.player_id LEFT JOIN crypto_receipts r ON r.reference=w.id AND r.kind='withdrawal' ORDER BY w.created_at DESC,w.id DESC",
  logins:'SELECT l.id,l.player_id::text,p.name,l.created_at FROM player_logins l JOIN players p ON p.id=l.player_id ORDER BY l.created_at DESC,l.id DESC',
  events:'SELECT e.*,p.name FROM finance_events e JOIN players p ON p.id=e.player_id ORDER BY e.created_at DESC,e.id DESC'
 };
 const rows=await pool.query(queries[section]+' LIMIT 26 OFFSET $1',[page*25]);return {section,page,hasMore:rows.rows.length>25,rows:rows.rows.slice(0,25),generatedAt:now};
}
