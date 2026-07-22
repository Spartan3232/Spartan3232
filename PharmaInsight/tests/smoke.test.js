#!/usr/bin/env node
// Bağımlılıksız statik regresyon testi — `npm test` ile çalışır, tarayıcı/Playwright
// gerektirmez (yalnızca Node 18+). Amaç: her değişiklikten sonra hızlıca çalıştırılabilen
// bir güvenlik ağı olmak (CLAUDE.md: "Değişiklikten önce mevcut fonksiyonların regresyon
// testleri çalıştırılmalıdır", "Yeni özellik tamamlanmadan önce konsol hatası sıfır olmalıdır").
//
// Bu test GERÇEK bir tarayıcıda çalıştırmaz; onclick/CSS/JS tutarlılığını statik olarak
// doğrular. Görsel/etkileşimli değişikliklerden sonra ayrıca Playwright ile gerçek bir
// tarayıcıda gezinme testi yapılması önerilir (bkz. docs/ACCEPTANCE_TESTS.md).
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
let failures = 0;
function check(name, cond, detail) {
  if (cond) {
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`);
  }
}

console.log('1) Build çalıştırılıyor...');
execFileSync('node', [path.join(ROOT, 'tools/build.js')], { stdio: 'inherit' });
const distPath = path.join(ROOT, 'dist/PharmaInsight_Command_Center.html');
const html = fs.readFileSync(distPath, 'utf8');
check('dist dosyası üretildi', fs.existsSync(distPath));

console.log('2) Gömülü veri geçerli JSON mu?');
const dataMatch = html.match(/<script type="application\/json" id="embeddedData">([\s\S]*?)<\/script>/);
check('embeddedData script bloğu bulundu', !!dataMatch);
if (dataMatch) {
  try {
    const data = JSON.parse(dataMatch[1]);
    check('embeddedData geçerli JSON', true);
    check('embeddedData beklenen anahtarları içeriyor', ['sel', 'ziyaret', 'havuz', 'siparis', 'real'].every(k => k in data), 'eksik anahtar');
  } catch (e) {
    check('embeddedData geçerli JSON', false, e.message);
  }
}

console.log('3) Her onclick="fn(...)" çağrısının bir karşılığı var mı? (ölü buton kontrolü)');
const JS_KEYWORDS = new Set(['if', 'for', 'while', 'switch', 'return', 'typeof', 'new']);
const onclicks = [...html.matchAll(/onclick="([a-zA-Z_$][\w$]*)\(/g)].map(m => m[1]).filter(f => !JS_KEYWORDS.has(f));
const uniqueFns = [...new Set(onclicks)];
const definedFns = new Set([
  ...[...html.matchAll(/function\s+([a-zA-Z_$][\w$]*)\s*\(/g)].map(m => m[1]),
  ...[...html.matchAll(/(?:^|[;\n])\s*([a-zA-Z_$][\w$]*)\s*=\s*function\s*\(/g)].map(m => m[1]),
  ...[...html.matchAll(/(?:^|[;\n])\s*(?:const|let|var)\s+([a-zA-Z_$][\w$]*)\s*=\s*\([^)]*\)\s*=>/g)].map(m => m[1]),
  ...[...html.matchAll(/(?:^|[;\n])\s*(?:const|let|var)\s+([a-zA-Z_$][\w$]*)\s*=\s*[a-zA-Z_$][\w$]*\s*=>/g)].map(m => m[1]),
]);
const deadButtons = uniqueFns.filter(fn => !definedFns.has(fn));
check(`${uniqueFns.length} benzersiz onclick fonksiyonunun tamamı tanımlı`, deadButtons.length === 0, 'tanımsız: ' + deadButtons.join(', '));

console.log('4) Bilinen regresyonlar tekrar girmemiş mi?');
check('growSave sabit score:60 regresyonu yok', !html.includes('score:60,'));
check('growSave sabit score:75 regresyonu yok', !html.includes('score:75,'));
check('MAX_SELECTION_TARGET adlandırılmış sabiti mevcut', html.includes('MAX_SELECTION_TARGET'));
check('versiyon etiketi tutarlı (v6.0 · 360 Workspace)', html.includes('v6.0 · 360 Workspace') && !html.includes('v5.0 · GROW Competency'));

console.log('5) Dosya içine gömülü bir gizli anahtar var mı? (olmamalı)');
check('sk-ant- biçiminde gömülü anahtar yok', !/sk-ant-[a-zA-Z0-9_-]{10,}/.test(html));
check("'Bearer ' ile başlayan gömülü token yok", !/Bearer [a-zA-Z0-9_.-]{10,}/.test(html));

console.log('\n' + (failures === 0 ? `TÜMÜ BAŞARILI (${uniqueFns.length} onclick, ${Object.keys(JSON.parse(dataMatch[1])).length} veri anahtarı kontrol edildi)` : `${failures} KONTROL BAŞARISIZ`));
process.exit(failures === 0 ? 0 : 1);
