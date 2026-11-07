// Seções da aba Ajustes, como nos Ajustes do iPhone: na aba, uma linha por seção (título e descrição);
// o toque abre a página da seção (rota /secao) com os ajustes dela.

import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { abrirDoacao } from '@/comunidade/Contribuir';
import { periodo } from '@/comunidade/jornadas';
import { horaCurta, nomesComissoes, textoRegra, textoSuasComissoes } from '@/comunidade/rotinas';
import { usePacote } from '@/conteudo/pacote';
import { mudarAjustes, useAjustes, type Ajustes } from '@/estado/ajustes';
import { escolherLembrete, ligado, modoDe, reagendarLembretes, textoAntes, textoModo } from '@/estado/lembretes';
import { hojeIso } from '@/liturgia/calendario';
import { useServidor } from '@/servidor/api';
import { Espaco, Marca, Quadrado, usePaleta } from '@/tema';
import { Aviso, Chave, Icone, Linha, Secao, toque } from '@/ui/base';
import { CampoData } from '@/ui/Data';

import type { InfoSecao } from './tipos';

export const SECOES_AJUSTES: InfoSecao[] = [
  { id: 'aj-oracao', titulo: 'Oração', sub: 'Tela, rolagem, timer e mais', icone: 'hands.sparkles', cor: Quadrado.vinho },
  { id: 'aj-lembretes', titulo: 'Lembretes', sub: 'Horas, devoções, jornadas e horários fixos', icone: 'bell', cor: Quadrado.verde },
  { id: 'aj-voz', titulo: 'Voz e leitura', sub: 'Leitura em voz alta e Laudes ampliada', icone: 'speaker.wave.2.fill', cor: Quadrado.azul },
  { id: 'aj-aparencia', titulo: 'Aparência', sub: 'Tema, tamanho da letra e fontes', icone: 'textformat.size', cor: Quadrado.ouro },
  { id: 'aj-conteudo', titulo: 'Conteúdo e Comunidade', sub: 'Conteúdo litúrgico, sua comissão e mais', icone: 'books.vertical', cor: Quadrado.cinza },
];

/** Linha com chave liga/desliga para um ajuste */
function useChave() {
  const aj = useAjustes();
  return (k: keyof Ajustes, titulo: string, sub: string, ultimo = false) => (
    <Linha titulo={titulo} sub={sub} direita={<Chave valor={aj[k] as boolean} mudar={(v) => mudarAjustes({ [k]: v } as Partial<Ajustes>)} />} ultimo={ultimo} />
  );
}

function Oracao() {
  const aj = useAjustes();
  const c = usePaleta();
  const chave = useChave();
  return (
    <Secao>
      {chave('telaLigada', 'Manter a tela sempre ligada', 'Manter a tela sempre ligada enquanto se reza')}
      {chave('bienal', 'Leituras do ciclo bienal', 'Leituras do Ofício das Leituras pelo ciclo bienal')}
      {chave('evangelhoAoAcaso', 'Habilitar Evangelho ao acaso', 'Possibilitar escolher o Evangelho do dia ou ao acaso')}
      {chave('iniciarMenuAberto', 'Iniciar com menu aberto', 'Iniciar o aplicativo com o menu das horas já aberto')}
      {chave('pularInstrucoes', 'Pular instruções na Proposta de Oração', 'As instruções de como rezar ficam no fim da proposta, e não no começo')}
      <View style={{ paddingHorizontal: Espaco.l, paddingVertical: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.texto, fontSize: 17 }}>Velocidade auto-rolagem</Text>
            <Text style={{ color: c.textoFraco, fontSize: 13.5, marginTop: 2 }}>0 não usa rolagem e desabilita botão</Text>
          </View>
          <Text style={{ color: c.destaque, fontSize: 26, fontVariant: ['tabular-nums'], width: 34, textAlign: 'right' }}>{aj.velocidadeRolagem}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <Passo sinal="minus" onPress={() => mudarAjustes({ velocidadeRolagem: Math.max(0, aj.velocidadeRolagem - 1) })} />
          <Slider
            style={{ flex: 1 }}
            minimumValue={0}
            maximumValue={10}
            step={1}
            value={aj.velocidadeRolagem}
            onSlidingComplete={(v) => mudarAjustes({ velocidadeRolagem: v })}
            minimumTrackTintColor={Marca.ouro}
          />
          <Passo sinal="plus" onPress={() => mudarAjustes({ velocidadeRolagem: Math.min(10, aj.velocidadeRolagem + 1) })} />
        </View>
      </View>
      <Sep />
      <Linha
        titulo="Coletas salmódicas"
        sub="Adicionar as coletas salmódicas após salmos e hinos (o pacote provisório não traz as coletas)"
        direita={<Chave valor={aj.coletasSalmodicas} mudar={(v) => mudarAjustes({ coletasSalmodicas: v })} />}
      />
      {chave('repetirRespostas', 'Repetir respostas nas preces', 'Repetir as respostas nas preces das Laudes e Vésperas')}
      {chave('esconderBarraStatus', 'Esconder a barra de status', 'Esconder a barra de status que fica no topo da tela')}
      {chave('feedbackTatil', 'Habilitar feedback tátil', 'Emitir pequena vibração ao selecionar algumas opções')}
      {chave('expandirTexto', 'Esconder os botões ao tocar', 'Um toque no texto esconde ou mostra os botões de leitura (o de voltar fica sempre)')}
      {chave('timerSilencio', 'Timer oração silenciosa', 'Dispor de timer p/ oração silenciosa nas Laudes e Vésperas', !aj.timerSilencio)}
      {aj.timerSilencio ? (
        <Linha
          titulo="Duração do silêncio"
          direita={<Contador valor={aj.minutosSilencio} sufixo=" min" min={1} max={30} mudar={(v) => mudarAjustes({ minutosSilencio: v })} />}
          ultimo
        />
      ) : null}
    </Secao>
  );
}

