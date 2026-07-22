#!/usr/bin/env node
// PharmaInsight Command Center — tek dosyalık dist HTML üretici.
//
// Neden bir "bundler" değil de basit string birleştirme?
// Nihai teslimat kullanıcı tarafında hiçbir kurulum/derleme gerektirmeyen,
// çift tıklayarak açılan TEK bir HTML dosyası olmak zorunda (CLAUDE.md).
// src/ altındaki dosyalar aynı orijinal dosyadaki gibi klasik (non-module)
// <script> içinde art arda çalışacak şekilde tasarlandı — aralarında
// import/export yok, hepsi aynı global scope'u paylaşıyor. Bu yüzden
// derleme adımı yalnızca "doğru sırada birleştir" işlemidir; geliştirici
// makinesinde `node tools/build.js` çalıştırır, kullanıcıya yalnızca
// dist/PharmaInsight_Command_Center.html gönderilir.
//
// Kullanım: node tools/build.js [--data=path/to/data.json] [--out=dist/....html]
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

function arg(name, def) {
  const pre = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(pre));
  return hit ? hit.slice(pre.length) : def;
}

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function build() {
  const dataPath = arg('data', 'fixtures/real-data.json');
  const outPath = arg('out', 'dist/PharmaInsight_Command_Center.html');

  const dataJson = read(dataPath).trim();
  // JSON.parse ile geçerliliğini doğrula — bozuk bir fixture sessizce gömülmesin.
  JSON.parse(dataJson);
  // </script içeren bir değer (örn. bir doktor/kurum adında) gömülü scripti
  // erken kapatmasın diye kaçırılıyor; orijinal dosyanın kendi
  // downloadUpdatedHtml() fonksiyonu da aynı önlemi alıyor.
  const dataJsonSafe = dataJson.replace(/<\/script/gi, '<\\/script');

  const baseCss = read('src/styles/base.css');
  const growV5Css = read('src/styles/grow-v5.css');
  const piV6Css = read('src/styles/pi-v6-workspace.css');

  const shellHtml = read('src/shell.html');

  const mainScriptParts = [
    read('src/state.js'),
    read('src/data/shared.js'),
    read('src/data/ims-parser.js'),
    read('src/data/seleksiyon-parser.js'),
    read('src/data/ziyaret-parser.js'),
    read('src/data/havuz-parser.js'),
    read('src/data/siparis-parser.js'),
    read('src/data/index.js'),
    read('src/app/legacy-app.js'),
  ].join('\n');

  const growScript = read('src/pages/grow.js');
  const piV6Script = read('src/app/pi-v6-workspace-layer.js');

  const SCRIPT_OPEN = '<' + 'script';
  const SCRIPT_CLOSE = '<' + '/script>';
  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=5">
<meta name="theme-color" content="#07152f">
<title>PharmaInsight Command Center v6 — G3 Akdeniz</title>
${SCRIPT_OPEN} src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js">${SCRIPT_CLOSE}
<style>
${baseCss}</style>
<style id="growV5Styles">
${growV5Css}</style>
<style id="piV6Styles">
${piV6Css}</style>
</head>
<body>
${shellHtml}
${SCRIPT_OPEN} type="application/json" id="embeddedData">${dataJsonSafe}${SCRIPT_CLOSE}
${SCRIPT_OPEN}>
${mainScriptParts}
${SCRIPT_CLOSE}
${SCRIPT_OPEN} id="growV5Script">
${growScript}
${SCRIPT_CLOSE}
${SCRIPT_OPEN} id="piV6Script">
${piV6Script}
${SCRIPT_CLOSE}
</body></html>
`;

  fs.mkdirSync(path.dirname(path.join(ROOT, outPath)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, outPath), html, 'utf8');
  console.log(`✓ Yazıldı: ${outPath} (${(html.length / 1024 / 1024).toFixed(2)} MB)`);
}

build();
