import * as echarts from 'echarts';
import { AllCommunityModule, ModuleRegistry, createGrid, type ColDef, themeQuartz } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { DATA } from './data';
import { getCurrentUser, signInWithMagicLink, signOut } from './services/auth';
import { adminOverridePick, adminProvisionProfile, adminUpdateResult, loadAdminAuditLog, loadLiveLeague, submitPick, type LiveLeagueData } from './services/league';
import { supabase, supabaseConfigured } from './services/supabase';
import './style.css';

ModuleRegistry.registerModules([AllCommunityModule]);

type Team = keyof typeof DATA.teamRace;
type Player = keyof typeof DATA.playerRace;
const teams = Object.keys(DATA.teamRace) as Team[];
const players = DATA.players as Player[];
const races = DATA.races;
const teamMeta: Record<Team, { name:string; color:string }> = {
  mercedes:{name:'Mercedes',color:'#27F4D2'}, ferrari:{name:'Ferrari',color:'#E8002D'}, redbull:{name:'Red Bull',color:'#3671C6'},
  mclaren:{name:'McLaren',color:'#FF8000'}, racingbulls:{name:'Racing Bulls',color:'#6692FF'}, alpine:{name:'Alpine',color:'#FF87BC'},
  audi:{name:'Audi',color:'#B6BABD'}, haas:{name:'Haas',color:'#E8E8E8'}, williams:{name:'Williams',color:'#64C4FF'},
  cadillac:{name:'Cadillac',color:'#D4AF37'}, astonmartin:{name:'Aston Martin',color:'#229971'},
};
const playerColors = ['#E8002D','#FF8000','#FFD12E','#27F4D2','#3671C6','#6692FF','#B38AFF','#FF87BC','#229971','#64C4FF','#B6BABD','#E8E8E8','#D4AF37'];
const playerColor = Object.fromEntries(players.map((p, i) => [p, playerColors[i % playerColors.length]]));
const value = (v: number | null) => v ?? 0;
const total = Object.fromEntries(players.map(p => [p, DATA.playerRace[p].reduce<number>((sum, score) => sum + value(score), 0)])) as Record<Player, number>;
const order = [...players].sort((a,b) => total[b] - total[a]);
const cumulative = Object.fromEntries(players.map(p => { let running = 0; const scores = DATA.playerRace[p].map(score => { running += value(score); return running; }); return [p, scores]; })) as Record<Player, number[]>;
const rankAt = (raceIndex: number, player: Player) => [...players].sort((a,b) => cumulative[b][raceIndex] - cumulative[a][raceIndex]).indexOf(player) + 1;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (text: string) => text.replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]!));

