export const paymentRates={gram:{rate:13000,min:.1},usdt:{rate:10000,min:1}};
function validate(network,amount){const c=paymentRates[network];if(!c||!Number.isFinite(amount)||amount<c.min)throw Error('Importe o red inválidos');return c;}
export function depositQuote(network,amount,first=false){const c=validate(network,amount);const base=Math.round(amount*c.rate);const bonus=network==='usdt'&&first?Math.round(base*.2):0;return {base,bonus,total:base+bonus};}
export function withdrawQuote(network,amount){const c=validate(network,amount);return {cash:Math.round(amount*c.rate),amount};}