function VozELeitura() {
  const aj = useAjustes();
  const chave = useChave();
  return (
    <Secao>
      {chave('voz', 'Habilita voz', 'Habilitar a sintetização de voz nos textos', !aj.voz)}
      {aj.voz ? (
        <Linha
          titulo="Velocidade da voz"
          direita={<Contador valor={Math.round(aj.velocidadeVoz * 10)} min={5} max={15} formatar={(v) => `${(v / 10).toFixed(1)}×`} mudar={(v) => mudarAjustes({ velocidadeVoz: v / 10 })} />}
        />
      ) : null}
      {chave('laudesAmpliada', 'Laudes ampliada', 'Possibilitar adicionar as leituras do Ofício às Laudes', true)}
    </Secao>
  );
}

function Aparencia() {
  const aj = useAjustes();
  return (
    <Secao>
      <Opcoes
        titulo="Tema"
        valor={aj.tema}
        opcoes={[
          ['sistema', 'Auto'],
          ['claro', 'Claro'],
          ['sepia', 'Sépia'],
          ['escuro', 'Escuro'],
        ]}
        mudar={(v) => mudarAjustes({ tema: v as Ajustes['tema'] })}
      />
      <Linha titulo="Tamanho da letra" direita={<Contador valor={aj.tamanhoFonte} min={14} max={34} mudar={(v) => mudarAjustes({ tamanhoFonte: v })} />} />
      <Opcoes
        titulo="Alinhamento do texto"
        valor={aj.alinhamento}
        opcoes={[
          ['centro', 'Centralizado'],
          ['esquerda', 'À esquerda'],
        ]}
        mudar={(v) => mudarAjustes({ alinhamento: v as Ajustes['alinhamento'] })}
      />
      <Opcoes
        titulo="Fonte dos títulos"
        valor={aj.fonteTitulos}
        opcoes={[
          ['sem-serifa', 'Sem serifa'],
          ['serifa', 'Com serifa'],
        ]}
        mudar={(v) => mudarAjustes({ fonteTitulos: v as Ajustes['fonteTitulos'] })}
      />
      <Opcoes
        titulo="Fonte do texto"
        valor={aj.fonte}
        opcoes={[
          ['serifa', 'Com serifa'],
          ['sem-serifa', 'Sem serifa'],
        ]}
        mudar={(v) => mudarAjustes({ fonte: v as Ajustes['fonte'] })}
      />
      <Opcoes
        titulo="Salmo do Invitatório"
        valor={aj.invitatorio}
        opcoes={[
          ['94', 'Sl 94'],
          ['99', 'Sl 99'],
          ['66', 'Sl 66'],
          ['23', 'Sl 23'],
        ]}
        mudar={(v) => mudarAjustes({ invitatorio: v as Ajustes['invitatorio'] })}
        ultimo
      />
    </Secao>
  );
}

