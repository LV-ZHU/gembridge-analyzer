import { fmt, pct, signed } from "../core/utils.mjs";

export function boardMarkdown(board,a,{reveal=true,seat=null}={}){
  const h=board.hand,L=[];L.push(`# R${h.round} B${h.board}`,'',`- 发牌：${h.dealer||'?'}`,`- 局况：${h.vulnerability??'?'}`,`- 点力：NS ${a.hcp.NS} / EW ${a.hcp.EW}`,`- 配合：${a.fits.length?a.fits.map(f=>`${f.side} ${f.strain} ${f.length}张`).join('；'):'没有8张以上配合'}`,`- Par：${h.par.contracts.join(' / ')||'未知'}；NS视角 ${signed(h.par.scoreNS)}`,'');
  L.push('## 手牌');for(const d of ['N','E','S','W']){if(seat&&d!==seat)continue;const x=h.hands[d];L.push(`- **${d} (${x.hcp??'?'} HCP)** ♠${x.S||'-'} ♥${x.H||'-'} ♦${x.D||'-'} ♣${x.C||'-'}`)}
  L.push('','## 先看这副牌');for(const q of questions(a,h))L.push(`- ${q}`);
  if(a.manual){L.push('','## 人工补录');if(a.manual.system)L.push(`- 体系：${a.manual.system}`);if(a.manual.auction?.length)L.push(`- 叫牌：${a.manual.auction.join(' – ')}`);if(a.manual.openingLead)L.push(`- 首攻：${a.manual.openingLead}`);for(const x of a.manual.play||[])L.push(`- ${x}`);if(a.manual.notes)L.push(`- ${a.manual.notes}`)}
  L.push('','## Double Dummy','|庄家|♣|♦|♥|♠|NT|','|---|---:|---:|---:|---:|---:|');for(const d of ['N','E','S','W']){const x=h.doubleDummyTricks[d];L.push(`|${d}|${x.C}|${x.D}|${x.H}|${x.S}|${x.NT}|`)}
  if(!reveal){L.push('','全场结果暂时隐藏。先做自己的叫牌或定约判断，再去掉 `--no-reveal`。');return L.join('\n')}
  if(a.slamOpportunities?.length){L.push('','## 满贯机会','|方向|DD可成的满贯|Par满贯|实战到满贯|','|---|---|---|---:|');for(const x of a.slamOpportunities){const dd=x.ddSlams.map(y=>contractName(y.contract)).join('、');const par=x.parSlams.length?x.parSlams.map(y=>humanContract(y.display)).join(' / '):'—';L.push(`|${x.side}|${dd}|${par}|${x.fieldSlamCount}/${x.fieldContractCount}|`)}}
  L.push('','## 场上怎么选','|落点|次数|占比|','|---|---:|---:|');for(const r of a.destinations.slice(0,18))L.push(`|${r.key}|${r.count}|${pct(r.pct)}|`);
  L.push('','## 具体结果','|结果|次数|占比|','|---|---:|---:|');for(const r of a.exactResults.slice(0,18))L.push(`|${r.key}|${r.count}|${pct(r.pct)}|`);
  L.push('','## 这副主要看什么');if(a.notes.length)for(const n of a.notes)L.push(`- ${n}`);else L.push('- 场上结果比较集中，没有明显的结构性分歧。');
  L.push('','## 数据',`- 有效结果：${a.fieldResultCount} 个 room，其中 ${a.playedResultCount} 个实际定约、${a.noPlayCount} 个 NoPlay。`,`- 定约高度：${a.gameCount}/${a.playedResultCount} 到成局高度，其中 ${a.madeGameCount} 个完成；满贯 ${a.slamCount}；加倍/红加倍 ${a.doubleCount}。`,`- xIMP：均值 ${fmt(a.ximp.mean)}，中位数 ${fmt(a.ximp.median)}，范围 ${fmt(a.ximp.min)} ~ ${fmt(a.ximp.max)}。`,`- 复盘优先级：${a.studyValue.label}（${a.studyValue.score}/100，启发式筛牌指标）。`);
  if(a.dataQuality){
    const q=a.dataQuality;
    L.push(`- 数据校验：${q.status==='ok'?'通过':q.status==='warning'?'有警告':'发现错误'}（${q.summary.checks} 项检查，${q.summary.errors} 个错误，${q.summary.warnings} 个警告）。`);
    for(const issue of q.issues.slice(0,3))L.push(`  - ${issue.path}：${issue.message}`);
  }
  if(a.excludedResultCount)L.push(`- 另有 ${a.excludedResultCount} 条空白、phantom 或调整占位记录，仅保留诊断，不计入分布和技术比例。`);
  if(a.openingLeads.count){L.push('','## 首攻数据',`API 中 ${a.openingLeads.count}/${a.playedResultCount} 个实际定约有首攻。`,'|首攻|次数|','|---|---:|');for(const x of a.openingLeads.distribution.slice(0,10))L.push(`|${x.key}|${x.count}|`)}
  L.push('','## xIMP较极端的结果','|桌|室|定约|NS分|Datum差|xIMP|','|---:|---:|---|---:|---:|---:|');for(const r of a.outliers)L.push(`|${r.table}|${roomLabel(r)}|${r.contract}|${signed(r.scoreNS)}|${signed(r.datumDifference)}|${signed(r.ximp)}|`);return L.join('\n')
}
function questions(a,h){
  const q=[];
  const slam=a.slamOpportunities?.find(x=>x.parSlams.length)||a.slamOpportunities?.[0];
  const makeableSides=['NS','EW'].filter(side=>a.makeableGames?.[side]?.length);
  if(slam){
    const par=slam.parSlams[0];
    const ceiling=slam.ddSlams.map(x=>contractName(x.contract)).join('、');
    q.push(`${slam.side} 合计 ${a.hcp[slam.side]} HCP，${par?`Par 却是 ${humanContract(par.display)}`:`DD 却显示可做成 ${ceiling}`}；哪些牌型、配合和控制价值不能由点力直接看出？`);
    const fieldGap=slam.fieldContractCount?`实战只有 ${slam.fieldSlamCount}/${slam.fieldContractCount} 到满贯`:'实战没有该方做庄样本';
    q.push(`DD 显示 ${slam.side} 有 ${ceiling}，而${fieldGap}；叫牌中怎样确认将牌配合并区分小满贯与大满贯？`);
    const other=slam.side==='NS'?'EW':'NS',otherFit=a.fits.find(f=>f.side===other);
    if(otherFit)q.push(`${other} 有 ${otherFit.length} 张${name(otherFit.strain)}配合；如果 ${slam.side} 继续探索满贯，${other} 的竞争会怎样影响判断？`);
  }else if(makeableSides.length===1){
    const side=makeableSides[0],other=side==='NS'?'EW':'NS',games=a.makeableGames[side].map(contractName).join('、');
    const alternatives=a.destinations.filter(x=>x.key.startsWith(`${side} `)&&!a.makeableGames[side].some(game=>x.key.includes(game))).map(x=>contractName(x.key.replace(`${side} `,''))).slice(0,2);
    q.push(alternatives.length?`${side} 双明手有 ${games}；${games} 和 ${alternatives.join('、')} 哪个定约更合理？`:`${side} 双明手有 ${games}，实战叫牌中怎样确认成局实力并选择定约？`);
    const otherFit=a.fits.find(f=>f.side===other);
    if(otherFit)q.push(`${other} 有 ${otherFit.length} 张${name(otherFit.strain)}配合；如果 ${side} 叫到成局，${other} 应该竞争到什么高度？`);
  }else{
    q.push(`在 ${h.dealer} 发牌、${h.vulnerability} 局况下，双方最可能争夺到什么高度？`);
    for(const f of a.fits.slice(0,2))q.push(`${f.side} 有 ${f.length} 张${name(f.strain)}配合，点力和牌型支持邀请、成局，还是只适合竞争？`);
  }
  const sacrifice=a.sacrificeCandidates?.[0];
  if(sacrifice){
    if(sacrifice.doubled)q.push(`${humanContract(sacrifice.contract)} 被加倍后，宕几墩仍比放打对方成局划算？`);
    else q.push(`${humanContract(sacrifice.contract)} 未被加倍，${sacrifice.side} 只付出 ${Math.abs(sacrifice.scoreForSide)} 分；这是可重复的牺牲判断，还是对方没有处罚到位？`);
  }
  if(a.ddBySide.NS.NT>=9)q.push('DD里NS有3NT，但实战是否有足够信息叫到成局？');
  q.push('如果只看自己一手牌，你会优先描述牌型、邀局、逼局，还是先处理竞争？');
  return q.slice(0,5)
}
function name(s){return({S:'黑桃',H:'红心',D:'方块',C:'梅花'})[s]||s}
function contractName(s){return String(s).replace(/(\d)(C|D|H|S|NT)/,(_,level,strain)=>`${level}${({C:'♣',D:'♦',H:'♥',S:'♠',NT:'NT'})[strain]}`)}
function humanContract(s){return String(s).replace(/(\d)(C|D|H|S|NT)/,(_,level,strain)=>contractName(`${level}${strain}`))}
function roomLabel(r){return r.sameResultInBothRooms?`${r.room}（两室相同）`:r.room}

