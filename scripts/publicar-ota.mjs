// Publica no servidor da Comunidade a atualização pelo ar gerada por
// `npx expo export --platform ios --platform android` (o servidor publica uma para cada plataforma).
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
// cada plataforma pode ter o seu runtimeVersion (android.runtimeVersion / ios.runtimeVersion no app.json):
// quando o Android ganha um módulo nativo que o iPhone não tem, só o runtime dele sobe
const runtimeDe = (p) => (expoConfig[p] && expoConfig[p].runtimeVersion) || expoConfig.runtimeVersion;
const plataformas = Object.keys(metadata.fileMetadata);
for (const p of plataformas) {
  if (typeof runtimeDe(p) !== 'string' || !runtimeDe(p)) {
    console.error(`::error::app.json precisa de "runtimeVersion" em texto (${p})`);
    process.exit(1);
  }
}

async function enviar(envio, p) {
  const corpo = fs.readFileSync(path.join(pasta, p));
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    const r = await fetch(`${base}/api/ota/envio/${envio}/${p}`, {
      method: 'PUT',
      headers: { 'X-OTA-Chave': chave, 'Content-Type': 'application/octet-stream' },
      body: corpo,
    }).catch((e) => ({ ok: false, status: 0, text: async () => e.message }));
    if (r.ok) return corpo.length;
    console.warn(`tentativa ${tentativa} de ${p}: ${r.status} ${await r.text()}`);
  }
  console.error(`::error::Não consegui enviar ${p}`);
  process.exit(1);
}

// uma publicação por plataforma (cada uma com o seu runtime e os seus arquivos)
const publicadas = [];
for (const p of plataformas) {
  const fm = metadata.fileMetadata[p];
  const envio = `${Date.now()}-${p}`;
  const arquivos = [fm.bundle, ...fm.assets.map((a) => a.path)];
  for (const [i, a] of arquivos.entries()) {
    const bytes = await enviar(envio, a);
    console.log(`${p} ${i + 1}/${arquivos.length} ${a} (${bytes} bytes)`);
  }
  const runtime = runtimeDe(p);
  const r = await fetch(`${base}/api/ota/envio/${envio}/publicar`, {
    method: 'POST',
    headers: { 'X-OTA-Chave': chave, 'Content-Type': 'application/json' },
    body: JSON.stringify({ runtime, metadata: { ...metadata, fileMetadata: { [p]: fm } }, expoConfig }),
  });
  const t = await r.text();
  if (!r.ok) {
    console.error(`::error::O servidor recusou a publicação (${p}): ${r.status} ${t}`);
    process.exit(1);
  }
  const j = JSON.parse(t);
  const pub = (j.publicadas ?? [{ plataforma: 'ios', id: j.id, arquivos: j.arquivos }]).find((x) => x.plataforma === p);
  if (!pub) {
    console.warn(`::warning::O servidor não publicou para ${p} (ota.js antigo no pf-app?)`);
    continue;
  }
  console.log(`Publicada (${p}): runtime ${runtime}, atualização ${pub.id}`);
  publicadas.push({ ...pub, runtime });
}
if (process.env.GITHUB_STEP_SUMMARY)
  fs.appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `### Atualização pelo ar publicada\n${publicadas.map((p) => `- ${p.plataforma === 'ios' ? 'iPhone' : 'Android'}: runtime ${p.runtime}, ${p.arquivos} arquivos`).join('\n')}\n\nOs aparelhos com a build do mesmo runtime baixam ao abrir o app e passam a usar na abertura seguinte.\n`,
  );
