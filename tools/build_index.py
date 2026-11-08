"""各アプリの app.json を読み、_site/index.html（アプリ一覧）を生成する"""
import html, json, pathlib, sys

site = pathlib.Path(sys.argv[1])
apps = []
for meta in sorted(site.glob("*/app.json")):
    try:
        d = json.loads(meta.read_text(encoding="utf-8"))
    except Exception as e:  # 壊れた app.json は一覧から外すだけ
        print("skip", meta, e)
        continue
    apps.append({"slug": meta.parent.name, **d})

cards = "\n".join(
    f'<a class="card" href="./{html.escape(a["slug"])}/">'
    f'<span class="ic">{html.escape(a.get("icon", "📱"))}</span>'
    f'<span><b>{html.escape(a.get("title", a["slug"]))}</b>'
    f'<small>{html.escape(a.get("description", ""))}</small></span></a>'
    for a in apps) or "<p>まだアプリがない</p>"

page = f"""<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Apps</title>
<style>
body{{margin:0;background:#0b1a2e;color:#f4f1ea;font-family:"Meiryo UI",system-ui,sans-serif;padding:20px}}
h1{{font-size:22px;margin:4px 0 16px}}
.card{{display:flex;gap:14px;align-items:center;background:#13253f;border:1px solid #2a4368;border-radius:14px;
padding:14px;margin-bottom:10px;color:inherit;text-decoration:none}}
.ic{{font-size:30px}} b{{display:block;font-size:17px}} small{{color:#a9b6c9;font-size:13px}}
</style></head><body>
<h1>Apps</h1>
{cards}
</body></html>
"""
(site / "index.html").write_text(page, encoding="utf-8", newline="\n")
print(f"{len(apps)} apps")
