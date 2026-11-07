// Santo Rosário. O texto vem do pacote de conteúdo (provisório); por cima dele entram as partes da Comunidade:
// - títulos dos mistérios como se reza na Comunidade ("Primeiro Mistério Gozoso: A Anunciação do Anjo Gabriel à
//   Virgem Maria"; no índice do leitor, o nome curto);
// - meditação, leitura e virtude de cada mistério, escritas para o app (aprovadas pelo Gabriel em 07/11/2026), no
//   lugar do texto do original; o Evangelho de cada mistério (referência e texto) continua o do pacote;
// - a jaculatória da Comunidade;
// - o contador de Ave-Marias: aqui só o lugar dele (`<div class="pf-terco">`); o terço e o botão são montados pelo
//   script da página (`conteudo/terco.ts`).
// Se o pacote mudar e algum trecho não for encontrado, aquela parte fica como está (nada some).

interface Misterio {
  titulo: string; // segunda linha do título
  curto: string; // no índice do leitor
  meditacao: string;
  leitura: string;
  virtude: string; // vai entre parênteses no fim da leitura
}

const ORDINAL = ['Primeiro', 'Segundo', 'Terceiro', 'Quarto', 'Quinto'];

const CONJUNTOS: Record<string, { nome: string; misterios: Misterio[] }> = {
  'rosario/misterios_alegria': {
    nome: 'Gozoso',
    misterios: [
      {
        titulo: 'A Anunciação do Anjo Gabriel à Virgem Maria',
        curto: 'A Anunciação',
        meditacao: 'O Anjo São Gabriel é enviado por Deus a Nazaré para anunciar a Maria que ela conceberá e dará à luz o Filho de Deus, obtendo o seu “sim”.',
        leitura:
          '“Ave, cheia de graça, o Senhor é contigo.” Com essa saudação, o anjo Gabriel se dirige a Maria, que se perturba e reflete sobre o sentido dessas palavras. O anjo a tranquiliza: Maria encontrou graça diante de Deus e, pela ação do Espírito Santo, será a Mãe do Filho do Altíssimo, cujo Reino não terá fim. Cheia de fé, ela entrega a Deus toda a sua vida: “Eis aqui a serva do Senhor; faça-se em mim segundo a tua palavra”. E o Verbo se fez carne e habitou entre nós.',
        virtude: 'Humildade: Maria se reconhece serva e deixa Deus agir nela. Peçamos um coração simples, pronto a dizer “sim” ao Senhor.',
      },
      {
        titulo: 'A Visitação da Virgem Maria à sua prima Santa Isabel',
        curto: 'A Visitação',
        meditacao:
          'Maria parte apressadamente para as montanhas da Judeia para ajudar Isabel. Ao som da saudação de Maria, João Batista estremece de alegria no ventre de Isabel, e Maria entoa o cântico do Magnificat.',
        leitura:
          'Mesmo trazendo no ventre o Filho de Deus, Maria não pensa em si: ao saber que sua prima Isabel, já idosa, espera um filho, vai às pressas servi-la. Quando Isabel ouve a sua saudação, a criança estremece em seu ventre, e ela, cheia do Espírito Santo, exclama: “Bendita és tu entre as mulheres, e bendito é o fruto do teu ventre!”. Maria devolve toda a glória a Deus: “A minha alma engrandece o Senhor”. E fica com Isabel cerca de três meses.',
        virtude: 'Caridade: quem leva Jesus consigo vai ao encontro dos outros para servir. Peçamos olhos atentos às necessidades de quem está perto de nós.',
      },
      {
        titulo: 'O Nascimento de Jesus na gruta de Belém',
        curto: 'O Nascimento de Jesus',
        meditacao: 'Em uma simples manjedoura em Belém, nasce o Salvador da humanidade. Os anjos louvam a Deus e anunciam a boa nova aos pastores.',
        leitura:
          'Por causa de um recenseamento ordenado pelo imperador, José sobe com Maria de Nazaré a Belém, a cidade de Davi. Ali se completam os dias do parto e, como não há lugar para eles na hospedaria, Maria dá à luz o seu Filho, envolve-o em faixas e o deita numa manjedoura. O Filho de Deus escolhe nascer pobre e pequeno. Os primeiros a receber a notícia são os pastores, que vão às pressas e encontram Maria, José e o Menino.',
        virtude: 'Pobreza de espírito: o Filho de Deus nasce pobre para nos enriquecer com a sua graça. Peçamos um coração desapegado das coisas e generoso com quem precisa.',
      },
      {
        titulo: 'A Apresentação do Menino Jesus no Templo',
        curto: 'A Apresentação',
        meditacao: 'Cumprindo a Lei de Moisés, Maria e José levam o Menino Jesus ao Templo de Jerusalém, onde são acolhidos pelo justo Simeão e pela profetisa Ana.',
        leitura:
          'Quarenta dias depois do nascimento, Maria e José sobem a Jerusalém para apresentar o Menino ao Senhor e fazer a oferta dos pobres: um par de rolas. No Templo, o velho Simeão, movido pelo Espírito Santo, toma Jesus nos braços e bendiz a Deus, porque seus olhos viram a salvação. Depois, anuncia a Maria que uma espada transpassará a sua alma. A profetisa Ana também louva a Deus e fala do Menino a todos que esperam a libertação de Jerusalém.',
        virtude: 'Obediência: Maria e José cumprem com fidelidade a Lei do Senhor e oferecem o Filho ao Pai. Peçamos a graça de entregar a Deus tudo o que somos e temos.',
      },
      {
        titulo: 'A Perda e o Encontro do Menino Jesus no Templo',
        curto: 'O Encontro no Templo',
        meditacao: 'Após três dias de aflição procurando por Jesus, Maria e José o encontram no Templo conversando com os doutores da Lei e ouvindo-os.',
        leitura:
          'Quando Jesus tem doze anos, a Sagrada Família sobe a Jerusalém para a festa da Páscoa. Na volta, Maria e José percebem que o Menino não está com eles e, aflitos, voltam para procurá-lo. Depois de três dias, encontram-no no Templo, sentado entre os doutores, ouvindo-os e fazendo-lhes perguntas. Maria lhe conta a angústia com que o procuravam, e Jesus responde: “Não sabíeis que devo estar na casa de meu Pai?”. Depois, volta com eles para Nazaré e lhes é obediente.',
        virtude: 'Busca de Jesus: Maria e José não descansam até encontrá-lo. Peçamos a graça de buscar Jesus sempre e de voltar para Ele quando nos afastamos pelo pecado.',
      },
    ],
  },
  'rosario/misterios_luz': {
    nome: 'Luminoso',
    misterios: [
      {
        titulo: 'O Batismo de Jesus no Rio Jordão',
        curto: 'O Batismo de Jesus',
        meditacao: 'Jesus vai da Galileia ao Rio Jordão e é batizado por João. O céu se abre, o Espírito Santo desce sobre Ele como uma pomba, e o Pai o apresenta como seu Filho amado.',
        leitura:
          'João Batista prega a conversão e batiza no Rio Jordão quando Jesus chega da Galileia para ser batizado. João tenta impedi-lo: “Eu é que preciso ser batizado por ti, e tu vens a mim?”. Mas Jesus insiste, porque convém cumprir toda a justiça. Ele, que não tem pecado, coloca-se no meio dos pecadores para tomar sobre si os nossos pecados. Ao sair da água, é revelado como o Filho amado, em quem o Pai se compraz.',
        virtude: 'Fidelidade ao Batismo: no Batismo também nós nos tornamos filhos amados do Pai. Peçamos a graça de viver como filhos de Deus.',
      },
      {
        titulo: 'A Revelação de Jesus nas Bodas de Caná',
        curto: 'As Bodas de Caná',
        meditacao: 'Numa festa de casamento em Caná da Galileia, atendendo ao pedido de Maria, Jesus transforma a água em vinho e realiza o primeiro de seus sinais.',
        leitura:
          'Em Caná da Galileia, Maria, Jesus e os discípulos participam de uma festa de casamento. Atenta a tudo, Maria percebe que o vinho acabou e diz ao Filho: “Eles não têm mais vinho”. Depois, orienta os serventes: “Fazei tudo o que Ele vos disser”. Jesus manda encher de água seis talhas de pedra, e a água se torna o melhor vinho da festa. Assim Ele manifesta a sua glória, e os discípulos creem nele.',
        virtude: 'Confiança em Maria: ela percebe nossas necessidades antes de nós e nos conduz a Jesus. Peçamos a graça de fazer tudo o que Ele nos disser.',
      },
      {
        titulo: 'O Anúncio do Reino de Deus e o convite à conversão',
        curto: 'O Anúncio do Reino',
        meditacao: 'Jesus percorre a Galileia anunciando que o Reino de Deus está próximo e chama todos à conversão, curando os doentes e perdoando os pecadores.',
        leitura:
          'Depois que João é preso, Jesus começa a proclamar o Evangelho de Deus: “Completou-se o tempo, e o Reino de Deus está próximo. Convertei-vos e crede no Evangelho”. Ele chama os primeiros discípulos, ensina com autoridade, senta-se à mesa com os pecadores e mostra a todos a misericórdia do Pai. O Reino chega a quem abre o coração à sua Palavra e se deixa transformar por ela.',
        virtude: 'Conversão: o Reino começa em nós quando deixamos o pecado e voltamos para Deus. Peçamos um coração arrependido e a graça de uma boa confissão.',
      },
      {
        titulo: 'A Transfiguração de Jesus no Monte Tabor',
        curto: 'A Transfiguração',
        meditacao: 'No alto do monte, Jesus se transfigura diante de Pedro, Tiago e João e deixa ver a glória que tem junto do Pai.',
        leitura:
          'Jesus leva consigo Pedro, Tiago e João e sobe a um monte para rezar. Enquanto reza, o aspecto do seu rosto muda, e suas vestes ficam brancas e resplandecentes. Moisés e Elias aparecem na glória e falam com Ele sobre a sua partida, que vai se cumprir em Jerusalém. Pedro quer ficar ali e fazer três tendas, mas uma nuvem os envolve, e da nuvem sai a voz do Pai: “Este é o meu Filho, o Escolhido. Escutai-o!”.',
        virtude: 'Escuta da Palavra: o Pai nos pede que escutemos o seu Filho. Peçamos a graça de ouvir Jesus e de pôr em prática o que Ele nos diz.',
      },
      {
        titulo: 'A Instituição da Eucaristia',
        curto: 'A Eucaristia',
        meditacao: 'Na Última Ceia, Jesus institui a Eucaristia: sob as aparências do pão e do vinho, entrega aos apóstolos o seu Corpo e o seu Sangue.',
        leitura:
          'Sabendo que chegou a sua hora, Jesus, que amava os seus, ama-os até o fim. Na Última Ceia, toma o pão, dá graças, parte-o e o dá aos discípulos: “Isto é o meu Corpo, que é dado por vós”. Depois, toma o cálice: “Este cálice é a nova Aliança no meu Sangue”. E lhes ordena: “Fazei isto em memória de mim”. Desde então, em cada Missa, Jesus continua a se dar a nós como alimento para o caminho.',
        virtude: 'Amor à Eucaristia: Jesus está verdadeiramente presente no Santíssimo Sacramento. Peçamos a graça de recebê-lo com fé e de adorá-lo com amor.',
      },
    ],
  },
  'rosario/misterios_dor': {
    nome: 'Doloroso',
    misterios: [
      {
        titulo: 'A Agonia de Jesus no Horto das Oliveiras',
        curto: 'A Agonia no Horto',
        meditacao:
          'No Horto das Oliveiras, diante da Paixão que se aproxima, Jesus sofre uma agonia tão grande que seu suor se torna como gotas de sangue, e reza ao Pai entregando-se à sua vontade.',
        leitura:
          'Depois da Ceia, Jesus vai com os discípulos ao Getsêmani. Leva consigo Pedro, Tiago e João e começa a sentir pavor e angústia: “A minha alma está triste até a morte. Ficai aqui e vigiai”. Um pouco adiante, cai por terra e reza: “Abbá, Pai, tudo te é possível: afasta de mim este cálice; porém, não o que eu quero, mas o que tu queres”. Ao voltar, encontra os discípulos dormindo.',
        virtude: 'Entrega à vontade de Deus: na hora da angústia, Jesus reza e se entrega ao Pai. Peçamos a graça de rezar nas provações e dizer, com Ele: “Seja feita a vossa vontade”.',
      },
      {
        titulo: 'A Flagelação de Jesus atado à coluna',
        curto: 'A Flagelação',
        meditacao: 'Por ordem de Pilatos, Jesus é atado à coluna e cruelmente flagelado, sofrendo em seu corpo as dores dos nossos pecados.',
        leitura:
          'Pilatos interroga Jesus e não encontra nele culpa alguma. Mesmo assim, para agradar à multidão, manda flagelá-lo. Os soldados o amarram e o açoitam com crueldade. Jesus não reage nem se queixa: em silêncio, oferece o seu corpo ferido pela nossa salvação. Cumpre-se o que anunciou o profeta Isaías: “Pelas suas chagas fomos curados”.',
        virtude: 'Pureza: Jesus oferece o seu corpo ferido pelos nossos pecados. Peçamos a graça de respeitar o nosso corpo e o dos outros, templos do Espírito Santo.',
      },
      {
        titulo: 'A Coroação de Jesus com espinhos',
        curto: 'A Coroação de espinhos',
        meditacao: 'Os soldados coroam Jesus com espinhos e zombam dele como rei, e o Senhor do universo aceita ser humilhado por amor a nós.',
        leitura:
          'Depois da flagelação, os soldados reúnem toda a tropa em volta de Jesus. Tecem uma coroa de espinhos e a colocam em sua cabeça, vestem-no com um manto de púrpura e põem-lhe uma cana na mão. Depois, ajoelham-se diante dele e zombam: “Salve, rei dos judeus!”, e lhe dão bofetadas. Jesus, o verdadeiro Rei, suporta o desprezo em silêncio, para reinar em nossos corações pelo amor.',
        virtude: 'Coragem: Jesus suporta o desprezo sem deixar de ser quem é. Peçamos a coragem de testemunhar a fé sem medo do que os outros vão pensar.',
      },
      {
        titulo: 'Jesus carregando a Cruz até o Calvário',
        curto: 'Jesus carrega a Cruz',
        meditacao: 'Condenado à morte, Jesus carrega a Cruz pelas ruas de Jerusalém até o Calvário, cansado e ferido, mas firme no amor.',
        leitura:
          'Pilatos entrega Jesus para ser crucificado. Carregando Ele mesmo a sua Cruz, o Senhor sai em direção ao lugar chamado Calvário, em hebraico Gólgota. No caminho, os soldados obrigam Simão de Cirene, que volta do campo, a carregar a Cruz atrás de Jesus. Uma grande multidão o segue, e algumas mulheres choram por Ele. Passo a passo, Jesus leva sobre os ombros o peso dos pecados do mundo.',
        virtude: 'Paciência: Jesus abraça a Cruz sem revolta. Peçamos a graça de carregar com paciência as cruzes de cada dia e de ajudar, como Simão, quem sofre ao nosso lado.',
      },
      {
        titulo: 'A Crucificação e Morte de Jesus',
        curto: 'A Crucificação',
        meditacao: 'No Calvário, Jesus é crucificado e, depois de três horas de agonia, entrega a vida pela nossa salvação.',
        leitura:
          'No Calvário, Jesus é pregado na Cruz entre dois malfeitores. Dali, reza pelos que o crucificam: “Pai, perdoa-lhes, porque não sabem o que fazem”. Promete o paraíso ao ladrão arrependido e entrega Maria como Mãe ao discípulo amado. Do meio-dia às três da tarde, as trevas cobrem toda a terra. Então Jesus clama em alta voz: “Pai, em tuas mãos entrego o meu espírito”. E, dizendo isso, expira.',
        virtude: 'Perdão: na Cruz, Jesus dá a vida por todos e perdoa até os que o crucificam. Peçamos a graça de perdoar de coração e de rezar pela salvação das almas.',
      },
    ],
  },
  'rosario/misterios_gloria': {
    nome: 'Glorioso',
    misterios: [
      {
        titulo: 'A Ressurreição de Jesus',
        curto: 'A Ressurreição',
        meditacao: 'Ao terceiro dia, Jesus ressuscita glorioso, vencendo o pecado e a morte, e enche de alegria o coração dos seus discípulos.',
        leitura:
          'Passado o sábado, ao raiar do primeiro dia da semana, Maria Madalena e a outra Maria vão ver o sepulcro. De repente, a terra treme: um anjo do Senhor desce do céu, remove a pedra e senta-se sobre ela. Ele diz às mulheres: “Não tenhais medo! Sei que procurais Jesus, o crucificado. Não está aqui, pois ressuscitou, como havia dito”. Cheias de alegria, elas correm para anunciar a notícia aos discípulos.',
        virtude: 'Fé: Cristo ressuscitado venceu o pecado e a morte. Peçamos uma fé viva, que nos faça testemunhas da Ressurreição.',
      },
      {
        titulo: 'A Ascensão de Jesus ao Céu',
        curto: 'A Ascensão',
        meditacao: 'Quarenta dias depois da Páscoa, Jesus abençoa os apóstolos e sobe glorioso ao Céu, onde está sentado à direita do Pai.',
        leitura:
          'Durante quarenta dias depois da Páscoa, Jesus aparece aos apóstolos e lhes fala do Reino de Deus. Antes de partir, promete: “Recebereis a força do Espírito Santo, que descerá sobre vós, e sereis minhas testemunhas até os confins da terra”. Dito isso, é elevado à vista deles, e uma nuvem o encobre. Enquanto olham para o céu, dois homens vestidos de branco lhes anunciam que Ele voltará do mesmo modo como o viram partir.',
        virtude: 'Esperança: Jesus foi preparar-nos um lugar junto do Pai. Peçamos a graça de viver com o coração no Céu, sem deixar de anunciar o Evangelho aqui na terra.',
      },
      {
        titulo: 'A Vinda do Espírito Santo sobre a Virgem Maria e os Apóstolos',
        curto: 'A Vinda do Espírito Santo',
        meditacao: 'Reunidos no Cenáculo com a Virgem Maria, os apóstolos recebem o Espírito Santo, e nasce a Igreja, enviada a anunciar o Evangelho a todos os povos.',
        leitura:
          'Depois da Ascensão, os apóstolos perseveram unidos em oração com Maria, a Mãe de Jesus. No dia de Pentecostes, vem do céu um ruído como de um vento impetuoso, e aparecem línguas como de fogo, que pousam sobre cada um deles. Todos ficam cheios do Espírito Santo e começam a falar em outras línguas. Pedro, que antes tivera medo, anuncia com coragem Jesus ressuscitado diante da multidão.',
        virtude: 'Docilidade ao Espírito Santo: Ele transforma o medo em coragem e enche o coração de amor a Deus. Peçamos os seus dons e a graça de seguir a sua voz.',
      },
      {
        titulo: 'A Assunção da Virgem Maria ao Céu',
        curto: 'A Assunção',
        meditacao: 'Terminado o curso de sua vida terrena, a Virgem Maria é elevada em corpo e alma à glória do Céu.',
        leitura:
          'Maria guardou no coração todas as palavras de seu Filho e o acompanhou até a Cruz. Depois, permaneceu com os apóstolos em oração, como Mãe da Igreja nascente. Deus, que fez nela grandes coisas, não quis que conhecesse a corrupção do sepulcro: a Virgem Imaculada participa já, em corpo e alma, da glória de Cristo ressuscitado. Cumpre-se o que ela mesma cantou no Magnificat: “Todas as gerações me chamarão bem-aventurada, porque o Poderoso fez em mim maravilhas”.',
        virtude: 'Desejo do Céu: onde Maria está, também nós somos chamados a chegar. Peçamos a graça de uma santa morte e de um dia estar com ela junto de Deus.',
      },
      {
        titulo: 'A Coroação da Virgem Maria como Rainha do Céu e da Terra',
        curto: 'A Coroação de Maria',
        meditacao: 'A Virgem Maria, humilde serva do Senhor, é coroada por Deus como Rainha de todo o universo.',
        leitura:
          'No livro do Apocalipse, São João vê um grande sinal no céu: “uma Mulher vestida de sol, com a lua debaixo dos pés e, sobre a cabeça, uma coroa de doze estrelas”. A Igreja reconhece nesse sinal a Virgem Maria, exaltada por Deus como Rainha do Céu e da Terra, dos anjos e dos santos. Rainha e Mãe, ela não se esquece de nós: intercede por seus filhos e nos conduz a Jesus.',
        virtude: 'Devoção a Maria: quem se confia a Maria encontra uma Mãe que o leva a Jesus. Peçamos a graça de perseverar na fé até o fim, sob o seu manto.',
      },
    ],
  },
};

