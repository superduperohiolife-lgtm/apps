/**
 * English News 配信用 Web App
 * - Drive の非公開フォルダにある sNN.json（スクリプト＋単語）と sNN.mp3（音声）を返す
 * - フォルダIDは Script Properties「FOLDER_ID」に保持（コードに書かない）
 * - デプロイ：実行ユーザー＝自分／アクセスできるユーザー＝全員。URL自体を合鍵として扱い、公開リポジトリに書かない
 */
function doGet(e) {
  var p = (e && e.parameter) || {};
  var out;
  try {
    var folder = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('FOLDER_ID'));
    if (p.action === 'list') {
      out = { sessions: listSessions_(folder) };
    } else if (p.action === 'data' || p.action === 'audio') {
      if (!/^s\d{2}$/.test(p.id || '')) throw new Error('bad id');
      var it = folder.getFilesByName(p.id + (p.action === 'data' ? '.json' : '.mp3'));
      if (!it.hasNext()) throw new Error('not found');
      var blob = it.next().getBlob();
      out = p.action === 'data'
        ? JSON.parse(blob.getDataAsString('UTF-8'))
        : { mime: 'audio/mpeg', b64: Utilities.base64Encode(blob.getBytes()) };
    } else {
      out = { ok: true };
    }
  } catch (err) {
    out = { error: String(err && err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function listSessions_(folder) {
  var files = folder.getFiles(), json = {}, mp3 = {};
  while (files.hasNext()) {
    var f = files.next(), m = /^(s\d{2})\.(json|mp3)$/.exec(f.getName());
    if (m) (m[2] === 'json' ? json : mp3)[m[1]] = f;
  }
  return Object.keys(json).sort().filter(function (id) { return mp3[id]; }).map(function (id) {
    var d = JSON.parse(json[id].getBlob().getDataAsString('UTF-8'));
    return {
      id: id, title: d.title, date: d.date, duration: d.duration,
      vocab: (d.vocab || []).length,
      updated: Math.max(json[id].getLastUpdated().getTime(), mp3[id].getLastUpdated().getTime())
    };
  });
}
