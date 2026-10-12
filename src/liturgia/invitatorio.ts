// Escolhe a antífona do Invitatório do dia. Os textos vêm do pacote de conteúdo (dados/invitatorio.json),
// nunca do código: aqui fica só a regra de qual antífona vale em cada dia.

import { deIso, epifania, type DiaLiturgico } from './calendario';

export interface DadosInvitatorio {
  tc: Record<string, string[]>; // semana do saltério -> [domingo..sábado]
  tempo: Record<string, string>;
  comum: Record<string, string>;
  proprio: Record<string, string>;
}

/** Comum de onde vem a antífona de um santo sem antífona própria (pelo nome da celebração) */
function comumDoSanto(nome: string, slug: string | undefined, pascoa: boolean): string {
  const n = nome.toLowerCase();
  if (/nossa senhora|virgem maria|santa maria|^ns|imaculad/.test(n) || (slug ?? '').startsWith('NS')) return 'nossasenhora';
  if (/evangelista/.test(n) && !/apóstolo/.test(n)) return 'evangelistas';
  if (/apóstol/.test(n)) return pascoa ? 'apostolosTP' : 'apostolos';
  if (/mártir|martir/.test(n)) return 'martires';
  if (/doutor/.test(n)) return 'doutores';
  if (/papa|bispo|presbítero|diácono/.test(n)) return 'pastores';
  if (/virgem/.test(n)) return 'virgens';
  if (/dedicação/.test(n)) return 'dedicacao';
  return 'santos';
}

export function antifonaInvitatorio(dia: DiaLiturgico, dados: DadosInvitatorio | null, memoriaEscolhida?: string): string | undefined {
  if (!dados) return undefined;
  const cel = dia.celebracao;
  const [, mes, d] = dia.data.split('-').map(Number);
  const pascoa = dia.tempo === 'pascoa';

  // 1) celebração com antífona própria (solenidades, festas e algumas memórias)
  const slug = memoriaEscolhida ?? cel.slug;
  if (slug && dados.proprio[slug]) return dados.proprio[slug];

  // 2) santo celebrado (solenidade, festa, memória ou memória escolhida): antífona do Comum
  const ehSanto = cel.santo && (cel.grau === 'S' || cel.grau === 'F' || cel.grau === 'M');
  if (memoriaEscolhida || ehSanto) {
    const nome = memoriaEscolhida ? dia.facultativas.find((f) => f.slug === memoriaEscolhida)?.nome ?? '' : cel.nome;
    if (memoriaEscolhida === 'santamarianosabado') return dados.comum.nossasenhora;
    const chave = comumDoSanto(nome, slug, pascoa);
    if (dados.comum[chave]) return dados.comum[chave];
  }

  // 3) tempos litúrgicos
  const t = dados.tempo;
  switch (dia.tempo) {
    case 'advento':
      if (mes === 12 && d === 24) return t.dez24;
      if (mes === 12 && d >= 17) return t.advento17;
      return t.advento;
    case 'natal': {
      // até a Epifania; da Epifania em diante, a antífona da manifestação do Senhor
      const t0 = deIso(dia.data);
      const ano = mes === 12 ? Number(dia.data.slice(0, 4)) + 1 : Number(dia.data.slice(0, 4));
      return t0 >= epifania(ano) ? t.natalEpifania : t.natal;
    }
    case 'quaresma':
      if (dia.semana >= 6) return t.semanasanta; // Semana Santa (a partir do Domingo de Ramos)
      return t.quaresma;
    case 'triduo':
      if (cel.chave === 'paixaodosenhor') return t.paixao;
      if (cel.chave === 'sabadosanto') return t.sabadosanto;
      return t.semanasanta;
    case 'pascoa':
      if (dia.semana >= 7 || cel.chave === 'ascensaodosenhor') return t.ascensao;
      return t.pascoa;
    default: {
      const semana = dados.tc[String(dia.semanaSalterio)];
      return semana?.[dia.diaSemana];
    }
  }
}
