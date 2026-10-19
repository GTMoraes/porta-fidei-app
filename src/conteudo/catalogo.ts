// Listas de navegação (orações, rituais, missal...). Só nomes e caminhos: o texto vem do pacote.

export interface Item {
  arquivo: string; // caminho no pacote; "@app:exame" = tela do app; "@lista:rosario" = outra lista
  titulo: string;
  sub?: string;
  alias?: string; // outros nomes pelos quais a busca também encontra
}
export interface Grupo {
  titulo: string;
  itens: Item[];
}

const o = (slug: string, titulo: string, sub?: string, alias?: string): Item => ({ arquivo: `oficio/outros/${slug}`, titulo, sub, alias });

// Um mesmo texto pode estar em mais de um lugar (ex.: o Ofício da Imaculada em Nossa Senhora e nos Ofícios votivos)
const EXAME_COMPLETO: Item = { arquivo: '@app:exame', titulo: 'Exame de consciência completo', sub: 'Mandamentos, pecados capitais e deveres do próprio estado', alias: 'exame pecados mandamentos confissao confessar' };
const EXAME_BREVE = o('exameconsciencia', 'Breve exame de consciência', undefined, 'exame pecados confissao');
const ATO_CONTRICAO = o('atodecontricao', 'Ato de contrição', undefined, 'confissao arrependimento');
const OFICIO_IMACULADA = o('oficioimaculada', 'Ofício da Imaculada Conceição', 'Também chamado Ofício de Nossa Senhora', 'oficio de nossa senhora pequeno oficio');

export const CONFISSAO: Grupo[] = [
  {
    titulo: 'Confissão',
    itens: [
      EXAME_COMPLETO,
      EXAME_BREVE,
      o('preparacao_confissao', 'Preparação para a confissão'),
      ATO_CONTRICAO,
      o('ladainhacontricao', 'Ladainha para pedir a contrição'),
      o('reconciliacaoindividual', 'Rito da Reconciliação individual', 'O rito do sacramento', 'penitencia confissao'),
    ],
  },
];

