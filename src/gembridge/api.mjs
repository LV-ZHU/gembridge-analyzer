import { HttpJsonClient } from "../core/http.mjs";

export class GemBridgeApi {
  constructor(options={}){this.http=options.http||new HttpJsonClient(options);this.gbbd=(options.gbbdBase||'http://www.ccba.org.cn:9898/api/GBBD').replace(/\/$/,'');this.score=(options.scoreBase||'http://www.ccba.org.cn:18632/api/score').replace(/\/$/,'')}
  async _get(url,opts){return this.http.get(url,opts)}
  handUrl(m){return `${this.gbbd}/Hand/Get/${e(m.section)}/${m.round}/${m.seg??0}/${m.board}`}
  boardResultsUrl(m){return `${this.gbbd}/Board/GetTeamRoundBoards/${e(m.section)}/${m.round}/${m.seg??0}/${m.board}/true`}
  roundMetaUrl(m){return `${this.gbbd}/Round/Get/${e(m.section)}/${m.round}/${m.seg??0}`}
  roundTablesUrl(m,mode=1){return `${this.gbbd}/Table/GetTeamRoundTables/${e(m.section)}/${m.round}/${m.seg??0}/${mode}`}
  roundRanksUrl(m){return `${this.gbbd}/Rank/Team/GetRoundRanks/${e(m.section)}/${m.round}`}
  swissUrl(m,byrank=true){return `${this.gbbd}/Section/GetSwissResult/${e(m.section)}/${m.round}/${byrank?'true':'false'}`}
  datumRoundUrl(m){if(!m.tourStart)throw new Error('Datum API 需要 URL 中的 tourStart');return `${this.score}/datum/round/${e(m.tourStart)}/${e(m.section)}/${m.round}/${m.seg??0}`}
  butlerUrl(m){if(!m.tourStart)throw new Error('Butler API 需要 URL 中的 tourStart');return `${this.score}/butler/section/${e(m.tourStart)}/${e(m.section)}`}
  tournamentUrl(m){if(m.tour==null)throw new Error('Tournament API 需要 tour');return `${this.gbbd}/Tournament/GetByID/${m.tour}`}

  async getHand(m){return this._get(this.handUrl(m))}
  async getBoardResults(m){return this._get(this.boardResultsUrl(m))}
  async getBoard(m){if(m.board==null)throw new Error('单副牌需要 board 参数');const [h,r]=await Promise.all([this.getHand(m),this.getBoardResults(m)]);return {meta:m,hand:h,results:r}}
  async getRoundMeta(m){return this._get(this.roundMetaUrl(m))}
  async getRoundTables(m,{mode=1}={}){return this._get(this.roundTablesUrl(m,mode))}
  async getRoundRanks(m){return this._get(this.roundRanksUrl(m))}
  async getSwiss(m,{byrank=true}={}){return this._get(this.swissUrl(m,byrank))}
  async getDatumRound(m){return this._get(this.datumRoundUrl(m))}
  async getButler(m){return this._get(this.butlerUrl(m))}
  async getTournament(m){return this._get(this.tournamentUrl(m))}
}
function e(x){return encodeURIComponent(String(x))}