document.querySelector('#app')!.innerHTML = `
  <header class="top"><nav class="nav"><span class="brand"><span class="mark"></span>F1 GAME 2026</span>
    <a href="#leaderboard">Leaderboard</a><a href="#title-race">Title race</a><a href="#player">Players</a><a href="#constructors">Constructors</a><a href="#my-pick">My pick</a>
    <span id="nav-auth" style="margin-left:auto"></span></nav></header>
  <main>
    <div class="hero"><p class="eyebrow">Private fantasy league · Phase 1 dashboard</p><h1>F1 Game 2026 <span>fantasy league</span></h1>
      <p>13 players. 11 constructors. Each race week, pick one team: your score is the sum of its two drivers' finishing points.</p>
      <div class="chips"><span class="chip" id="data-mode"><i class="dot" style="background:var(--warn)"></i>Demo analytics</span><span class="chip"><i class="dot" style="background:var(--good)"></i>17 races scored</span><span class="chip"><i class="dot" style="background:#6692FF"></i>23-race season</span></div>
    </div>
    <section id="leaderboard"><h2>Leaderboard</h2><p class="sub" id="leaderboard-sub">Demo standings from the original prototype dataset.</p><div class="card"><div id="leaderboard-grid" class="ag-theme-quartz-dark" style="height:465px;width:100%"></div></div></section>
    <section id="title-race"><h2>The title race</h2><p class="sub">Cumulative points across the scored races. Select a line in the legend to focus on a player.</p><div class="card"><div id="cumulative-chart" class="chart tall"></div></div></section>
    <section id="player"><h2>Player deep dive</h2><p class="sub">Per-race scoring, championship rank, and constructor usage against the 9×2 + 2×3 rule.</p><select class="control" id="player-select"></select><div class="statgrid" id="player-stats"></div><div class="grid2"><div class="card"><h3>Points per race</h3><div id="player-race-chart" class="chart"></div></div><div class="card"><h3>Championship rank per race</h3><div id="player-rank-chart" class="chart"></div></div></div><div class="card" style="margin-top:20px"><h3>Constructor usage</h3><div id="usage-list"></div></div></section>
    <section id="constructors"><h2>Constructors</h2><p class="sub">Compare team strength and see how the league has distributed its picks.</p><div class="grid2"><div class="card"><h3>Season average points per race</h3><div id="avg-chart" class="chart"></div></div><div class="card"><h3>Team points by race</h3><select class="control" id="race-select"></select><div id="race-team-chart" class="chart"></div></div></div><div class="card" style="margin-top:20px"><h3>Picks per race</h3><div id="picks-chart" class="chart tall"></div><p class="muted">Stacked counts of how many players picked each constructor each race.</p></div></section>
    <section id="my-pick"><h2>My pick</h2><p class="sub">Sign in with an invited email address. Picks are submitted against the live 2026 schedule and validated by Supabase.</p><div class="card" id="login-card"><h3>Log in</h3><p class="muted" id="login-help">${supabaseConfigured ? 'We will email you a secure magic link. No password is required.' : 'Supabase is not configured; this is a local prototype session.'}</p><div class="loginrow"><input class="inp" id="login-email" type="email" placeholder="you@example.com" autocomplete="email"><button class="btn" id="login-btn">${supabaseConfigured ? 'Email me a link' : 'Log in'}</button></div><p class="muted" id="login-error" style="display:none;color:var(--accent2)"></p></div><div id="pick-ui" style="display:none"><div class="card"><h3 id="next-race-title"></h3><p class="sub" id="lock-info"></p><div id="team-grid" class="pickgrid"></div><div class="loginrow"><button class="btn" id="submit-pick">Submit pick</button><span class="muted" id="pick-status"></span></div></div><div class="card history-card"><h3>My pick history</h3><p class="muted">Your submitted constructors and scored points. Picks remain private until their race starts.</p><div class="table-scroll"><table><thead><tr><th>Race</th><th>Constructor</th><th>Status</th><th class="num">Points</th></tr></thead><tbody id="pick-history"><tr><td colspan="4" class="muted">Loading live picks…</td></tr></tbody></table></div><div id="pick-usage" class="usage-summary"></div></div></div></section>
    <section id="admin-panel" style="display:none"><h2>Admin control room</h2><p class="sub">Private tools for provisioning members, correcting published results, and managing exceptional pick changes. Every mutation uses an admin-only RPC and writes an audit record.</p><div class="admin-grid"><div class="card"><h3>League members</h3><p class="muted">Invite the email in Supabase Auth first, then paste its user UUID here to link it to the league.</p><div class="form-stack"><label>Auth user UUID<input class="inp wide" id="admin-member-user-id" placeholder="00000000-0000-0000-0000-000000000000"></label><div class="form-row"><label>Display name<input class="inp" id="admin-member-name" placeholder="Player name"></label><label>Role<select class="control" id="admin-member-role"><option value="player">Player</option><option value="admin">Admin</option></select></label></div><label>Reason<input class="inp wide" id="admin-member-reason" placeholder="Invitation or role assignment reason"></label><button class="btn" id="admin-member-save">Provision member</button><span class="muted" id="admin-member-status"></span></div><div class="table-scroll" style="margin-top:16px"><table><thead><tr><th>Member</th><th>Role</th><th>Joined</th></tr></thead><tbody id="admin-members"></tbody></table></div></div><div class="card"><h3>Race schedule</h3><div class="table-scroll"><table><thead><tr><th>Round</th><th>Race</th><th>Start</th><th>Status</th></tr></thead><tbody id="admin-schedule"></tbody></table></div></div><div class="card"><h3>Edit driver result</h3><div class="form-stack"><label>Race<select class="control" id="admin-result-race"></select></label><label>Driver<select class="control" id="admin-result-driver"></select></label><div class="form-row"><label>Position<input class="inp" id="admin-result-position" type="number" min="1" max="22" placeholder="—"></label><label>Status<select class="control" id="admin-result-status"><option value="finished">Finished</option><option value="dnf">DNF</option><option value="dns">DNS</option><option value="dsq">DSQ</option></select></label></div><label>Reason<input class="inp wide" id="admin-result-reason" placeholder="Required audit reason"></label><button class="btn" id="admin-result-save">Save result correction</button><span class="muted" id="admin-result-status-message"></span></div></div><div class="card"><h3>Override a pick</h3><div class="form-stack"><label>Player<select class="control" id="admin-pick-player"></select></label><label>Race<select class="control" id="admin-pick-race"></select></label><label>Constructor<select class="control" id="admin-pick-constructor"></select></label><label>Reason<input class="inp wide" id="admin-pick-reason" placeholder="Required audit reason"></label><button class="btn" id="admin-pick-save">Save pick override</button><span class="muted" id="admin-pick-status-message"></span></div></div><div class="card"><h3>Audit history</h3><div class="table-scroll"><table><thead><tr><th>When</th><th>Action</th><th>Entity</th><th>Reason</th></tr></thead><tbody id="admin-audit"></tbody></table></div></div></div></section>
    <section id="scoring"><h2>Scoring system</h2><p class="sub">The exact formula used by the dashboard, computed from the imported race results.</p><div class="formula"><div class="fcard"><div class="big">23 − position</div><div class="cap">1st = 22 points, 2nd = 21 … 22nd = 1.</div></div><div class="fcard"><div class="big">0 points</div><div class="cap">DNF, DNS, and disqualification score zero.</div></div><div class="fcard"><div class="big">Driver A + B</div><div class="cap">Team score is the sum of both drivers.</div></div></div><div class="card"><h3>Worked example</h3><select class="control" id="demo-race"></select><div class="table-scroll"><table><thead><tr><th>Pos</th><th>Driver</th><th>Constructor</th><th>Status</th><th class="num">Points</th></tr></thead><tbody id="demo-body"></tbody></table></div><div id="demo-teams" style="margin-top:16px"></div><div class="note" id="demo-note" style="display:none"></div></div></section>
  </main>`;

const chart = (id: string, option: echarts.EChartsOption) => { const instance = echarts.init($(id)); instance.setOption(option); window.addEventListener('resize', () => instance.resize()); return instance; };
const axis = { axisLabel:{ color:'#8f99ad' }, axisLine:{ lineStyle:{ color:'#253049' } }, splitLine:{ lineStyle:{ color:'rgba(38,48,73,.55)' } } };