/** Lembretes: as horas (tela própria), as devoções com lembrete sugerido, as jornadas e as rotinas, e os horários */
function Lembretes() {
  const aj = useAjustes();
  const router = useRouter();
  const srv = useServidor();
  const com = srv.comunidade;
  const hoje = hojeIso();
  const horasAtivas = Object.values(aj.lembretes).filter((l) => l.ativo).length;
  const oracoes = (com?.oracoes ?? []).filter((o) => o.lembrete);
  const jornadas = (com?.jornadas ?? []).filter((j) => j.ativa !== false).flatMap((j) => {
    const p = periodo(j, hoje);
    return p ? [{ j, p }] : [];
  });
  const rotinas = (com?.rotinas ?? []).filter((r) => r.ativa !== false);
  const curto = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
  const sino = (m: ReturnType<typeof modoDe>) => (ligado(m) ? 'bell.fill' : 'bell');
  const mudar = (p: Partial<Ajustes>) => {
    mudarAjustes(p);
    reagendarLembretes();
  };
  return (
    <>
      <Secao titulo="Liturgia das Horas">
        <Linha
          titulo="Lembretes das horas"
          sub={horasAtivas ? `${horasAtivas} ${horasAtivas === 1 ? 'hora lembrada' : 'horas lembradas'} todo dia` : 'Nenhum ligado'}
          icone="clock"
          onPress={() => router.push('/notificacoes')}
          ultimo
        />
      </Secao>
      <Secao titulo="Devoções da Comunidade">
        {oracoes.length ? (
          oracoes.map((o, i) => {
            const m = modoDe(aj, 'oracao', o.id);
            return (
              <Linha
                key={o.id}
                titulo={o.titulo}
                sub={`${textoRegra(o.lembrete!)} · ${textoModo(m, aj)}`}
                icone={sino(m)}
                onPress={() => escolherLembrete('oracao', o.id, o.titulo)}
                ultimo={i === oracoes.length - 1}
              />
            );
          })
        ) : (
          <Aviso icone="bell" texto="Quando a Comunidade sugerir um lembrete numa oração (ex.: toda 1ª sexta-feira), ela aparece aqui." />
        )}
      </Secao>
      {jornadas.length ? (
        <Secao titulo="Jornadas">
          {jornadas.map(({ j, p }, i) => {
            const m = modoDe(aj, 'jornada', j.id);
            const quando = p.inicio > hoje ? `Começa em ${curto(p.inicio)}` : `Até ${curto(p.fim)}`;
            return (
              <Linha
                key={j.id}
                titulo={j.titulo}
                sub={`${quando}${j.anual ? ', todo ano' : ''} · ${textoModo(m, aj)}`}
                icone={sino(m)}
                onPress={() => escolherLembrete('jornada', j.id, j.titulo)}
                ultimo={i === jornadas.length - 1}
              />
            );
          })}
        </Secao>
      ) : null}
      {rotinas.length ? (
        <Secao titulo="Horários fixos">
          {rotinas.map((r, i) => {
            const m = modoDe(aj, 'rotina', r.id);
            return (
              <Linha
                key={r.id}
                titulo={r.tipo === 'comissao' && r.comissao && !r.titulo.includes(r.comissao) ? `${r.comissao} · ${r.titulo}` : r.titulo}
                sub={`${textoRegra(r)}, ${horaCurta(r.hora)} · ${textoModo(m, aj)}`}
                icone={sino(m)}
                onPress={() => escolherLembrete('rotina', r.id, r.titulo)}
                ultimo={i === rotinas.length - 1}
              />
            );
          })}
        </Secao>
      ) : null}
      <Secao titulo="Horários dos lembretes">
        <CampoData rotulo="Na véspera, às" valor={aj.horaVespera} modo="time" mudar={(v) => mudar({ horaVespera: v })} />
        <CampoData rotulo="No dia, às" valor={aj.horaNoDia} modo="time" mudar={(v) => mudar({ horaNoDia: v })} />
        <Linha
          titulo="Antes dos horários fixos"
          direita={
            <Contador
              valor={Math.round(aj.minutosAntes / 15)}
              min={1}
              max={16}
              formatar={(v) => textoAntes(v * 15)}
              mudar={(v) => mudar({ minutosAntes: v * 15 })}
            />
          }
          ultimo
        />
      </Secao>
    </>
  );
}

