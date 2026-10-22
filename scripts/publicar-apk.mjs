// Envia o instalador do Android (APK) para o servidor da Comunidade, em partes de 8 MB
// (o nginx do servidor não aceita corpos muito grandes de uma vez).
// Uso (no GitHub Actions): node scripts/publicar-apk.mjs caminho/do/app.apk versao versionCode
// Variáveis: OTA_CHAVE (Secret do GitHub, igual à do .env do servidor), OTA_URL (opcional).

import crypto from 'node:crypto';
import fs from 'node:fs';

const [arquivo, versao, versionCode] = process.argv.slice(2);
const base = (process.env.OTA_URL || 'https://portafidei.com.br/app').replace(/\/$/, '');
const chave = process.env.OTA_CHAVE || '';
if (!chave) {
  console.error('::error::Falta o Secret OTA_CHAVE');
  process.exit(1);
}
if (!arquivo || !versao || !versionCode) {
  console.error('uso: node scripts/publicar-apk.mjs app.apk 0.5.0 112');
  process.exit(1);
}

const tudo = fs.readFileSync(arquivo);
const sha256 = crypto.createHash('sha256').update(tudo).digest('hex');
const PARTE = 8 * 1024 * 1024;
const partes = Math.ceil(tudo.length / PARTE);
const envio = `${Date.now()}`;

for (let n = 0; n < partes; n++) {
  const corpo = tudo.subarray(n * PARTE, (n + 1) * PARTE);
  let ok = false;
  for (let tentativa = 1; tentativa <= 3 && !ok; tentativa++) {
    const r = await fetch(`${base}/api/apk/envio/${envio}/parte/${n}`, {
      method: 'PUT',
      headers: { 'X-OTA-Chave': chave, 'Content-Type': 'application/octet-stream' },
      body: corpo,
    }).catch((e) => ({ ok: false, status: 0, text: async () => e.message }));
    ok = r.ok;
    if (!ok) console.warn(`tentativa ${tentativa} da parte ${n + 1}: ${r.status} ${await r.text()}`);
  }
  if (!ok) {
    console.error(`::error::Não consegui enviar a parte ${n + 1} de ${partes}`);
    process.exit(1);
  }
  console.log(`parte ${n + 1}/${partes} (${corpo.length} bytes)`);
}

const r = await fetch(`${base}/api/apk/envio/${envio}/concluir`, {
  method: 'POST',
  headers: { 'X-OTA-Chave': chave, 'Content-Type': 'application/json' },
  body: JSON.stringify({ partes, sha256, versao, versionCode: Number(versionCode) }),
});
const t = await r.text();
if (!r.ok) {
  console.error(`::error::O servidor recusou o APK: ${r.status} ${t}`);
  process.exit(1);
}
const j = JSON.parse(t);
const mb = (j.bytes / 1048576).toFixed(1);
console.log(`APK publicado: ${j.arquivo} (${mb} MB, sha256 ${sha256})`);
if (process.env.GITHUB_STEP_SUMMARY)
  fs.appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `### Instalador do Android publicado\nVersão ${versao} (${versionCode}), ${mb} MB. Está no link secreto do servidor (APK_LINK do .env do pf-app).\n`,
  );
