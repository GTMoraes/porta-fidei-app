This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Porta Fidei: build x atualização pelo ar

- O app tem atualização pelo ar própria (expo-updates apontando para o servidor pf-app: `/api/ota/manifest`).
- `.github/workflows/ota.yml` publica sozinho a cada push que mexe em `src/`. `build-ipa.yml` só roda quando muda `package.json`, `app.json`, `assets/` ou pelo botão "Run workflow".
- **Regra:** sempre que entrar algo nativo (módulo novo, plugin, permissão, entitlement), suba `runtimeVersion` no `app.json` ("1" → "2"...). Sem isso, o código novo iria pelo ar para builds que não têm o módulo e o app quebraria.
- A chave do conteúdo (`extra.chaveConteudo`) não vai no manifest público: o app guarda a da build na primeira abertura (`src/conteudo/remoto.ts`).
- **Textos litúrgicos nunca entram neste repositório** (ele é público). O app lê os textos do pacote `pf-conteudo.zip`, instalado no aparelho a partir do CDN privado; aqui fica só a lógica (calendário, qual texto vale em cada dia). Orações próprias da Comunidade moram no servidor, não no código.
- **Chaves nunca no código:** `OTA_CHAVE`, `PF_CHAVE_CONTEUDO` e as de assinatura da Apple ficam só nos Secrets do GitHub e no `.env` do servidor.
- O Gabriel sobe as mudanças pelo upload web do GitHub, a partir de uma pasta `_subir/<versão>/` só com os arquivos alterados.

## Porta Fidei: Android

- O mesmo código serve iPhone e Android. Diferenças ficam em `Platform.OS` (nunca mudar o comportamento do iPhone ao mexer no Android).
- Ícones: o app usa nomes de SF Symbols; no Android, `src/ui/icones-android.ts` traduz cada nome para o Material Symbols. **Nome de ícone novo no app = acrescentar o par nesse arquivo** (sem par, aparece um pontinho).
- Android não tem o recuo automático do iOS: cabeçalho sólido (`app/_layout.tsx`), `<Fundo aba>` nas abas (desce o conteúdo abaixo da barra de status) e `<Fundo>` nas outras telas (sobe acima da barra de navegação e do teclado).
- Sem `ActionSheetIOS` direto: use `mostrarOpcoes` (`src/ui/Opcoes.tsx`). Sem `DateTimePicker` direto: use `SeletorData` (`src/ui/Data.tsx`). O alerta do Android aceita no máximo 3 botões.
- PDF no Android: o WebView não mostra PDF, então `app/pdf.tsx` desenha com o pdf.js (cdnjs).
- Build: `build-apk.yml` (ubuntu) gera o APK assinado e manda para o servidor (link secreto `APK_LINK`). versionCode = 100 + número da execução. A chave de assinatura nunca muda (sem ela o Android não atualiza por cima). Secrets: `ANDROID_KEYSTORE_B64`, `ANDROID_KEYSTORE_SENHA`, `GOOGLE_MAPS_ANDROID_KEY`.
- Atualização pelo ar: `ota.yml` exporta iOS e Android e `scripts/publicar-ota.mjs` publica uma de cada, **cada plataforma com o seu runtime** (hoje as duas usam o `runtimeVersion` "1"; para separar, `android.runtimeVersion` ou `ios.runtimeVersion` no `app.json`). Módulo nativo só de uma plataforma: sobe só o runtime dela. O push silencioso só existe no iPhone por enquanto (Android sem Firebase).
- Barra de abas: no iPhone é a nativa (`NativeTabs`); no Android é desenhada pelo app (`src/ui/AbasAndroid.tsx`, abas JS de `expo-router/js-tabs`), translúcida com desfoque (`expo-blur`, só Android 12+) e brasão grande. As abas ficam dentro de um `BlurTargetView` e a barra fora dele. Telas de aba usam `useFolgaAbas()` no fim da lista. O `expo-blur` já estava nas builds (iPhone e Android), por isso tudo isso foi pelo ar.