export const ORACOES: Grupo[] = [
  {
    titulo: 'Orações do dia a dia',
    itens: [
      o('oferecimentodiario', 'Oferecimento diário'),
      o('angelus', 'Ângelus'),
      o('reginacoeli', 'Regina Coeli', 'No Tempo Pascal, no lugar do Ângelus'),
      o('credo', 'Credo apostólico'),
      o('gloria', 'Glória a Deus nas alturas'),
      o('paraasrefeicoes', 'Nas refeições'),
      o('antesdosestudos', 'Antes dos estudos'),
      EXAME_BREVE,
      ATO_CONTRICAO,
      o('decalogo', 'O Decálogo'),
      o('ficacomigosenhor', 'Fica comigo, Senhor'),
      o('nadatepertube', 'Nada te perturbe'),
    ],
  },
  CONFISSAO[0],
  {
    titulo: 'Eucaristia',
    itens: [
      o('preparacaomissa', 'Preparação para a Missa'),
      o('antesdepoisdacomunhao', 'Antes e depois da Comunhão'),
      o('comunhaoespiritual', 'Comunhão espiritual'),
      o('almadecristo', 'Alma de Cristo'),
      o('adorotedevote', 'Adoro te devote'),
      o('pangelingua', 'Pange lingua'),
      o('posmissa', 'Depois da Missa'),
      o('paraantesdeservir', 'Antes e depois de servir'),
      o('bencao_santissimo', 'Bênção do Santíssimo'),
    ],
  },
  {
    titulo: 'Nossa Senhora',
    itens: [
      o('salverainha', 'Salve Rainha'),
      o('lembraivos', 'Lembrai-vos'),
      o('subtuumpraesidium', 'À vossa proteção (Sub tuum praesidium)'),
      o('almademaria', 'Alma de Maria'),
      o('augustarainha', 'Augusta Rainha dos céus'),
      o('consagracaonossasenhora', 'Consagração a Nossa Senhora'),
      o('consagracaoNSaAparecida', 'Consagração a Nossa Senhora Aparecida'),
      o('coroinhaNSa', 'Coroinha de Nossa Senhora'),
      o('7doresdemaria', 'As sete dores de Maria'),
      o('stabatmaterdolorosa', 'Stabat Mater'),
      o('antifonas_marianas', 'Antífonas marianas'),
      o('avemarisstella', 'Ave Maris Stella'),
      o('akathistos', 'Hino Akáthistos'),
      o('escapulario', 'Bênção e imposição do escapulário'),
      { arquivo: '@lista:rosario', titulo: 'Santo Rosário', sub: 'Mistérios gozosos, luminosos, dolorosos e gloriosos', alias: 'terco' },
      OFICIO_IMACULADA,
      o('oficioNSCarmo', 'Ofício de Nossa Senhora do Carmo'),
      o('ladainhaNSa', 'Ladainha de Nossa Senhora', undefined, 'ladainha lauretana'),
      o('angelus', 'Ângelus'),
      o('reginacoeli', 'Regina Coeli', 'No Tempo Pascal, no lugar do Ângelus'),
    ],
  },
  {
    titulo: 'Santos e anjos',
    itens: [
      o('asaomiguelarcanjo', 'Oração a São Miguel Arcanjo'),
      o('coroinhasaomiguel', 'Coroinha de São Miguel'),
      o('quaresmasaomiguel', 'Quaresma de São Miguel'),
      o('suplicasantosanjos', 'Súplica aos santos anjos'),
      o('saojose', 'Oração a São José'),
      o('saojoseantesdotrabalho', 'São José, antes do trabalho'),
      o('santoexpedito', 'Santo Expedito'),
      o('couracasaopatricio', 'Couraça de São Patrício'),
    ],
  },
  {
    titulo: 'Cristo e Espírito Santo',
    itens: [
      o('tercodivinamisericordia', 'Terço da Divina Misericórdia'),
      o('jesuscrucificado', 'Oração a Jesus crucificado'),
      o('dulcissimojesusredentor', 'Dulcíssimo Jesus, Redentor'),
      o('invocacaoespiritosanto', 'Invocação ao Espírito Santo'),
      o('venicreator', 'Veni Creator'),
      o('trisagio', 'Trisságio'),
      o('viasacra', 'Via-Sacra'),
      o('tedeum', 'Te Deum'),
    ],
  },
  {
    titulo: 'Ladainhas',
    itens: [
      o('ladainhaNSa', 'Ladainha de Nossa Senhora'),
      o('ladainhaSCJ', 'Ladainha do Sagrado Coração de Jesus'),
      o('ladainhasantissimonomejesus', 'Ladainha do Santíssimo Nome de Jesus'),
      o('ladainhasantissimosacramento', 'Ladainha do Santíssimo Sacramento'),
      o('ladainhasanguecristo', 'Ladainha do Preciosíssimo Sangue'),
      o('ladainhaespiritosanto', 'Ladainha do Espírito Santo'),
      o('ladainhasaojose', 'Ladainha de São José'),
      o('ladainhatodosossantos', 'Ladainha de Todos os Santos'),
      o('ladainhaanjodaguarda', 'Ladainha ao Anjo da Guarda'),
      o('ladainhadahumildade', 'Ladainha da humildade'),
      o('ladainhapaixao', 'Ladainha da Paixão'),
      o('ladainhaquaresmal', 'Ladainha quaresmal'),
      o('ladainhacontricao', 'Ladainha para pedir a contrição'),
      o('ladainhajesussacerdote', 'Ladainha de Jesus Sacerdote e Vítima'),
      o('ladainhaalmaspurgatorio', 'Ladainha pelas almas do purgatório'),
    ],
  },
  {
    titulo: 'Vocações e falecidos',
    itens: [
      o('pelasvocacoes', 'Pelas vocações'),
      o('pelapropriavocacao', 'Para discernir a própria vocação'),
      o('pelosfalecidos', 'Pelos falecidos'),
      o('oficioalmaspurgatorio', 'Ofício das almas do purgatório'),
    ],
  },
  {
    titulo: 'Em latim',
    itens: [
      o('painossolatim', 'Pater Noster'),
      o('avemarialatim', 'Ave Maria'),
      o('angelus_latim', 'Angelus'),
      o('tedeum_latim', 'Te Deum'),
      o('benedictusemagnificatlatim', 'Benedictus e Magnificat'),
      o('nuncdimittisemlatim', 'Nunc dimittis'),
      o('hinosemlatim', 'Hinos em latim'),
    ],
  },
];

