// ═══════════════════════════════════════════════════════════════
// SITE TEMPLATES (Presets) — Blocos pré-montados para site
// ═══════════════════════════════════════════════════════════════

const uuid = () => crypto.randomUUID();

export const SITE_TEMPLATES = [
  {
    key: 'minimalista',
    label: 'Minimalista',
    description: 'Clean e elegante. Poucos blocos, foco nas fotos.',
    pages: [
      {
        titulo: 'Home',
        slug: 'home',
        is_home: true,
        ordem: 0,
        blocos: [
          { id: uuid(), type: 'hero', variant: 'minimal', props: { titulo: 'Fotografia que conta histórias', subtitulo: 'Registrando os momentos mais importantes da sua vida', botao_texto: 'Fale comigo', botao_url: '/contato' } },
          { id: uuid(), type: 'gallery', variant: 'grid', props: { titulo: 'Portfólio', quantidade: 6 } },
          { id: uuid(), type: 'cta', variant: 'simples', props: { titulo: 'Vamos conversar?', subtitulo: 'Entre em contato para agendar seu ensaio', botao_texto: 'WhatsApp', botao_url: '#contato' } },
        ],
      },
      {
        titulo: 'Sobre',
        slug: 'sobre',
        is_home: false,
        ordem: 1,
        blocos: [
          { id: uuid(), type: 'text', variant: 'simples', props: { titulo: 'Sobre mim', conteudo: 'Conte sua história aqui. Fale sobre sua paixão pela fotografia, experiência e estilo de trabalho.', imagem_url: '', imagem_posicao: 'direita' } },
          { id: uuid(), type: 'separator', variant: 'decorativo', props: { altura: 40 } },
          { id: uuid(), type: 'testimonials', variant: 'lista', props: { titulo: 'O que dizem sobre meu trabalho', quantidade: 3 } },
        ],
      },
      {
        titulo: 'Contato',
        slug: 'contato',
        is_home: false,
        ordem: 2,
        blocos: [
          { id: uuid(), type: 'cta', variant: 'destaque', props: { titulo: 'Fale comigo', subtitulo: 'Estou disponível para novos projetos. Vamos criar algo incrível juntos!', botao_texto: 'Enviar mensagem', botao_url: '#contato' } },
          { id: uuid(), type: 'faq', variant: 'accordion', props: { titulo: 'Perguntas frequentes', items: [{ pergunta: 'Quanto custa um ensaio?', resposta: 'Os valores variam de acordo com o tipo de ensaio. Entre em contato para um orçamento personalizado.' }, { pergunta: 'Como funciona a entrega?', resposta: 'As fotos são entregues em galeria digital online, com opção de download em alta resolução.' }, { pergunta: 'Qual o prazo de entrega?', resposta: 'O prazo médio é de 15 a 30 dias úteis após o ensaio.' }] } },
        ],
      },
    ],
  },
  {
    key: 'editorial',
    label: 'Editorial',
    description: 'Visual impactante com hero fullscreen e galeria destaque.',
    pages: [
      {
        titulo: 'Home',
        slug: 'home',
        is_home: true,
        ordem: 0,
        blocos: [
          { id: uuid(), type: 'hero', variant: 'fullscreen', props: { titulo: 'Fotografia Profissional', subtitulo: 'Casamentos • Ensaios • Eventos', imagem_url: '', botao_texto: 'Ver Portfólio', botao_url: '/portfolio' } },
          { id: uuid(), type: 'text', variant: 'destaque', props: { titulo: 'Cada momento é único', conteudo: 'Capturo a essência de cada instante com sensibilidade e técnica. Meu trabalho vai além de simples registros — são memórias que duram para sempre.' } },
          { id: uuid(), type: 'gallery', variant: 'masonry', props: { titulo: 'Trabalhos recentes', quantidade: 9 } },
          { id: uuid(), type: 'testimonials', variant: 'carousel', props: { titulo: 'Depoimentos', quantidade: 4 } },
          { id: uuid(), type: 'cta', variant: 'banner', props: { titulo: 'Pronto para registrar seu momento?', subtitulo: 'Vamos criar memórias juntos', botao_texto: 'Agendar sessão', botao_url: '#contato' } },
        ],
      },
      {
        titulo: 'Serviços',
        slug: 'servicos',
        is_home: false,
        ordem: 1,
        blocos: [
          { id: uuid(), type: 'text', variant: 'destaque', props: { titulo: 'O que eu faço', conteudo: 'Ofereço serviços fotográficos completos para os momentos mais especiais da sua vida.' } },
          { id: uuid(), type: 'services', variant: 'cards', props: { titulo: '', items: [{ nome: 'Casamentos', descricao: 'Cobertura completa do grande dia, do making of à festa', icone: '💒' }, { nome: 'Ensaios', descricao: 'Gestante, família, casal, newborn e muito mais', icone: '📸' }, { nome: 'Eventos', descricao: 'Corporativos, formaturas, aniversários e celebrações', icone: '🎉' }] } },
          { id: uuid(), type: 'faq', variant: 'accordion', props: { titulo: 'Dúvidas frequentes', items: [{ pergunta: 'Atende em outras cidades?', resposta: 'Sim! Atendo em todo o estado e viajo para outros destinos com custo de deslocamento.' }, { pergunta: 'Quanto tempo antes devo agendar?', resposta: 'Recomendo pelo menos 3 meses de antecedência para casamentos e 1 mês para ensaios.' }] } },
        ],
      },
      {
        titulo: 'Contato',
        slug: 'contato',
        is_home: false,
        ordem: 2,
        blocos: [
          { id: uuid(), type: 'cta', variant: 'destaque', props: { titulo: 'Entre em contato', subtitulo: 'Terei prazer em conversar sobre seu projeto fotográfico', botao_texto: 'Chamar no WhatsApp', botao_url: '#contato' } },
        ],
      },
    ],
  },
  {
    key: 'bold',
    label: 'Bold',
    description: 'Ousado e vibrante. Cores fortes e CTAs agressivos.',
    pages: [
      {
        titulo: 'Home',
        slug: 'home',
        is_home: true,
        ordem: 0,
        blocos: [
          { id: uuid(), type: 'hero', variant: 'split', props: { titulo: 'Fotos que vendem seu trabalho', subtitulo: 'Transformo momentos em arte. Casamentos, ensaios e eventos com olhar único.', imagem_url: '', botao_texto: 'Quero um orçamento', botao_url: '#contato' } },
          { id: uuid(), type: 'services', variant: 'grid', props: { titulo: 'Meus serviços', items: [{ nome: 'Casamento', descricao: 'Do making of à festa', icone: '💍' }, { nome: 'Ensaio', descricao: 'Gestante, família, casal', icone: '📷' }, { nome: 'Corporativo', descricao: 'Headshots e eventos', icone: '🏢' }, { nome: 'Newborn', descricao: 'Primeiros dias de vida', icone: '👶' }] } },
          { id: uuid(), type: 'gallery', variant: 'grid', props: { titulo: 'Trabalhos', quantidade: 8 } },
          { id: uuid(), type: 'testimonials', variant: 'grid', props: { titulo: 'Clientes felizes', quantidade: 4 } },
          { id: uuid(), type: 'cta', variant: 'banner', props: { titulo: 'Bora fazer acontecer?', subtitulo: 'Me manda uma mensagem agora mesmo', botao_texto: 'Falar no WhatsApp →', botao_url: '#contato' } },
        ],
      },
      {
        titulo: 'Sobre',
        slug: 'sobre',
        is_home: false,
        ordem: 1,
        blocos: [
          { id: uuid(), type: 'hero', variant: 'minimal', props: { titulo: 'Quem sou eu', subtitulo: '' } },
          { id: uuid(), type: 'text', variant: 'simples', props: { titulo: '', conteudo: 'Conte sua trajetória aqui. Fale sobre como começou na fotografia, seus valores e o que te diferencia.', imagem_url: '', imagem_posicao: 'esquerda' } },
          { id: uuid(), type: 'video', variant: 'contained', props: { titulo: 'Bastidores', url: '' } },
        ],
      },
    ],
  },
  {
    key: 'clean',
    label: 'Clean',
    description: 'Simples e funcional. Ideal para quem quer ir direto ao ponto.',
    pages: [
      {
        titulo: 'Home',
        slug: 'home',
        is_home: true,
        ordem: 0,
        blocos: [
          { id: uuid(), type: 'hero', variant: 'fullscreen', props: { titulo: 'Seu nome aqui', subtitulo: 'Fotógrafo profissional', imagem_url: '', botao_texto: 'Conhecer trabalhos', botao_url: '/portfolio' } },
          { id: uuid(), type: 'separator', variant: 'espaco', props: { altura: 40 } },
          { id: uuid(), type: 'gallery', variant: 'grid', props: { titulo: 'Destaques', quantidade: 6 } },
          { id: uuid(), type: 'separator', variant: 'linha', props: {} },
          { id: uuid(), type: 'testimonials', variant: 'lista', props: { titulo: 'Avaliações', quantidade: 3 } },
          { id: uuid(), type: 'cta', variant: 'simples', props: { titulo: 'Vamos conversar?', botao_texto: 'Entrar em contato', botao_url: '#contato' } },
        ],
      },
    ],
  },
  {
    key: 'elegante',
    label: 'Elegante',
    description: 'Sofisticado e refinado. Perfeito para casamentos e alto padrão.',
    pages: [
      {
        titulo: 'Home',
        slug: 'home',
        is_home: true,
        ordem: 0,
        blocos: [
          { id: uuid(), type: 'hero', variant: 'fullscreen', props: { titulo: 'Arte em cada detalhe', subtitulo: 'Fotografia autoral para momentos eternos', imagem_url: '', botao_texto: 'Descubra mais', botao_url: '#sobre' } },
          { id: uuid(), type: 'text', variant: 'citacao', props: { titulo: 'Marcelo Bloise', conteudo: 'A fotografia é a poesia do olhar. Cada clique guarda uma emoção que o tempo não apaga.' } },
          { id: uuid(), type: 'gallery', variant: 'masonry', props: { titulo: 'Galeria', quantidade: 9 } },
          { id: uuid(), type: 'separator', variant: 'decorativo', props: { altura: 40 } },
          { id: uuid(), type: 'testimonials', variant: 'carousel', props: { titulo: 'Palavras que me inspiram', quantidade: 5 } },
          { id: uuid(), type: 'services', variant: 'lista', props: { titulo: 'Especialidades', items: [{ nome: 'Casamento Fine Art', descricao: 'Registro artístico e delicado do seu grande dia', icone: '✨' }, { nome: 'Ensaio Editorial', descricao: 'Produção completa com direção de arte', icone: '🎨' }, { nome: 'Destination Wedding', descricao: 'Casamentos em qualquer lugar do mundo', icone: '✈️' }] } },
          { id: uuid(), type: 'cta', variant: 'destaque', props: { titulo: 'Transforme seu momento em arte', subtitulo: 'Entre em contato e vamos criar algo extraordinário', botao_texto: 'Agendar consultoria', botao_url: '#contato' } },
        ],
      },
      {
        titulo: 'Sobre',
        slug: 'sobre',
        is_home: false,
        ordem: 1,
        blocos: [
          { id: uuid(), type: 'text', variant: 'simples', props: { titulo: 'Minha história', conteudo: 'Há mais de 10 anos registrando histórias de amor. Cada casal é único, cada momento é irrepetível.', imagem_url: '', imagem_posicao: 'direita' } },
        ],
      },
      {
        titulo: 'Contato',
        slug: 'contato',
        is_home: false,
        ordem: 2,
        blocos: [
          { id: uuid(), type: 'cta', variant: 'destaque', props: { titulo: 'Vamos conversar', subtitulo: 'Adoraria ouvir sobre seus planos e como posso torná-los inesquecíveis', botao_texto: 'Enviar mensagem', botao_url: '#contato' } },
        ],
      },
    ],
  },
];
