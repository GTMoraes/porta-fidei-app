import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { usePacote } from '@/conteudo/pacote';
import { mudarAjustes, useAjustes, type Ajustes } from '@/estado/ajustes';
import { useServidor } from '@/servidor/api';
import { Espaco, Marca, usePaleta } from '@/tema';
import { Chave, Fundo, Icone, Linha, Secao, TituloTela, toque } from '@/ui/base';
import { abrirDoacao } from '@/comunidade/Contribuir';
import { useSubirAoTopo } from '@/ui/subirAoTopo';

export default function TelaAjustes() {
  const lista = useSubirAoTopo();
  const aj = useAjustes();
  const router = useRouter();
  const pacote = usePacote();
  const srv = useServidor();
  const c = usePaleta();

  const chave = (k: keyof Ajustes, titulo: string, sub: string, ultimo = false) => (
    <Linha titulo={titulo} sub={sub} direita={<Chave valor={aj[k] as boolean} mudar={(v) => mudarAjustes({ [k]: v } as Partial<Ajustes>)} />} ultimo={ultimo} />
  );

  return (
    <Fundo aba>
      <ScrollView
        ref={lista}
        scrollToOverflowEnabled contentInsetAdjustmentBehavior="automatic">
        <TituloTela titulo="Ajustes" />

        <Secao titulo="Oração">
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
          <Linha titulo="Configura notificações" sub="Configurar notificações para as horas canônicas" onPress={() => router.push('/notificacoes')} />
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

        <Secao titulo="Voz e leitura">
          {chave('voz', 'Habilita voz', 'Habilitar a sintetização de voz nos textos', !aj.voz)}
          {aj.voz ? (
            <Linha
              titulo="Velocidade da voz"
              direita={<Contador valor={Math.round(aj.velocidadeVoz * 10)} min={5} max={15} formatar={(v) => `${(v / 10).toFixed(1)}×`} mudar={(v) => mudarAjustes({ velocidadeVoz: v / 10 })} />}
            />
          ) : null}
          {chave('laudesAmpliada', 'Laudes ampliada', 'Possibilitar adicionar as leituras do Ofício às Laudes', true)}
        </Secao>

        <Secao titulo="Aparência">
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
            titulo="Fonte"
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

        <Secao titulo="Conteúdo e Comunidade">
          <Linha
            titulo="Conteúdo litúrgico"
            sub={pacote.manifest ? (pacote.manifest.tipo === 'provisorio' ? 'Pacote provisório de demonstração instalado' : 'Pacote oficial instalado') : 'Não instalado'}
            icone="books.vertical"
            onPress={() => router.push('/conteudo')}
          />
          <Linha titulo="Administração" sub={srv.admin ? 'Conectado como administrador' : 'Para a coordenação publicar agenda e avisos'} icone="lock.shield" onPress={() => router.push('/admin')} />
          <Linha titulo="Contribuir com a Comunidade" sub="Doação única ou ser Benfeitor" icone="heart" onPress={() => abrirDoacao(false)} />
          <Linha titulo="Enviar sugestão" sub="Uma ideia, algo que não encontrou, um erro" icone="text.bubble" onPress={() => router.push('/sugestao')} />
          <Linha titulo="Sobre o app" icone="info.circle" onPress={() => router.push('/sobre')} ultimo />
        </Secao>
        <View style={{ height: 50 }} />
      </ScrollView>
    </Fundo>
  );
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
}): ReactNode {
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