export const RITUAIS: Grupo[] = [
  {
    titulo: 'Sacramentos',
    itens: [
      o('batismovariascriancas', 'Batismo de várias crianças'),
      o('confirmacao', 'Confirmação (na Missa)'),
      o('matrimonio', 'Matrimônio sem Missa'),
      o('reconciliacaoindividual', 'Reconciliação individual'),
      o('preparacao_confissao', 'Preparação para a confissão'),
      EXAME_COMPLETO,
      EXAME_BREVE,
      o('comunhaoenfermos', 'Comunhão aos enfermos'),
      o('enfermos', 'Unção dos enfermos'),
      o('enfermos_confirmacao', 'Confirmação em perigo de morte'),
      o('exequias', 'Exéquias'),
    ],
  },
  {
    titulo: 'Bênçãos',
    itens: [
      o('bencaofamilia', 'Bênção da família'),
      o('bencaonovaresidencia', 'Bênção de nova residência'),
      o('bencaoantesdoparto', 'Bênção antes do parto'),
      o('bencaolocaltrabalho', 'Bênção de local de trabalho'),
      o('bencaoveiculo', 'Bênção de veículo'),
      o('bencaoobjetos', 'Bênção de objetos de devoção'),
      o('bencaoimagemcristo', 'Bênção de imagem de Cristo'),
      o('bencaoimagemnossasenhora', 'Bênção de imagem de Nossa Senhora'),
      o('bencaoimagemsantos', 'Bênção de imagem de santos'),
      o('bencaoagua', 'Água benta fora da Missa'),
      o('paramentacao', 'Orações para a paramentação'),
    ],
  },
];

const nomesHora: [string, string][] = [
  ['Ivesperas', 'I Vésperas'],
  ['leituras', 'Ofício das Leituras'],
  ['laudes', 'Laudes'],
  ['terca', 'Terça'],
  ['sexta', 'Sexta'],
  ['nona', 'Nona'],
  ['vesperas', 'Vésperas'],
];
const comum = (slug: string, titulo: string): Grupo => ({
  titulo,
  itens: nomesHora.map(([h, n]) => o(`comum_${slug}_${h}`, n)),
});

export const COMUNS: Grupo[] = [
  comum('nossasenhora', 'Comum de Nossa Senhora'),
  comum('apostolos', 'Comum dos Apóstolos'),
  comum('ummartir', 'Comum de um mártir'),
  comum('variosmartires', 'Comum de vários mártires'),
  comum('pastores', 'Comum dos pastores'),
  comum('doutores', 'Comum dos doutores da Igreja'),
  comum('virgens', 'Comum das virgens'),
  comum('santoshomens', 'Comum dos santos homens'),
  comum('santosreligiosos', 'Comum dos santos religiosos'),
  comum('santasmulheres', 'Comum das santas mulheres'),
  comum('santasreligiosas', 'Comum das santas religiosas'),
  comum('dedicacaoigreja', 'Comum da dedicação de uma igreja'),
  {
    titulo: 'Ofícios votivos e outros',
    itens: [
      o('memoria_santamaria_sabado_leituras', 'Santa Maria no sábado: Ofício das Leituras'),
      o('memoria_santamaria_sabado_laudes', 'Santa Maria no sábado: Laudes'),
      o('oficio_fieisdefuntos_leituras', 'Ofício dos fiéis defuntos: Leituras'),
      o('oficio_fieisdefuntos_laudes', 'Ofício dos fiéis defuntos: Laudes'),
      o('oficio_fieisdefuntos_vesperas', 'Ofício dos fiéis defuntos: Vésperas'),
      OFICIO_IMACULADA,
      o('oficiosaojose', 'Ofício de São José'),
      o('oficioNSCarmo', 'Ofício de Nossa Senhora do Carmo'),
      o('oficiodapaixaodosenhor', 'Ofício da Paixão do Senhor'),
      o('oficiodastrevas', 'Ofício das Trevas'),
      o('antifonas_o', 'As antífonas do "Ó"'),
      o('hinosdiversos', 'Hinos diversos'),
      o('benedictus', 'Cântico Benedictus'),
      o('magnificat', 'Cântico Magnificat'),
      o('nuncdimittis', 'Cântico Nunc dimittis'),
    ],
  },
];