const leaderboardGrid = createGrid($('leaderboard-grid'), { theme: themeQuartz.withParams({ backgroundColor:'#121826', foregroundColor:'#eaeef5', borderColor:'#253049', headerBackgroundColor:'#171f30', headerTextColor:'#8f99ad' }), rowData: order.map((player, i) => ({ rank:i+1, player, points:total[player], behind:i ? total[player] - total[order[0]] : 0, average:(total[player]/races.length).toFixed(1), missed:DATA.dns[player] ?? 0 })), columnDefs: [
  { field:'rank', headerName:'#', width:72, cellClass: p => p.value === 1 ? 'rank1' : '' }, { field:'player', headerName:'Player', flex:1 }, { field:'points', headerName:'Points', width:110, type:'numericColumn' }, { field:'behind', headerName:'Behind', width:110, valueFormatter:p => p.value === 0 ? '—' : String(p.value) }, { field:'average', headerName:'Avg / race', width:120 }, { field:'missed', headerName:'Missed', width:95 },
] as ColDef[], defaultColDef:{ sortable:true, resizable:true }, animateRows:true });

let liveLeague: LiveLeagueData | null = null;
let activeLiveRaceId: number | null = null;
let selectedConstructorId: number | null = null;
function renderLiveLeaderboard(data: LiveLeagueData) {
  const liveRows = data.standings.map((standing, index) => ({
    rank: index + 1,
    player: standing.display_name ?? 'Unnamed player',
    points: standing.points ?? 0,
    behind: index ? (standing.points ?? 0) - (data.standings[0]?.points ?? 0) : 0,
    average: data.races.length ? ((standing.points ?? 0) / data.races.length).toFixed(1) : '0.0',
    missed: Math.max(0, data.races.length - (standing.picks_submitted ?? 0)),
  }));
  leaderboardGrid.setGridOption('rowData', liveRows);
  if (liveRows.length === 0) leaderboardGrid.showNoRowsOverlay();
  $('leaderboard-sub').textContent = liveRows.length
    ? `Live Supabase standings across ${data.races.filter((race) => race.status === 'completed').length} completed races.`
    : 'The season is loaded. League member profiles will appear here after they are invited and added.';
  $('data-mode').innerHTML = '<i class="dot" style="background:var(--good)"></i>Live Supabase data';
}

function renderLiveAnalytics(data: LiveLeagueData) {
  if (!data.standings.length) return;
  const raceById = new Map(data.races.map((race) => [race.id, race]));
  const constructorById = new Map(data.constructors.map((constructor) => [constructor.id, constructor]));
  const scoredRaces = data.races.filter((race) => race.status === 'completed').sort((a, b) => a.round_number - b.round_number);
  const scoreFor = (raceId: number, constructorId: number) => data.playerRaceScores
    .find((score) => score.race_id === raceId && score.constructor_id === constructorId)?.points ?? 0;
  const livePlayers = data.standings.map((standing) => standing.display_name ?? 'Unnamed player');
  const scoreRows = new Map<string, number>();
  for (const score of data.playerRaceScores) scoreRows.set(`${score.player_id}:${score.race_id}`, score.points ?? 0);

  const liveCumulative = data.standings.map((standing) => {
    let running = 0;
    return {
      name: standing.display_name ?? 'Unnamed player',
      type: 'line' as const,
      smooth: true,
      showSymbol: false,
      lineStyle: { color: playerColor[standing.display_name as Player] ?? '#8f99ad', width: 2 },
      data: scoredRaces.map((race) => { running += scoreRows.get(`${standing.player_id}:${race.id}`) ?? 0; return running; }),
    };
  });
  const cumulativeChart = chart('cumulative-chart', { tooltip:{ trigger:'axis' }, legend:{ type:'scroll', bottom:0, textStyle:{ color:'#8f99ad' } }, grid:{ left:45,right:20,top:20,bottom:75 }, xAxis:{ type:'category', data:scoredRaces.map((race) => race.name), axisLabel:{ color:'#8f99ad', rotate:40 } }, yAxis:{ type:'value', ...axis }, series:liveCumulative });
  cumulativeChart.resize();
  $('title-race').querySelector('.sub')!.textContent = 'Live cumulative points from submitted picks and published race results.';

  const liveConstructorRows = data.constructors.map((constructor) => ({
    constructor,
    average: scoredRaces.length ? scoredRaces.reduce((sum, race) => sum + scoreFor(race.id, constructor.id), 0) / scoredRaces.length : 0,
  })).sort((a, b) => b.average - a.average);
  chart('avg-chart', { tooltip:{ trigger:'axis' }, grid:{ left:100,right:15,top:15,bottom:20 }, xAxis:{ type:'value', ...axis }, yAxis:{ type:'category', data:liveConstructorRows.map((row) => row.constructor.name), axisLabel:{ color:'#8f99ad' } }, series:[{ type:'bar', data:liveConstructorRows.map((row) => ({ value:row.average, itemStyle:{ color:row.constructor.color } })), barMaxWidth:16 }] });
  $('constructors').querySelector('.sub')!.textContent = 'Live constructor strength and pick distribution from the published season data.';

  const renderLiveRaceTeams = () => {
    raceTeamChart?.dispose();
    const race = data.races.find((item) => item.name === raceSelect.value) ?? scoredRaces.at(-1) ?? data.races[0];
    if (!race) return;
    const rows = data.constructors.map((constructor) => ({ constructor, score:scoreFor(race.id, constructor.id) })).sort((a, b) => b.score - a.score);
    raceTeamChart = chart('race-team-chart', { grid:{ left:100,right:15,top:15,bottom:20 }, xAxis:{ type:'value', max:45, ...axis }, yAxis:{ type:'category', data:rows.map((row) => row.constructor.name), axisLabel:{ color:'#8f99ad' } }, series:[{ type:'bar', data:rows.map((row) => ({ value:row.score, itemStyle:{ color:row.constructor.color } })), barMaxWidth:16 }] });
  };
  raceSelect.innerHTML = data.races.map((race) => `<option>${esc(race.name)}</option>`).join('');
  raceSelect.value = scoredRaces.at(-1)?.name ?? data.races[0]?.name ?? '';
  raceSelect.onchange = renderLiveRaceTeams;
  renderLiveRaceTeams();

  const livePickCounts = new Map<string, number>();
  for (const score of data.playerRaceScores) livePickCounts.set(`${score.race_id}:${score.constructor_id}`, (livePickCounts.get(`${score.race_id}:${score.constructor_id}`) ?? 0) + 1);
  chart('picks-chart', { tooltip:{ trigger:'axis' }, legend:{ type:'scroll', bottom:0, textStyle:{ color:'#8f99ad' } }, grid:{ left:38,right:15,top:20,bottom:70 }, xAxis:{ type:'category', data:data.races.map((race) => race.name), axisLabel:{ color:'#8f99ad', rotate:40 } }, yAxis:{ type:'value', max:Math.max(13, data.standings.length), ...axis }, series:data.constructors.map((constructor) => ({ name:constructor.name, type:'bar', stack:'picks', itemStyle:{ color:constructor.color }, data:data.races.map((race) => livePickCounts.get(`${race.id}:${constructor.id}`) ?? 0) })) });

  const playerIds = new Map(data.standings.map((standing) => [standing.display_name ?? 'Unnamed player', standing.player_id]));
  playerSelect.innerHTML = livePlayers.map((name) => `<option value="${esc(name)}">${esc(name)}</option>`).join('');
  playerSelect.value = currentEmail && livePlayers.includes(currentEmail) ? currentEmail : livePlayers[0] ?? '';
  playerSelect.onchange = () => renderLivePlayer(data, playerIds.get(playerSelect.value) ?? null);
  renderLivePlayer(data, playerIds.get(playerSelect.value) ?? null);
}

