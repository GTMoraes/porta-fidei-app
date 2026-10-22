// Faz a build "release" do Android ser assinada com a chave da Comunidade (e não com a de debug
// que o Expo prebuild deixa). A chave vem do GitHub Secrets pelo ambiente:
//   PF_KEYSTORE (caminho do .p12), PF_KEYSTORE_SENHA (senha do arquivo e da chave), alias "porta-fidei".
// Uso: node scripts/assinar-android.mjs android/app/build.gradle

import fs from 'node:fs';

const p = process.argv[2] || 'android/app/build.gradle';
let g = fs.readFileSync(p, 'utf8');
if (g.includes('signingConfigs.release')) {
  console.log('build.gradle já assina com a chave de release');
  process.exit(0);
}
const antes = g;
g = g.replace(
  /signingConfigs \{\n/,
  `signingConfigs {
        release {
            storeFile file(System.getenv('PF_KEYSTORE'))
            storePassword System.getenv('PF_KEYSTORE_SENHA')
            keyAlias 'porta-fidei'
            keyPassword System.getenv('PF_KEYSTORE_SENHA')
            storeType 'pkcs12'
        }
`,
);
g = g.replace(/(\n        release \{\n(?:(?!\n        \}).)*?)signingConfig signingConfigs\.debug/s, '$1signingConfig signingConfigs.release');
if (g === antes || !g.includes('signingConfig signingConfigs.release')) {
  console.error('::error::Não achei onde pôr a assinatura no build.gradle (o modelo do Expo mudou?)');
  process.exit(1);
}
fs.writeFileSync(p, g);
console.log('build.gradle: release assinada com a chave da Comunidade');
