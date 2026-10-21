// Conteúdo da aba Comunidade (quem somos, Casa Porta Fidei, obras, ministérios, contatos).
// PROVISÓRIO: montado a partir do blog antigo (comunidadeportafidei.wordpress.com) e do relatório de 2020.
// O que está marcado com "a confirmar" precisa ser conferido com a Comunidade.

export const DOAR_URL = 'https://doar.portafidei.com.br/doar/?origem=app';
export const BENFEITOR_URL = 'https://doar.portafidei.com.br/doar/?origem=app&tipo=benfeitor';

export type Bloco =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'titulo'; texto: string }
  | { tipo: 'lista'; itens: { titulo: string; sub?: string; icone?: string }[] }
  | { tipo: 'citacao'; texto: string; autor?: string }
  | { tipo: 'links'; itens: { titulo: string; sub?: string; url: string; icone?: string }[] }
  | { tipo: 'aviso'; texto: string };

export interface Pagina {
  id: string;
  titulo: string;
  sobre?: string; // linha pequena acima do título
  blocos: Bloco[];
}

export const CARISMA = 'Defender a Verdade, guardar a fé para a salvação das almas e o bem da Santa Igreja.';

export const QUEM_SOMOS =
  'Associação privada de fiéis na Arquidiocese de Olinda e Recife, a Comunidade Católica Porta Fidei é uma Comunidade de Aliança e de Vida. Seu nome vem da Carta Apostólica Porta Fidei, do Papa Bento XVI, que convocou o Ano da Fé, aberto em 2012: o mesmo ano em que tudo começou.';