function renderLivePlayer(data: LiveLeagueData, playerId: string | null) {
  if (!playerId) return;
  const scoredRaces = data.races.filter((race) => race.status === 'completed').sort((a, b) => a.round_number - b.round_number);
  const scores = scoredRaces.map((race) => data.playerRaceScores.find((score) => score.player_id === playerId && score.race_id === race.id)?.points ?? 0);
  const standing = data.standings.find((item) => item.player_id === playerId);
  const totalPoints = standing?.points ?? scores.reduce((sum, score) => sum + score, 0);
  const constructorById = new Map(data.constructors.map((constructor) => [constructor.id, constructor]));
  $('player-stats').innerHTML = `<div class="stat"><div class="k">Total</div><div class="v">${totalPoints}</div></div><div class="stat"><div class="k">Rank</div><div class="v">${Math.max(1, data.standings.indexOf(standing!) + 1)} / ${data.standings.length}</div></div><div class="stat"><div class="k">Avg / race</div><div class="v">${scoredRaces.length ? (totalPoints / scoredRaces.length).toFixed(1) : '0.0'}</div></div><div class="stat"><div class="k">Best race</div><div class="v">${Math.max(0, ...scores)}</div></div><div class="stat"><div class="k">Races scored</div><div class="v">${scores.filter((score) => score > 0).length}</div></div><div class="stat"><div class="k">Picks submitted</div><div class="v">${standing?.picks_submitted ?? 0}</div></div>`;
  playerRaceChart?.dispose();
  playerRaceChart = chart('player-race-chart', { tooltip:{ trigger:'axis' }, grid:{ left:42,right:15,top:15,bottom:58 }, xAxis:{ type:'category', data:scoredRaces.map((race) => race.name), axisLabel:{ color:'#8f99ad', rotate:40 } }, yAxis:{ type:'value', ...axis }, series:[{ type:'bar', data:scores, itemStyle:{ color:'#e8002d', borderRadius:[4,4,0,0] } }] });
  const cumulativeByPlayer = new Map<string, number>();
  const ranks = scoredRaces.map((race) => {
    for (const item of data.standings) cumulativeByPlayer.set(item.player_id!, (cumulativeByPlayer.get(item.player_id!) ?? 0) + (data.playerRaceScores.find((score) => score.player_id === item.player_id && score.race_id === race.id)?.points ?? 0));
    return [...cumulativeByPlayer.entries()].sort((a, b) => b[1] - a[1]).findIndex(([id]) => id === playerId) + 1;
  });
  playerRankChart?.dispose();
  playerRankChart = chart('player-rank-chart', { tooltip:{ trigger:'axis' }, grid:{ left:42,right:15,top:15,bottom:58 }, xAxis:{ type:'category', data:scoredRaces.map((race) => race.name), axisLabel:{ color:'#8f99ad', rotate:40 } }, yAxis:{ type:'value', inverse:true, min:1, max:Math.max(1, data.standings.length), interval:1, ...axis }, series:[{ type:'line', smooth:true, data:ranks, lineStyle:{ color:'#e8002d', width:2 }, itemStyle:{ color:'#e8002d' } }] });
  const usage = new Map<number, number>();
  for (const pick of data.playerRaceScores.filter((score) => score.player_id === playerId)) usage.set(pick.constructor_id!, (usage.get(pick.constructor_id!) ?? 0) + 1);
  $('usage-list').innerHTML = data.constructors.map((constructor) => {
    const count = usage.get(constructor.id) ?? 0;
    return `<div class="usage-row"><span class="tname"><i class="swatch" style="background:${constructor.color}"></i>${esc(constructor.name)}</span><span class="pips">${[0,1,2].map((i) => `<i class="pip ${i < count ? 'on' : ''}"></i>`).join('')}</span><span class="ulabel">${count ? `${count}×` : '—'}</span></div>`;
  }).join('');
}