/** Jaculatória da Comunidade (sem o ponto final: o ponto do original fica onde está) */
export const JACULATORIA =
  'Ó meu Jesus, perdoai e nos livrai do fogo do inferno, levai as almas todas para o céu, e socorrei principalmente as que mais precisarem da Vossa misericórdia. Abençoai o Santo Padre, o Papa, santificai o clero, protegei as nossas famílias e dai-nos saúde e paz';

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// título do original: <div class="c"><span class="r">Primeiro Mistério: <br/>A ANUNCIAÇÃO</span></div>
const RE_TITULO = /<div class="c"><span class="r">\s*(Primeiro|Segundo|Terceiro|Quarto|Quinto)\s+Mist[ée]rio:?\s*<br\s*\/?>[^<]*<\/span><\/div>/g;
// do fim da figura até o Evangelho (ou a Leitura) do mistério: o texto do original, que dá lugar ao nosso
const RE_TEXTO = /(<img[^>]*>\s*<\/div>)(?:\s*<br\s*\/?>)?[\s\S]*?(<p><span class="r">\s*(?:Evangelho|Leitura))/;
const RE_CONTADOR = /<div[^>]*>\s*Contar Ave Marias\s*<span[^>]*>\s*\d*\s*<\/span>\s*<\/div>/;
const RE_JACULATORIA = /Ó\s+meu\s+Jesus,\s+perdoai-nos,[^<]*?mais\s+precisarem/g;