export function matchMarkdown(a){const L=[`# R${a.round} · ${a.table}桌`,'',`${a.teamA.name} vs ${a.teamB.name}`,'',`最终：**${a.final.teamAImp}–${a.final.teamBImp} IMP**，**${fmt(a.final.teamAVp)}–${fmt(a.final.teamBVp)} VP**。`,'','## 比分怎么形成的','|牌|A队得失IMP|开室/room1|闭室/room2|原因|累计|','|---:|---:|---|---|---|---|'];for(const b of a.boards)L.push(`|B${b.board}|${signed(b.teamAGain)}|${b.room1.contract} (${signed(b.room1.scoreNS)})|${b.room2.contract} (${signed(b.room2.scoreNS)})|${b.cause}|${b.cumulative.teamA}-${b.cumulative.teamB}|`);L.push('','## 大摆幅');for(const b of a.topSwings)L.push(`- B${b.board}：${signed(b.teamAGain)} IMP，${b.cause}。`);if(a.leadChanges)L.push(`- 按牌号累计，领先方变化 ${a.leadChanges} 次。`);if(!a.validation.netMatches)L.push(`- 程序按逐副结果累计为 ${a.validation.derivedTeamA}-${a.validation.derivedTeamB}，与官方 ${a.validation.officialTeamA}-${a.validation.officialTeamB} 不一致；优先以官方比分为准。`);return L.join('\n')}