chart('cumulative-chart', { tooltip:{ trigger:'axis' }, legend:{ type:'scroll', bottom:0, textStyle:{ color:'#8f99ad' } }, grid:{ left:45,right:20,top:20,bottom:75 }, xAxis:{ type:'category', data:races, axisLabel:{ color:'#8f99ad', rotate:40 } }, yAxis:{ type:'value', ...axis }, series:order.map(player => ({ name:player, type:'line', smooth:true, showSymbol:false, lineStyle:{ color:playerColor[player], width:2 }, data:cumulative[player] })) });

const playerSelect = $('player-select') as HTMLSelectElement; playerSelect.innerHTML = players.map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join(''); playerSelect.value = 'Cooper McGuire';
let playerRaceChart: echarts.ECharts, playerRankChart: echarts.ECharts;
function renderPlayer(player = playerSelect.value as Player) {
  const scores = DATA.playerRace[player]; const usage = DATA.usage[player]; const maxed = teams.filter(t => usage[t] === 3); const over = teams.filter(t => usage[t] > 3);
  $('player-stats').innerHTML = `<div class="stat"><div class="k">Total</div><div class="v">${total[player]}</div></div><div class="stat"><div class="k">Rank</div><div class="v">${order.indexOf(player)+1} / 13</div></div><div class="stat"><div class="k">Avg / race</div><div class="v">${(total[player]/races.length).toFixed(1)}</div></div><div class="stat"><div class="k">Best race</div><div class="v">${Math.max(...scores.map(value))}</div></div><div class="stat"><div class="k">3× teams</div><div class="v">${maxed.length || '—'}</div></div><div class="stat"><div class="k">Races missed</div><div class="v">${DATA.dns[player] ?? 0}</div></div>`;
  playerRaceChart?.dispose(); playerRankChart?.dispose();
  playerRaceChart = chart('player-race-chart', { tooltip:{ trigger:'axis' }, grid:{ left:42,right:15,top:15,bottom:58 }, xAxis:{ type:'category', data:races, axisLabel:{ color:'#8f99ad', rotate:40 } }, yAxis:{ type:'value', ...axis }, series:[{ type:'bar', data:scores.map(value), itemStyle:{ color:playerColor[player], borderRadius:[4,4,0,0] } }] });
  playerRankChart = chart('player-rank-chart', { tooltip:{ trigger:'axis' }, grid:{ left:42,right:15,top:15,bottom:58 }, xAxis:{ type:'category', data:races, axisLabel:{ color:'#8f99ad', rotate:40 } }, yAxis:{ type:'value', inverse:true, min:1, max:13, interval:1, ...axis }, series:[{ type:'line', smooth:true, data:races.map((_,i) => rankAt(i, player)), lineStyle:{ color:playerColor[player], width:2 }, itemStyle:{ color:playerColor[player] } }] });
  $('usage-list').innerHTML = teams.map(team => { const count = usage[team]; const label = count > 3 ? `<span class="flagcell">${count}× over max</span>` : count === 3 ? '3× maxed' : count ? `${count}×` : '—'; return `<div class="usage-row"><span class="tname"><i class="swatch" style="background:${teamMeta[team].color}"></i>${teamMeta[team].name}</span><span class="pips">${[0,1,2].map(i => `<i class="pip ${i < count ? 'on' : ''}"></i>`).join('')}</span><span class="ulabel">${label}</span></div>`; }).join('');
  if (over.length) $('usage-list').insertAdjacentHTML('afterbegin', `<div class="note" style="margin:0 0 8px"><b>Audit flag:</b> ${over.map(team => teamMeta[team].name).join(', ')} exceeds the normal three-use display limit.</div>`);
}
playerSelect.addEventListener('change', () => renderPlayer()); renderPlayer();

chart('avg-chart', { tooltip:{ trigger:'axis' }, grid:{ left:100,right:15,top:15,bottom:20 }, xAxis:{ type:'value', ...axis }, yAxis:{ type:'category', data:teams.map(t => teamMeta[t].name), axisLabel:{ color:'#8f99ad' } }, series:[{ type:'bar', data:teams.map(t => ({ value:DATA.teamRace[t].reduce((a,b) => a+value(b),0)/races.length, itemStyle:{ color:teamMeta[t].color } })), barMaxWidth:16 }] });
const raceSelect = $('race-select') as HTMLSelectElement; raceSelect.innerHTML = races.map(r => `<option>${esc(r)}</option>`).join('');
let raceTeamChart: echarts.ECharts; function renderRaceTeams() { raceTeamChart?.dispose(); const race = raceSelect.value; const rows = teams.map(team => ({ team, score:value(DATA.teamRace[team][races.indexOf(race)]) })).sort((a,b) => b.score-a.score); raceTeamChart = chart('race-team-chart', { grid:{ left:100,right:15,top:15,bottom:20 }, xAxis:{ type:'value', max:45, ...axis }, yAxis:{ type:'category', data:rows.map(r => teamMeta[r.team].name), axisLabel:{ color:'#8f99ad' } }, series:[{ type:'bar', data:rows.map(r => ({ value:r.score, itemStyle:{ color:teamMeta[r.team].color } })), barMaxWidth:16 }] }); } raceSelect.addEventListener('change', renderRaceTeams); renderRaceTeams();
chart('picks-chart', { tooltip:{ trigger:'axis' }, legend:{ type:'scroll', bottom:0, textStyle:{ color:'#8f99ad' } }, grid:{ left:38,right:15,top:20,bottom:70 }, xAxis:{ type:'category', data:races, axisLabel:{ color:'#8f99ad', rotate:40 } }, yAxis:{ type:'value', max:13, ...axis }, series:teams.map(team => ({ name:teamMeta[team].name, type:'bar', stack:'picks', itemStyle:{ color:teamMeta[team].color }, data:DATA.picks[team] })) });

