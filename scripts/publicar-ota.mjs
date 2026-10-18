// Publica no servidor da Comunidade a atualização pelo ar gerada por `npx expo export --platform ios`.
// Uso (no GitHub Actions): node scripts/publicar-ota.mjs dist
// Variáveis: OTA_CHAVE (Secret do GitHub, igual à do .env do servidor), OTA_URL (opcional).

import fs from 'node:fs';
import path from 'node:path';

const pasta = process.argv[2] || 'dist';
const base = (process.env.OTA_URL || 'https://portafidei.com.br/app').replace(/\/$/, '');
const chave = process.env.OTA_CHAVE || '';
if (!chave) {
  console.error('::error::Falta o Secret OTA_CHAVE');
  process.exit(1);
}

const metadata = JSON.parse(fs.readFileSync(path.join(pasta, 'metadata.json'), 'utf8'));
const expoConfig = JSON.parse(fs.readFileSync(path.join(pasta, 'expoConfig.json'), 'utf8'));
const runtime = expoConfig.runtimeVersion;
if (typeof runtime !== 'string' || !runtime) {
  console.error('::error::app.json precisa de "runtimeVersion" em texto');
  process.exit(1);
}
const ios = metadata.fileMetadata.ios;
const envio = `${Date.now()}`;
const arquivos = [ios.bundle, ...ios.assets.map((a) => a.path)];

for (const [i, p] of arquivos.entries()) {
  const corpo = fs.readFileSync(path.join(pasta, p));
  let ok = false;
  for (let tentativa = 1; tentativa <= 3 && !ok; tentativa++) {
    const r = await fetch(`${base}/api/ota/envio/${envio}/${p}`, {
      method: 'PUT',
      headers: { 'X-OTA-Chave': chave, 'Content-Type': 'application/octet-stream' },
      body: corpo,
    }).catch((e) => ({ ok: false, status: 0, text: async () => e.message }));
    ok = r.ok;
    if (!ok) console.warn(`tentativa ${tentativa} de ${p}: ${r.status} ${await r.text()}`);
  }
  if (!ok) {
    console.error(`::error::Não consegui enviar ${p}`);
    process.exit(1);
  }
  console.log(`${i + 1}/${arquivos.length} ${p} (${corpo.length} bytes)`);
}

const r = await fetch(`${base}/api/ota/envio/${envio}/publicar`, {
  method: 'POST',
  headers: { 'X-OTA-Chave': chave, 'Content-Type': 'application/json' },
  body: JSON.stringify({ runtime, metadata, expoConfig }),
});
const t = await r.text();
if (!r.ok) {
  console.error(`::error::O servidor recusou a publicação: ${r.status} ${t}`);
  process.exit(1);
}
const j = JSON.parse(t);
console.log(`Publicada: runtime ${j.runtime}, atualização ${j.id}`);
if (process.env.GITHUB_STEP_SUMMARY)
  fs.appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `### Atualização pelo ar publicada\nRuntime ${j.runtime}, ${j.arquivos} arquivos. Os iPhones com a build deste runtime baixam ao abrir o app e passam a usar na abertura seguinte.\n`,
  );
