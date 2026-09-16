/* ============================================================
   Re:che オンライン教材 — 利用者向け
   ============================================================ */
(function(){
'use strict';

/* ---------- 小道具 ---------- */
var WD = ['日','月','火','水','木','金','土'];
var QS = (function(){ try{ return new URLSearchParams(location.search); }catch(e){ return { get:function(){ return null; } }; } })();
var PREVIEW = QS.get('preview') === '1';
var DEBUG   = QS.get('debug') === '1';
var CFG     = window.MANABI || {};
var VER     = CFG.version || 'dev';

function d2(n){ return (n < 10 ? '0' : '') + n; }
function toDate(v){
  if(!v) return null;
  var d = (v instanceof Date) ? v : new Date(String(v).replace(' ', 'T'));
  return isNaN(d.getTime()) ? null : d;
}
/* 端末の時計が海外に合っていても、日付と曜日は日本時間で表示する */
function jstShift(d){ return new Date(d.getTime() + 9 * 3600 * 1000); }
function fmtDate(v){
  var d = toDate(v); if(!d) return '';
  var j = jstShift(d);
  return j.getUTCFullYear() + '年' + (j.getUTCMonth()+1) + '月' + j.getUTCDate() + '日（' + WD[j.getUTCDay()] + '）';
}
function fmtYM(ym){
  if(!ym) return 'そのほか';
  var m = String(ym).match(/(\d{4})[^\d]?(\d{1,2})/);
  return m ? (m[1] + '年' + (+m[2]) + '月') : String(ym);
}
function daysSince(v){
  var d = toDate(v); if(!d) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}
function esc(s){
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function arr(v){
  if(Array.isArray(v)) return v.slice();
  if(v == null || v === '') return [];
  if(typeof v === 'string'){
    var t = v.trim();
    if(t.charAt(0) === '[' || t.charAt(0) === '{'){ try{ var p = JSON.parse(t); return Array.isArray(p) ? p : [p]; }catch(e){} }
    if(t.charAt(0) === '{' ) return [];
    return t.split(',').map(function(x){ return x.trim(); }).filter(Boolean);
  }
  return [v];
}
function byId(id){ return document.getElementById(id); }
function on(node, ev, fn){ if(node) node.addEventListener(ev, fn); }
function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function lsSet(k, v){ try{ localStorage.setItem(k, v); return true; }catch(e){ return false; } }
function lsDel(k){ try{ localStorage.removeItem(k); }catch(e){} }
function jGet(k, dflt){ var s = lsGet(k); if(!s) return dflt; try{ return JSON.parse(s); }catch(e){ return dflt; } }
function jSet(k, v){ try{ return lsSet(k, JSON.stringify(v)); }catch(e){ return false; } }

/* ---------- 画面ログ（?debug=1） ---------- */
var LOGS = [];
function logLine(tag, msg){
  var line = '[' + new Date().toLocaleTimeString('ja-JP') + '] ' + tag + ' ' + msg;
  LOGS.push(line); if(LOGS.length > 120) LOGS.shift();
  if(!DEBUG) return;
  var box = byId('dbgB'), panel = byId('dbg');
  if(!box || !panel) return;
  panel.classList.add('on');
  box.textContent = LOGS.join('\n');
  box.scrollTop = box.scrollHeight;
}
function initDebug(){
  if(!DEBUG) return;
  var panel = byId('dbg'); if(panel) panel.classList.add('on');
  on(byId('dbgX'), 'click', function(){ if(panel) panel.classList.remove('on'); });
  window.addEventListener('error', function(ev){ logLine('ERR', (ev && ev.message ? ev.message : 'error') + ' @' + (ev && ev.filename ? String(ev.filename).split('/').pop() : '') + ':' + (ev && ev.lineno ? ev.lineno : '')); });
  window.addEventListener('unhandledrejection', function(ev){
    var r = ev && ev.reason; logLine('REJ', (r && (r.message || r.error_description)) || String(r));
  });
  var ce = console.error;
  console.error = function(){ try{ logLine('CON', Array.prototype.map.call(arguments, function(a){ return (a && a.message) ? a.message : String(a); }).join(' ')); }catch(e){} ce.apply(console, arguments); };
  logLine('OK', 'ログを開始しました version=' + VER);
}

/* ---------- 内蔵の見本データ（local/sample.json が無いときだけ使う） ---------- */
var DUMMY = {
  categories: [
    { id:'setup',      name:'セットアップ', parent_id:null,    sort_order:1, description:'はじめに目を通していただく基本の内容です。' },
    { id:'setup-self', name:'自己理解',     parent_id:'setup', sort_order:1, description:'' },
    { id:'setup-base', name:'基礎',         parent_id:'setup', sort_order:2, description:'' },
    { id:'jissen',     name:'実践',         parent_id:null,    sort_order:2, description:'仕入れから出品までの手順をまとめています。' },
    { id:'jissen-shiire', name:'仕入れ',    parent_id:'jissen', sort_order:1, description:'' }
  ],
  lessons: [
    { id:'c1', wp_id:1, kind:'course', slug:'start', title:'はじめての方へ　学びの進め方', category_id:'setup-self',
      level_tags:['初心者'], search_tags:['はじめに'], year_month:'', sort_order:1, published_at:'2025-01-10T09:00:00+09:00', is_published:true,
      body_html:'<p>ここは見本の講座です。実際の講座はログイン後に読み込まれます。</p><h2>学びの進め方</h2><ul><li>上から順に読み進めてください</li><li>読み終えたら「完了にする」を押してください</li><li>あとから読み返していただいてかまいません</li></ul>',
      videos:[], links:[] },
    { id:'c2', wp_id:2, kind:'course', slug:'basic', title:'アカウントの整え方', category_id:'setup-base',
      level_tags:['初心者'], search_tags:['出品','アカウント'], year_month:'', sort_order:2, published_at:'2025-01-17T09:00:00+09:00', is_published:true,
      body_html:'<p>見本の本文です。</p><h2>整えておきたい3点</h2><ol><li>プロフィール</li><li>お支払い方法</li><li>発送のしたく</li></ol>',
      videos:[], links:[{ title:'ワークシート（見本）', url:'https://docs.google.com/document/d/example' }] },
    { id:'c3', wp_id:3, kind:'course', slug:'shiire', title:'仕入れ先の選び方', category_id:'jissen-shiire',
      level_tags:['中級者'], search_tags:['仕入れ'], year_month:'', sort_order:3, published_at:'2025-02-07T09:00:00+09:00', is_published:true,
      body_html:'<p>見本の本文です。表と画像の表示確認用に使います。</p><table><tr><th>種類</th><th>目安</th></tr><tr><td>店頭</td><td>週1回</td></tr><tr><td>オンライン</td><td>毎日</td></tr></table>',
      videos:[], links:[] },
    { id:'m1', wp_id:11, kind:'monthly', slug:'m2026-08', title:'2026年8月　月1講座', category_id:null,
      level_tags:[], search_tags:[], year_month:'2026-08', sort_order:1, published_at:'2026-08-05T20:00:00+09:00', is_published:true,
      body_html:'<p>見本の月1講座です。</p>', videos:[], links:[] },
    { id:'i1', wp_id:21, kind:'interview', slug:'iv1', title:'受講生インタビュー（見本）', category_id:null,
      level_tags:[], search_tags:[], year_month:'', sort_order:1, published_at:'2026-03-03T09:00:00+09:00', is_published:true,
      body_html:'<p>見本のインタビュー本文です。</p>', videos:[], links:[] },
    { id:'ma1', wp_id:31, kind:'manual', slug:'mn1', title:'サイトの使い方（見本）', category_id:null,
      level_tags:[], search_tags:[], year_month:'', sort_order:1, published_at:'2026-01-05T09:00:00+09:00', is_published:true,
      body_html:'<p>見本のマニュアル本文です。</p>', videos:[], links:[] },
    { id:'n1', wp_id:41, kind:'news', slug:'news-list', title:'新着情報', category_id:null,
      level_tags:[], search_tags:[], year_month:'', sort_order:1, published_at:'2026-09-01T09:00:00+09:00', is_published:true,
      body_html:'<p>見本のお知らせ本文です。</p>', videos:[], links:[] },
    { id:'p1', wp_id:51, kind:'page', slug:'welfare', title:'福利厚生など', category_id:null,
      level_tags:[], search_tags:[], year_month:'', sort_order:1, published_at:'2026-01-05T09:00:00+09:00', is_published:true,
      body_html:'<p>見本の福利厚生ページです。</p>', videos:[], links:[] }
  ],
  settings: { entry_code:'reche2026', admin_emails:'4morikawa5@gmail.com', line_contact_url:'', notice:'' }
};

/* ---------- データの形をそろえる ---------- */
function normSettings(raw){
  var out = { entry_code:'', admin_emails:'', line_contact_url:'', notice:'' };
  if(!raw) return out;
  if(Array.isArray(raw)){ raw.forEach(function(r){ if(r && r.key != null) out[r.key] = r.value == null ? '' : String(r.value); }); return out; }
  Object.keys(raw).forEach(function(k){ out[k] = raw[k] == null ? '' : String(raw[k]); });
  return out;
}
function normContent(raw){
  raw = raw || {};
  var cats = (raw.categories || []).map(function(c){
    return { id:String(c.id), name:String(c.name || ''), parent_id:(c.parent_id == null || c.parent_id === '') ? null : String(c.parent_id),
             sort_order:(+c.sort_order || 0), description:String(c.description || '') };
  });
  var les = (raw.lessons || []).map(function(l){
    return {
      id:String(l.id), wp_id:l.wp_id == null ? null : l.wp_id, kind:String(l.kind || 'course'), slug:String(l.slug || ''),
      title:String(l.title || '（無題）'), category_id:(l.category_id == null || l.category_id === '') ? null : String(l.category_id),
      level_tags:arr(l.level_tags).map(String), search_tags:arr(l.search_tags).map(String), year_month:String(l.year_month || ''),
      body_html:String(l.body_html || ''), videos:arr(l.videos), links:arr(l.links),
      sort_order:(+l.sort_order || 0), published_at:l.published_at || null, updated_at:l.updated_at || null,
      is_published:(l.is_published !== false)
    };
  }).filter(function(l){ return l.is_published; });
  return { categories:cats, lessons:les, settings:normSettings(raw.settings) };
}

/* ============================================================
   データ層（DataSource）— local と supabase で同じ形を返す
   ============================================================ */
function makeLocal(){
  var K_ACCT = 'manabi_local_acct', K_SESS = 'manabi_local_sess', K_PROG = 'manabi_local_prog';
  var content = null, user = null, cbs = [];
  function fire(){ cbs.forEach(function(f){ try{ f(user); }catch(e){} }); }
  function acct(){ return jGet(K_ACCT, null); }
  return {
    mode:'local',
    init:function(){
      var a = acct();
      if(a && lsGet(K_SESS) === '1') user = { id:a.id, email:a.email, name:a.name, role:a.role || 'student', entry_ok:!!a.entry_ok };
      return Promise.resolve();
    },
    user:function(){ return user; },
    onAuth:function(f){ cbs.push(f); },
    loadPublicSettings:function(){
      return this.loadContent().then(function(c){
        return { line_contact_url:c.settings.line_contact_url || '', notice:c.settings.notice || '' };
      });
    },
    loadContent:function(){
      if(content) return Promise.resolve(content);
      if(location.protocol === 'file:'){
        logLine('INFO', 'ファイルから直接ひらいているため、内蔵の見本データで表示します');
        content = normContent(DUMMY);
        return Promise.resolve(content);
      }
      return fetch('local/sample.json?v=' + VER)
        .then(function(r){ if(!r.ok) throw new Error('sample ' + r.status); return r.json(); })
        .catch(function(e){ logLine('INFO', '見本データを内蔵ぶんで表示します (' + (e && e.message) + ')'); return DUMMY; })
        .then(function(raw){ content = normContent(raw); return content; });
    },
    signUp:function(f){
      return this.loadContent().then(function(c){
        var want = c.settings.entry_code || 'reche2026';
        if(String(f.code || '').trim() !== String(want)) throw new Error('ENTRY');
        var a = { id:'local-' + Date.now(), email:String(f.email || '').trim(), pw:String(f.password || ''), name:String(f.name || '').trim() || 'ゲスト', role:'student', entry_ok:true };
        jSet(K_ACCT, a); lsSet(K_SESS, '1');
        user = { id:a.id, email:a.email, name:a.name, role:a.role, entry_ok:true }; fire();
        return user;
      });
    },
    signIn:function(f){
      var a = acct();
      if(!a || a.email !== String(f.email || '').trim() || a.pw !== String(f.password || '')) return Promise.reject(new Error('CRED'));
      lsSet(K_SESS, '1');
      user = { id:a.id, email:a.email, name:a.name, role:a.role || 'student', entry_ok:!!a.entry_ok }; fire();
      return Promise.resolve(user);
    },
    signOut:function(){ lsDel(K_SESS); user = null; fire(); return Promise.resolve(); },
    verifyEntry:function(code){
      return this.loadContent().then(function(c){
        var okc = String(f2(c.settings.entry_code)) === String(f2(code));
        if(okc){ var a = acct() || {}; a.entry_ok = true; jSet(K_ACCT, a); if(user) user.entry_ok = true; }
        return okc;
      });
      function f2(x){ return String(x == null ? '' : x).trim(); }
    },
    touch:function(){ return Promise.resolve(); },
    setName:function(nm){
      var a = acct() || {}; a.name = nm; jSet(K_ACCT, a); if(user) user.name = nm; return Promise.resolve();
    },
    loadProgress:function(){ return Promise.resolve(jGet(K_PROG, {}) || {}); },
    setProgress:function(id, done){
      var p = jGet(K_PROG, {}) || {};
      if(done) p[id] = new Date().toISOString(); else delete p[id];
      jSet(K_PROG, p); return Promise.resolve(p);
    },
    logEvent:function(){ return Promise.resolve(); },
    signImages:function(paths){
      var o = {}; paths.forEach(function(p){ o[p] = 'content/' + p.replace(/^\/+/, ''); }); return Promise.resolve(o);
    }
  };
}

function makeSupabase(){
  if(!window.supabase || !window.supabase.createClient) throw new Error('SDK');
  var sb = window.supabase.createClient(CFG.url, CFG.anon, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:false } });
  var content = null, user = null, cbs = [];
  function fire(){ cbs.forEach(function(f){ try{ f(user); }catch(e){} }); }
  function profileOf(au, fallbackName){
    if(!au) { user = null; return Promise.resolve(null); }
    return sb.from('manabi_profiles').select('user_id,email,name,role,entry_ok').eq('user_id', au.id).maybeSingle()
      .then(function(res){
        var p = res && res.data;
        if(!p){
          var row = { user_id:au.id, email:au.email || '', name:fallbackName || '', role:'student', entry_ok:false };
          return sb.from('manabi_profiles').upsert(row, { onConflict:'user_id' }).select().maybeSingle()
            .then(function(r2){ return (r2 && r2.data) || row; });
        }
        if(fallbackName && !p.name){
          return sb.from('manabi_profiles').update({ name:fallbackName }).eq('user_id', au.id)
            .then(function(){ p.name = fallbackName; return p; });
        }
        return p;
      })
      .catch(function(e){ logLine('WARN', 'profile ' + (e && e.message)); return { user_id:au.id, email:au.email || '', name:fallbackName || '', role:'student', entry_ok:false }; })
      .then(function(p){
        user = { id:au.id, email:p.email || au.email || '', name:p.name || '', role:p.role || 'student', entry_ok:!!p.entry_ok };
        return user;
      });
  }
  return {
    mode:'supabase', client:sb,
    init:function(){
      sb.auth.onAuthStateChange(function(evt, sess){
        if(!sess || !sess.user){ user = null; fire(); return; }
        profileOf(sess.user).then(fire);
      });
      return sb.auth.getSession().then(function(res){
        var s = res && res.data && res.data.session;
        return s && s.user ? profileOf(s.user) : null;
      });
    },
    user:function(){ return user; },
    onAuth:function(f){ cbs.push(f); },
    loadPublicSettings:function(){
      return sb.rpc('manabi_public_settings').then(function(res){
        if(res.error) throw res.error;
        var v = normSettings(res.data);
        return { line_contact_url:v.line_contact_url || '', notice:v.notice || '' };
      });
    },
    loadContent:function(){
      if(content) return Promise.resolve(content);
      return Promise.all([
        sb.from('manabi_categories').select('*').order('sort_order', { ascending:true }),
        sb.from('manabi_lessons').select('*').eq('is_published', true).order('sort_order', { ascending:true }),
        sb.rpc('manabi_public_settings')
      ]).then(function(r){
        if(r[0].error) throw r[0].error;
        if(r[1].error) throw r[1].error;
        content = normContent({ categories:r[0].data || [], lessons:r[1].data || [], settings:(r[2] && !r[2].error) ? r[2].data : null });
        return content;
      });
    },
    signUp:function(f){
      return sb.auth.signUp({ email:String(f.email || '').trim(), password:String(f.password || '') })
        .then(function(res){
          if(res.error) throw res.error;
          var au = (res.data && (res.data.user || (res.data.session && res.data.session.user))) || null;
          if(!au) throw new Error('NOUSER');
          if(!(res.data && res.data.session)){
            return sb.auth.signInWithPassword({ email:String(f.email || '').trim(), password:String(f.password || '') })
              .then(function(r2){ if(r2.error) throw r2.error; return (r2.data && r2.data.user) || au; });
          }
          return au;
        })
        .then(function(au){ return profileOf(au, String(f.name || '').trim()); })
        .then(function(){
          return sb.rpc('manabi_verify_entry', { code:String(f.code || '').trim() }).then(function(res){
            if(res.error) throw res.error;
            if(res.data !== true) throw new Error('ENTRY');
            if(user) user.entry_ok = true;
            fire(); return user;
          });
        });
    },
    signIn:function(f){
      return sb.auth.signInWithPassword({ email:String(f.email || '').trim(), password:String(f.password || '') })
        .then(function(res){ if(res.error) throw res.error; return profileOf(res.data.user); })
        .then(function(u){ fire(); return u; });
    },
    signOut:function(){ return sb.auth.signOut().then(function(){ user = null; fire(); }); },
    verifyEntry:function(code){
      return sb.rpc('manabi_verify_entry', { code:String(code || '').trim() }).then(function(res){
        if(res.error) throw res.error;
        var okc = res.data === true;
        if(okc && user){ user.entry_ok = true; fire(); }
        return okc;
      });
    },
    touch:function(){
      return sb.rpc('manabi_touch').then(function(){}).catch(function(e){ logLine('WARN', 'touch ' + (e && e.message)); });
    },
    setName:function(nm){
      if(!user) return Promise.reject(new Error('NOUSER'));
      return sb.from('manabi_profiles').update({ name:nm }).eq('user_id', user.id).then(function(res){
        if(res.error) throw res.error; user.name = nm;
      });
    },
    loadProgress:function(){
      if(!user) return Promise.resolve({});
      return sb.from('manabi_progress').select('lesson_id,done_at').eq('user_id', user.id).then(function(res){
        if(res.error) throw res.error;
        var o = {}; (res.data || []).forEach(function(r){ o[r.lesson_id] = r.done_at || new Date().toISOString(); }); return o;
      });
    },
    setProgress:function(id, done){
      if(!user) return Promise.reject(new Error('NOUSER'));
      if(done){
        var row = { user_id:user.id, lesson_id:id, done_at:new Date().toISOString(), updated_at:new Date().toISOString() };
        return sb.from('manabi_progress').upsert(row, { onConflict:'user_id,lesson_id' }).select()
          .then(function(res){ if(res.error) throw res.error; return res.data; });
      }
      return sb.from('manabi_progress').delete().eq('user_id', user.id).eq('lesson_id', id)
        .then(function(res){ if(res.error) throw res.error; return res.data; });
    },
    logEvent:function(kind, lessonId){
      if(!user) return Promise.resolve();
      return sb.from('manabi_events').insert({ user_id:user.id, lesson_id:lessonId || null, kind:kind })
        .then(function(){}).catch(function(e){ logLine('WARN', 'event ' + (e && e.message)); });
    },
    signImages:function(paths){
      if(!paths.length) return Promise.resolve({});
      return sb.storage.from('manabi').createSignedUrls(paths, 3600).then(function(res){
        if(res.error) throw res.error;
        var o = {};
        (res.data || []).forEach(function(r){ if(r && r.path && r.signedUrl) o[r.path] = r.signedUrl; });
        return o;
      });
    }
  };
}

/* ============================================================
   状態と共通処理
   ============================================================ */
var DS = null;
var C  = { categories:[], lessons:[], settings:normSettings(null) };
var P  = {};
var CACHE_KEY = 'manabi_cache_content_v1';
var PEND_KEY  = 'manabi_pending_v1';
var LAST_KEY  = 'manabi_last_lesson';
var OFFLINE   = false;
var SPX = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';

function me(){ return DS ? DS.user() : null; }
function catById(id){ for(var i = 0; i < C.categories.length; i++) if(C.categories[i].id === id) return C.categories[i]; return null; }
function topCats(){
  return C.categories.filter(function(c){ return !c.parent_id; })
    .sort(function(a, b){ return a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'ja'); });
}
function childCats(pid){
  return C.categories.filter(function(c){ return c.parent_id === pid; })
    .sort(function(a, b){ return a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'ja'); });
}
function rootOf(catId){
  var seen = 0, c = catById(catId);
  while(c && c.parent_id && seen++ < 8) c = catById(c.parent_id);
  return c;
}
function byKind(k){ return C.lessons.filter(function(l){ return l.kind === k; }); }
function sortCourse(a, b){
  var ta = toDate(a.published_at), tb = toDate(b.published_at);
  if(a.sort_order !== b.sort_order && (a.sort_order || b.sort_order)) return a.sort_order - b.sort_order;
  if(ta && tb && ta.getTime() !== tb.getTime()) return ta - tb;
  return a.title.localeCompare(b.title, 'ja');
}
function lessonsOfCat(catId){ return byKind('course').filter(function(l){ return l.category_id === catId; }).sort(sortCourse); }
function lessonById(id){ for(var i = 0; i < C.lessons.length; i++) if(C.lessons[i].id === id) return C.lessons[i]; return null; }