const demoRace = $('demo-race') as HTMLSelectElement; demoRace.innerHTML = [...races, 'Sepang'].map(r => `<option>${r}</option>`).join(''); demoRace.value = 'Sepang';
function renderDemo() { const race = demoRace.value as keyof typeof DATA.realResults; const rows = DATA.realResults[race] as Array<[string, Team, number, number]>; const totals:Record<Team,number> = Object.fromEntries(teams.map(t => [t,0])) as Record<Team,number>; $('demo-body').innerHTML = rows.map((row: [string, Team, number, number]) => { const [code, team, pos, finished] = row; const points = finished && pos != null ? 23-pos : 0; totals[team] += points; return `<tr><td>${pos ?? '—'}</td><td><b>${code}</b></td><td><i class="swatch" style="display:inline-block;background:${teamMeta[team].color}"></i> ${teamMeta[team].name}</td><td style="color:${finished?'var(--good)':'var(--muted)'}">${finished?'Finished':'DNF / DNS'}</td><td class="num"><b>${points}</b></td></tr>`; }).join(''); const sorted = teams.map(team => ({team, score:totals[team]})).sort((a,b) => b.score-a.score); $('demo-teams').innerHTML = `<h3>Team totals: ${esc(race)}</h3><table><thead><tr><th>Constructor</th><th class="num">Points</th></tr></thead><tbody>${sorted.map(row => `<tr><td>${teamMeta[row.team].name}</td><td class="num"><b>${row.score}</b></td></tr>`).join('')}</tbody></table>`; const note = $('demo-note'); note.style.display = race === 'Australia' || race === 'Barcelona' ? 'block' : 'none'; note.innerHTML = race === 'Australia' ? '<b>Audit flag:</b> the source sheet records Aston Martin as 0 here, but Stroll finished P17, worth 6 points.' : '<b>Audit flag:</b> the source sheet records Williams as 11 here, but Albon finished P18, worth 16 total.'; }
demoRace.addEventListener('change', renderDemo); renderDemo();

