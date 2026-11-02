// Qual "próprio do Missal" (antífonas e orações da Missa) vale para o dia.
import { ymd, deIso, type DiaLiturgico } from './calendario';

const DIAS = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

export function missalDoDia(dia: DiaLiturgico, existe: (a: string) => boolean): string | undefined {
  const c = dia.celebracao;
  const nd = DIAS[dia.diaSemana];
  const { m, d } = ymd(deIso(dia.data));
  const cands: string[] = [];
  if (c.slug) {
    const proprio = `missal/proprio/proprio/${c.slug}`;
    // solenidade, festa ou domingo com nome próprio sem as orações dele no pacote: melhor não mostrar nada do que as
    // de outro domingo (numa memória sem próprio, continuam as do dia de semana)
    if (!existe(proprio) && ['S', 'F', 'D'].includes(c.grau)) return undefined;
    cands.push(proprio);
  }
  switch (dia.tempo) {
    case 'comum':
      if (dia.diaSemana === 0) cands.push(`missal/proprio/tempocomum/${dia.semana}domingoTC`);
      else cands.push(`missal/proprio/tempocomum/${dia.semana}domingoTC`); // nos dias de semana usa-se a coleta do domingo
      break;
    case 'advento':
      if (m === 12 && d === 24 && dia.diaSemana !== 0) cands.push('missal/proprio/advento/_24dezembroAD');
      if (m === 12 && d >= 17 && dia.diaSemana !== 0) cands.push(`missal/proprio/advento/${d}dezembroAD`);
      cands.push(`missal/proprio/advento/${dia.semana}${nd}AD`);
      break;
    case 'natal':
      cands.push(`missal/proprio/natal/${d}${m === 12 ? 'dezembro' : 'janeiro'}NA`, `missal/proprio/natal/${nd}NA`);
      // dias de semana de janeiro: antes da Epifania e depois dela até o Batismo do Senhor
      if (m === 1 && dia.diaSemana !== 0) cands.push(`missal/proprio/natal/${nd}_${dia.feria.includes('antes da Epifania') ? 'antesdaepifania' : 'ateobatismo'}`);
      break;
    case 'quaresma':
      if (dia.semana === 0) cands.push(`missal/proprio/quaresma/${nd}_depoisdascinzas`); // quinta a sábado depois das Cinzas
      if (dia.semana === 6) cands.push(`missal/proprio/semanasanta/${nd}_semanasanta`);
      cands.push(`missal/proprio/quaresma/${dia.semana}${nd}QA`);
      break;
    case 'pascoa':
      if (dia.semana === 1) cands.push(`missal/proprio/pascoa/${nd}_oitava`);
      cands.push(`missal/proprio/pascoa/${dia.semana}${nd}PA`);
      break;
  }
  return cands.find(existe);
}
