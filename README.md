# Re:che オンライン教材（新版）

merone.co.jp（WordPress）の会員向けコンテンツサイトを、同じ機能のまま自社製に置き換えたものです。
公開する「器」だけを GitHub Pages に置き、講座の本文と画像は Supabase に置いてログイン後にだけ読めるようにしています。

公開URL（予定）: https://kumiko0814.github.io/reche-manabi/

---

## 1. ファイル

| ファイル | 役割 |
|---|---|
| `index.html` | 利用者向け。ハッシュルーティングの1枚もの |
| `app.js` | 利用者向けのすべての画面とデータ層 |
| `admin.html` / `admin.js` | 管理画面（`role=admin` のみ） |
| `style.css` | おたすけ君テーマの共通スタイル |
| `config.js` | 接続先とモードの設定 |
| `assets/` | 正式ロゴ（`reche-logo-transparent.png`）と公式ちびキャラ（`kumiko-head-avatar.png`） |
| `local/sample.json` | プレビュー用の見本データ（取り込み担当が作成。無くても内蔵の見本で動きます） |
| `qa/` | Playwright で撮ったスクリーンショット |

キャッシュ対策として `?v=20260917b` を script / link に付けています。中身を更新したら
`config.js` の `version` と各 HTML の `?v=` を同じ値にそろえて上げてください。

---

## 2. 動かし方

### プレビュー（Supabase なしで見る）

```
open "index.html?preview=1"
open "admin.html?preview=1"
```

- `local` モードで動きます。`local/sample.json` があればそれを読み、無ければ `app.js` 内の内蔵見本（講座3本＋カテゴリ構造）を使います。
- 進捗はブラウザの中だけに残ります。合言葉の初期値は `reche2026`。
- `file://` で直接開いた場合はブラウザの制限で `local/sample.json` を読めないため、内蔵見本になります。
  `sample.json` を確かめたいときは `python3 -m http.server` などでローカルに配信してから開いてください。

### 本番（Supabase）

`config.js` の `mode` を `supabase` のままにします。テーブル作成前は講座を読めないため、
ようこそ画面までは出て、登録の段階で案内が出ます。

```js
window.MANABI = {
  url: 'https://inrvprlyobghviklulcv.supabase.co',
  anon: 'sb_publishable_...',   // 公開キー
  mode: 'supabase',
  version: '20260917b'
};
```

### 調べもの用

- `?debug=1` … 画面内にエラーログのパネルを出します（`window.onerror` / `unhandledrejection` / `console.error`）。
- 右下の「困ったとき」… 読み込み直しと Re:che専用LINE への導線。利用者向けの緊急脱出です。
- `index.html` の末尾に起動保険の小さなスクリプトがあります。`app.js` や外部の部品が読み込めなかったときだけ、6秒後に「読み込んでいます」を消して「困ったとき」を出します。`app.js` が動いたときは `window.__manabiBooted` が立つので、保険側は何もしません。
- 「ようこそ」と「お問い合わせ」はログイン前でも開きます。合言葉が分からないときや画面が開かないときに、連絡先までたどり着けるようにしています。

---

## 3. データ層（DataSource）

画面のコードは `local` でも `supabase` でも同じものを使います。切り替えは `config.js` と `?preview=1` だけです。

```
init / user / onAuth
signUp / signIn / signOut / verifyEntry / touch / setName
loadContent  -> { categories[], lessons[], settings{} }
loadPublicSettings -> { line_contact_url, notice }   （ログイン前でも取れる）
loadProgress -> { lesson_id: done_at }
setProgress(lessonId, done)
logEvent(kind, lessonId)
signImages(paths) -> { path: signedUrl }
```

- `supabase` は `supabase-js v2`（jsDelivr の UMD）を使います。
- 講座本文の `__IMG__/img/<wp_id>/<file>` は、講座を開くときに `storage.from('manabi').createSignedUrls(paths, 3600)` で署名URLに差し替えます。取れなかった画像は「画像を読み込めませんでした（通信状況をご確認ください）」に置き換わります。
- 講座一覧は `localStorage`（`manabi_cache_content_v1`）に控えます。起動に失敗したときは前回の一覧を出す「避難モード」に入り、画面上部に案内と LINE への導線が出ます。
- 完了の記録はサーバーの応答を待ってから表示を変えます。送れなかったときは端末に控え（`manabi_pending_v1`）、次に開いたときにまとめて送ります。

---

## 4. 画面

利用者（`index.html`）

| ルート | 内容 |
|---|---|
| `#/welcome` | 登録（メール・パスワード・お名前・合言葉）／ログイン |
| `#/` | 挨拶・つづきから・進みぐあい・最近ふえた講座・お知らせ |
| `#/courses` `#/courses/<catId>` | 2階層カテゴリ＋レベル＋タグの絞り込み、完了マーク |
| `#/lesson/<id>` | 本文・動画（16:9）・完了トグル・前へ／次へ・関連リンク |
| `#/monthly` | 月1講座（年月ごと） |
| `#/interviews` `#/manual` `#/news` `#/welfare` `#/contact` | それぞれの一覧・本文・ご案内 |
| `#/search` | タイトルと本文の部分一致（ブラウザ側） |
| `#/progress` | カテゴリ別バー・完了一覧・LINE用コピー・動作確認セルフチェック |
| `#/me` | 名前変更・ログアウト・不具合を報告・困ったとき |

管理（`admin.html`・`role=admin` のみ）

- 受講者一覧（要ケアの色分け：14日以上=橙／30日以上=テラコッタ）、行タップで詳細と進捗リセット
- CSV 書き出し、LINE 文面の一括生成（圧ゼロの文面）
- ヘルスチェック5項目（ログイン／表の用意／書き込みと読みもどし／画像の署名URL／講座件数）
- 不具合の受信箱（`ailab_notes` の `member_id='bug_reche-manabi'`）
- 設定（合言葉・管理者メール・LINE URL・お知らせ）
- 講座一覧（`is_published` の公開トグル）

---

## 5. 不具合の報告先

画面左下の「不具合を報告」は、既存の `ailab_notes` テーブルへ anon キーで POST します。

| 列 | 入れているもの |
|---|---|
| `member_id` | `bug_reche-manabi` |
| `member_name` | `Re:cheオンライン教材` |
| `mood` | `バグ報告`（対応済みにすると `対応済み`） |
| `worry` | 本文＋お名前・メール |
| `want` | URL と UA |

`ailab_notes` の実際の列は `worry` / `want` です（BUILD_SPEC の `note` に相当する列が無いため、
AIカルテの `index.html` / `kanri.html` と同じ入れ方にそろえています）。管理画面の受信箱もこの形で読みます。

---

## 6. これから（未着手）

- Supabase のテーブル作成・Storage・初期データ投入は `setup/`（別途）。Management API トークン（`sbp_`）が要ります。
- したがって Supabase モードでの実データ確認は未実施です。プレビュー（`local`）での確認のみ済んでいます。
- `local/sample.json` は取り込み担当が作成中です。
