/* ============================================================
   Re:che オンライン教材 — 管理画面
   ============================================================ */
(function(){
'use strict';

var WD = ['日','月','火','水','木','金','土'];
var QS = (function(){ try{ return new URLSearchParams(location.search); }catch(e){ return { get:function(){ return null; } }; } })();
var PREVIEW = QS.get('preview') === '1';
var DEBUG   = QS.get('debug') === '1';
var CFG     = window.MANABI || {};
var VER     = CFG.version || 'dev';
var CARE1 = 14, CARE2 = 30;

function byId(id){ return document.getElementById(id); }
function on(n, e, f){ if(n) n.addEventListener(e, f); }
function esc(s){
  return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function toDate(v){ if(!v) return null; var d = (v instanceof Date) ? v : new Date(String(v).replace(' ','T')); return isNaN(d.getTime()) ? null : d; }
function fmtDate(v){ var d = toDate(v); if(!d) return '—'; return d.getFullYear() + '年' + (d.getMonth()+1) + '月' + d.getDate() + '日（' + WD[d.getDay()] + '）'; }
function daysSince(v){ var d = toDate(v); if(!d) return null; return Math.floor((Date.now() - d.getTime()) / 86400000); }
function arr(v){
  if(Array.isArray(v)) return v.slice();
  if(v == null || v === '') return [];
  if(typeof v === 'string'){ var t = v.trim(); if(t.charAt(0) === '['){ try{ return JSON.parse(t); }catch(e){} } return t.split(',').map(function(x){ return x.trim(); }).filter(Boolean); }
  return [v];
}
var LOGS = [];
function logLine(tag, msg){
  LOGS.push('[' + new Date().toLocaleTimeString('ja-JP') + '] ' + tag + ' ' + msg);
  if(LOGS.length > 120) LOGS.shift();
  if(!DEBUG) return;
  var b = byId('dbgB'), p = byId('dbg'); if(!b || !p) return;
  p.classList.add('on'); b.textContent = LOGS.join('\n'); b.scrollTop = b.scrollHeight;
}
function initDebug(){
  if(!DEBUG) return;
  var p = byId('dbg'); if(p) p.classList.add('on');
  on(byId('dbgX'), 'click', function(){ if(p) p.classList.remove('on'); });
  window.addEventListener('error', function(ev){ logLine('ERR', (ev && ev.message) || 'error'); });
  window.addEventListener('unhandledrejection', function(ev){ var r = ev && ev.reason; logLine('REJ', (r && r.message) || String(r)); });
  var ce = console.error;
  console.error = function(){ try{ logLine('CON', Array.prototype.join.call(arguments, ' ')); }catch(e){} ce.apply(console, arguments); };
}

/* ---------- 状態 ---------- */
var SB = null, ME = null, TAB = 'members';
var D = { categories:[], lessons:[], profiles:[], progress:[], settings:{}, bugs:[] };

/* ---------- 見本データ（?preview=1） ---------- */
var DEMO = {
  categories:[
    { id:'setup', name:'セットアップ', parent_id:null, sort_order:1 },
    { id:'setup-self', name:'自己理解', parent_id:'setup', sort_order:1 },
    { id:'jissen', name:'実践', parent_id:null, sort_order:2 },
    { id:'jissen-shiire', name:'仕入れ', parent_id:'jissen', sort_order:1 }
  ],
  lessons:[
    { id:'c1', title:'はじめての方へ　学びの進め方', kind:'course', category_id:'setup-self', is_published:true, sort_order:1, year_month:'' },
    { id:'c2', title:'アカウントの整え方', kind:'course', category_id:'setup-self', is_published:true, sort_order:2, year_month:'' },
    { id:'c3', title:'仕入れ先の選び方', kind:'course', category_id:'jissen-shiire', is_published:true, sort_order:3, year_month:'' },
    { id:'m1', title:'2026年8月　月1講座', kind:'monthly', category_id:null, is_published:true, sort_order:1, year_month:'2026-08' }
  ],
  profiles:[
    { user_id:'u1', name:'見本 はな', email:'hana@example.com', role:'student', entry_ok:true, last_seen_at:new Date(Date.now() - 2*86400000).toISOString() },
    { user_id:'u2', name:'見本 みどり', email:'midori@example.com', role:'student', entry_ok:true, last_seen_at:new Date(Date.now() - 18*86400000).toISOString() },
    { user_id:'u3', name:'見本 さくら', email:'sakura@example.com', role:'student', entry_ok:true, last_seen_at:new Date(Date.now() - 45*86400000).toISOString() }
  ],
  progress:[
    { user_id:'u1', lesson_id:'c1', done_at:new Date(Date.now() - 3*86400000).toISOString() },
    { user_id:'u1', lesson_id:'c2', done_at:new Date(Date.now() - 2*86400000).toISOString() },
    { user_id:'u2', lesson_id:'c1', done_at:new Date(Date.now() - 20*86400000).toISOString() }
  ],
  settings:{ entry_code:'reche2026', admin_emails:'4morikawa5@gmail.com', line_contact_url:'', notice:'' },
  bugs:[{ id:1, member_name:'Re:cheオンライン教材', mood:'バグ報告', worry:'（見本）完了を押しても印が変わりませんでした', want:'URL: https://example/\nUA: iPhone', created_at:new Date().toISOString() }]
};

/* ---------- 画面の枠 ---------- */
function setView(html){ var v = byId('aview'); if(v){ v.innerHTML = html; window.scrollTo(0, 0); } return byId('aview'); }
function hideLoad(){ var l = byId('load'); if(l) l.classList.add('off'); }
function showTabs(show){ var t = byId('atabs'); if(t) t.hidden = !show; }

/* ---------- まとまり（セットアップ / 実践 / 月1講座） ---------- */
function topCats(){ return D.categories.filter(function(c){ return !c.parent_id; }).sort(function(a,b){ return (a.sort_order||0) - (b.sort_order||0); }); }
function childCats(pid){ return D.categories.filter(function(c){ return c.parent_id === pid; }); }
function lessonsOfCat(id){ return D.lessons.filter(function(l){ return l.kind === 'course' && l.category_id === id; }); }
function groups(){
  var gs = [];
  topCats().forEach(function(t){
    var ids = lessonsOfCat(t.id).map(function(l){ return l.id; });
    childCats(t.id).forEach(function(k){ ids = ids.concat(lessonsOfCat(k.id).map(function(l){ return l.id; })); });
    if(ids.length) gs.push({ name:t.name, ids:ids });
  });
  var mon = D.lessons.filter(function(l){ return l.kind === 'monthly'; }).map(function(l){ return l.id; });
  if(mon.length) gs.push({ name:'月1講座', ids:mon });
  return gs;
}
function progressOf(uid){ return D.progress.filter(function(p){ return p.user_id === uid; }); }
function members(){
  var gs = groups();
  return D.profiles.map(function(p){
    var mine = progressOf(p.user_id);
    var set = {}; mine.forEach(function(r){ set[r.lesson_id] = r.done_at; });
    var cols = gs.map(function(g){
      var n = 0; g.ids.forEach(function(i){ if(set[i]) n++; });
      return { name:g.name, done:n, total:g.ids.length, pc:g.ids.length ? Math.round(n / g.ids.length * 100) : 0 };
    });
    var last = p.last_seen_at;
    var lastDone = mine.map(function(r){ return toDate(r.done_at); }).filter(Boolean).sort(function(a,b){ return b - a; })[0] || null;
    return {
      user_id:p.user_id, name:p.name || '（お名前なし）', email:p.email || '', role:p.role || 'student',
      entry_ok:!!p.entry_ok, last_seen_at:last, last_done:lastDone, done:mine.length, cols:cols, set:set,
      ov:(D.ov || {})[p.user_id] || null
    };
  }).sort(function(a, b){ return (toDate(b.last_seen_at) || 0) - (toDate(a.last_seen_at) || 0); });
}
function careLevel(m){
  var d = daysSince(m.last_seen_at);
  if(d == null) return 2;
  if(d >= CARE2) return 2;
  if(d >= CARE1) return 1;
  return 0;
}

/* ============================================================
   読み込み
   ============================================================ */
function sbRest(path, opt){
  opt = opt || {};
  return fetch(CFG.url + '/rest/v1/' + path, {
    method:opt.method || 'GET',
    headers:{ apikey:CFG.anon, Authorization:'Bearer ' + CFG.anon, 'Content-Type':'application/json', Prefer:opt.prefer || 'return=representation' },
    body:opt.body
  });
}
function loadBugs(){
  if(PREVIEW){ D.bugs = DEMO.bugs.slice(); return Promise.resolve(); }
  return sbRest('ailab_notes?member_id=eq.bug_reche-manabi&order=created_at.desc&limit=100')
    .then(function(r){ return r.json(); })
    .then(function(j){ D.bugs = Array.isArray(j) ? j : []; })
    .catch(function(e){ logLine('WARN', 'bugs ' + (e && e.message)); D.bugs = []; });
}
function loadAll(){
  if(PREVIEW){
    D.categories = DEMO.categories.slice(); D.lessons = DEMO.lessons.slice();
    D.profiles = DEMO.profiles.slice(); D.progress = DEMO.progress.slice();
    D.settings = JSON.parse(JSON.stringify(DEMO.settings));
    return loadBugs();
  }
  return Promise.all([
    SB.from('manabi_categories').select('*').order('sort_order', { ascending:true }),
    SB.from('manabi_lessons').select('id,title,kind,category_id,year_month,sort_order,published_at,is_published').order('sort_order', { ascending:true }),
    SB.from('manabi_profiles').select('*'),
    SB.from('manabi_progress').select('user_id,lesson_id,done_at'),
    SB.from('manabi_settings').select('key,value'),
    SB.rpc('manabi_admin_overview')
  ]).then(function(r){
    D.categories = (r[0] && r[0].data) || [];
    D.lessons    = (r[1] && r[1].data) || [];
    D.profiles   = (r[2] && r[2].data) || [];
    D.progress   = (r[3] && r[3].data) || [];
    D.settings = {};
    ((r[4] && r[4].data) || []).forEach(function(s){ D.settings[s.key] = s.value == null ? '' : String(s.value); });
    D.overview = (r[5] && !r[5].error) ? (r[5].data || []) : null;
    D.ov = {};
    if(D.overview) D.overview.forEach(function(o){ if(o && o.user_id) D.ov[o.user_id] = o; });
    if(r[5] && r[5].error) logLine('WARN', 'overview ' + r[5].error.message);
    return loadBugs();
  });
}

/* ============================================================
   ログイン
   ============================================================ */
function renderLogin(msg){
  showTabs(false);
  var h = '<div class="card" style="max-width:420px; margin:0 auto;">';
  h += '<div class="ttl">管理画面</div><p class="lead">管理者のメールアドレスでログインしてください。</p>';
  if(msg) h += '<div class="err">' + esc(msg) + '</div>';
  h += '<div class="field"><label for="aEmail">メールアドレス</label><input id="aEmail" type="email" autocomplete="email"></div>';
  h += '<div class="field"><label for="aPw">パスワード</label><input id="aPw" type="password" autocomplete="current-password"></div>';
  h += '<button class="btn" id="aBtn" type="button">ログイン</button></div>';
  setView(h);
  on(byId('aBtn'), 'click', function(){
    var b = byId('aBtn');
    var em = (byId('aEmail') || {}).value || '', pw = (byId('aPw') || {}).value || '';
    if(!em || !pw){ renderLogin('メールアドレスとパスワードをご記入ください。'); return; }
    if(b) b.disabled = true;
    SB.auth.signInWithPassword({ email:String(em).trim(), password:String(pw) }).then(function(res){
      if(res.error) throw res.error;
      return start();
    }).catch(function(e){ logLine('ERR', 'login ' + (e && e.message)); renderLogin('ログインできませんでした。入力内容をご確認ください。'); });
  });
}
function renderNotAdmin(){
  showTabs(false);
  setView('<div class="card" style="max-width:420px; margin:0 auto;"><div class="ttl">管理者のみ</div>' +
    '<p class="lead">この画面は管理者だけがご覧になれます。教材は下のボタンからお開きください。</p>' +
    '<a class="btn sub" href="index.html">オンライン教材をひらく</a>' +
    '<button class="btn ghost" id="aOut" type="button" style="margin-top:9px;">ログアウト</button></div>');
  on(byId('aOut'), 'click', function(){ if(SB) SB.auth.signOut().then(function(){ location.reload(); }); else location.reload(); });
}

/* ============================================================
   タブ 1 受講者
   ============================================================ */
function renderMembers(){
  var ms = members(), gs = groups();
  var care1 = ms.filter(function(m){ return careLevel(m) === 1; }).length;
  var care2 = ms.filter(function(m){ return careLevel(m) === 2; }).length;
  var h = '<div class="card"><div class="ttl">受講者</div>';
  h += '<p class="lead">' + ms.length + '名　/　' + CARE1 + '日以上ひらいていない方 ' + care1 + '名　/　' + CARE2 + '日以上の方 ' + care2 + '名</p>';
  h += '<div class="btnrow"><button class="btn sub sm" id="mCsv" type="button">CSVで書き出す</button>';
  h += '<button class="btn sub sm" id="mTmpl" type="button">LINEの文面をつくる</button>';
  h += '<button class="btn ghost sm" id="mRel" type="button">読み込み直す</button></div>';
  h += '<div id="mOut"></div></div>';

  h += '<div class="card"><div class="scroll"><table class="tbl"><thead><tr>';
  h += '<th>お名前</th><th>メール</th><th>最終アクセス</th><th class="num">完了</th>';
  gs.forEach(function(g){ h += '<th class="num">' + esc(g.name) + '</th>'; });
  h += '<th>ようす</th></tr></thead><tbody>';
  if(!ms.length) h += '<tr><td colspan="' + (5 + gs.length) + '"><div class="empty">受講者の登録はありません。</div></td></tr>';
  ms.forEach(function(m){
    var lv = careLevel(m), d = daysSince(m.last_seen_at);
    h += '<tr data-u="' + esc(m.user_id) + '" class="' + (lv === 2 ? 'care2' : (lv === 1 ? 'care1' : '')) + '">';
    h += '<td><b>' + esc(m.name) + '</b>' + (m.role === 'admin' ? ' <span class="pill g">管理</span>' : '') + (m.entry_ok ? '' : ' <span class="pill a">合言葉なし</span>') + '</td>';
    h += '<td>' + esc(m.email) + '</td>';
    h += '<td>' + esc(fmtDate(m.last_seen_at)) + (d == null ? '' : '<br><span style="font-size:11px; color:var(--sub);">' + d + '日前</span>') + '</td>';
    h += '<td class="num">' + m.done + '</td>';
    m.cols.forEach(function(c){ h += '<td class="num">' + c.pc + '％<br><span style="font-size:11px; color:var(--sub);">' + c.done + '/' + c.total + '</span></td>'; });
    h += '<td>' + (lv === 2 ? '<span class="pill b">お声がけ</span>' : (lv === 1 ? '<span class="pill a">気にかける</span>' : '<span class="pill g">順調</span>')) + '</td>';
    h += '</tr>';
  });
  h += '</tbody></table></div></div>';
  var v = setView(h);
  if(!v) return;
  Array.prototype.forEach.call(v.querySelectorAll('tr[data-u]'), function(tr){
    tr.onclick = function(){ openDetail(tr.getAttribute('data-u')); };
  });
  on(byId('mCsv'), 'click', exportCsv);
  on(byId('mTmpl'), 'click', makeTemplates);
  on(byId('mRel'), 'click', function(){ loadAll().then(render).catch(function(e){ logLine('ERR', 'reload ' + (e && e.message)); }); });
}
function csvCell(s){ return '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"'; }
function exportCsv(){
  var ms = members(), gs = groups();
  var head = ['お名前','メールアドレス','最終アクセス','経過日数','完了数'].concat(gs.map(function(g){ return g.name; }));
  var rows = [head.map(csvCell).join(',')];
  ms.forEach(function(m){
    var d = daysSince(m.last_seen_at);
    var r = [m.name, m.email, fmtDate(m.last_seen_at), (d == null ? '' : d), m.done]
      .concat(m.cols.map(function(c){ return c.done + '/' + c.total; }));
    rows.push(r.map(csvCell).join(','));
  });
  var csv = '﻿' + rows.join('\r\n');
  var out = byId('mOut');
  try{
    var blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'reche-manabi-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(a.href); }, 2000);
    if(out) out.innerHTML = '<div class="ok" style="margin:10px 0 0;">CSVを書き出しました。</div>';
  }catch(e){
    logLine('WARN', 'csv ' + (e && e.message));
    if(out) out.innerHTML = '<div class="warn" style="margin:10px 0 0;">書き出しができませんでした。下の内容をコピーしてご利用ください。</div><textarea class="tmpl" readonly>' + esc(csv) + '</textarea>';
  }
}
function makeTemplates(){
  var ms = members(), out = byId('mOut');
  var txt = ms.map(function(m){
    var line = m.cols.map(function(c){ return c.name + ' ' + c.done + '/' + c.total; }).join('、');
    return m.name + ' さん（' + (m.email || '') + '）\n' +
      m.name + 'さん、こんにちは。Re:che の森川です。\n' +
      'オンライン教材は、いま ' + line + ' まで進んでいらっしゃいます。\n' +
      'ご自分のペースで大丈夫ですので、気になるところから読んでいただけたらうれしいです。\n' +
      '分からないところがあれば、この専用LINEにそのままお送りください。\n';
  }).join('\n----------------\n\n');
  if(out) out.innerHTML = '<p class="muted" style="margin:10px 0 6px;">そのままコピーしてお使いいただけます。</p><textarea class="tmpl" id="tmplBox" readonly>' + esc(txt) + '</textarea>';
  var b = byId('tmplBox'); if(b){ b.focus(); b.select(); }
}

/* 受講者の詳細 */
function openDetail(uid){
  var ms = members(), m = null;
  ms.forEach(function(x){ if(x.user_id === uid) m = x; });
  if(!m) return;
  var modal = byId('detM'), box = byId('detB');
  if(!modal || !box) return;
  var rows = D.progress.filter(function(p){ return p.user_id === uid; })
    .sort(function(a, b){ return (toDate(b.done_at) || 0) - (toDate(a.done_at) || 0); });
  var h = '<h3>' + esc(m.name) + '</h3>';
  h += '<p class="muted" style="margin:0 0 10px; overflow-wrap:anywhere;">' + esc(m.email) + '<br>最終アクセス ' + esc(fmtDate(m.last_seen_at)) + '</p>';
  var lastTtl = (m.ov && m.ov.last_lesson_title) || '';
  if(!lastTtl && rows.length){
    D.lessons.forEach(function(x){ if(x.id === rows[0].lesson_id) lastTtl = x.title; });
  }
  if(lastTtl) h += '<div class="kv"><b>最後に完了した講座</b><span style="text-align:right;">' + esc(lastTtl) + '</span></div>';
  if(m.ov && m.ov.done_total != null && Number(m.ov.done_total) !== m.done){
    h += '<div class="warn" style="margin:10px 0;">記録の集計が一致しません（一覧 ' + m.done + '件 / 集計 ' + esc(m.ov.done_total) + '件）。読み込み直してご確認ください。</div>';
  }
  m.cols.forEach(function(c){
    h += '<div class="brow"><div class="bl"><span>' + esc(c.name) + '</span><span class="bv">' + c.done + ' / ' + c.total + '</span></div>';
    h += '<div class="bar"><span style="width:' + c.pc + '%"></span></div></div>';
  });
  h += '<div class="hr"></div><div class="sttl">完了した講座（' + rows.length + '件）</div>';
  if(!rows.length) h += '<div class="empty">記録はありません。</div>';
  rows.forEach(function(r){
    var l = null; D.lessons.forEach(function(x){ if(x.id === r.lesson_id) l = x; });
    h += '<div class="kv"><b style="flex:1 1 auto; min-width:0;">' + esc(l ? l.title : r.lesson_id) + '<br><span style="font-size:11px; color:var(--sub); font-weight:600;">' + esc(fmtDate(r.done_at)) + '</span></b>';
    h += '<button class="xbtn" data-del="' + esc(r.lesson_id) + '" type="button" aria-label="この記録を消す"><svg width="11" height="11"><use href="#i-x"></use></svg></button></div>';
  });
  h += '<div class="bb" style="display:flex; gap:8px; margin-top:14px;"><button class="btn ghost" id="detC" type="button">閉じる</button></div>';
  box.innerHTML = h;
  modal.classList.add('on');
  on(byId('detC'), 'click', function(){ modal.classList.remove('on'); });
  Array.prototype.forEach.call(box.querySelectorAll('[data-del]'), function(b){
    b.onclick = function(){
      var lid = b.getAttribute('data-del');
      if(!window.confirm('この講座の完了の記録を消します。よろしいですか。')) return;
      b.disabled = true;
      resetProgress(uid, lid).then(function(){
        D.progress = D.progress.filter(function(p){ return !(p.user_id === uid && p.lesson_id === lid); });
        openDetail(uid); render();
      }).catch(function(e){ logLine('ERR', 'reset ' + (e && e.message)); b.disabled = false; window.alert('消すことができませんでした。'); });
    };
  });
}
function resetProgress(uid, lid){
  if(PREVIEW) return Promise.resolve();
  return SB.from('manabi_progress').delete().eq('user_id', uid).eq('lesson_id', lid)
    .then(function(res){ if(res.error) throw res.error; });
}

/* ============================================================
   タブ 2 ヘルスチェック
   ============================================================ */
function renderHealth(){
  var h = '<div class="card"><div class="ttl">ヘルスチェック</div>';
  h += '<p class="lead">5つの項目を順に確かめます。動かないところがあれば、ここに出ます。</p>';
  h += '<button class="btn" id="hRun" type="button">確認をはじめる</button><div id="hOut"></div></div>';
  setView(h);
  on(byId('hRun'), 'click', runHealth);
}
function runHealth(){
  var out = byId('hOut'); if(!out) return;
  out.innerHTML = '<p class="muted" style="margin:10px 0 0;">確認しています</p>';
  var TABLES = ['manabi_categories','manabi_lessons','manabi_profiles','manabi_progress','manabi_events','manabi_settings'];
  var checks = [
    { nm:'ログインの状態', run:function(){
        if(PREVIEW) return Promise.resolve({ ok:true, rs:'見本の表示です' });
        return SB.auth.getSession().then(function(r){
          var s = r && r.data && r.data.session;
          return s ? { ok:true, rs:(s.user.email || '') } : { ok:false, rs:'ログインが切れています' };
        });
      } },
    { nm:'表（テーブル）の用意', run:function(){
        if(PREVIEW) return Promise.resolve({ ok:true, rs:'見本の表示です' });
        return Promise.all(TABLES.map(function(t){
          return SB.from(t).select('*', { count:'exact', head:true }).then(function(r){ return r.error ? t : null; });
        })).then(function(bad){
          var ng = bad.filter(Boolean);
          return ng.length ? { ok:false, rs:'ないもの: ' + ng.join(' ') } : { ok:true, rs:TABLES.length + '個そろっています' };
        });
      } },
    { nm:'書き込みと読みもどし', run:function(){
        if(PREVIEW) return Promise.resolve({ ok:true, rs:'見本の表示です' });
        var stamp = String(Date.now());
        return SB.from('manabi_settings').upsert({ key:'_healthcheck', value:stamp }, { onConflict:'key' })
          .then(function(r){ if(r.error) throw r.error; return SB.from('manabi_settings').select('value').eq('key', '_healthcheck').maybeSingle(); })
          .then(function(r){
            if(r.error) throw r.error;
            var okv = r.data && String(r.data.value) === stamp;
            return SB.from('manabi_settings').delete().eq('key', '_healthcheck').then(function(){
              return okv ? { ok:true, rs:'往復できました' } : { ok:false, rs:'読みもどせませんでした' };
            });
          });
      } },
    { nm:'画像の表示（署名つきURL）', run:function(){
        if(PREVIEW) return Promise.resolve({ ok:true, rs:'見本の表示です' });
        return SB.storage.from('manabi').list('img', { limit:1 }).then(function(r){
          if(r.error) throw r.error;
          var first = (r.data || [])[0];
          if(!first) return { ok:false, rs:'画像が置かれていません' };
          if(first.id === null || first.metadata == null){
            return SB.storage.from('manabi').list('img/' + first.name, { limit:1 }).then(function(r2){
              var f2 = (r2.data || [])[0];
              if(!f2) return { ok:false, rs:'画像が置かれていません' };
              return SB.storage.from('manabi').createSignedUrls(['img/' + first.name + '/' + f2.name], 600)
                .then(function(r3){ return (r3.data && r3.data[0] && r3.data[0].signedUrl) ? { ok:true, rs:'取得できました' } : { ok:false, rs:'取得できませんでした' }; });
            });
          }
          return SB.storage.from('manabi').createSignedUrls(['img/' + first.name], 600)
            .then(function(r3){ return (r3.data && r3.data[0] && r3.data[0].signedUrl) ? { ok:true, rs:'取得できました' } : { ok:false, rs:'取得できませんでした' }; });
        });
      } },
    { nm:'講座の件数', run:function(){
        var n = D.lessons.length;
        var pub = D.lessons.filter(function(l){ return l.is_published !== false; }).length;
        return Promise.resolve(n ? { ok:true, rs:'公開 ' + pub + '件 / 全 ' + n + '件' } : { ok:false, rs:'講座がありません' });
      } }
  ];
  checks.reduce(function(chain, c){
    return chain.then(function(acc){
      return c.run().catch(function(e){ return { ok:false, rs:((e && e.message) || '確認できませんでした').slice(0, 60) }; })
        .then(function(r){ acc.push({ nm:c.nm, ok:r.ok, rs:r.rs }); return acc; });
    });
  }, Promise.resolve([])).then(function(res){
    var h = '<div style="margin-top:12px;">';
    res.forEach(function(r){
      h += '<div class="ck ' + (r.ok ? 'pass' : 'fail') + '"><span class="st"><svg><use href="#' + (r.ok ? 'i-check2' : 'i-x') + '"></use></svg></span>' +
        '<span class="nm">' + esc(r.nm) + '</span><span class="rs">' + esc(r.rs) + '</span></div>';
    });
    h += '</div>';
    var ng = res.filter(function(r){ return !r.ok; }).length;
    h += ng ? '<div class="warn" style="margin-top:10px;">' + ng + '項目に気になるところがありました。</div>'
            : '<div class="ok" style="margin-top:10px;">5項目とも問題ありませんでした。</div>';
    out.innerHTML = h;
  });
}

/* ============================================================
   タブ 3 不具合の受信箱
   ============================================================ */
function renderBugs(){
  var open = D.bugs.filter(function(b){ return b.mood !== '対応済み'; }).length;
  var h = '<div class="card"><div class="ttl">不具合の受信箱</div>';
  h += '<p class="lead">' + (D.bugs.length ? ('未対応 ' + open + '件　/　全 ' + D.bugs.length + '件') : '報告はありません。') + '</p>';
  h += '<button class="btn ghost sm" id="bRel" type="button">読み込み直す</button></div>';
  h += '<div class="card"><div id="bList">';
  if(!D.bugs.length) h += '<div class="empty">報告はありません。</div>';
  D.bugs.forEach(function(b){
    var fin = b.mood === '対応済み';
    h += '<div class="buginfo' + (fin ? ' fin' : '') + '" data-b="' + esc(b.id) + '">';
    h += '<div>' + esc(b.worry || '') + '</div>';
    if(b.want) h += '<div class="mt">' + esc(b.want) + '</div>';
    h += '<div class="mt">' + esc(fmtDate(b.created_at)) + '</div>';
    h += fin ? '<span class="pill g" style="margin-top:7px; display:inline-block;">対応済み</span>'
             : '<button class="btn sub sm" data-fin="' + esc(b.id) + '" type="button" style="margin-top:8px;">対応済みにする</button>';
    h += '</div>';
  });
  h += '</div></div>';
  var v = setView(h);
  if(!v) return;
  on(byId('bRel'), 'click', function(){ loadBugs().then(render); });
  Array.prototype.forEach.call(v.querySelectorAll('[data-fin]'), function(btn){
    btn.onclick = function(){
      var id = btn.getAttribute('data-fin');
      btn.disabled = true;
      var p = PREVIEW ? Promise.resolve() : sbRest('ailab_notes?id=eq.' + encodeURIComponent(id), { method:'PATCH', body:JSON.stringify({ mood:'対応済み' }) })
        .then(function(r){ if(!r.ok) throw new Error('PATCH ' + r.status); });
      p.then(function(){
        D.bugs.forEach(function(b){ if(String(b.id) === String(id)) b.mood = '対応済み'; });
        render();
      }).catch(function(e){ logLine('ERR', 'bugfin ' + (e && e.message)); btn.disabled = false; window.alert('更新できませんでした。'); });
    };
  });
}

/* ============================================================
   タブ 4 設定
   ============================================================ */
var SET_FIELDS = [
  { k:'entry_code',       nm:'合言葉',                  hint:'登録のときにご記入いただく言葉です。' },
  { k:'admin_emails',     nm:'管理者のメールアドレス',  hint:'カンマ区切りで複数ご記入いただけます。' },
  { k:'line_contact_url', nm:'Re:che専用LINE のURL',    hint:'お問い合わせ画面のボタンの行き先になります。' },
  { k:'notice',           nm:'ホームのお知らせ',        hint:'空にすると表示されません。' }
];
function renderSettings(){
  var h = '<div class="card"><div class="ttl">設定</div><p class="lead">保存すると、受講者の画面にすぐ反映されます。</p>';
  SET_FIELDS.forEach(function(f){
    var v = D.settings[f.k] == null ? '' : D.settings[f.k];
    h += '<div class="field"><label for="st_' + f.k + '">' + esc(f.nm) + '</label>';
    h += (f.k === 'notice')
      ? '<textarea id="st_' + f.k + '" rows="3">' + esc(v) + '</textarea>'
      : '<input id="st_' + f.k + '" type="text" value="' + esc(v) + '">';
    h += '<div class="hint">' + esc(f.hint) + '</div></div>';
  });
  h += '<button class="btn" id="stSave" type="button">保存する</button><div id="stMsg"></div></div>';
  setView(h);
  on(byId('stSave'), 'click', function(){
    var btn = byId('stSave'), msg = byId('stMsg');
    var rows = SET_FIELDS.map(function(f){ return { key:f.k, value:String((byId('st_' + f.k) || {}).value || '') }; });
    if(btn) btn.disabled = true;
    var p = PREVIEW ? Promise.resolve() : SB.from('manabi_settings').upsert(rows, { onConflict:'key' }).then(function(r){ if(r.error) throw r.error; });
    p.then(function(){
      rows.forEach(function(r){ D.settings[r.key] = r.value; });
      if(msg) msg.innerHTML = '<div class="ok" style="margin:10px 0 0;">保存しました。</div>';
      if(btn) btn.disabled = false;
    }).catch(function(e){
      logLine('ERR', 'settings ' + (e && e.message));
      if(msg) msg.innerHTML = '<div class="err" style="margin:10px 0 0;">保存できませんでした。</div>';
      if(btn) btn.disabled = false;
    });
  });
}

/* ============================================================
   タブ 5 講座一覧
   ============================================================ */
function renderLessons(){
  var ls = D.lessons.slice().sort(function(a, b){
    if(a.kind !== b.kind) return String(a.kind).localeCompare(String(b.kind));
    return (a.sort_order || 0) - (b.sort_order || 0) || String(a.title).localeCompare(String(b.title), 'ja');
  });
  var pub = ls.filter(function(l){ return l.is_published !== false; }).length;
  var h = '<div class="card"><div class="ttl">講座一覧</div><p class="lead">公開 ' + pub + '件　/　全 ' + ls.length + '件。切り替えると受講者の画面に反映されます。</p></div>';
  h += '<div class="card"><div class="scroll"><table class="tbl"><thead><tr><th>種類</th><th>タイトル</th><th>カテゴリ</th><th>公開</th></tr></thead><tbody>';
  if(!ls.length) h += '<tr><td colspan="4"><div class="empty">講座がありません。</div></td></tr>';
  ls.forEach(function(l){
    var c = null; D.categories.forEach(function(x){ if(x.id === l.category_id) c = x; });
    h += '<tr><td>' + esc(kindLabel(l.kind)) + '</td><td class="wrap">' + esc(l.title) + '</td><td>' + esc(c ? c.name : (l.year_month || '—')) + '</td>';
    h += '<td><button class="chip' + (l.is_published !== false ? ' on' : '') + '" data-p="' + esc(l.id) + '" type="button">' + (l.is_published !== false ? '公開' : '非公開') + '</button></td></tr>';
  });
  h += '</tbody></table></div></div>';
  var v = setView(h);
  if(!v) return;
  Array.prototype.forEach.call(v.querySelectorAll('[data-p]'), function(btn){
    btn.onclick = function(){
      var id = btn.getAttribute('data-p'), l = null;
      D.lessons.forEach(function(x){ if(x.id === id) l = x; });
      if(!l) return;
      var want = !(l.is_published !== false);
      btn.disabled = true;
      var p = PREVIEW ? Promise.resolve() : SB.from('manabi_lessons').update({ is_published:want }).eq('id', id).then(function(r){ if(r.error) throw r.error; });
      p.then(function(){ l.is_published = want; render(); })
       .catch(function(e){ logLine('ERR', 'publish ' + (e && e.message)); btn.disabled = false; window.alert('切り替えできませんでした。'); });
    };
  });
}
function kindLabel(k){
  return ({ course:'講座', monthly:'月1講座', interview:'インタビュー', manual:'マニュアル', news:'新着情報', page:'ご案内' })[k] || '講座';
}

/* ============================================================
   起動
   ============================================================ */
function render(){
  showTabs(true);
  var t = byId('atabs');
  if(t) Array.prototype.forEach.call(t.querySelectorAll('.chip'), function(c){ c.classList.toggle('on', c.getAttribute('data-t') === TAB); });
  if(TAB === 'health') return renderHealth();
  if(TAB === 'bugs') return renderBugs();
  if(TAB === 'settings') return renderSettings();
  if(TAB === 'lessons') return renderLessons();
  return renderMembers();
}
function wireTabs(){
  var t = byId('atabs'); if(!t) return;
  Array.prototype.forEach.call(t.querySelectorAll('.chip'), function(c){
    c.addEventListener('click', function(){ TAB = c.getAttribute('data-t'); render(); });
  });
  var m = byId('detM');
  if(m) m.addEventListener('click', function(ev){ if(ev.target === m) m.classList.remove('on'); });
}
function start(){
  return loadAll().then(function(){
    var pill = byId('apill');
    if(pill) pill.textContent = ME && ME.email ? ME.email : '管理';
    render();
  });
}
function bootReal(){
  if(PREVIEW){
    ME = { email:'preview@example.com', role:'admin' };
    return start();
  }
  if(!window.supabase || !window.supabase.createClient) throw new Error('SDK');
  SB = window.supabase.createClient(CFG.url, CFG.anon, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:false } });
  return SB.auth.getSession().then(function(r){
    var s = r && r.data && r.data.session;
    if(!s){ renderLogin(''); return null; }
    return SB.from('manabi_profiles').select('user_id,email,name,role').eq('user_id', s.user.id).maybeSingle()
      .then(function(pr){
        var role = (pr && pr.data && pr.data.role) || 'student';
        ME = { id:s.user.id, email:s.user.email || '', role:role };
        if(role !== 'admin'){ renderNotAdmin(); return null; }
        return start();
      });
  });
}
function boot(){
  initDebug();
  wireTabs();
  var timer = null;
  var limit = new Promise(function(_, rej){ timer = setTimeout(function(){ rej(new Error('TIMEOUT')); }, 8000); });
  var started;
  try{ started = bootReal(); }
  catch(e){ started = Promise.reject(e); }
  Promise.race([started, limit])
    .catch(function(e){
      logLine('ERR', 'boot ' + (e && e.message ? e.message : e));
      showTabs(false);
      setView('<div class="card" style="max-width:420px; margin:0 auto;"><div class="ttl">いま開くことができませんでした</div>' +
        '<p class="lead">通信の状況をご確認のうえ、読み込み直してください。' + esc(VER) + '</p>' +
        '<button class="btn" id="aDead" type="button">読み込み直す</button></div>');
      on(byId('aDead'), 'click', function(){ location.reload(); });
    })
    .then(function(){ hideLoad(); }, function(){ hideLoad(); });
  if(timer) setTimeout(function(){ clearTimeout(timer); }, 8100);
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

setTimeout(function(){
  var l = byId('load');
  if(l && !l.classList.contains('off')){ logLine('ERR', 'loading guard'); hideLoad(); }
}, 8500);

})();
