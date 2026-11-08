# apps リポジトリ：Claude Code 向けルール

個人用Webアプリを1リポジトリにまとめ、GitHub Pages で公開する。スマホの Claude アプリ（Code タブ）から依頼される前提。

## 公開の仕組み
- `main` に push すると `.github/workflows/pages.yml` が動き、全アプリをビルドして Pages に公開する
- 公開URL：`https://superduperohiolife-lgtm.github.io/apps/<アプリのフォルダ名>/`
- トップページ（`https://superduperohiolife-lgtm.github.io/apps/`）は `tools/build_index.py` が各アプリの `app.json` から自動生成する

## 新しいアプリを作るとき
1. フォルダ名は英小文字・数字・ハイフン（例：`suburi-counter`）。既存フォルダと重ねない
2. 必須ファイル
   - `<app>/index.html`（またはビルドで `<app>/dist/index.html` を生成）
   - `<app>/app.json`：`{"title": "表示名", "description": "1行説明", "icon": "絵文字1文字"}`
   - `<app>/README.md`：日本語で、何をするアプリか・使い方・注意点
3. ビルドが要る場合は `<app>/build.sh` を置く。Actions がそのフォルダで `bash build.sh` を実行し、`<app>/dist/` をそのアプリとして公開する。`build.sh` がなければフォルダをそのまま公開する
4. 作業は **`main` に直接 commit・push してよい**（依頼者が PR を求めた場合だけブランチ＋PR）
5. push 後、Actions の完了を待てる場合は公開URLで表示を確認し、URLを依頼者に伝える

## 技術方針（依頼者の既定）
- Pages は静的のみ。APIキー等の秘匿値はコード・リポジトリに置かない。キーが要る処理は Google Apps Script（Web App）経由
- データ保存は端末内（localStorage等）を基本。共有が要る場合は Google Sheets を簡易DBとして GAS 経由
- 課金APIの利用や有料化が要る場合は、作る前に依頼者へ確認
- 文字コード UTF-8・改行 LF。コメント・README は日本語、コミット prefix は英語可（feat:, fix: 等）
- モバイル（縦画面）優先。日本語フォントは端末標準、英数字は system-ui で可
- 外部CDNより、必要ライブラリは npm で取得してフォルダ内に同梱する方を優先（オフラインで動く）
- 言語・フレームワーク・対象環境が依頼から決まらない場合は、作る前に依頼者へ確認

## してはいけないこと
- 他のアプリのフォルダを無断で変更・削除しない
- `.github/workflows/pages.yml` と `tools/` の変更は依頼があったときだけ
