// Ajustes › Suas comissões (0.7.0). Em cima, as comissões da pessoa: só para ver, porque quem coloca cada um numa
// comissão é a coordenação dela (quem coordena abre a comissão daqui). Embaixo, "Ver também as reuniões de": outras
// comissões cujas reuniões a pessoa quer ver na Agenda (ex.: a de um parente); isso não a põe na comissão.
// O "ver também" fica no aparelho (`suasComissoes`, o mesmo ajuste de antes da 0.7.0: quem tinha marcado comissões
// continua vendo as mesmas reuniões). A aba Comunidade (Horários e encontros) mostra sempre todas.

import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { agruparRotinas, nomesComissoes } from '@/comunidade/rotinas';
import { mudarAjustes, useAjustes } from '@/estado/ajustes';
import { useConta } from '@/estado/conta';
import { useServidor } from '@/servidor/api';
import { Espaco, usePaleta } from '@/tema';
import { Aviso, Fundo, Icone, Linha, Secao, toque } from '@/ui/base';

const chave = (n: string) => n.trim().toLowerCase();

export default function SuasComissoes() {
  const router = useRouter();
  const c = usePaleta();
  const aj = useAjustes();
  const srv = useServidor();
  const conta = useConta();
  const rotinas = srv.comunidade?.rotinas;
  const quando = new Map((agruparRotinas(rotinas, 'comissao')[0]?.linhas ?? []).map((l) => [chave(l.comissao ?? ''), l.quando]));
  const minhas = conta?.comissoes ?? [];
  const minhasChaves = new Set(minhas.map((m) => chave(m.nome)));
  // para "ver também": as que têm reunião cadastrada, menos as da própria pessoa
  const outras = nomesComissoes(rotinas).filter((n) => !minhasChaves.has(chave(n)));
  const todas = aj.suasComissoes.includes('*');
  const marcada = (n: string) => todas || aj.suasComissoes.includes(n);
  const marca = (sim: boolean) => (sim ? <Icone nome="checkmark" tamanho={17} /> : undefined);
  const alternar = (n: string) => {
    toque();
    const atual = todas ? outras : aj.suasComissoes.filter((x) => x !== '*');
    mudarAjustes({ suasComissoes: atual.includes(n) ? atual.filter((x) => x !== n) : [...atual, n] });
  };

  return (
    <Fundo>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingTop: Espaco.l }}>
        <Secao titulo="Suas comissões">
          {!conta ? (
            <>
              <Aviso icone="person.crop.circle" texto="Entre na sua conta para ver as suas comissões." />
              <Linha titulo="Entrar ou criar conta" icone="person.crop.circle" onPress={() => router.push('/entrar')} ultimo />
            </>
          ) : minhas.length ? (
            minhas.map((m, i) => {
              const q = quando.get(chave(m.nome));
              const sub = [m.coordenador ? 'Coordenação' : 'Membro', q].filter(Boolean).join(' · ');
              return (
                <Linha
                  key={m.id}
                  titulo={m.nome}
                  sub={sub}
                  icone={m.coordenador ? 'star.circle' : 'person.2'}
                  onPress={m.coordenador ? () => router.push({ pathname: '/comissao', params: { id: m.id } }) : undefined}
                  ultimo={i === minhas.length - 1}
                />
              );
            })
          ) : (
            <Aviso icone="person.2" texto="Você ainda não está em nenhuma comissão." />
          )}
        </Secao>
        <Text style={{ color: c.textoFraco, fontSize: 13, lineHeight: 18, marginHorizontal: Espaco.xl, marginTop: -Espaco.m, marginBottom: Espaco.xl }}>
          Quem coloca cada pessoa numa comissão é a coordenação dela. As reuniões das suas comissões entram na Agenda.
        </Text>

        {outras.length ? (
          <>
            <Secao titulo="Ver também as reuniões de">
              <Linha
                titulo="Nenhuma"
                direita={marca(!todas && !aj.suasComissoes.some((n) => outras.includes(n)))}
                onPress={() => {
                  toque();
                  mudarAjustes({ suasComissoes: [] });
                }}
                seta={false}
              />
              <Linha
                titulo="Todas"
                sub="Inclui as que forem cadastradas depois"
                direita={marca(todas)}
                onPress={() => {
                  toque();
                  mudarAjustes({ suasComissoes: ['*'] });
                }}
                seta={false}
              />
              {outras.map((n, i) => (
                <Linha key={n} titulo={n} sub={quando.get(chave(n))} direita={marca(marcada(n))} onPress={() => alternar(n)} seta={false} ultimo={i === outras.length - 1} />
              ))}
            </Secao>
            <Text style={{ color: c.textoFraco, fontSize: 13, lineHeight: 18, marginHorizontal: Espaco.xl, marginTop: -Espaco.m, marginBottom: Espaco.xl }}>
              Só para ver as reuniões na Agenda: marcar aqui não coloca você na comissão. Na aba Comunidade, em Horários e encontros, aparecem sempre todas.
            </Text>
          </>
        ) : null}
        <View style={{ height: 40 }} />
      </ScrollView>
    </Fundo>
  );
}