let adminData: LiveLeagueData | null = null;
let isAdmin = false;
function renderAdminPanel(data: LiveLeagueData) {
  adminData = data;
  isAdmin = data.profiles.some((profile) => profile.id === currentUserId && profile.role === 'admin');
  const panel = $('admin-panel');
  panel.style.display = isAdmin ? 'block' : 'none';
  if (!isAdmin) return;
  const raceById = new Map(data.races.map((race) => [race.id, race]));
  const driverById = new Map(data.drivers.map((driver) => [driver.id, driver]));
  const constructorById = new Map(data.constructors.map((constructor) => [constructor.id, constructor]));
  $('admin-members').innerHTML = data.profiles.length ? data.profiles.map((profile) => `<tr><td>${esc(profile.display_name)}</td><td><span class="status-badge ${profile.role === 'admin' ? 'completed' : 'scheduled'}">${esc(profile.role)}</span></td><td>${new Date(profile.created_at).toLocaleDateString()}</td></tr>`).join('') : '<tr><td colspan="3" class="muted">No profiles provisioned yet.</td></tr>';
  ($('admin-member-save') as HTMLButtonElement).onclick = async () => {
    const message = $('admin-member-status');
    const userId = ($('admin-member-user-id') as HTMLInputElement).value.trim();
    const displayName = ($('admin-member-name') as HTMLInputElement).value.trim();
    const role = ($('admin-member-role') as HTMLSelectElement).value;
    const reason = ($('admin-member-reason') as HTMLInputElement).value.trim();
    if (!userId || !displayName || !reason) { message.textContent = 'User UUID, display name, and reason are required.'; return; }
    const button = $('admin-member-save') as HTMLButtonElement;
    button.disabled = true; message.textContent = 'Provisioning member…';
    try { await adminProvisionProfile(userId, displayName, role, reason); message.textContent = 'Member provisioned.'; await loadLiveDashboard(); }
    catch (error) { message.textContent = error instanceof Error ? error.message : 'Unable to provision member.'; }
    finally { button.disabled = false; }
  };
  $('admin-schedule').innerHTML = data.races.map((race) => `<tr><td>${race.round_number}</td><td>${esc(race.name)}</td><td>${new Date(race.starts_at).toLocaleString()}</td><td><span class="status-badge ${race.status}">${race.status}</span></td></tr>`).join('');
  const resultRace = $('admin-result-race') as HTMLSelectElement;
  const resultDriver = $('admin-result-driver') as HTMLSelectElement;
  resultRace.innerHTML = data.races.map((race) => `<option value="${race.id}">${race.round_number}. ${esc(race.name)}</option>`).join('');
  const syncResultDrivers = () => {
    const raceId = Number(resultRace.value);
    const assigned = data.assignments.filter((assignment) => assignment.race_id === raceId);
    const driverIds = assigned.length ? assigned.map((assignment) => assignment.driver_id) : data.drivers.map((driver) => driver.id);
    resultDriver.innerHTML = driverIds.map((driverId) => `<option value="${driverId}">${esc(driverById.get(driverId)?.name ?? 'Unknown driver')}</option>`).join('');
    syncResultForm();
  };
  const syncResultForm = () => {
    const result = data.driverResults.find((item) => item.race_id === Number(resultRace.value) && item.driver_id === Number(resultDriver.value));
    ($('admin-result-position') as HTMLInputElement).value = result?.finishing_position?.toString() ?? '';
    ($('admin-result-status') as HTMLSelectElement).value = result?.status ?? 'finished';
  };
  resultRace.onchange = syncResultDrivers;
  resultDriver.onchange = syncResultForm;
  syncResultDrivers();
  ($('admin-result-save') as HTMLButtonElement).onclick = async () => {
    const message = $('admin-result-status-message');
    const reason = ($('admin-result-reason') as HTMLInputElement).value.trim();
    const status = ($('admin-result-status') as HTMLSelectElement).value;
    const rawPosition = ($('admin-result-position') as HTMLInputElement).value;
    if (!reason) { message.textContent = 'Enter an audit reason before saving.'; return; }
    if (status === 'finished' && !rawPosition) { message.textContent = 'Finished results need a position.'; return; }
    const button = $('admin-result-save') as HTMLButtonElement;
    button.disabled = true; message.textContent = 'Saving correction…';
    try { await adminUpdateResult(Number(resultRace.value), Number(resultDriver.value), rawPosition ? Number(rawPosition) : null, status, reason); message.textContent = 'Result correction saved.'; await loadLiveDashboard(); }
    catch (error) { message.textContent = error instanceof Error ? error.message : 'Unable to save result correction.'; }
    finally { button.disabled = false; }
  };
  const pickPlayer = $('admin-pick-player') as HTMLSelectElement;
  const pickRace = $('admin-pick-race') as HTMLSelectElement;
  const pickConstructor = $('admin-pick-constructor') as HTMLSelectElement;
  pickPlayer.innerHTML = data.profiles.filter((profile) => profile.role === 'player' || profile.role === 'admin').map((profile) => `<option value="${profile.id}">${esc(profile.display_name)}</option>`).join('');
  pickRace.innerHTML = data.races.map((race) => `<option value="${race.id}">${race.round_number}. ${esc(race.name)}</option>`).join('');
  pickConstructor.innerHTML = data.constructors.map((constructor) => `<option value="${constructor.id}">${esc(constructor.name)}</option>`).join('');
  const audit = $('admin-audit');
  audit.innerHTML = data.auditLog.length ? data.auditLog.map((entry) => `<tr><td>${new Date(entry.created_at).toLocaleString()}</td><td>${esc(entry.action)}</td><td>${esc(entry.entity_type)} ${esc(entry.entity_id)}</td><td>${esc(entry.reason ?? '—')}</td></tr>`).join('') : '<tr><td colspan="4" class="muted">Loading audit history…</td></tr>';
  void loadAdminAuditLog().then((entries) => { if (adminData === data) { data.auditLog = entries; audit.innerHTML = entries.length ? entries.map((entry) => `<tr><td>${new Date(entry.created_at).toLocaleString()}</td><td>${esc(entry.action)}</td><td>${esc(entry.entity_type)} ${esc(entry.entity_id)}</td><td>${esc(entry.reason ?? '—')}</td></tr>`).join('') : '<tr><td colspan="4" class="muted">No audit entries yet.</td></tr>'; } }).catch(() => { audit.innerHTML = '<tr><td colspan="4" class="muted">Audit history unavailable.</td></tr>'; });
  ($('admin-pick-save') as HTMLButtonElement).onclick = async () => {
    const message = $('admin-pick-status-message');
    const reason = ($('admin-pick-reason') as HTMLInputElement).value.trim();
    if (!reason) { message.textContent = 'Enter an audit reason before saving.'; return; }
    const button = $('admin-pick-save') as HTMLButtonElement;
    button.disabled = true; message.textContent = 'Saving override…';
    try { await adminOverridePick(pickPlayer.value, Number(pickRace.value), Number(pickConstructor.value), reason); message.textContent = 'Pick override saved.'; await loadLiveDashboard(); }
    catch (error) { message.textContent = error instanceof Error ? error.message : 'Unable to save pick override.'; }
    finally { button.disabled = false; }
  };
}

