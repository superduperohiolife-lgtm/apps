# apps

個人用Webアプリ集。`main` に push すると GitHub Actions で全アプリをビルドし、GitHub Pages に公開する。

- 一覧：https://superduperohiolife-lgtm.github.io/apps/
- 各アプリ：`https://superduperohiolife-lgtm.github.io/apps/<フォルダ名>/`

## スマホから新しいアプリを作る
1. Claude アプリ → Code タブ → リポジトリ `superduperohiolife-lgtm/apps` を選ぶ
2. 「〇〇するアプリを作って」と依頼する（ルールは `CLAUDE.md`）
3. Claude が `main` に push → 約1分で公開

## フォルダ構成
| パス | 内容 |
|---|---|
| `<app>/index.html` | アプリ本体（静的） |
| `<app>/app.json` | 一覧に出す表示名・説明・アイコン |
| `<app>/build.sh` | 任意。あれば Actions が実行し `<app>/dist/` を公開 |
| `tools/build_index.py` | トップの一覧ページを生成 |
| `.github/workflows/pages.yml` | ビルド＆デプロイ |