/* 前へ・次へ のための並び順 */
function orderedList(kind){
  if(kind === 'course'){
    var out = [];
    topCats().forEach(function(t){
      out = out.concat(lessonsOfCat(t.id));
      childCats(t.id).forEach(function(ch){ out = out.concat(lessonsOfCat(ch.id)); });
    });
    var rest = byKind('course').filter(function(l){ return out.indexOf(l) < 0; }).sort(sortCourse);
    return out.concat(rest);
  }
  if(kind === 'monthly'){
    return byKind('monthly').sort(function(a, b){
      if(a.year_month !== b.year_month) return String(b.year_month).localeCompare(String(a.year_month));
      return sortCourse(a, b);
    });
  }
  return byKind(kind).sort(sortCourse);
}

/* 進捗のまとまり（セットアップ / 実践 / 月1講座 …） */
function groups(){
  var gs = [];
  topCats().forEach(function(t){
    var ids = lessonsOfCat(t.id).map(function(l){ return l.id; });
    childCats(t.id).forEach(function(ch){ ids = ids.concat(lessonsOfCat(ch.id).map(function(l){ return l.id; })); });
    if(ids.length) gs.push({ key:'cat:' + t.id, name:t.name, ids:ids, href:'#/courses/' + encodeURIComponent(t.id) });
  });
  var mon = byKind('monthly').map(function(l){ return l.id; });
  if(mon.length) gs.push({ key:'monthly', name:'月1講座', ids:mon, href:'#/monthly' });
  return gs;
}
function doneCount(ids){ var n = 0; ids.forEach(function(i){ if(P[i]) n++; }); return n; }