export const PAGINAS: Record<string, Pagina> = {
  historia: {
    id: 'historia',
    titulo: 'Nossa história',
    sobre: 'De um grupo de estudo a Comunidade',
    blocos: [
      { tipo: 'aviso', texto: 'Em breve, aqui, uma linha do tempo com fotos de toda a história. Por enquanto, os primeiros marcos.' },
      {
        tipo: 'lista',
        itens: [
          { titulo: '29 de setembro de 2012', sub: 'A pedido de um padre da arquidiocese, um jovem, o Rodriguinho, reúne um pequeno grupo de estudo numa paróquia. É o primeiro encontro.', icone: 'sparkles' },
          { titulo: 'O nome: Porta Fidei', sub: 'Inspirado na Carta Apostólica Porta Fidei, de Bento XVI, que convocou o Ano da Fé.', icone: 'door.left.hand.open' },
          { titulo: 'Os primeiros anos', sub: 'O grupo percebe que a missão vai além da própria formação: levar mais pessoas ao Senhor. Nascem o SOS Curados pelo Amor e o Happy Day.', icone: 'heart' },
          { titulo: '20 de dezembro de 2015', sub: 'Os membros se compreendem, de fato, como Comunidade.', icone: 'person.3' },
          { titulo: 'Casa Porta Fidei', sub: 'A obra social e evangelizadora da Comunidade, no Parnamirim. (Data a confirmar.)', icone: 'house' },
          { titulo: '2020: Quarentena Solidária', sub: 'Na pandemia, cerca de 4 toneladas de doações chegam a comunidades da Região Metropolitana do Recife.', icone: 'shippingbox' },
        ],
      },
    ],
  },
  casa: {
    id: 'casa',
    titulo: 'Casa Porta Fidei',
    sobre: 'Obra social e evangelizadora',
    blocos: [
      { tipo: 'texto', texto: 'A Casa Porta Fidei acolhe famílias em situação de vulnerabilidade e busca realizar os sonhos de crianças e jovens em situação social difícil. Cerca de 100 famílias são acompanhadas (número a confirmar).' },
      { tipo: 'titulo', texto: 'Serviços gratuitos' },
      {
        tipo: 'lista',
        itens: [
          { titulo: 'Atendimento médico', sub: 'Dias e horários a confirmar', icone: 'stethoscope' },
          { titulo: 'Atendimento psicológico', sub: 'Dias e horários a confirmar', icone: 'brain.head.profile' },
          { titulo: 'Fisioterapia', sub: 'Dias e horários a confirmar', icone: 'figure.walk' },
          { titulo: 'Nutrição', sub: 'Dias e horários a confirmar', icone: 'leaf' },
          { titulo: 'Fonoaudiologia', sub: 'Dias e horários a confirmar', icone: 'waveform' },
          { titulo: 'Aulas de balé', sub: 'Dias e horários a confirmar', icone: 'figure.dance' },
          { titulo: 'Aulas de judô', sub: 'Dias e horários a confirmar', icone: 'figure.martial.arts' },
          { titulo: 'Pré-vestibular', sub: 'Dias e horários a confirmar', icone: 'graduationcap' },
        ],
      },
      { tipo: 'titulo', texto: 'Onde fica' },
      {
        tipo: 'links',
        itens: [
          { titulo: 'Rua Major Joaquim Cavalcanti, 75', sub: 'Parnamirim, Recife · abrir no mapa', url: 'https://maps.apple.com/?q=Rua%20Major%20Joaquim%20Cavalcanti%2C%2075%2C%20Parnamirim%2C%20Recife', icone: 'mappin.and.ellipse' },
          { titulo: 'Falar com a Casa', sub: 'WhatsApp (81) 99276-0416 (a confirmar)', url: 'https://wa.me/5581992760416', icone: 'message' },
          { titulo: '@casaportafidei', sub: 'Instagram da Casa', url: 'https://www.instagram.com/casaportafidei/', icone: 'camera' },
        ],
      },
    ],
  },
  cuscuz: {
    id: 'cuscuz',
    titulo: 'Cuscuz Solidário',
    sobre: 'Obras e ações',
    blocos: [{ tipo: 'texto', texto: 'Leva alimento, ajuda e companhia a pessoas em situação de rua na Região Metropolitana do Recife. (Texto provisório: dias, frequência e como participar a confirmar.)' }],
  },
  happyday: {
    id: 'happyday',
    titulo: 'Happy Day',
    sobre: 'Obras e ações',
    blocos: [
      { tipo: 'texto', texto: 'Um encontro para dar um dia diferente, cheio de alegria, a crianças carentes. Foi uma das primeiras iniciativas de evangelização da Obra Porta Fidei. (Texto provisório.)' },
      { tipo: 'links', itens: [{ titulo: '@happyday_pf', sub: 'Instagram do Happy Day', url: 'https://www.instagram.com/happyday_pf/', icone: 'camera' }] },
    ],
  },
  quarentena: {
    id: 'quarentena',
    titulo: 'Quarentena Solidária',
    sobre: 'Obras e ações · 2020',
    blocos: [
      { tipo: 'texto', texto: 'Com as atividades presenciais da Casa suspensas pela pandemia, a missão continuou: #aCasanaSuaCasa.' },
      {
        tipo: 'lista',
        itens: [
          { titulo: '1ª edição · Páscoa, 13 de abril de 2020', sub: '210 cestas básicas e 600 fraldas geriátricas para Peixinhos, Água Fria e Tejipió.', icone: 'shippingbox' },
          { titulo: '13 de maio de 2020', sub: 'A imagem de Nossa Senhora de Fátima percorre bairros do Recife, do Santuário de Fátima à Paróquia Nossa Senhora das Graças.', icone: 'car' },
          { titulo: '2ª edição · 22 de maio de 2020', sub: 'Cestas, máscaras e álcool em gel para Igarassu, Maria Farinha, Engenho do Meio e outras comunidades. Somando as duas, cerca de 4 toneladas.', icone: 'shippingbox' },
        ],
      },
      { tipo: 'citacao', texto: 'Mais do que dar, eu recebi: a maior graça é sair da prisão de nós mesmos para ir ao encontro do próximo.', autor: 'Luis Felipe Portela, voluntário' },
    ],
  },
  ministerios: {
    id: 'ministerios',
    titulo: 'Ministérios',
    sobre: 'A Comunidade em serviço',
    blocos: [
      { tipo: 'aviso', texto: 'Em breve: cada ministério com a sua página, fotos e contatos.' },
      {
        tipo: 'lista',
        itens: [
          { titulo: 'Ministério de Obras', sub: 'Obras sociais, como a Casa do Pão, e ações em cidades vizinhas.', icone: 'hammer' },
          { titulo: 'Ministério de Música', sub: 'Músicas autorais da Comunidade. Em breve, os álbuns e prévias para ouvir aqui.', icone: 'music.note' },
        ],
      },
    ],
  },
  benfeitor: {
    id: 'benfeitor',
    titulo: 'Seja um Benfeitor',
    sobre: 'Sustente esta obra',
    blocos: [
      { tipo: 'texto', texto: 'O Benfeitor é quem contribui todos os meses com a Comunidade. É com essa ajuda fiel que a Casa Porta Fidei se mantém de portas abertas e alcança cada dia mais famílias.' },
      { tipo: 'citacao', texto: 'Você, nosso benfeitor, também faz parte desta obra e tem um grande papel na realização deste sonho de Deus para nós.', autor: 'Relatório da Casa Porta Fidei, 2020' },
      { tipo: 'aviso', texto: 'A confirmar com a Comunidade: o que o Benfeitor recebe (por exemplo, Missa ou orações pelos benfeitores).' },
    ],
  },
};

export const REDES = [
  { titulo: 'Instagram', sub: '@comunidadeportafidei', url: 'https://www.instagram.com/comunidadeportafidei/', icone: 'camera' },
  { titulo: 'YouTube', sub: 'Comunidade Católica Porta Fidei', url: 'https://www.youtube.com/channel/UCY5bF5s1Y-JuQy0s-8JWkzw', icone: 'play.rectangle' },
  { titulo: 'Facebook', sub: 'comunidadeportafidei', url: 'https://www.facebook.com/comunidadeportafidei', icone: 'person.2' },
  { titulo: 'Site', sub: 'portafidei.com.br', url: 'https://portafidei.com.br', icone: 'globe' },
];
