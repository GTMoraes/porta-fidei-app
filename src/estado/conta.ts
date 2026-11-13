// A conta de quem está usando o app (0.7.0): o que ela pode fazer e as comissões dela.
// O administrador pode tudo. As outras pessoas fazem o que as capacidades dadas por um administrador deixam
// (Administração › Pessoas) e, na comissão que coordenam, põem e tiram membros e cancelam ou mudam um dia das reuniões.
// As comissões de cada um são colocadas pela coordenação: a pessoa não escolhe (em Ajustes › Suas comissões ela só vê
// as dela e escolhe de quais outras quer ver as reuniões na Agenda, o que não a põe na comissão).

import type { Ajustes } from '@/estado/ajustes';
import { useServidor, type Capacidade, type Conta, type Pessoa } from '@/servidor/api';

export interface InfoCapacidade {
  id: Capacidade;
  titulo: string;
  sub: string;
  /** já tem telas na Administração (a biblioteca ainda não existe) */
  ativa: boolean;
}
export const CAPACIDADES: InfoCapacidade[] = [
  { id: 'agenda', titulo: 'Agenda', sub: 'Missas, eventos, horários fixos e cancelamentos', ativa: true },
  { id: 'avisos', titulo: 'Avisos e notificações', sub: 'Avisos e o "notificar todos"', ativa: true },
  { id: 'oracao', titulo: 'Oração da Comunidade', sub: 'Proposta da semana, jornadas e orações', ativa: true },
  { id: 'biblioteca', titulo: 'Bibliotecário', sub: 'Vale quando a biblioteca existir no app', ativa: false },
];

export const useConta = (): Conta | null => useServidor().conta ?? null;

/** O administrador pode tudo; os outros, o que as capacidades deixam */
export function pode(conta: Conta | null | undefined, c: Capacidade | 'admin'): boolean {
  if (!conta) return false;
  if (conta.admin) return true;
  return c !== 'admin' && conta.capacidades.includes(c);
}

const igual = (a?: string | null, b?: string | null) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

/** Coordena a comissão deste nome (o administrador, todas) */
export function coordena(conta: Conta | null | undefined, comissao?: string | null): boolean {
  if (!conta) return false;
  if (conta.admin) return true;
  return conta.comissoes.some((c) => c.coordenador && igual(c.nome, comissao));
}
export const coordenacoes = (conta: Conta | null | undefined) => (conta?.comissoes ?? []).filter((c) => c.coordenador);

/** Tem alguma tarefa na Administração (a linha "Administração" aparece em Ajustes) */
export function ehEquipe(conta: Conta | null | undefined): boolean {
  if (!conta) return false;
  return conta.admin || conta.capacidades.some((c) => CAPACIDADES.find((x) => x.id === c)?.ativa) || coordenacoes(conta).length > 0;
}

/** "Administrador", "Agenda e Avisos e notificações", "Coordenação de Música" */
export function textoTarefas(conta: Conta | null | undefined): string {
  if (!conta) return '';
  if (conta.admin) return 'Administrador';
  const partes = CAPACIDADES.filter((c) => conta.capacidades.includes(c.id)).map((c) => c.titulo);
  const coord = coordenacoes(conta).map((c) => c.nome);
  if (coord.length) partes.push(`Coordenação de ${coord.join(', ')}`);
  return partes.join(' · ');
}

/** Comissões cujas reuniões entram na Agenda: as da pessoa e as que ela quis ver (Ajustes › Suas comissões) */
export function comissoesNaAgenda(conta: Conta | null | undefined, aj: Pick<Ajustes, 'suasComissoes'>): string[] {
  return [...(conta?.comissoes ?? []).map((c) => c.nome), ...aj.suasComissoes];
}

/** Iniciais para a foto que falta ("Maria da Silva" → "MS") */
export function iniciais(nome: string): string {
  const p = nome.trim().split(/\s+/).filter((x) => x.length > 2 || /^[A-ZÀ-Ý]/.test(x));
  const l = (p.length ? p : nome.trim().split(/\s+/)).filter(Boolean);
  return ((l[0]?.[0] ?? '') + (l.length > 1 ? l[l.length - 1][0] : '')).toUpperCase();
}

// A senha provisória com que a pessoa acabou de entrar, para a tela "Senha nova" não pedir de novo (só na memória)
let senhaRecente: string | null = null;
export const guardarSenhaRecente = (s: string) => void (senhaRecente = s);
export function pegarSenhaRecente() {
  const s = senhaRecente;
  senhaRecente = null;
  return s;
}

/** Usuário válido para o cadastro (igual ao servidor): 3 a 30, letras sem acento, números, ponto e _ */
export const usuarioValido = (u: string) => /^[a-z0-9][a-z0-9._]{2,29}$/.test(u.trim().toLowerCase().replace(/^@/, ''));
export const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());

/** Em Pessoas: "Administrador", "Agenda · Avisos e notificações", "Conta desativada" */
export function resumoPessoa(p: Pessoa): string {
  if (p.ativo === false) return 'Conta desativada';
  if (p.admin) return 'Administrador';
  return CAPACIDADES.filter((c) => p.capacidades?.includes(c.id))
    .map((c) => c.titulo)
    .join(' · ');
}