const m = (p: string, titulo: string, sub?: string): Item => ({ arquivo: `missal/${p}`, titulo, sub });

export const MISSAL_FIXO: Grupo[] = [
  {
    titulo: 'Ordinário da Missa',
    itens: [
      m('ordinario/ritosiniciais', 'Ritos iniciais'),
      m('ordinario/liturgiapalavra', 'Liturgia da Palavra'),
      m('ordinario/oracoesuniversais', 'Fórmulas de oração universal'),
      m('ordinario/liturgiaeucaristica', 'Liturgia eucarística'),
      m('ordinario/ritocomunhao', 'Rito da Comunhão'),
      m('ordinario/ritosfinais', 'Ritos finais'),
      m('ordinario/ritosempovo', 'Ordinário da Missa sem povo'),
    ],
  },
  {
    titulo: 'Orações eucarísticas',
    itens: [
      m('oracaoeucaristica/oracaoeucaristicaI', 'Oração eucarística I', 'Cânon romano'),
      m('oracaoeucaristica/oracaoeucaristicaII', 'Oração eucarística II'),
      m('oracaoeucaristica/oracaoeucaristicaIII', 'Oração eucarística III'),
      m('oracaoeucaristica/oracaoeucaristicaIV', 'Oração eucarística IV'),
      m('oracaoeucaristica/oracaoeucaristicaV', 'Oração eucarística V'),
      m('oracaoeucaristica/oracaoeucaristicaRI', 'Sobre a reconciliação I'),
      m('oracaoeucaristica/oracaoeucaristicaRII', 'Sobre a reconciliação II'),
      m('oracaoeucaristica/oracaoeucaristicaDCI', 'Para diversas circunstâncias I'),
      m('oracaoeucaristica/oracaoeucaristicaDCII', 'Para diversas circunstâncias II'),
      m('oracaoeucaristica/oracaoeucaristicaDCIII', 'Para diversas circunstâncias III'),
      m('oracaoeucaristica/oracaoeucaristicaDCIV', 'Para diversas circunstâncias IV'),
      m('oracaoeucaristica/oracaoeucaristicaCI', 'Com crianças I'),
      m('oracaoeucaristica/oracaoeucaristicaCII', 'Com crianças II'),
      m('oracaoeucaristica/oracaoeucaristicaCIII', 'Com crianças III'),
    ],
  },
];

export const ROSARIO: Grupo[] = [
  {
    titulo: 'Mistérios',
    itens: [
      { arquivo: 'rosario/misterios_alegria', titulo: 'Mistérios gozosos', sub: 'Segunda-feira e sábado' },
      { arquivo: 'rosario/misterios_luz', titulo: 'Mistérios luminosos', sub: 'Quinta-feira' },
      { arquivo: 'rosario/misterios_dor', titulo: 'Mistérios dolorosos', sub: 'Terça e sexta-feira' },
      { arquivo: 'rosario/misterios_gloria', titulo: 'Mistérios gloriosos', sub: 'Quarta-feira e domingo' },
    ],
  },
];

export function titulo(texto: string): string {
  const menores = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'em', 'para', 'por', 'no', 'na', 'ao', 'à']);
  return texto
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) => (i > 0 && menores.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}
