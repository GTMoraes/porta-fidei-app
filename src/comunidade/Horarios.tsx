// Bloco "rotinas" das páginas da aba Comunidade: os horários fixos cadastrados na Administração › Rotinas, por tipo
// (Missas, Adoração, Grupos de oração, Comissões). Rotinas iguais em horários diferentes viram uma linha
// ("Domingos, 11h e 17h30"). Mostra sempre todas as comissões, seja qual for o ajuste "Sua comissão".

import { Text } from 'react-native';

import { ICONE_ROTINA, NOME_TIPO_ROTINA, agruparRotinas, type LinhaRotinas } from '@/comunidade/rotinas';
import { useServidor } from '@/servidor/api';
import { Espaco, usePaleta } from '@/tema';
import { Aviso, Linha, Secao } from '@/ui/base';
import { abrirNoMapa } from '@/util/mapas';

function textos(l: LinhaRotinas) {
  const diz = (t: string, x?: string | null) => !!x && t.toLowerCase().includes(x.toLowerCase());
  if (l.tipo === 'comissao' && l.comissao) {
    const extra = diz(l.titulo, l.comissao) ? '' : l.titulo;
    return { titulo: l.comissao, sub: [extra, l.quando, l.local, ...l.obs].filter(Boolean).join(' · ') };
  }
  // o local só aparece quando o título ainda não diz ("Missa na Samaria" já diz onde é)
  return { titulo: l.titulo, sub: [l.quando, diz(l.titulo, l.local) ? '' : l.local, ...l.obs].filter(Boolean).join(' · ') };
}

export function BlocoRotinas({ so }: { so?: 'comissao' }) {
  const c = usePaleta();
  const srv = useServidor();
  const grupos = agruparRotinas(srv.comunidade?.rotinas, so);
  if (!grupos.length)
    return so ? null : (
      <Secao>
        <Aviso icone="clock" texto="Os horários da Comunidade aparecem aqui assim que forem cadastrados." />
      </Secao>
    );
  return (
    <>
      {grupos.map((g) => (
        <Secao key={g.tipo} titulo={so ? 'Reuniões' : NOME_TIPO_ROTINA[g.tipo]}>
          {g.linhas.map((l, i) => {
            const t = textos(l);
            return (
              <Linha
                key={l.chave}
                titulo={t.titulo}
                sub={t.sub}
                icone={ICONE_ROTINA[l.tipo] as any}
                onPress={
                  l.lat != null || l.endereco ? () => abrirNoMapa({ nome: l.titulo, local: l.lat != null ? l.local || l.titulo : l.endereco, lat: l.lat, lng: l.lng }) : undefined
                }
                ultimo={i === g.linhas.length - 1}
              />
            );
          })}
        </Secao>
      ))}
      {so ? null : (
        <Text style={{ color: c.textoFraco, fontSize: 13, lineHeight: 18, marginHorizontal: Espaco.xl, marginBottom: Espaco.xl }}>
          Em datas especiais os horários podem mudar: as mudanças chegam pelos avisos da Agenda.
        </Text>
      )}
    </>
  );
}