export function standingsMarkdown(a,round){const L=[`# 第${round}轮后排名`,'','|名次|队号|队名|VP|IMP.Q|平均对手分|罚分|','|---:|---:|---|---:|---:|---:|---:|'];for(const x of a.rows)L.push(`|${x.rank}|${x.teamNo}|${x.teamName}|${fmt(x.vps)}|${fmt(x.impQ,4)}|${fmt(x.avgVsVp,4)}|${fmt(x.penalty)}|`);if(a.penalties.length){L.push('','## 有罚分的队');for(const x of a.penalties)L.push(`- ${x.teamName}：${fmt(x.penalty)}。`)}if(a.tiedScores.length){L.push('','## 同VP需要看tie-break的情况');for(const g of a.tiedScores.slice(0,10))L.push(`- ${fmt(g.score)} VP：${g.teams.map(x=>`${x.rank}.${x.name}(IMP.Q ${fmt(x.impQ,4)})`).join('；')}`)}return L.join('\n')}

export function butlerMarkdown(a){const L=['# Butler','',`数据更新时间：${a.updatedAt||'未知'}`,'','## 原始Butler前15','|名次|牌手|队伍|XIMP|副数|Butler|AOB|修正Butler|','|---:|---|---|---:|---:|---:|---:|---:|'];for(const x of a.topRaw)L.push(`|${x.rank}|${x.name}|${x.team}|${x.ximps}|${x.boards}|${fmt(x.butler,3)}|${fmt(x.aob,3)}|${fmt(x.correctButler,3)}|`);L.push('','## 按修正Butler重排','|重排名次|牌手|原排名|修正Butler|变化|','|---:|---|---:|---:|---:|');for(const x of a.topCorrected)L.push(`|${x.correctedRank}|${x.name}|${x.rank}|${fmt(x.correctButler,3)}|${signed(x.rank-x.correctedRank)}|`);L.push('','样本副数差异很大时，别只盯单个排名。');return L.join('\n')}

