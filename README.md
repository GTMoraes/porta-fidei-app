# Porta Fidei (app da Comunidade Católica Porta Fidei)

App de iPhone (e, depois, Android) da Comunidade: agenda de missas e eventos, avisos,
Liturgia das Horas, Liturgia Diária, orações, rituais, missal, salmos e calendário litúrgico.

Feito com Expo (React Native). No iPhone usa o Liquid Glass nativo do iOS 26.

## Conteúdo litúrgico
Este repositório **não contém nenhum texto litúrgico**. O app lê um *pacote de conteúdo*
(`pf-conteudo.zip`) instalado no próprio aparelho, em Ajustes › Conteúdo litúrgico.
O calendário litúrgico é calculado pelo próprio código (`src/liturgia/calendario.ts`).

## Estrutura
- `src/liturgia`: calendário (Brasil), santos, regra de qual texto vale para cada hora
- `src/conteudo`: leitura do pacote e montagem das páginas
- `src/servidor`: agenda e avisos (servidor da Comunidade)
- `src/app`: telas (expo-router)

## Build
O GitHub Actions (`.github/workflows/build-ipa.yml`) gera o `PortaFidei.ipa` sem assinatura
e publica em Releases. Teste do calendário: `npx tsx testes/teste-calendario.ts`.
