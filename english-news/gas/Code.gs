/**
 * English News 配信用 Web App
 * - Drive の非公開フォルダにある sNN.json（スクリプト＋単語）と sNN.mp3（音声）を返す
 * - 素材づくり用：フォルダ内の録画（動画）を分割して返す／作った sNN.json・sNN.mp3 を書き込む
 *   （PC を使わずに、Claude の作業環境から録画の取り込みと素材の配置をするため）
 * - フォルダIDは Script Properties「FOLDER_ID」に保持（コードに書かない）
 * - デプロイ：実行ユーザー＝自分／アクセスできるユーザー＝全員。URL自体を合鍵として扱い、公開リポジトリに書かない
 */
var CHUNK_MAX = 10 * 1024 * 1024; // 1回に返す最大バイト数（10MB）

function doGet(e) {
  var p = (e && e.parameter) || {};
  var out;
  try {
    var folder = folder_();
    if (p.action === 'list') {
      out = { sessions: listSessions_(folder) };
    } else if (p.action === 'data' || p.action === 'audio') {
      if (!/^s\d{2}$/.test(p.id || '')) throw new Error('bad id');
      var f = fileByName_(folder, p.id + (p.action === 'data' ? '.json' : '.mp3'));
      if (!f) throw new Error('not found');
      var blob = f.getBlob();
      out = p.action === 'data'
        ? JSON.parse(blob.getDataAsString('UTF-8'))
        : { mime: 'audio/mpeg', b64: Utilities.base64Encode(blob.getBytes()) };
    } else if (p.action === 'files') {
      // フォルダ内の全ファイル（ゴミ箱を除く）。新しい録画を探すため
      out = { files: listFiles_(folder) };
    } else if (p.action === 'chunk') {
      // 録画などを start バイト目から len バイトだけ返す（大きいファイルを分割して取り込むため）
      out = chunk_(folder, p.fileId, Number(p.start || 0), Number(p.len || CHUNK_MAX));
    } else {
      out = { ok: true };
    }
  } catch (err) {
    out = { error: String(err && err.message || err) };
  }
  return json_(out);
}

// 素材の書き込み：sNN.json / sNN.mp3 だけ。同名の旧ファイルはゴミ箱へ移して置き換える
// 本文：{"action":"put","name":"s03.json","mime":"application/json","b64":"…"}
function doPost(e) {
  var out;
  try {
    var b = JSON.parse(e.postData.contents);
    if (b.action !== 'put') throw new Error('bad action');
    if (!/^s\d{2}\.(json|mp3)$/.test(b.name || '')) throw new Error('bad name');
    var folder = folder_();
    var olds = [], it = folder.getFilesByName(b.name);
    while (it.hasNext()) { var o = it.next(); if (!o.isTrashed()) olds.push(o); }
    var blob = Utilities.newBlob(Utilities.base64Decode(b.b64), b.mime || 'application/octet-stream', b.name);
    var nf = folder.createFile(blob);
    olds.forEach(function (o) { o.setName('old_' + Date.now() + '_' + b.name); o.setTrashed(true); });
    out = { ok: true, id: nf.getId(), size: nf.getSize(), replaced: olds.length };
  } catch (err) {
    out = { error: String(err && err.message || err) };
  }
  return json_(out);
}

function folder_() {
  return DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('FOLDER_ID'));
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function fileByName_(folder, name) {
  var it = folder.getFilesByName(name);
  while (it.hasNext()) { var f = it.next(); if (!f.isTrashed()) return f; }
  return null;
}

function listFiles_(folder) {
  var files = folder.getFiles(), out = [];
  while (files.hasNext()) {
    var f = files.next();
    if (f.isTrashed()) continue;
    out.push({ id: f.getId(), name: f.getName(), mime: f.getMimeType(), size: f.getSize(), created: f.getDateCreated().getTime() });
  }
  return out.sort(function (a, b) { return b.created - a.created; });
}

function chunk_(folder, fileId, start, len) {
  if (!fileId) throw new Error('no fileId');
  var f = DriveApp.getFileById(fileId);
  // このフォルダ内のファイルだけ返す
  var inFolder = false, ps = f.getParents();
  while (ps.hasNext()) if (ps.next().getId() === folder.getId()) inFolder = true;
  if (!inFolder) throw new Error('not in folder');
  var size = f.getSize();
  len = Math.min(len, CHUNK_MAX, size - start);
  if (start < 0 || len <= 0) return { size: size, start: start, len: 0, b64: '' };
  var res = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + fileId + '?alt=media', {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), Range: 'bytes=' + start + '-' + (start + len - 1) },
    muteHttpExceptions: true
  });
  var code = res.getResponseCode();
  if (code !== 206 && code !== 200) throw new Error('drive ' + code + ': ' + res.getContentText().slice(0, 200));
  var bytes = res.getContent();
  return { size: size, start: start, len: bytes.length, b64: Utilities.base64Encode(bytes) };
}

function listSessions_(folder) {
  var files = folder.getFiles(), json = {}, mp3 = {};
  while (files.hasNext()) {
    var f = files.next();
    if (f.isTrashed()) continue;
    var m = /^(s\d{2})\.(json|mp3)$/.exec(f.getName());
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

// 初回だけエディタから実行する：外部への通信（UrlFetchApp）の権限を承認するための関数
function authorizeFetch() {
  UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }
  });
}