const sessionKey = 'f1demo.session'; const pickKey = 'f1demo.picks'; const upcoming = { id:'united-states', name:'United States Grand Prix', lockUTC:'2026-10-25T20:00:00Z' };
let selectedTeam:Team | null = null;
let currentEmail: string | null = null;
let currentUserId: string | null = null;
const session = () => { try { return JSON.parse(localStorage.getItem(sessionKey) ?? 'null') as { email:string } | null; } catch { return null; } };
async function loadLiveDashboard() { if (!supabaseConfigured || !currentEmail) return; try { liveLeague = await loadLiveLeague(); renderLiveLeaderboard(liveLeague); renderLiveAnalytics(liveLeague); renderAdminPanel(liveLeague); renderPick(); } catch (error) { $('pick-status').textContent = error instanceof Error ? error.message : 'Unable to load live league data.'; } }
async function renderAuth() { const localUser = session(); const remoteUser = supabaseConfigured ? await getCurrentUser() : null; currentEmail = remoteUser?.email ?? localUser?.email ?? null; currentUserId = remoteUser?.id ?? null; const loggedIn = Boolean(currentEmail); $('nav-auth').innerHTML = loggedIn ? `<button class="btn ghost" id="logout-btn">${esc(currentEmail!)} · Log out</button>` : `<a href="#my-pick">Log in</a>`; $('login-card').style.display = loggedIn ? 'none' : 'block'; $('pick-ui').style.display = loggedIn ? 'block' : 'none'; if (loggedIn) { renderPick(); void loadLiveDashboard(); } $('logout-btn')?.addEventListener('click', async () => { if (supabaseConfigured) await signOut(); localStorage.removeItem(sessionKey); currentEmail=null; currentUserId=null; liveLeague=null; selectedTeam=null; selectedConstructorId=null; await renderAuth(); }); }
function renderPickHistory() {
  if (!liveLeague || !currentUserId) return;
  const raceById = new Map(liveLeague.races.map((race) => [race.id, race]));
  const constructorById = new Map(liveLeague.constructors.map((constructor) => [constructor.id, constructor]));
  const picks = liveLeague.playerRaceScores.filter((score) => score.player_id === currentUserId).sort((a, b) => (raceById.get(a.race_id!)?.round_number ?? 0) - (raceById.get(b.race_id!)?.round_number ?? 0));
  $('pick-history').innerHTML = picks.length ? picks.map((pick) => {
    const race = raceById.get(pick.race_id!);
    const constructor = constructorById.get(pick.constructor_id!);
    const scored = race?.status === 'completed';
    return `<tr><td>${esc(race?.name ?? 'Unknown race')}</td><td><i class="swatch" style="display:inline-block;background:${constructor?.color ?? '#8f99ad'}"></i> ${esc(constructor?.name ?? 'Unknown constructor')}</td><td style="color:${scored ? 'var(--good)' : 'var(--muted)'}">${scored ? 'Scored' : 'Submitted'}</td><td class="num"><b>${scored ? pick.points ?? 0 : '—'}</b></td></tr>`;
  }).join('') : '<tr><td colspan="4" class="muted">No live picks submitted yet.</td></tr>';
  const counts = new Map<number, number>();
  for (const pick of picks) counts.set(pick.constructor_id!, (counts.get(pick.constructor_id!) ?? 0) + 1);
  $('pick-usage').innerHTML = `<span class="muted">Usage:</span> ${[...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id, count]) => `<span class="usage-pill"><i class="swatch" style="background:${constructorById.get(id)?.color ?? '#8f99ad'}"></i>${esc(constructorById.get(id)?.name ?? 'Unknown')} ${count}×</span>`).join('')}`;
}
function renderPick() { if (!currentEmail) return; const liveRace = liveLeague?.races.find((race) => race.status === 'scheduled' && new Date(race.starts_at).getTime() > Date.now()); const race = liveRace ?? upcoming; activeLiveRaceId = liveRace?.id ?? null; const lockUTC = liveRace?.starts_at ?? upcoming.lockUTC; const locked = new Date(lockUTC).getTime() <= Date.now(); const liveConstructors = liveLeague?.constructors ?? []; let saved: {team:Team} | null = null; try { saved = JSON.parse(localStorage.getItem(pickKey) ?? 'null'); } catch { saved=null; } if (!selectedTeam && saved) selectedTeam=saved.team; $('next-race-title').textContent = `Next race: ${race.name}`; $('lock-info').innerHTML = locked ? '<b style="color:var(--warn)">Picks are locked.</b> The race has started.' : `Picks lock <b>${new Date(lockUTC).toLocaleString()}</b>.`; $('team-grid').innerHTML = liveConstructors.length ? liveConstructors.map(constructor => `<button class="pickbtn ${selectedConstructorId===constructor.id?'sel':''}" data-constructor-id="${constructor.id}" ${locked?'disabled':''}><i class="swatch" style="background:${constructor.color}"></i>${esc(constructor.name)}</button>`).join('') : teams.map(team => `<button class="pickbtn ${selectedTeam===team?'sel':''}" data-team="${team}" ${locked?'disabled':''}><i class="swatch" style="background:${teamMeta[team].color}"></i>${teamMeta[team].name}</button>`).join(''); document.querySelectorAll<HTMLButtonElement>('.pickbtn').forEach(button => button.addEventListener('click', () => { if (liveLeague) { selectedConstructorId=Number(button.dataset.constructorId); } else { selectedTeam=button.dataset.team as Team; } renderPick(); })); $('submit-pick').style.display=locked || (supabaseConfigured && !liveLeague) ? 'none':'inline-block'; $('pick-status').textContent = supabaseConfigured ? (liveLeague ? 'Select a constructor, then submit. Supabase enforces the lock and usage rules.' : 'Loading the live 2026 schedule…') : saved ? `Your submitted pick: ${teamMeta[saved.team].name}` : 'No pick submitted yet.'; if (liveLeague) renderPickHistory(); }
$('login-btn').addEventListener('click', async () => { const email = ($('login-email') as HTMLInputElement).value.trim(); const error = $('login-error'); if (!email.includes('@')) { error.textContent='Enter a valid email address.'; error.style.display='block'; return; } error.style.display='none'; try { if (supabaseConfigured) { await signInWithMagicLink(email); error.textContent='Check your email for a secure sign-in link.'; error.style.color='var(--good)'; error.style.display='block'; } else { localStorage.setItem(sessionKey, JSON.stringify({ email })); await renderAuth(); } } catch (err) { error.textContent = err instanceof Error ? err.message : 'Unable to send the sign-in link.'; error.style.color='var(--accent2)'; error.style.display='block'; } }); $('submit-pick').addEventListener('click', async () => { const button = $('submit-pick') as HTMLButtonElement; if (supabaseConfigured && activeLiveRaceId && selectedConstructorId) { button.disabled=true; $('pick-status').textContent='Submitting pick…'; try { await submitPick(activeLiveRaceId, selectedConstructorId); $('pick-status').textContent='Pick submitted successfully.'; await loadLiveDashboard(); } catch (err) { $('pick-status').textContent = err instanceof Error ? err.message : 'Unable to submit pick.'; } finally { button.disabled=false; } return; } if (!selectedTeam || supabaseConfigured) return; localStorage.setItem(pickKey, JSON.stringify({ team:selectedTeam, at:new Date().toISOString() })); renderPick(); }); if (supabase) supabase.auth.onAuthStateChange(() => { void renderAuth(); }); void renderAuth();
