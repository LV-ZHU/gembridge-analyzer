export function cardCount(s){const v=String(s??'').trim();return !v||v==='-'?0:v.length}
export function sideFits(hands){
  const out=[];for(const [side,dirs] of [['NS',['N','S']],['EW',['E','W']]])for(const strain of ['S','H','D','C']){const length=dirs.reduce((n,d)=>n+cardCount(hands[d]?.[strain]),0);if(length>=8)out.push({side,strain,length})}return out.sort((a,b)=>b.length-a.length||a.side.localeCompare(b.side));
}
export function shape(hand){return ['S','H','D','C'].map(s=>cardCount(hand?.[s]));}