/* 本文の組み立て */
function hydrateBody(box, lesson){
  var html = String(lesson.body_html || '');
  html = html.replace(/(src\s*=\s*)(["'])__IMG__\/([^"']+)\2/gi, function(all, a, q, p){
    return 'data-p=' + q + p + q + ' ' + a + q + SPX + q;
  });
  html = html.replace(/__IMG__\//g, '');
  box.innerHTML = html;
  Array.prototype.forEach.call(box.querySelectorAll('table'), function(t){
    if(t.parentNode && t.parentNode.className === 'tblwrap') return;
    var w = document.createElement('div'); w.className = 'tblwrap';
    t.parentNode.insertBefore(w, t); w.appendChild(t);
  });
  Array.prototype.forEach.call(box.querySelectorAll('a[href]'), function(a){
    if(a.getAttribute('href').charAt(0) !== '#'){ a.target = '_blank'; a.rel = 'noopener noreferrer'; }
  });
  Array.prototype.forEach.call(box.querySelectorAll('iframe'), function(f){
    if(f.parentNode && f.parentNode.className === 'vid') return;
    var w = document.createElement('div'); w.className = 'vid';
    f.parentNode.insertBefore(w, f); w.appendChild(f);
  });
  var imgs = Array.prototype.slice.call(box.querySelectorAll('img[data-p]'));
  imgs.forEach(function(im){
    im.addEventListener('error', function(){
      var d = document.createElement('div'); d.className = 'imgfail';
      d.textContent = '画像を読み込めませんでした（通信状況をご確認ください）';
      if(im.parentNode) im.parentNode.replaceChild(d, im);
    });
  });
  var paths = [];
  imgs.forEach(function(im){ var p = im.getAttribute('data-p'); if(p && paths.indexOf(p) < 0) paths.push(p); });
  if(!paths.length || !DS) return;
  DS.signImages(paths).then(function(map){
    imgs.forEach(function(im){
      var u = map[im.getAttribute('data-p')];
      if(u) im.src = u;
      else if(im.parentNode){
        var d = document.createElement('div'); d.className = 'imgfail';
        d.textContent = '画像を読み込めませんでした（通信状況をご確認ください）';
        im.parentNode.replaceChild(d, im);
      }
    });
  }).catch(function(e){
    logLine('WARN', 'image ' + (e && e.message));
    imgs.forEach(function(im){
      if(!im.parentNode) return;
      var d = document.createElement('div'); d.className = 'imgfail';
      d.textContent = '画像を読み込めませんでした（通信状況をご確認ください）';
      im.parentNode.replaceChild(d, im);
    });
  });
}

/* 講座カード */
function lessonRow(l, sub){
  var done = !!P[l.id];
  return '<a class="lesson' + (done ? ' done' : '') + '" href="#/lesson/' + encodeURIComponent(l.id) + '">' +
    '<span class="mk"><svg><use href="#i-check"></use></svg></span>' +
    '<span class="tt"><b>' + esc(l.title) + '</b>' +
    (sub ? '<em>' + esc(sub) + '</em>' : (done ? '<em>' + esc(fmtDate(P[l.id])) + ' 完了</em>' : '')) +
    '</span></a>';
}

/* 保留していた進捗をあとから送る */
function flushPending(){
  var q = jGet(PEND_KEY, []) || [];
  if(!q.length || !DS || !me()) return Promise.resolve();
  var rest = [];
  return q.reduce(function(chain, item){
    return chain.then(function(){
      return DS.setProgress(item.id, item.done).catch(function(){ rest.push(item); });
    });
  }, Promise.resolve()).then(function(){
    jSet(PEND_KEY, rest);
    if(!rest.length) logLine('OK', '保留していた記録を送りました');
  });
}

/* ============================================================
   ナビゲーション
   ============================================================ */
var SECTIONS = [
  { href:'#/courses',    label:'講座をさがす' },
  { href:'#/news',       label:'新着情報' },
  { href:'#/monthly',    label:'月1講座' },
  { href:'#/interviews', label:'インタビュー' },
  { href:'#/welfare',    label:'福利厚生など' },
  { href:'#/manual',     label:'マニュアル' },
  { href:'#/progress',   label:'学びの記録' },
  { href:'#/contact',    label:'お問い合わせ' }
];
function navHTML(cur){
  var h = '<div class="navsec"><a class="navlink' + (cur === '/' ? ' on' : '') + '" href="#/">ホーム</a></div>';
  topCats().forEach(function(t){
    var kids = childCats(t.id), direct = lessonsOfCat(t.id);
    var ids = direct.map(function(l){ return l.id; });
    kids.forEach(function(k){ ids = ids.concat(lessonsOfCat(k.id).map(function(l){ return l.id; })); });
    if(!ids.length) return;
    h += '<div class="navsec"><div class="navttl">' + esc(t.name) + '</div>';
    h += '<a class="navlink" href="#/courses/' + encodeURIComponent(t.id) + '">すべて<span class="navcount">' + doneCount(ids) + ' / ' + ids.length + '</span></a>';
    kids.forEach(function(k){
      var n = lessonsOfCat(k.id).length; if(!n) return;
      h += '<a class="navsub" href="#/courses/' + encodeURIComponent(k.id) + '">' + esc(k.name) + '<span class="navcount">' + n + '</span></a>';
    });
    h += '</div>';
  });
  h += '<div class="navsec"><div class="navttl">そのほか</div>';
  SECTIONS.forEach(function(s){
    h += '<a class="navlink' + (('#' + cur) === s.href ? ' on' : '') + '" href="' + s.href + '">' + esc(s.label) + '</a>';
  });
  h += '</div>';
  return h;
}
function paintNav(cur){
  var s = byId('side'); if(s) s.innerHTML = navHTML(cur);
  var tabs = byId('tabs');
  if(tabs) Array.prototype.forEach.call(tabs.querySelectorAll('.tab'), function(a){
    a.classList.toggle('on', a.getAttribute('data-tab') === cur);
  });
}
function openDrawer(){
  var d = byId('drawer'), pn = byId('dwpn');
  if(!d || !pn) return;
  pn.innerHTML = '<img class="logo" src="assets/reche-logo-transparent.png" width="307" height="75" alt="Re:che">' + navHTML(curPath());
  d.classList.add('on');
}
function closeDrawer(){ var d = byId('drawer'); if(d) d.classList.remove('on'); }

/* ============================================================
   ルーター
   ============================================================ */
function curPath(){
  var h = location.hash || '#/';
  return h.replace(/^#/, '') || '/';
}
function parts(){
  return curPath().replace(/^\//, '').split('/').map(function(x){ try{ return decodeURIComponent(x); }catch(e){ return x; } });
}
function go(path){ location.hash = path; }
function view(){ return byId('view'); }
function setView(html){
  var v = view(); if(!v) return null;
  v.innerHTML = html; window.scrollTo(0, 0); return v;
}

var SCREENS = {};
/* ログインしていなくても開ける画面（困ったときの導線を必ず残す） */
var OPEN_SCREENS = { welcome:1, contact:1 };
function route(){
  closeDrawer();
  var p = parts(), head = p[0] || '';
  var u = me();
  if(!u || !u.entry_ok){
    if(!OPEN_SCREENS[head]){ go('/welcome'); return; }
  } else if(head === 'welcome'){ go('/'); return; }
  var fn = SCREENS[head] || SCREENS[''];
  var hdr = byId('hdr'), tabs = byId('tabs'), side = byId('side');
  var signedIn = !!(u && u.entry_ok);
  if(hdr) hdr.hidden = !signedIn;
  if(tabs) tabs.hidden = !signedIn;
  if(side) side.style.display = signedIn ? '' : 'none';
  var pill = byId('npill');
  if(pill) pill.textContent = (u && u.name) ? (u.name + ' さん') : 'わたし';
  paintNav(signedIn ? tabKey(head) : '');
  try{ fn(p); }
  catch(e){
    logLine('ERR', 'screen ' + head + ' ' + (e && e.message));
    setView('<div class="card"><div class="ttl">画面を開けませんでした</div><p class="lead">お手数ですが、いちど読み込み直してください。それでも変わらないときは Re:che専用LINE へお知らせください。</p><button class="btn" id="rl2" type="button">画面を読み込み直す</button></div>');
    on(byId('rl2'), 'click', function(){ location.reload(); });
  }
}
function tabKey(head){
  if(head === '') return '/';
  if(head === 'courses' || head === 'lesson') return '/courses';
  if(head === 'monthly') return '/monthly';
  if(head === 'progress') return '/progress';
  if(head === 'me') return '/me';
  return '/' + head;
}

/* ============================================================
   画面 1 ようこそ
   ============================================================ */
var WMODE = 'signup';
SCREENS.welcome = function(){
  var h = '';
  if(WMODE === 'entry'){
    h += '<div class="card" style="text-align:center;">';
    h += '<img src="assets/reche-logo-transparent.png" width="307" height="75" alt="Re:che オンライン教材" style="width:200px; margin:2px auto 12px;">';
    h += '</div>';
    h += '<div class="card"><div class="ttl">合言葉のご記入</div>';
    h += '<p class="lead">ログインできました。はじめに合言葉をご記入ください。</p>';
    h += '<div id="wErr"></div>';
    h += '<div class="field"><label for="enCode">合言葉</label><input id="enCode" type="text" autocomplete="off" placeholder="お渡ししている合言葉">';
    h += '<div class="hint">合言葉は Re:che専用LINE でお伝えしています。お手元に見あたらないときは、専用LINEへひとことお送りください。</div></div>';
    h += '<button class="btn" id="enBtn" type="button">すすむ</button>';
    h += '<div class="btnrow" style="margin-top:12px;"><a class="btn ghost" href="#/contact">Re:che専用LINEへ</a>';
    h += '<button class="btn ghost" id="enOut" type="button">ログアウト</button></div></div>';
    setView(h);
    on(byId('enBtn'), 'click', doEntry);
    var ei = byId('enCode');
    if(ei) ei.addEventListener('keydown', function(e){ if(e.key === 'Enter') doEntry(); });
    on(byId('enOut'), 'click', function(){
      DS.signOut().then(function(){
        WMODE = 'login'; P = {};
        lsDel('manabi_profile_cache'); lsDel('manabi_prog_cache');
        route();
      });
    });
    return;
  }
  h += '<div class="card" style="text-align:center;">';
  h += '<img src="assets/reche-logo-transparent.png" width="307" height="75" alt="Re:che オンライン教材" style="width:200px; margin:2px auto 12px;">';
  h += '<div class="chibi" style="text-align:left;"><img src="assets/kumiko-head-avatar.png" alt="">';
  h += '<div class="bubble">Re:che のオンライン教材へようこそ。<br>ご自分のペースで、読みたいところから進めていただけます。<br><b>森川</b></div></div>';
  h += '</div>';
  h += '<div class="card">';
  h += '<div class="chips" style="margin-bottom:14px;">';
  h += '<button class="chip' + (WMODE === 'signup' ? ' on' : '') + '" id="wTs" type="button">はじめての方（登録）</button>';
  h += '<button class="chip' + (WMODE === 'login' ? ' on' : '') + '" id="wTl" type="button">ログイン</button>';
  h += '</div>';
  h += '<div id="wErr"></div>';
  if(WMODE === 'signup'){
    h += '<div id="wSignup">';
    h += '<div class="field"><label for="suName">お名前</label><input id="suName" type="text" autocomplete="name" placeholder="例）森川 花"></div>';
    h += '<div class="field"><label for="suEmail">メールアドレス</label><input id="suEmail" type="email" autocomplete="email" inputmode="email" placeholder="例）hana@example.com"></div>';
    h += '<div class="field"><label for="suPw">パスワード</label><input id="suPw" type="password" autocomplete="new-password" placeholder="6文字以上"></div>';
    h += '<div class="field"><label for="suCode">合言葉</label><input id="suCode" type="text" autocomplete="off" placeholder="お渡ししている合言葉"><div class="hint">合言葉は Re:che専用LINE でお伝えしています。お手元に見あたらないときは、専用LINEへひとことお送りください。</div></div>';
    h += '<button class="btn" id="suBtn" type="button">登録して学びはじめる</button>';
    h += '</div>';
  } else {
    h += '<div id="wLogin">';
    h += '<div class="field"><label for="liEmail">メールアドレス</label><input id="liEmail" type="email" autocomplete="email" inputmode="email"></div>';
    h += '<div class="field"><label for="liPw">パスワード</label><input id="liPw" type="password" autocomplete="current-password"></div>';
    h += '<button class="btn" id="liBtn" type="button">ログイン</button>';
    h += '<p class="muted" style="margin:12px 0 0;">パスワードが分からなくなったときは、Re:che専用LINE へお知らせください。こちらで設定し直してお伝えします。</p>';
    h += '</div>';
  }
  h += '</div>';
  setView(h);
  on(byId('wTs'), 'click', function(){ WMODE = 'signup'; route(); });
  on(byId('wTl'), 'click', function(){ WMODE = 'login'; route(); });
  on(byId('suBtn'), 'click', doSignUp);
  on(byId('liBtn'), 'click', doSignIn);
};
function wErr(msg){ var b = byId('wErr'); if(b) b.innerHTML = msg ? '<div class="err">' + esc(msg) + '</div>' : ''; }
function authMsg(e){
  var m = (e && (e.message || e.error_description)) || '';
  if(m === 'ENTRY') return '合言葉が一致しませんでした。Re:che専用LINE でご確認いただけますでしょうか。';
  if(m === 'CRED' || /Invalid login/i.test(m)) return 'メールアドレスかパスワードが一致しませんでした。もう一度ご確認ください。';
  if(/already registered|User already/i.test(m)) return 'このメールアドレスはすでに登録されています。「ログイン」からお進みください。';
  if(/Password should be/i.test(m)) return 'パスワードは6文字以上でお願いします。';
  if(/valid email|invalid format/i.test(m)) return 'メールアドレスの形をご確認ください。';
  return '手続きができませんでした。通信状況をご確認のうえ、もう一度お試しください。';
}
function doSignUp(){
  var b = byId('suBtn');
  var f = {
    name:(byId('suName') || {}).value || '', email:(byId('suEmail') || {}).value || '',
    password:(byId('suPw') || {}).value || '', code:(byId('suCode') || {}).value || ''
  };
  wErr('');
  if(!f.name.trim()){ wErr('お名前をご記入ください。'); return; }
  if(!f.email.trim()){ wErr('メールアドレスをご記入ください。'); return; }
  if(String(f.password).length < 6){ wErr('パスワードは6文字以上でお願いします。'); return; }
  if(!f.code.trim()){ wErr('合言葉をご記入ください。'); return; }
  if(b){ b.disabled = true; b.textContent = '手続き中'; }
  DS.signUp(f).then(function(){ return afterSignIn(); })
    .then(function(){ go('/'); route(); })
    .catch(function(e){ logLine('ERR', 'signup ' + (e && e.message)); wErr(authMsg(e)); if(b){ b.disabled = false; b.textContent = '登録して学びはじめる'; } });
}
function doSignIn(){
  var b = byId('liBtn');
  var f = { email:(byId('liEmail') || {}).value || '', password:(byId('liPw') || {}).value || '' };
  wErr('');
  if(!f.email.trim() || !f.password){ wErr('メールアドレスとパスワードをご記入ください。'); return; }
  if(b){ b.disabled = true; b.textContent = '確認中'; }
  DS.signIn(f).then(function(u){
    if(u && !u.entry_ok){ WMODE = 'entry'; route(); return null; }
    return afterSignIn().then(function(){ go('/'); route(); });
  }).catch(function(e){ logLine('ERR', 'signin ' + (e && e.message)); wErr(authMsg(e)); if(b){ b.disabled = false; b.textContent = 'ログイン'; } });
}
/* 合言葉の再入力（画面内フォーム） */
function doEntry(){
  var b = byId('enBtn'), code = String((byId('enCode') || {}).value || '').trim();
  wErr('');
  if(!code){ wErr('合言葉をご記入ください。'); return; }
  if(b){ b.disabled = true; b.textContent = '確認中'; }
  DS.verifyEntry(code).then(function(okc){
    if(!okc) throw new Error('ENTRY');
    return afterSignIn().then(function(){ WMODE = 'signup'; go('/'); route(); });
  }).catch(function(e){
    logLine('ERR', 'entry ' + (e && e.message));
    wErr(authMsg(e));
    if(b){ b.disabled = false; b.textContent = 'すすむ'; }
  });
}
function afterSignIn(){
  return DS.loadContent().then(function(c){
    C = c; jSet(CACHE_KEY, { at:Date.now(), data:c });
    jSet('manabi_profile_cache', me());
    return DS.loadProgress();
  }).then(function(p){
    P = p || {}; jSet('manabi_prog_cache', P);
    return flushPending();
  }).then(function(){
    return DS.loadProgress().then(function(p2){ P = p2 || P; jSet('manabi_prog_cache', P); }).catch(function(){});
  }).then(function(){ return DS.touch(); });
}

/* ============================================================
   画面 2 ホーム
   ============================================================ */
SCREENS[''] = function(){
  var u = me(), h = '';
  if(OFFLINE) h += offlineBanner();
  h += '<div class="card"><div class="ttl">' + esc(u && u.name ? u.name + ' さん、こんにちは' : 'こんにちは') + '</div>';
  h += '<p class="lead">きょうも、読みたいところからどうぞ。ひと息つきながらで大丈夫です。</p>';
  if(C.settings.notice) h += '<div class="notice">' + esc(C.settings.notice) + '</div>';
  h += '</div>';

  var last = jGet(LAST_KEY, null);
  if(last && lessonById(last.id)){
    h += '<div class="card"><div class="sttl">つづきから</div>' + lessonRow(lessonById(last.id), '前回ひらいた講座') + '</div>';
  }

  var gs = groups();
  if(gs.length){
    h += '<div class="card"><div class="sttl">学びの進みぐあい</div>';
    gs.forEach(function(g){
      var n = doneCount(g.ids), pc = g.ids.length ? Math.round(n / g.ids.length * 100) : 0;
      h += '<div class="brow"><a class="bl" href="' + g.href + '"><span>' + esc(g.name) + '</span><span class="bv">' + n + ' / ' + g.ids.length + '</span></a>';
      h += '<div class="bar"><span style="width:' + pc + '%"></span></div></div>';
    });
    h += '<a class="btn sub sm" href="#/progress" style="margin-top:4px;">記録をくわしく見る</a></div>';
  }

  var recent = C.lessons.filter(function(l){ return l.kind === 'course' || l.kind === 'monthly'; })
    .sort(function(a, b){ return (toDate(b.published_at) || 0) - (toDate(a.published_at) || 0); }).slice(0, 3);
  if(recent.length){
    h += '<div class="card"><div class="sttl">最近ふえた講座</div>';
    recent.forEach(function(l){ h += lessonRow(l, fmtDate(l.published_at)); });
    h += '<a class="btn ghost sm" href="#/news" style="margin-top:4px;">新着情報を見る</a></div>';
  }
  setView(h);
};
function offlineBanner(){
  return '<div class="warn">いまは前回ひらいたときの講座一覧を表示しています。電波のよい場所でもういちど開いていただくと、最新の内容にもどります。' +
    '<br><a href="#/contact">Re:che専用LINEへ</a></div>';
}

/* ============================================================
   画面 3 講座アーカイブ
   ============================================================ */
var FLT = { cat:'', level:'', tag:'' };
function matchFlt(l){
  if(FLT.level && l.level_tags.indexOf(FLT.level) < 0) return false;
  if(FLT.tag && l.search_tags.indexOf(FLT.tag) < 0) return false;
  return true;
}
SCREENS.courses = function(p){
  if(p[1] != null && p[1] !== '') FLT.cat = p[1];
  var courses = byKind('course');
  var levels = [], tags = [];
  courses.forEach(function(l){
    l.level_tags.forEach(function(t){ if(t && levels.indexOf(t) < 0) levels.push(t); });
    l.search_tags.forEach(function(t){ if(t && tags.indexOf(t) < 0) tags.push(t); });
  });
  var ORD = ['初心者','中級者','上級者'];
  levels.sort(function(a, b){ var ia = ORD.indexOf(a), ib = ORD.indexOf(b); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b, 'ja'); });
  tags.sort(function(a, b){ return a.localeCompare(b, 'ja'); });

  var h = '';
  if(OFFLINE) h += offlineBanner();
  h += '<div class="card"><div class="ttl">講座をさがす</div><p class="lead">気になるところから読み進めていただけます。読み終えた講座には印がつきます。</p>';
  h += '<div class="tagline">カテゴリ</div><div class="chips">';
  h += '<button class="chip' + (FLT.cat ? '' : ' on') + '" data-c="" type="button">すべて</button>';
  topCats().forEach(function(t){
    var n = lessonsOfCat(t.id).length;
    childCats(t.id).forEach(function(k){ n += lessonsOfCat(k.id).length; });
    if(!n) return;
    h += '<button class="chip' + (FLT.cat === t.id ? ' on' : '') + '" data-c="' + esc(t.id) + '" type="button">' + esc(t.name) + '</button>';
  });
  h += '</div>';
  if(levels.length){
    h += '<div class="tagline">レベル</div><div class="chips">';
    h += '<button class="chip lav' + (FLT.level ? '' : ' on') + '" data-l="" type="button">すべて</button>';
    levels.forEach(function(t){ h += '<button class="chip lav' + (FLT.level === t ? ' on' : '') + '" data-l="' + esc(t) + '" type="button">' + esc(t) + '</button>'; });
    h += '</div>';
  }
  if(tags.length){
    h += '<div class="tagline">タグ</div><div class="chips">';
    h += '<button class="chip' + (FLT.tag ? '' : ' on') + '" data-t="" type="button">すべて</button>';
    tags.forEach(function(t){ h += '<button class="chip' + (FLT.tag === t ? ' on' : '') + '" data-t="' + esc(t) + '" type="button">' + esc(t) + '</button>'; });
    h += '</div>';
  }
  if(FLT.cat || FLT.level || FLT.tag) h += '<button class="btn ghost sm" id="fclr" type="button" style="margin-top:12px;">絞り込みをもどす</button>';
  h += '</div>';

  var shown = 0, body = '';
  topCats().forEach(function(t){
    if(FLT.cat && FLT.cat !== t.id && !childCats(t.id).some(function(k){ return k.id === FLT.cat; })) return;
    var blocks = '', cnt = 0, total = 0;
    var direct = lessonsOfCat(t.id).filter(matchFlt);
    var dTotal = lessonsOfCat(t.id).length;
    if(!FLT.cat || FLT.cat === t.id){
      total += dTotal;
      if(direct.length){ direct.forEach(function(l){ blocks += lessonRow(l); cnt++; }); }
    }
    childCats(t.id).forEach(function(k){
      if(FLT.cat && FLT.cat !== t.id && FLT.cat !== k.id) return;
      var ls = lessonsOfCat(k.id);
      total += ls.length;
      var f = ls.filter(matchFlt);
      if(!f.length) return;
      blocks += '<div class="subcat">' + esc(k.name) + '</div>';
      f.forEach(function(l){ blocks += lessonRow(l); cnt++; });
    });
    if(!cnt) return;
    shown += cnt;
    body += '<div class="card catbox"><div class="cathead"><span>' + esc(t.name) + '</span><span class="n">' + cnt + '件</span></div>';
    if(t.description) body += '<p class="catdesc">' + esc(t.description) + '</p>';
    body += blocks + '</div>';
  });
  var orphan = byKind('course').filter(function(l){ return !l.category_id || !catById(l.category_id); }).filter(matchFlt);
  if(orphan.length && !FLT.cat){
    shown += orphan.length;
    body += '<div class="card catbox"><div class="cathead"><span>そのほか</span><span class="n">' + orphan.length + '件</span></div>';
    orphan.forEach(function(l){ body += lessonRow(l); });
    body += '</div>';
  }
  h += shown ? body : '<div class="card"><div class="empty">この絞り込みに合う講座はありませんでした。<br>条件をゆるめてお試しください。</div></div>';
  var v = setView(h);
  if(!v) return;
  Array.prototype.forEach.call(v.querySelectorAll('[data-c]'), function(b){ b.onclick = function(){ FLT.cat = b.getAttribute('data-c'); go('/courses'); route(); }; });
  Array.prototype.forEach.call(v.querySelectorAll('[data-l]'), function(b){ b.onclick = function(){ FLT.level = b.getAttribute('data-l'); route(); }; });
  Array.prototype.forEach.call(v.querySelectorAll('[data-t]'), function(b){ b.onclick = function(){ FLT.tag = b.getAttribute('data-t'); route(); }; });
  on(byId('fclr'), 'click', function(){ FLT = { cat:'', level:'', tag:'' }; go('/courses'); route(); });
};

/* ============================================================
   画面 4 講座ページ
   ============================================================ */
SCREENS.lesson = function(p){
  var l = lessonById(p[1] || '');
  if(!l){
    setView('<div class="card"><div class="ttl">講座が見つかりませんでした</div><p class="lead">一覧からもういちどお選びいただけますでしょうか。</p><a class="btn sub" href="#/courses">講座をさがす</a></div>');
    return;
  }
  jSet(LAST_KEY, { id:l.id, title:l.title, at:Date.now() });
  if(DS) DS.logEvent('open', l.id);

  var cat = catById(l.category_id), par = cat && cat.parent_id ? catById(cat.parent_id) : null;
  var crumb = [par && par.name, cat && cat.name].filter(Boolean).join('　＞　');
  var h = '';
  h += '<div class="card">';
  if(crumb) h += '<p class="muted" style="margin:0 0 6px;">' + esc(crumb) + '</p>';
  h += '<h1 class="ttl" style="font-size:19px; margin-bottom:8px;">' + esc(l.title) + '</h1>';
  var meta = [];
  if(l.level_tags.length) meta.push(l.level_tags.join('・'));
  if(l.year_month) meta.push(fmtYM(l.year_month));
  if(l.published_at) meta.push(fmtDate(l.published_at) + ' 公開');
  if(meta.length) h += '<p class="muted" style="margin:0;">' + esc(meta.join('　/　')) + '</p>';
  if(l.search_tags.length) h += '<div class="chips" style="margin-top:9px;">' + l.search_tags.map(function(t){ return '<span class="chip">' + esc(t) + '</span>'; }).join('') + '</div>';
  h += '</div>';

  if(l.videos.length){
    h += '<div class="card">';
    l.videos.forEach(function(v){
      var src = (typeof v === 'string') ? v : (v && (v.url || v.src || v.embed)) || '';
      if(!src) return;
      h += '<div class="vid"><iframe src="' + esc(src) + '" title="' + esc(l.title) + '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div>';
    });
    h += '</div>';
  }
  h += '<div class="card"><div class="lbody" id="lbody"></div></div>';

  if(l.links.length){
    h += '<div class="card"><div class="sttl">関連リンク</div>';
    l.links.forEach(function(k){
      var url = (typeof k === 'string') ? k : (k && (k.url || k.href)) || '';
      var ttl = (typeof k === 'string') ? k : (k && (k.title || k.text)) || url;
      if(!url) return;
      h += '<a class="linkitem" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(ttl) + '<em>' + esc(url) + '</em></a>';
    });
    h += '</div>';
  }

  h += '<div class="card" id="dbox"></div>';

  var list = orderedList(l.kind), i = -1;
  for(var n = 0; n < list.length; n++) if(list[n].id === l.id){ i = n; break; }
  var prev = i > 0 ? list[i-1] : null, next = (i >= 0 && i < list.length - 1) ? list[i+1] : null;
  h += '<div class="pnav">';
  h += prev ? '<a href="#/lesson/' + encodeURIComponent(prev.id) + '"><span class="lb">前の講座</span><span class="tt">' + esc(prev.title) + '</span></a>'
            : '<span><span class="lb">前の講座</span><span class="tt">ここが最初です</span></span>';
  h += next ? '<a class="nx" href="#/lesson/' + encodeURIComponent(next.id) + '"><span class="lb">次の講座</span><span class="tt">' + esc(next.title) + '</span></a>'
            : '<span class="nx"><span class="lb">次の講座</span><span class="tt">ここが最後です</span></span>';
  h += '</div>';

  setView(h);
  var box = byId('lbody');
  if(box) hydrateBody(box, l);
  paintDone(l);
};
function paintDone(l){
  var box = byId('dbox'); if(!box) return;
  var done = !!P[l.id];
  var h = '';
  if(done){
    h += '<div class="chibi" style="margin-bottom:12px;"><img src="assets/kumiko-head-avatar.png" alt="">';
    h += '<div class="bubble">おつかれさまでした。ひとつ進みましたね。<br><b>森川</b></div></div>';
    h += '<p class="muted" style="margin:0 0 10px;">' + esc(fmtDate(P[l.id])) + ' に完了にされています。</p>';
    h += '<button class="btn sub" id="dbtn" type="button">完了をもどす</button>';
  } else {
    h += '<p class="lead" style="margin-bottom:10px;">読み終えたら、こちらを押してください。あとからいつでも押していただけます。</p>';
    h += '<button class="btn" id="dbtn" type="button">完了にする</button>';
  }
  h += '<div id="dmsg"></div>';
  box.innerHTML = h;
  on(byId('dbtn'), 'click', function(){ toggleDone(l); });
}
function toggleDone(l){
  var btn = byId('dbtn'), msg = byId('dmsg');
  var want = !P[l.id];
  if(btn){ btn.disabled = true; btn.textContent = '保存しています'; }
  if(msg) msg.innerHTML = '';
  DS.setProgress(l.id, want).then(function(){
    if(want) P[l.id] = new Date().toISOString(); else delete P[l.id];
    jSet('manabi_prog_cache', P);
    if(DS) DS.logEvent(want ? 'done' : 'undone', l.id);
    paintDone(l); paintNav(tabKey('lesson'));
  }).catch(function(e){
    logLine('WARN', 'progress ' + (e && e.message));
    var q = jGet(PEND_KEY, []) || [];
    q = q.filter(function(x){ return x.id !== l.id; });
    q.push({ id:l.id, done:want });
    jSet(PEND_KEY, q);
    if(want) P[l.id] = new Date().toISOString(); else delete P[l.id];
    jSet('manabi_prog_cache', P);
    paintDone(l);
    var m2 = byId('dmsg');
    if(m2) m2.innerHTML = '<div class="warn" style="margin:10px 0 0;">記録はこの端末に控えました。電波のよい場所で次に開いたときに、あらためてお送りします。</div>';
  });
}

/* ============================================================
   画面 5 月1講座
   ============================================================ */
SCREENS.monthly = function(){
  var ls = orderedList('monthly');
  var h = '';
  if(OFFLINE) h += offlineBanner();
  h += '<div class="card"><div class="ttl">月1講座</div><p class="lead">毎月ひらいている講座のアーカイブです。新しい回が上にならびます。</p>';
  h += '<p class="muted" style="margin:0;">ぜんぶで ' + ls.length + '回　/　完了 ' + doneCount(ls.map(function(l){ return l.id; })) + '回</p></div>';
  if(!ls.length){ h += '<div class="card"><div class="empty">まもなく公開いたします。</div></div>'; setView(h); return; }
  var cur = null, open = false;
  ls.forEach(function(l){
    if(l.year_month !== cur){
      if(open) h += '</div>';
      cur = l.year_month; open = true;
      h += '<div class="card catbox"><div class="cathead"><span>' + esc(fmtYM(cur)) + '</span></div>';
    }
    h += lessonRow(l, l.published_at ? fmtDate(l.published_at) : '');
  });
  if(open) h += '</div>';
  setView(h);
};

/* ============================================================
   画面 6 インタビュー / マニュアル / 新着情報 / 福利厚生 / お問い合わせ
   ============================================================ */
function listScreen(kind, title, lead){
  var ls = orderedList(kind);
  var h = '';
  if(OFFLINE) h += offlineBanner();
  h += '<div class="card"><div class="ttl">' + esc(title) + '</div><p class="lead">' + esc(lead) + '</p></div>';
  if(!ls.length){ h += '<div class="card"><div class="empty">まもなく公開いたします。</div></div>'; setView(h); return; }
  h += '<div class="card">';
  ls.forEach(function(l){ h += lessonRow(l, l.published_at ? fmtDate(l.published_at) : ''); });
  h += '</div>';
  setView(h);
}
SCREENS.interviews = function(){ listScreen('interview', 'インタビュー', '先に学ばれた方のお話です。ご自分に近いところから読んでみてください。'); };
SCREENS.manual     = function(){ listScreen('manual', 'マニュアル', 'サイトの使い方や、手続きのご案内をまとめています。'); };

function pageScreen(pick, title, lead){
  var l = pick();
  var h = '';
  if(OFFLINE) h += offlineBanner();
  h += '<div class="card"><div class="ttl">' + esc(title) + '</div>';
  if(lead) h += '<p class="lead">' + esc(lead) + '</p>';
  if(l && l.published_at) h += '<p class="muted" style="margin:0;">' + esc(fmtDate(l.updated_at || l.published_at)) + ' 更新</p>';
  h += '</div>';
  if(!l){ h += '<div class="card"><div class="empty">まもなく公開いたします。</div></div>'; setView(h); return; }
  h += '<div class="card"><div class="lbody" id="lbody"></div></div>';
  setView(h);
  var box = byId('lbody'); if(box) hydrateBody(box, l);
}
SCREENS.news = function(){
  pageScreen(function(){
    var ls = byKind('news').sort(function(a, b){ return (toDate(b.published_at) || 0) - (toDate(a.published_at) || 0); });
    if(ls[0]) return ls[0];
    var pg = byKind('page');
    for(var i = 0; i < pg.length; i++) if(/news/i.test(pg[i].slug)) return pg[i];
    for(var j = 0; j < pg.length; j++) if(/ニュース|新着/.test(pg[j].title)) return pg[j];
    return null;
  }, '新着情報', '');
};
SCREENS.welfare = function(){
  pageScreen(function(){
    var ls = byKind('page');
    for(var i = 0; i < ls.length; i++) if(/welfare|fukuri/i.test(ls[i].slug) || /福利厚生/.test(ls[i].title)) return ls[i];
    return null;
  }, '福利厚生など', 'Re:che でご用意しているサポートのご案内です。');
};
SCREENS.contact = function(){
  var url = C.settings.line_contact_url || '';
  var h = '<div class="card"><div class="ttl">お問い合わせ</div>';
  h += '<p class="lead">ご質問やお困りごとは、Re:che専用LINE へお送りください。順番にお返事いたします。</p>';
  h += '<div class="chibi" style="margin-bottom:14px;"><img src="assets/kumiko-head-avatar.png" alt="">';
  h += '<div class="bubble">うまく進まないところがあれば、そのままの言葉でお知らせください。いっしょに整えていきましょう。<br><b>森川</b></div></div>';
  if(url) h += '<a class="btn" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">Re:che専用LINEをひらく</a>';
  else h += '<p class="muted" style="margin:0;">Re:che専用LINE のトークからお送りいただけます。</p>';
  h += '</div>';
  h += '<div class="card"><div class="sttl">よくあるご相談</div>';
  h += '<div class="kv"><b>合言葉が分からない</b><span>専用LINEでお伝えします</span></div>';
  h += '<div class="kv"><b>パスワードを忘れた</b><span>こちらで設定し直します</span></div>';
  h += '<div class="kv"><b>画面が開かない</b><span>右下の「困ったとき」からどうぞ</span></div>';
  h += '</div>';
  var u = me();
  if(!u || !u.entry_ok) h += '<div class="card"><a class="btn sub" href="#/welcome">ようこそ画面にもどる</a></div>';
  setView(h);
};

/* ============================================================
   画面 7 さがす
   ============================================================ */
var SQ = '';
function plain(html){
  return String(html || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
}
SCREENS.search = function(){
  var h = '<div class="card"><div class="ttl">さがす</div>';
  h += '<p class="lead">講座のタイトルと本文から、あてはまるものをさがします。</p>';
  h += '<div class="field"><input id="sq" type="search" placeholder="例）出品　撮影　値づけ" value="' + esc(SQ) + '"></div>';
  h += '<button class="btn" id="sbtn" type="button">さがす</button></div>';
  h += '<div id="sres"></div>';
  setView(h);
  var inp = byId('sq');
  on(byId('sbtn'), 'click', function(){ SQ = inp ? inp.value : ''; runSearch(); });
  if(inp) inp.addEventListener('keydown', function(e){ if(e.key === 'Enter'){ SQ = inp.value; runSearch(); } });
  if(SQ) runSearch();
};
function runSearch(){
  var box = byId('sres'); if(!box) return;
  var q = String(SQ || '').trim();
  if(!q){ box.innerHTML = ''; return; }
  var lq = q.toLowerCase();
  var hits = [];
  C.lessons.forEach(function(l){
    var txt = plain(l.body_html), t = l.title;
    var iT = t.toLowerCase().indexOf(lq), iB = txt.toLowerCase().indexOf(lq);
    if(iT < 0 && iB < 0 && l.search_tags.join(' ').toLowerCase().indexOf(lq) < 0) return;
    var snip = '';
    if(iB >= 0) snip = (iB > 20 ? '…' : '') + txt.slice(Math.max(0, iB - 20), iB + 60) + '…';
    hits.push({ l:l, snip:snip, score:(iT >= 0 ? 0 : 1) });
  });
  hits.sort(function(a, b){ return a.score - b.score; });
  if(!hits.length){ box.innerHTML = '<div class="card"><div class="empty">あてはまる講座はありませんでした。<br>別の言葉でもお試しください。</div></div>'; return; }
  var h = '<div class="card"><p class="muted" style="margin:0 0 10px;">' + hits.length + '件みつかりました</p>';
  hits.slice(0, 60).forEach(function(x){
    h += '<a class="hit" href="#/lesson/' + encodeURIComponent(x.l.id) + '"><b>' + esc(x.l.title) + '</b>' +
      '<em>' + esc(kindLabel(x.l.kind)) + (x.snip ? '　' + esc(x.snip) : '') + '</em></a>';
  });
  h += '</div>';
  box.innerHTML = h;
}
function kindLabel(k){
  return ({ course:'講座', monthly:'月1講座', interview:'インタビュー', manual:'マニュアル', news:'新着情報', page:'ご案内' })[k] || '講座';
}

/* ============================================================
   画面 8 学びの記録
   ============================================================ */
SCREENS.progress = function(){
  var gs = groups();
  var doneList = C.lessons.filter(function(l){ return !!P[l.id]; })
    .sort(function(a, b){ return (toDate(P[b.id]) || 0) - (toDate(P[a.id]) || 0); });
  var h = '';
  if(OFFLINE) h += offlineBanner();
  h += '<div class="card"><div class="ttl">学びの記録</div>';
  h += '<p class="lead">これまでに読み終えた講座のまとめです。日付を問わず、あとから完了にしていただけます。</p>';
  h += '<p class="muted" style="margin:0;">完了 ' + doneList.length + '件　/　全 ' + C.lessons.filter(function(l){ return l.kind === 'course' || l.kind === 'monthly'; }).length + '件</p></div>';

  if(gs.length){
    h += '<div class="card"><div class="sttl">カテゴリごと</div>';
    gs.forEach(function(g){
      var n = doneCount(g.ids), pc = g.ids.length ? Math.round(n / g.ids.length * 100) : 0;
      h += '<div class="brow"><div class="bl"><span>' + esc(g.name) + '</span><span class="bv">' + n + ' / ' + g.ids.length + '（' + pc + '％）</span></div>';
      h += '<div class="bar"><span style="width:' + pc + '%"></span></div></div>';
    });
    h += '</div>';
  }

  h += '<div class="card"><div class="sttl">記録をお送りするとき</div>';
  h += '<p class="lead" style="margin-bottom:10px;">下のボタンで文章をつくります。そのまま Re:che専用LINE に貼りつけていただけます。</p>';
  h += '<button class="btn sub" id="pcopy" type="button">記録をコピーする</button><div id="pcmsg"></div></div>';

  h += '<div class="card"><div class="sttl">動作確認セルフチェック</div>';
  h += '<p class="lead" style="margin-bottom:10px;">画面がうまく動いているかを、その場で確かめられます。</p>';
  h += '<button class="btn ghost" id="pchk" type="button">確認をはじめる</button><div id="pcres"></div></div>';

  h += '<div class="card"><div class="sttl">完了した講座</div><div id="pdlist">';
  if(!doneList.length) h += '<div class="empty">まずは1本、気になる講座からどうぞ。</div>';
  else doneList.forEach(function(l){ h += lessonRow(l, fmtDate(P[l.id]) + ' 完了　/　' + kindLabel(l.kind)); });
  h += '</div></div>';
  setView(h);
  on(byId('pcopy'), 'click', copyProgress);
  on(byId('pchk'), 'click', runSelfCheck);
};
function progressText(){
  var u = me(), gs = groups();
  var lines = ['Re:che オンライン教材　学びの記録'];
  lines.push('お名前：' + ((u && u.name) || ''));
  lines.push(fmtDate(new Date()) + ' 時点');
  lines.push('');
  gs.forEach(function(g){ lines.push(g.name + '　' + doneCount(g.ids) + ' / ' + g.ids.length); });
  var doneList = C.lessons.filter(function(l){ return !!P[l.id]; })
    .sort(function(a, b){ return (toDate(P[b.id]) || 0) - (toDate(P[a.id]) || 0); });
  if(doneList.length){
    lines.push('');
    lines.push('完了した講座');
    doneList.slice(0, 40).forEach(function(l){ lines.push('・' + l.title + '（' + fmtDate(P[l.id]) + '）'); });
    if(doneList.length > 40) lines.push('・ほか ' + (doneList.length - 40) + '件');
  }
  return lines.join('\n');
}
function copyProgress(){
  var txt = progressText(), msg = byId('pcmsg');
  function okmsg(){ if(msg) msg.innerHTML = '<div class="ok" style="margin:10px 0 0;">コピーしました。Re:che専用LINE に貼りつけてお送りください。</div>'; }
  function ngmsg(){
    if(msg) msg.innerHTML = '<div class="warn" style="margin:10px 0 0;">コピーができませんでした。下の文章を長押しして選び、コピーしてください。</div>' +
      '<textarea class="tmpl" readonly style="margin-top:8px;">' + esc(txt) + '</textarea>';
  }
  try{
    if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(txt).then(okmsg).catch(ngmsg); return; }
  }catch(e){}
  try{
    var ta = document.createElement('textarea');
    ta.value = txt; ta.style.position = 'fixed'; ta.style.top = '-1000px';
    document.body.appendChild(ta); ta.select();
    var okc = document.execCommand('copy');
    document.body.removeChild(ta);
    if(okc) okmsg(); else ngmsg();
  }catch(e2){ ngmsg(); }
}
/* 横はばのはみ出し。body の overflow-x:hidden に隠れないよう、要素の右端も見る。 */
function widthCheck(){
  var de = document.documentElement, bd = document.body;
  var w = de.clientWidth || window.innerWidth || 0;
  var over = [];
  if(de.scrollWidth > w + 2) over.push('画面全体');
  if(bd && bd.scrollWidth > w + 2) over.push('本文の枠');
  var sel = ['#view', '#view .card', '#view .tblwrap', '#hdr .hdin', '#tabs'];
  sel.forEach(function(q){
    var nodes = document.querySelectorAll(q);
    for(var i = 0; i < nodes.length; i++){
      var r = nodes[i].getBoundingClientRect();
      if(r.width > 0 && (r.right > w + 2 || r.left < -2)){ over.push(q); return; }
    }
  });
  var okw = over.length === 0;
  return { ok:okw, rs:okw ? 'はみ出しはありません' : ('はみ出しがあります（' + over.slice(0, 2).join('・') + '）') };
}
function runSelfCheck(){
  var box = byId('pcres'); if(!box) return;
  box.innerHTML = '<p class="muted" style="margin:10px 0 0;">確認しています</p>';
  var items = [
    { nm:'インターネットにつながっているか', run:function(){
        return Promise.resolve(navigator.onLine !== false ? { ok:true, rs:'つながっています' } : { ok:false, rs:'つながっていません' }); } },
    { nm:'ログインの状態', run:function(){
        var u = me();
        return Promise.resolve(u && u.entry_ok ? { ok:true, rs:((u.name || '') + ' さん') } : { ok:false, rs:'もう一度ログインしてください' }); } },
    { nm:'講座の読み込み', run:function(){
        return Promise.resolve(C.lessons.length ? { ok:true, rs:C.lessons.length + '件' } : { ok:false, rs:'読み込めていません' }); } },
    { nm:'記録の保存と読みもどし', run:function(){
        return DS.loadProgress().then(function(p){
          var n = Object.keys(p || {}).length;
          return { ok:true, rs:'完了 ' + n + '件を読みもどせました' };
        }).catch(function(){ return { ok:false, rs:'読みもどせませんでした' }; }); } },
    { nm:'画面の横はばの表示', run:function(){ return Promise.resolve(widthCheck()); } }
  ];
  items.reduce(function(chain, it){
    return chain.then(function(acc){
      return it.run().catch(function(){ return { ok:false, rs:'確認できませんでした' }; })
        .then(function(r){ acc.push({ nm:it.nm, ok:r.ok, rs:r.rs }); return acc; });
    });
  }, Promise.resolve([])).then(function(res){
    var h = '<div style="margin-top:10px;">';
    res.forEach(function(r){
      h += '<div class="ck ' + (r.ok ? 'pass' : 'fail') + '"><span class="st"><svg><use href="#' + (r.ok ? 'i-check2' : 'i-x') + '"></use></svg></span>' +
        '<span class="nm">' + esc(r.nm) + '</span><span class="rs">' + esc(r.rs) + '</span></div>';
    });
    h += '</div>';
    var ng = res.filter(function(r){ return !r.ok; }).length;
    h += ng ? '<div class="warn" style="margin-top:10px;">気になるところがありました。画面を読み込み直しても変わらないときは、この画面のようすを Re:che専用LINE へお送りください。</div>'
            : '<div class="ok" style="margin-top:10px;">5つとも問題ありませんでした。</div>';
    box.innerHTML = h;
  });
}

/* ============================================================
   画面 9 わたし
   ============================================================ */
SCREENS.me = function(){
  var u = me() || {};
  var h = '<div class="card"><div class="ttl">わたし</div>';
  h += '<div class="kv"><b>お名前</b><span>' + esc(u.name || '') + '</span></div>';
  h += '<div class="kv"><b>メールアドレス</b><span style="overflow-wrap:anywhere;">' + esc(u.email || '') + '</span></div>';
  h += '</div>';
  h += '<div class="card"><div class="sttl">お名前を変える</div>';
  h += '<div class="field"><input id="mname" type="text" value="' + esc(u.name || '') + '" autocomplete="name"></div>';
  h += '<button class="btn sub" id="msave" type="button">保存する</button><div id="mmsg"></div></div>';
  h += '<div class="card"><div class="sttl">困ったとき</div>';
  h += '<p class="lead" style="margin-bottom:10px;">画面が開かない、記録が残らないなど、気になることがあればお知らせください。</p>';
  h += '<div class="btnrow"><button class="btn ghost" id="mbug" type="button">不具合を報告する</button>';
  h += '<a class="btn ghost" href="#/contact">Re:che専用LINEへ</a></div></div>';
  h += '<div class="card"><div class="sttl">ログアウト</div>';
  h += '<p class="lead" style="margin-bottom:10px;">同じ端末でまた開くときは、メールアドレスとパスワードでログインしていただけます。</p>';
  h += '<button class="btn ghost" id="mout" type="button">ログアウト</button></div>';
  h += '<p class="muted" style="text-align:center; margin:16px 0 0;">Re:che オンライン教材　' + esc(VER) + '</p>';
  setView(h);
  on(byId('msave'), 'click', function(){
    var v = (byId('mname') || {}).value || '', btn = byId('msave'), msg = byId('mmsg');
    if(!String(v).trim()){ if(msg) msg.innerHTML = '<div class="err" style="margin:10px 0 0;">お名前をご記入ください。</div>'; return; }
    if(btn) btn.disabled = true;
    DS.setName(String(v).trim()).then(function(){
      if(msg) msg.innerHTML = '<div class="ok" style="margin:10px 0 0;">保存しました。</div>';
      var pill = byId('npill'); if(pill) pill.textContent = String(v).trim() + ' さん';
      if(btn) btn.disabled = false;
    }).catch(function(e){
      logLine('WARN', 'name ' + (e && e.message));
      if(msg) msg.innerHTML = '<div class="err" style="margin:10px 0 0;">保存できませんでした。通信状況をご確認ください。</div>';
      if(btn) btn.disabled = false;
    });
  });
  on(byId('mbug'), 'click', function(){ var m = byId('bugM'); if(m) m.classList.add('on'); });
  on(byId('mout'), 'click', function(){
    DS.signOut().then(function(){
      P = {}; WMODE = 'login';
      lsDel('manabi_profile_cache'); lsDel('manabi_prog_cache');
      go('/welcome'); route();
    });
  });
};

/* ============================================================
   避難モード（起動に失敗したとき・前回の講座一覧を読む）
   ============================================================ */
function makeEscape(content, profile){
  var user = profile;
  function noGo(){ return Promise.reject(new Error('ESCAPE')); }
  return {
    mode:'escape',
    init:function(){ return Promise.resolve(); },
    user:function(){ return user; },
    onAuth:function(){},
    loadContent:function(){ return Promise.resolve(content); },
    loadPublicSettings:function(){ return Promise.resolve({ line_contact_url:content.settings.line_contact_url || '', notice:content.settings.notice || '' }); },
    signUp:noGo, signIn:noGo,
    signOut:function(){ lsDel('manabi_local_sess'); user = null; return Promise.resolve(); },
    verifyEntry:function(){ return Promise.resolve(false); },
    touch:function(){ return Promise.resolve(); },
    setName:noGo,
    loadProgress:function(){ return Promise.resolve(jGet('manabi_prog_cache', {}) || {}); },
    setProgress:function(id, done){
      var q = jGet(PEND_KEY, []) || [];
      q = q.filter(function(x){ return x.id !== id; });
      q.push({ id:id, done:done });
      jSet(PEND_KEY, q);
      var p = jGet('manabi_prog_cache', {}) || {};
      if(done) p[id] = new Date().toISOString(); else delete p[id];
      jSet('manabi_prog_cache', p);
      return Promise.resolve(p);
    },
    logEvent:function(){ return Promise.resolve(); },
    signImages:function(){ return Promise.reject(new Error('ESCAPE')); }
  };
}

/* ============================================================
   不具合を報告 / 困ったとき / ドロワー
   ============================================================ */
function wireChrome(){
  on(byId('mbtn'), 'click', openDrawer);
  on(byId('dwbd'), 'click', closeDrawer);
  var bl = byId('bugL'), bm = byId('bugM');
  if(bl){ bl.hidden = false; bl.onclick = function(){ if(bm) bm.classList.add('on'); }; }
  on(byId('bugC'), 'click', function(){ if(bm) bm.classList.remove('on'); var d = byId('bugD'); if(d) d.style.display = 'none'; var e2 = byId('bugE'); if(e2) e2.hidden = true; });
  on(byId('bugS'), 'click', sendBug);
  var so = byId('sos'), sm = byId('sosM');
  if(so){ so.hidden = false; so.onclick = function(){ if(sm) sm.classList.add('on'); }; }
  on(byId('sosC'), 'click', function(){ if(sm) sm.classList.remove('on'); });
  on(byId('sosR'), 'click', function(){ location.reload(); });
  on(byId('sosL'), 'click', function(){ if(sm) sm.classList.remove('on'); });
  var tabs = byId('tabs');
  if(tabs) Array.prototype.forEach.call(tabs.querySelectorAll('.tab'), function(a){ a.addEventListener('click', closeDrawer); });
}
function sendBug(){
  var ta = byId('bugT'), btn = byId('bugS'), dn = byId('bugD');
  var er = byId('bugE');
  var t = ta ? String(ta.value || '').trim() : '';
  if(!t){ if(ta) ta.focus(); return; }
  if(er) er.hidden = true;
  if(btn) btn.disabled = true;
  function done(){
    if(dn) dn.style.display = 'block';
    if(ta) ta.value = '';
    if(btn) btn.disabled = false;
    setTimeout(function(){ var m = byId('bugM'); if(m) m.classList.remove('on'); if(dn) dn.style.display = 'none'; }, 1800);
  }
  function ng(e){
    logLine('ERR', 'bug ' + (e && e.message));
    if(btn) btn.disabled = false;
    if(er) er.hidden = false;
    else window.alert('送信できませんでした。Re:che専用LINEへ直接お知らせください。');
  }
  if(PREVIEW){ done(); return; }
  /* お名前やメールアドレスは自動では付けません（書きたい方は本文にご記入ください） */
  var body = {
    member_id:'bug_reche-manabi',
    member_name:'Re:cheオンライン教材',
    mood:'バグ報告',
    worry:t,
    want:'URL: ' + location.href.slice(0, 200) + '\nUA: ' + String(navigator.userAgent).slice(0, 200)
  };
  fetch(CFG.url + '/rest/v1/ailab_notes', {
    method:'POST',
    headers:{ apikey:CFG.anon, Authorization:'Bearer ' + CFG.anon, 'Content-Type':'application/json' },
    body:JSON.stringify(body)
  }).then(function(r){
    if(!r.ok) throw new Error('HTTP ' + r.status);
    done();
  }).catch(ng);
}

/* ============================================================
   起動
   ============================================================ */
function hideLoad(){ var l = byId('load'); if(l) l.classList.add('off'); }
function bootReal(){
  var useLocal = PREVIEW || CFG.mode === 'local';
  DS = useLocal ? makeLocal() : makeSupabase();
  logLine('OK', 'mode=' + DS.mode);
  return DS.init().then(function(){
    DS.onAuth(function(){ /* ログイン状態の変化は画面遷移で反映します */ });
    var u = me();
    if(u && !u.entry_ok) WMODE = 'entry';
    if(!u || !u.entry_ok){
      /* まだ講座は読めない。お問い合わせ画面に出す連絡先だけ取っておく。 */
      return DS.loadPublicSettings().then(function(v){
        C.settings.line_contact_url = v.line_contact_url;
        C.settings.notice = v.notice;
      }).catch(function(e){
        logLine('WARN', 'settings ' + (e && e.message));
        /* 前に開いたことがあるのに今日はつながらない、というときは
           前回の講座一覧（避難モード）に切りかえる */
        if(!u && jGet('manabi_profile_cache', null) && jGet(CACHE_KEY, null)) throw e;
      });
    }
    return afterSignIn();
  });
}
function useCache(){
  OFFLINE = true;
  var cached = jGet(CACHE_KEY, null);
  var prof = jGet('manabi_profile_cache', null);
  if(cached && cached.data && prof){
    C = normContent(cached.data);
    P = jGet('manabi_prog_cache', {}) || {};
    DS = makeEscape(C, prof);
    logLine('OK', '前回の講座一覧を表示します（' + C.lessons.length + '件）');
    return true;
  }
  return false;
}
function renderDead(){
  hideLoad();
  var hdr = byId('hdr'), tabs = byId('tabs'), side = byId('side');
  if(hdr) hdr.hidden = false;
  if(tabs) tabs.hidden = true;
  if(side) side.style.display = 'none';
  setView('<div class="card"><div class="ttl">いま開くことができませんでした</div>' +
    '<p class="lead">電波のよい場所で、もういちどお試しいただけますでしょうか。それでも変わらないときは、Re:che専用LINE へこの画面のようすをお知らせください。</p>' +
    '<div class="chibi" style="margin-bottom:14px;"><img src="assets/kumiko-head-avatar.png" alt="">' +
    '<div class="bubble">ご不便をおかけしております。こちらで確認いたしますので、お気軽にお知らせください。<br><b>森川</b></div></div>' +
    '<button class="btn" id="dead1" type="button">画面を読み込み直す</button>' +
    '<a class="btn sub" href="#/contact" style="margin-top:9px;">Re:che専用LINEへ</a></div>');
  on(byId('dead1'), 'click', function(){ location.reload(); });
}
function boot(){
  initDebug();
  wireChrome();
  window.__manabiBooted = true;   /* index.html の起動保険に「もう大丈夫」と伝える */
  var timer = null;
  var limit = new Promise(function(_, rej){ timer = setTimeout(function(){ rej(new Error('TIMEOUT')); }, 8000); });
  var started;
  try{ started = bootReal(); }
  catch(e){ started = Promise.reject(e); }
  Promise.race([started, limit])
    .then(function(){ if(timer) clearTimeout(timer); return true; })
    .catch(function(e){
      if(timer) clearTimeout(timer);
      logLine('ERR', 'boot ' + (e && e.message ? e.message : e));
      DS = null;   /* 途中で止まったデータ層は使わない（空の画面を出さないため） */
      return useCache();
    })
    .then(function(alive){
      window.addEventListener('hashchange', route);
      if(alive === false && !DS){ renderDead(); return; }
      route();
    })
    .catch(function(e){ logLine('ERR', 'route ' + (e && e.message)); renderDead(); })
    .then(function(){ hideLoad(); }, function(){ hideLoad(); });
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

/* 起動できなかったときの最後の砦（8.5秒） */
setTimeout(function(){
  var l = byId('load');
  if(l && !l.classList.contains('off')){ logLine('ERR', 'loading guard'); hideLoad(); if(!DS) renderDead(); }
}, 8500);

})();