/** Os mistérios do arquivo (para os testes e para quem precisar dos nomes) */
export const misteriosDe = (arquivo: string) => CONJUNTOS[arquivo];

/** Aplica as partes da Comunidade num arquivo do Rosário (os outros textos passam sem mudança) */
export function prepararRosario(arquivo: string, html: string): string {
  const conj = CONJUNTOS[arquivo];
  if (!conj) return html;
  const inicios = [...html.matchAll(RE_TITULO)];
  if (!inicios.length) return html;
  let out = html.slice(0, inicios[0].index);
  inicios.forEach((m, k) => {
    const fim = k + 1 < inicios.length ? inicios[k + 1].index! : html.length;
    let bloco = html.slice(m.index!, fim);
    const n = ORDINAL.indexOf(m[1]);
    const mist = conj.misterios[n];
    if (!mist) {
      out += bloco;
      return;
    }
    // título
    const titulo = `<div class="c pf-misterio" data-indice="${n + 1}º ${conj.nome}: ${esc(mist.curto)}"><span class="r">${ORDINAL[n]} Mistério ${conj.nome}:<br/>${esc(mist.titulo)}</span></div>`;
    bloco = bloco.replace(m[0], () => titulo);
    // meditação, leitura e virtude no lugar do texto do original
    bloco = bloco.replace(
      RE_TEXTO,
      (_t, figura: string, evangelho: string) =>
        `${figura}<p class="pf-meditacao"><span class="r">Meditação:</span> ${esc(mist.meditacao)}</p>` +
        `<p class="pf-leitura">${esc(mist.leitura)} <span class="pf-virtude">(${esc(mist.virtude)})</span></p>${evangelho}`,
    );
    // o contador de Ave-Marias (o terço é montado pelo script da página)
    bloco = bloco.replace(RE_CONTADOR, () => `<div class="pf-terco" data-misterio="${n + 1}"></div>`);
    out += bloco;
  });
  return out.replace(RE_JACULATORIA, () => JACULATORIA);
}
