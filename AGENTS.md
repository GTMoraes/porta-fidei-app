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
- O Gabriel sobe as mudanças por git, no clone `porta-fidei-app\repo\` do laptop (desde a 0.6.3): o Claude grava ali os arquivos, conferidos por hash, e ele roda `git add -A`, `git commit -m "<versão>"` e `git push`. Workflows: a ponte não grava em `.github\`; vão em `PARA-A-PASTA-.github-workflows\` (ignorada pelo git) e ele move. Até a 0.6.2 era pelo upload do site, com as pastas `_subir/<versão>/`.

## Porta Fidei: Android

- O mesmo código serve iPhone e Android. Diferenças ficam em `Platform.OS` (nunca mudar o comportamento do iPhone ao mexer no Android).
- Ícones: o app usa nomes de SF Symbols; no Android, `src/ui/icones-android.ts` traduz cada nome para o Material Symbols. **Nome de ícone novo no app = acrescentar o par nesse arquivo** (sem par, aparece um pontinho).
- Android não tem o recuo automático do iOS: cabeçalho sólido (`app/_layout.tsx`), `<Fundo aba>` nas abas (desce o conteúdo abaixo da barra de status) e `<Fundo>` nas outras telas (sobe acima da barra de navegação e do teclado).
- Sem `ActionSheetIOS` direto: use `mostrarOpcoes` (`src/ui/Opcoes.tsx`). Sem `DateTimePicker` direto: use `SeletorData` (`src/ui/Data.tsx`). O alerta do Android aceita no máximo 3 botões.
- PDF no Android: o WebView não mostra PDF, então `app/pdf.tsx` desenha com o pdf.js (cdnjs).
- Build: `build-apk.yml` (ubuntu) gera o APK assinado e manda para o servidor (link secreto `APK_LINK`). versionCode = 100 + número da execução. A chave de assinatura nunca muda (sem ela o Android não atualiza por cima). Secrets: `ANDROID_KEYSTORE_B64`, `ANDROID_KEYSTORE_SENHA`, `GOOGLE_MAPS_ANDROID_KEY`, `GOOGLE_SERVICES_JSON_B64` (Firebase, projeto `portafidei-app`; o `google-services.json` não vai para o repositório).
- Atualização pelo ar: `ota.yml` exporta iOS e Android e `scripts/publicar-ota.mjs` publica uma de cada, **cada plataforma com o seu runtime** (iPhone no `runtimeVersion` "1"; Android no `android.runtimeVersion` "2" desde o APK com Firebase). Módulo nativo só de uma plataforma: sobe só o runtime dela. Os APKs de runtime 1 ficaram parados na última versão pelo ar deles, que mostra o card "Atualize o app".
- Notificações no Android: Firebase (FCM). O app registra o token com `plataforma: 'android'` (`src/estado/push.ts`, só a partir do runtime 2) e cria o canal `avisos`; o servidor manda mensagem só de dados (`title`, `message`, `body`, `channelId`), que o expo-notifications mostra mesmo com o app fechado. Push silencioso = sem título.
- APK novo (algo nativo mudou): o servidor diz o runtime do APK mais novo (`/api/android/atual`) e a Hoje mostra "Atualize o app" quando ele é maior que o do aparelho (`src/estado/apkNovo.ts`). Com o `expo-intent-launcher` (runtime 2 em diante) o app baixa e abre o instalador; nos APKs antigos, abre a página do link secreto no navegador. **Subir o runtime do Android = APK novo para todos**; prefira mudanças que vão pelo ar.
- Barra de abas: no iPhone é a nativa (`NativeTabs`); no Android é desenhada pelo app (`src/ui/AbasAndroid.tsx`, abas JS de `expo-router/js-tabs`), translúcida com desfoque (`expo-blur`, só Android 12+) e brasão grande. As abas ficam dentro de um `BlurTargetView` e a barra fora dele. Telas de aba usam `useFolgaAbas()` no fim da lista. O `expo-blur` já estava nas builds (iPhone e Android), por isso tudo isso foi pelo ar.

## Porta Fidei: visual

- Cores só pela paleta (`usePaleta()`, `src/tema.ts`): Claro no padrão do iPhone (fundo branco, cartões `#F2F2F7`, textos em preto e cinzas neutros), Sépia (papel) e Escuro (azul-noite liso, títulos em branco). Superfície cheia com texto branco (botão principal, "Rezar agora"): `c.vinhoCheio` / `c.ouroCheio`.
- Títulos: `...fonteTitulo(tamanho, alturaDaLinha)`. Sempre em negrito; sem serifa (fonte do sistema) por padrão, com serifa (Baskerville) em Ajustes › Fonte dos títulos. A sem serifa entra 10% menor. O título do leitor (HTML) segue o mesmo ajuste.
- Ícones: o app vai até o iOS 16.4, e os iPhone 8 e X param no iOS 16. SF Symbol que só existe a partir do iOS 17 precisa de um par em `SO_NO_IOS_17` (`src/ui/base.tsx`), senão aparece vazio nesses aparelhos.
- Mãos em oração: não existem no SF Symbols nem no Material, e o `hands.sparkles` da Apple parece palmas. No app, `hands.sparkles` é desenhado pelo `Icone` com o ícone próprio `src/ui/icones/maos-em-oracao.png` (1x/2x/3x, fonte em `.svg`; vai pelo ar, pintado com `tintColor`). Usar só para oração. Jornadas: `figure.hiking`; santos: `person.crop.circle`; não usar `sparkles` (lembra "IA").
- Logo completa da Comunidade (PNGs da Comunicação): `src/comunidade/logo-horizontal*.png` e `logo-vertical*.png` (versão branca no tema escuro). Ficam em `src/` para irem pelo ar; em `assets/` disparariam build.
- Pendente para a próxima build: tela de abertura do modo escuro com o brasão branco (`app.json` › `expo-splash-screen` › `dark.image`).
- Cabeçalho das abas (`TituloTela`): só o título grande, começando um pouco abaixo da barra de status; explicação, quando precisa (Agenda), vai embaixo (`sub`), nunca acima.
- Hoje, nesta ordem: dia litúrgico, Oração Pessoal (proposta da semana e jornadas), Rezar agora, Próximas missas e eventos (data em destaque, `LinhaEvento comData`), Avisos (cartões com a faixa dourada), Para hoje (atalhos pequenos). Os títulos dessas seções são fortes (`<Secao grande>`). Os botões de cada Hora saíram da Hoje: ficam em Rezar › Liturgia das Horas.
- Rezar, Ajustes e Comunidade: na aba, uma linha por seção (título, descrição e ícone num quadrado colorido, `Linha quadrado` com as cores de `Quadrado` em `src/tema.ts`); o toque abre a página da seção. Rezar e Ajustes: rota `/secao`, conteúdo em `src/secoes/`. Comunidade: rota `/pagina`, conteúdo em `src/comunidade/sobre.ts`. A Comunidade chama de "Comissões" (não "Ministérios").
- Rezar (desde a 0.6.5, juntou a antiga tela do dia): título com a folhinha da data à direita (dourada quando o dia não é hoje; abre o calendário), busca, card do dia (`CartaoDoDia`, o mesmo da Hoje; toque mostra as leituras do dia), Próprios do dia (Liturgia Diária, vida do santo, memórias facultativas, Outros santos, Missal do dia), Meus favoritos e as seções. Os abertos recentemente ficam na tela de busca, antes de digitar. O card do dia da Hoje leva ao Rezar; `/dia` ficou só como atalho para links antigos.
- Data do Rezar (`src/estado/dataRezar.ts`): tudo o que se abre pelo Rezar e depende do dia segue essa data (Horas, Liturgia Diária, Missal, santos, proposta da semana e jornadas, que recebem `data`). A Hoje mostra sempre hoje, mas passar por ela não muda a data do Rezar (desde a 0.6.10). Volta para hoje: app fechado (não é guardada), mais de 5 minutos em segundo plano, dia que muda e toque no card do dia da Hoje (`abrirRezarHoje`). De volta ao Rezar com outro dia escolhido, a folhinha dá um pulso dourado. Aberto num dia de propósito (`abrirRezarNoDia`, pelo Calendário litúrgico, e `abrirRezarHoje`, pelo card da Hoje), o Rezar sobe para o topo e pulsa mesmo em hoje (`pegarDestaqueRezar`, desde a 0.6.11). Para abrir o Rezar num dia de outra tela: `abrirRezarNoDia(data)` (usa `router.dismissTo`: `router.navigate` de uma tela por cima das abas empilharia outra cópia delas).
- Datas: evento em duas linhas (`quandoEvento`: "Quarta, 28 de outubro, às 18h" / "até quinta, 12 de novembro"); aviso compacto (`dataHoraCurta`: "28/10 | 15h30 → 12/11 | 23h59"). Cor litúrgica para mostrar: `NOME_COR` (no feminino: "branca", "vermelha").
- Telas que andam de dia em dia (Liturgia das Horas, Liturgia Diária): tocar na data abre o calendário litúrgico do mês (`SeletorDataLiturgica`, `src/ui/CalendarioLiturgico.tsx`, a mesma grade da tela Calendário litúrgico). A barra de cima tem só a data; a celebração fica embaixo do título (pedido do seminarista). A memória facultativa é uma linha discreta embaixo da data, que abre as opções do dia.
- Calendário litúrgico: "Solenidades e festas do mês" (Solenidade dourada, Festa vinho); a chave do fim da lista acrescenta as memórias obrigatórias (cor neutra), guardada em `memoriasNoCalendario`. Abre no dia do Rezar; se o Rezar está noutro dia, esse dia tem anel dourado na grade e uma legenda ("Dia aberto no Rezar"); hoje fica com o contorno fino de sempre. Atalhos: Rezar › Consulta, Hoje e o botão "Litúrgico" no alto da Agenda (palavra e ponto na cor litúrgica de hoje; não acompanha a data do Rezar, porque a Agenda é sempre de hoje em diante).
- Listas longas em níveis (`app/lista.tsx`, `EM_NIVEIS`: Comuns e ofícios votivos, Orações, Rituais, Missal, Salmos): primeiro os títulos dos grupos; o toque abre a mesma rota com `grupo`. A busca do alto procura em tudo.
- Instrução Geral (IGLH): o índice do começo, as setas ↑ e as notas voltam a ser links (`src/conteudo/iglh.ts`; no HTML, `data-ir` = id do destino, rolado pelo script de `paginaHtml`).
- Rotinas (horários fixos que se repetem: missas da semana, adoração, grupos, comissões), cadastradas em Administração › Rotinas (servidor `comunidade.js`, vêm em `/api/comunidade`). Lógica em `src/comunidade/rotinas.ts` (dias em que caem, texto "Segunda a sexta"). Aparecem na aba Comunidade › Horários e encontros (`comunidade/Horarios.tsx`, todas) e na Agenda em linhas finas, sem ícone (`LinhaRotina`), com a chave "Mostrar rotinas" (as de hoje aparecem sempre) e só as comissões marcadas em Ajustes › Sua comissão (`suasComissoes`; `['*']` = todas). O calendário da Agenda só marca eventos pontuais.
- Exceções de rotina (desde a 0.6.11): cancelar ou mudar o horário de uma rotina só num dia, pela tela do dia (`app/rotina-dia.tsx`, aberta pela linha da Agenda ou pelo lembrete) › Administração (`app/editar-excecao.tsx`). Servidor: tabela `pf_app.rotina_excecoes` (uma por rotina e dia), `POST/DELETE /api/admin/rotinas/:id/excecoes[/:data]`, vêm em `/api/comunidade` como `excecoes` (de 7 dias atrás em diante). A notificação e o aviso (que vence no fim do dia) vão pelas rotas de sempre, chamadas pelo app. `ocorrencias(rotinas, de, ate, excecoes)` já devolve o dia cancelado (`situacao: 'cancelado'`), o original da mudança (`remarcado`, com `novo`) e o novo horário (`remarcada`, com `original`); a Agenda mostra os três mesmo com "Mostrar rotinas" desligado.
- Lembretes (notificações locais, `src/estado/lembretes.ts`; a lógica pura, testável fora do app, em `lembretesRegras.ts`): horas canônicas (todo dia) e, por item, orações com lembrete sugerido pela Comunidade (`Oracao.lembrete`, uma regra como a das rotinas, definida em Administração › Orações), jornadas (o começo) e rotinas. Escolha por item em `lembretesItens` (`'oracao:<id>'`, `'jornada:<id>'`, `'rotina:<id>'` → `{vespera, noDia, antes}`), pelo sino da tela do item (`escolherLembrete`) ou em Ajustes › Lembretes, que também tem os horários (`horaVespera`, `horaNoDia`, `minutosAntes`). Agendamos até 45 dias à frente e reagendamos quando a pessoa muda algo e quando os dados do servidor mudam (rotina cancelada pula o lembrete; remarcada lembra no novo horário). O iPhone guarda no máximo 64 agendadas: as horas e as 60 menos as horas mais próximas.
- Gestos (`src/ui/Deslizar.tsx`, react-native-gesture-handler + Reanimated): os calendários trocam de mês arrastando para o lado (`DeslizarMes`); no Calendário litúrgico e no seletor de data, tocar em "Novembro 2026" mostra os 12 meses para saltar de mês e ano. Na Agenda, só o seletor de cima troca entre Missas e eventos e Avisos: tocar ou arrastar a bolha (`Segmentos`, `src/ui/Segmentos.tsx`, como a barra de abas); arrastar o resto da tela não troca de seção. O arquivar dos avisos só ativa para a esquerda. Gesto dentro de `Modal` precisa de `GestureHandlerRootView` em volta (Android).
- Santo Rosário (`src/conteudo/rosario.ts`, desde a 0.6.13; recolhido na 0.6.14): o texto vem do pacote, e o app põe por cima, em `app/texto.tsx`, as partes da Comunidade. Abertura: Ato de contrição, Oferecimento e Pai-Nosso abrem ao tocar; o Credo fica aberto; as três Ave-Marias são "Deus Salve Maria, filha de Deus Pai" etc., cada uma com "(Ave Maria)" que abre a oração, e um terço de 3 contas. Cada mistério, montado de novo: título ("Primeiro Mistério Gozoso:" + nome longo; no índice, o nome curto por `data-indice`), figura, Meditação fechada (toque: a meditação breve e "mais meditação…"; depois a leitura com a virtude e "menos…"), Evangelho fechado com a referência à vista, (breve silêncio), "- Pai Nosso" e "- 10 Ave Marias" (abrem a oração), terço de 10 e, dali em diante, o original (Glória, jaculatória da Comunidade). No fim ficam Agradecimento e Salve Rainha; saem a Oração final e a Ladainha (que continua como oração à parte). Os textos (meditações e leituras escritas para o app e aprovadas pelo Gabriel em 07/11/2026, jaculatória, Pai-Nosso e Ave-Maria) ficam no código por exceção: não têm direitos de ninguém; o Evangelho continua o do pacote. O comportamento e o estilo (abre e fecha, meditação em estágios, terço de 3 ou 10 contas com botão que só avança) são `JS_ROSARIO` e `cssRosario` de `src/conteudo/terco.ts`, que `paginaHtml` só inclui nas páginas que têm essas partes. Esses toques não mostram nem escondem a barra; mandam `{ tipo: 'conta', fim }` e `{ tipo: 'dobra' }` para a vibração. A busca na página abre o trecho fechado (`window.pfMostrar`). Trecho do pacote que não for achado fica como está.
- Textos da Comunidade (`src/comunidade/html.ts`): linha em branco separa parágrafos; linha que começa com "# " vira título de parte (vermelho, entra no índice do leitor; serve para juntar várias orações num item só, como a Devoção ao Sagrado Coração); linha curta terminada em ":" vira negrito só no começo do parágrafo ou depois de frase terminada. Título que começa com "As 12" é tomado por citação bíblica pelo índice ("Is 12"): escrever por extenso.
- Favoritos e recentes (`src/estado/favoritos.ts`): além dos textos do pacote, guardam orações, propostas e jornadas da Comunidade (`itemComunidade`, arquivo `@oracao:<id>` etc.); abrir sempre por `abrirSalvo`.
- Android, ícones cheios (`star.fill`, `heart.fill`): desenhados com a fonte Material Symbols Filled (`src/ui/simbolosCheios.android.ts`; o arquivo sem `.android` deixa a fonte fora do pacote do iPhone).
