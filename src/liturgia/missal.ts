// Qual "próprio do Missal" (antífonas e orações da Missa) vale para o dia.
import { ymd, deIso, type DiaLiturgico } from './calendario';

const DIAS = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

export function missalDoDia(dia: DiaLiturgico, existe: (a: string) => boolean): string | undefined {
  const c = dia.celebracao;
  const nd = DIAS[dia.diaSemana];
  const { m, d } = ymd(deIso(dia.data));
  const cands: string[] = [];
  if (c.slug) cands.push(`missal/proprio/proprio/${c.slug}`);
  switch (dia.tempo) {
    case 'comum':
      if (dia.diaSemana === 0) cands.push(`missal/proprio/tempocomum/${dia.semana}domingoTC`);
      else cands.push(`missal/proprio/tempocomum/${dia.semana}domingoTC`); // nos dias de semana usa-se a coleta do domingo
      break;
    case 'advento':
      if (m === 12 && d >= 17 && dia.diaSemana !== 0) cands.push(`missal/proprio/advento/${d}dezembroAD`);
      cands.push(`missal/proprio/advento/${dia.semana}${nd}AD`);
      break;
    case 'natal':
      cands.push(`missal/proprio/natal/${d}${m === 12 ? 'dezembro' : 'janeiro'}NA`, `missal/proprio/natal/${nd}NA`);
      break;
    case 'quaresma':
      if (dia.semana === 6) cands.push(`missal/proprio/semanasanta/${nd}_semanasanta`);
      cands.push(`missal/proprio/quaresma/${dia.semana}${nd}QA`);
      break;
    case 'pascoa':
      cands.push(`missal/proprio/pascoa/${dia.semana}${nd}PA`);
      break;
  }
  return cands.find(existe);
}