function ConteudoEComunidade() {
  const router = useRouter();
  const pacote = usePacote();
  const srv = useServidor();
  const aj = useAjustes();
  return (
    <Secao>
      <Linha
        titulo="Conteúdo litúrgico"
        sub={pacote.manifest ? (pacote.manifest.tipo === 'provisorio' ? 'Pacote provisório de demonstração instalado' : 'Pacote oficial instalado') : 'Não instalado'}
        icone="books.vertical"
        onPress={() => router.push('/conteudo')}
      />
      <Linha
        titulo="Sua comissão"
        sub={`${textoSuasComissoes(aj.suasComissoes.filter((n) => n === '*' || nomesComissoes(srv.comunidade?.rotinas).includes(n)))} · as reuniões entram na Agenda`}
        icone="person.2"
        onPress={() => router.push('/sua-comissao')}
      />
      <Linha titulo="Administração" sub={srv.admin ? 'Conectado como administrador' : 'Para a coordenação publicar agenda e avisos'} icone="lock.shield" onPress={() => router.push('/admin')} />
      <Linha titulo="Contribuir com a Comunidade" sub="Doação única ou ser Benfeitor" icone="heart" onPress={() => abrirDoacao(false)} />
      <Linha titulo="Enviar sugestão" sub="Uma ideia, algo que não encontrou, um erro" icone="text.bubble" onPress={() => router.push('/sugestao')} />
      <Linha titulo="Sobre o app" icone="info.circle" onPress={() => router.push('/sobre')} ultimo />
    </Secao>
  );
}

/** Ajustes de uma seção (página aberta pela linha da aba) */
export function ConteudoAjustes({ id }: { id: string }) {
  switch (id) {
    case 'aj-oracao':
      return <Oracao />;
    case 'aj-lembretes':
      return <Lembretes />;
    case 'aj-voz':
      return <VozELeitura />;
    case 'aj-aparencia':
      return <Aparencia />;
    case 'aj-conteudo':
      return <ConteudoEComunidade />;
    default:
      return null;
  }
}

function Sep() {
  const c = usePaleta();
  return <View style={{ height: 0.5, backgroundColor: c.separador, marginLeft: Espaco.l }} />;
}

function Passo({ sinal, onPress }: { sinal: 'plus' | 'minus'; onPress: () => void }) {
  return (
    <Pressable
      hitSlop={8}
      onPress={() => {
        toque();
        onPress();
      }}
      style={{ padding: 6 }}>
      <Icone nome={sinal} tamanho={16} />
    </Pressable>
  );
}

function Contador({
  valor,
  min,
  max,
  mudar,
  sufixo = '',
  formatar,
}: {
  valor: number;
  min: number;
  max: number;
  mudar: (v: number) => void;
  sufixo?: string;
  formatar?: (v: number) => string;
}) {
  const c = usePaleta();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Passo sinal="minus" onPress={() => mudar(Math.max(min, valor - 1))} />
      <Text style={{ color: c.texto, fontSize: 16, minWidth: 48, textAlign: 'center', fontVariant: ['tabular-nums'] }}>
        {formatar ? formatar(valor) : `${valor}${sufixo}`}
      </Text>
      <Passo sinal="plus" onPress={() => mudar(Math.min(max, valor + 1))} />
    </View>
  );
}

function Opcoes({
  titulo,
  valor,
  opcoes,
  mudar,
  ultimo,
}: {
  titulo: string;
  valor: string;
  opcoes: [string, string][];
  mudar: (v: string) => void;
  ultimo?: boolean;
}) {
  const c = usePaleta();
  return (
    <View>
      <View style={{ paddingHorizontal: Espaco.l, paddingVertical: 12 }}>
        <Text style={{ color: c.texto, fontSize: 17, marginBottom: 8 }}>{titulo}</Text>
        <View style={{ flexDirection: 'row', backgroundColor: c.escuro ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', borderRadius: 12, padding: 3 }}>
          {opcoes.map(([v, n]) => (
            <Pressable
              key={v}
              style={{ flex: 1 }}
              onPress={() => {
                toque();
                mudar(v);
              }}>
              <View style={{ paddingVertical: 7, borderRadius: 9, backgroundColor: valor === v ? (c.escuro ? 'rgba(222,190,130,0.28)' : '#fff') : 'transparent' }}>
                <Text style={{ textAlign: 'center', color: valor === v ? c.texto : c.textoSuave, fontSize: 13.5, fontWeight: valor === v ? '600' : '400' }}>{n}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>
      {!ultimo ? <Sep /> : null}
    </View>
  );
}