export function playerMarkdown(a){const L=[`# ${a.name||a.memberNo}`,'',`- 队伍：${a.team||'未知'}`,`- 总XIMP：${signed(a.totalXimp)}，${a.boardCount} 副，平均 ${fmt(a.averageXimp,3)}。`];if(a.butler)L.push(`- Butler：${fmt(a.butler.butler,3)}；AOB ${fmt(a.butler.aob,3)}；修正 ${fmt(a.butler.correctButler,3)}；官方排名 ${a.butler.rank}。`);L.push('','## 各轮','|轮次|桌|室|位置|搭档|XIMP|副数|','|---:|---:|---:|---|---|---:|---:|');for(const r of a.rounds)L.push(`|R${r.round}|${r.table}|${r.room}|${r.position}|${r.partner?.name||''}|${signed(r.totalXimp)}|${r.boards}|`);L.push('','## 最好与最差的牌');for(const x of a.bestBoards.slice(0,5))L.push(`- R${x.round} B${x.board}：${signed(x.ximp)} xIMP`);for(const x of a.worstBoards.slice(0,5))L.push(`- R${x.round} B${x.board}：${signed(x.ximp)} xIMP`);return L.join('\n')}

export function teamMarkdown(a){const L=[`# ${a.teamName}`,'',`- 最终/当前排名：${a.finalRank}`,`- VP：${fmt(a.totalVp)}；IMP.Q ${fmt(a.impQ,4)}；平均对手分 ${fmt(a.avgVsVp,4)}。`,`- 平均每轮 ${fmt(a.avgVp)} VP；轮间标准差 ${fmt(a.vpStdev)}。`,'','## 每轮','|轮次|对手号|IMP|VP|累计VP|排名|桌号|','|---:|---:|---|---:|---:|---:|---:|'];for(const r of a.trajectory)L.push(`|R${r.round}|${r.opponentNo}|${r.imps}-${r.vsImps}|${fmt(r.vp)}|${fmt(r.cumulativeVp)}|${r.rank??''}|${r.table??''}|`);if(a.keyBoards.length){L.push('','## 对本队影响最大的牌');for(const b of a.keyBoards.slice(0,10))L.push(`- R${b.round} B${b.board}：${signed(b.teamAGain)} IMP（以该轮room1 NS队为正方向；team命令内部已选取本队比赛）。`)}return L.join('\n')}

export function roundMarkdown(a){const L=[`# 第${a.round}轮`];if(a.meta?.start)L.push('',`${a.meta.start} – ${a.meta.end}，${a.meta.lengthMinutes??'?'} 分钟。`);L.push('','## 比分最大的几场');for(const m of a.largestWins.slice(0,8))L.push(`- ${m.table}桌：${m.a} ${m.aImp}-${m.bImp} ${m.b}（${fmt(m.aVp)}-${fmt(m.bVp)} VP）`);if(a.boardImpact.length){L.push('','## 本轮波动最大的牌','|牌|平均绝对IMP|最大IMP|10+ IMP场次|打平场次|复盘分|','|---:|---:|---:|---:|---:|---:|');for(const b of a.boardImpact.slice(0,12))L.push(`|B${b.board}|${fmt(b.avgAbsImp)}|${b.maxAbsImp}|${b.tenPlus}|${b.flat}|${b.studyScore}|`)}return L.join('\n')}

export function eventMarkdown(a){const L=['# 赛事概览','','## 当前/最终前15','|名次|队伍|VP|IMP.Q|','|---:|---|---:|---:|'];for(const x of a.finalTop)L.push(`|${x.rank}|${x.teamName}|${fmt(x.vps)}|${fmt(x.impQ,4)}|`);if(a.biggestClimbers.length){L.push('','## 排名变化');for(const x of a.biggestClimbers.slice(0,5))L.push(`- ${x.teamName}：${x.startRank} → ${x.rank}`);for(const x of a.biggestDrops.slice(0,5))L.push(`- ${x.teamName}：${x.startRank} → ${x.rank}`)}if(a.mostVolatileBoards.length){L.push('','## 各轮最容易出大分的牌');for(const x of a.mostVolatileBoards.slice(0,12))L.push(`- R${x.round} B${x.board}：平均绝对摆幅 ${fmt(x.avgAbsImp)} IMP，最大 ${x.maxAbsImp} IMP。`)}if(a.butler.topRaw.length){L.push('','## Butler前列');for(const x of a.butler.topRaw.slice(0,8))L.push(`- ${x.rank}. ${x.name}（${x.team}）：${fmt(x.butler,3)}，修正 ${fmt(x.correctButler,3)}。`)}return L.join('\n')}
