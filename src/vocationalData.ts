export const VOCATIONAL_CATEGORIES = [
  { id: 'pastoreio', name: 'Pastoreio', description: 'Cuidado, acolhimento, proteção e discipulado.', ministries: ['Célula', 'Discipulado', 'Acompanhamento Familiar'] },
  { id: 'ensino', name: 'Ensino', description: 'Estudo, profundidade bíblica e organização de conhecimento.', ministries: ['Escola Bíblica', 'Cursos', 'Treinamento', 'Discipulado Teológico'] },
  { id: 'evangelismo', name: 'Evangelismo', description: 'Ousadia, comunicação e paixão por vidas.', ministries: ['Evangelismo', 'Missões Urbanas', 'Ação Social'] },
  { id: 'profetico', name: 'Profético', description: 'Discernimento, sensibilidade e direção espiritual.', ministries: ['Intercessão', 'Oração', 'Aconselhamento'] },
  { id: 'intercessao', name: 'Intercessão', description: 'Tempo em oração e peso espiritual.', ministries: ['Vigílias', 'Torre de Oração', 'Intercessão Profética'] },
  { id: 'louvor', name: 'Louvor e Adoração', description: 'Conexão com Deus através da música e arte.', ministries: ['Equipe de Louvor', 'Banda', 'Coro', 'Equipe de Adoração'] },
  { id: 'servico', name: 'Serviço e Ajuda', description: 'Humildade, bastidores e suporte ministerial.', ministries: ['Recepção', 'Apoio', 'Logística', 'Assistência Social'] },
  { id: 'administracao', name: 'Administração e Liderança', description: 'Estratégia, organização e gestão.', ministries: ['Coordenação', 'Administração', 'Projetos'] },
  { id: 'missoes', name: 'Missões', description: 'Adaptação, coragem e expansão do Reino.', ministries: ['Missões Transculturais', 'Plantação de Igrejas'] },
  { id: 'aconselhamento', name: 'Aconselhamento e Cuidado', description: 'Empatia, restauração e cuidado emocional.', ministries: ['Pastoral de Oração', 'Cuidado de Membros'] },
  { id: 'comunicacao', name: 'Comunicação e Mídia', description: 'Influência, expressão e criatividade digital.', ministries: ['Mídia', 'Design', 'Fotografia', 'Redes Sociais'] },
  { id: 'criatividade', name: 'Criatividade e Artes', description: 'Expressão artística e soluções criativas.', ministries: ['Teatro', 'Dança', 'Artes Visuais', 'Cenografia'] },
  { id: 'empreendedorismo', name: 'Empreendedorismo do Reino', description: 'Inovação e criação de novos projetos.', ministries: ['Novos Projetos', 'Gestão de Recursos'] },
  { id: 'formacao', name: 'Formação e Discipulado', description: 'Paciência e desenvolvimento de líderes.', ministries: ['Escola de Líderes', 'Mentoria'] }
];

export const VOCATIONAL_QUESTIONS = [
  // Pastoreio
  { id: 1, category: 'pastoreio', text: 'Pessoas costumam procurar meus conselhos espontaneamente.' },
  { id: 2, category: 'pastoreio', text: 'Tenho facilidade em cuidar emocionalmente das pessoas.' },
  { id: 3, category: 'pastoreio', text: 'Sinto preocupação quando alguém se afasta da igreja.' },
  { id: 4, category: 'pastoreio', text: 'Gosto de acompanhar crescimento espiritual de pessoas.' },
  { id: 5, category: 'pastoreio', text: 'Tenho paciência para ouvir problemas longos.' },
  // Ensino
  { id: 6, category: 'ensino', text: 'Tenho facilidade para explicar assuntos bíblicos.' },
  { id: 7, category: 'ensino', text: 'Gosto de estudar profundamente a Bíblia.' },
  { id: 8, category: 'ensino', text: 'Pessoas dizem que aprendem facilmente comigo.' },
  { id: 9, category: 'ensino', text: 'Sinto prazer em preparar estudos e aulas.' },
  { id: 10, category: 'ensino', text: 'Tenho interesse em doutrina e conhecimento bíblico.' },
  // Evangelismo
  { id: 11, category: 'evangelismo', text: 'Tenho facilidade para falar de Jesus para desconhecidos.' },
  { id: 12, category: 'evangelismo', text: 'Sinto alegria quando alguém aceita Cristo.' },
  { id: 13, category: 'evangelismo', text: 'Gosto de alcançar pessoas afastadas da fé.' },
  { id: 14, category: 'evangelismo', text: 'Tenho coragem para iniciar conversas evangelísticas.' },
  { id: 15, category: 'evangelismo', text: 'Sinto urgência pela salvação de vidas.' },
  // Profético
  { id: 16, category: 'profetico', text: 'Tenho forte sensibilidade espiritual.' },
  { id: 17, category: 'profetico', text: 'Muitas vezes percebo situações espirituais antes dos outros.' },
  { id: 18, category: 'profetico', text: 'Deus frequentemente me direciona através de sonhos ou impressões.' },
  { id: 19, category: 'profetico', text: 'Tenho facilidade para discernir ambientes espirituais.' },
  { id: 20, category: 'profetico', text: 'Pessoas já confirmaram palavras ou direcionamentos que compartilhei.' },
  // Intercessão
  { id: 21, category: 'intercessao', text: 'Gosto de passar tempo em oração.' },
  { id: 22, category: 'intercessao', text: 'Sinto peso espiritual por pessoas e situações.' },
  { id: 23, category: 'intercessao', text: 'Tenho perseverança em oração.' },
  { id: 24, category: 'intercessao', text: 'Frequentemente oro por outras pessoas espontaneamente.' },
  { id: 25, category: 'intercessao', text: 'Sinto prazer em campanhas e vigílias de oração.' },
  // Louvor
  { id: 26, category: 'louvor', text: 'A música me aproxima profundamente de Deus.' },
  { id: 27, category: 'louvor', text: 'Tenho facilidade para conduzir ambientes de adoração.' },
  { id: 28, category: 'louvor', text: 'Gosto de ministrar através da música.' },
  { id: 29, category: 'louvor', text: 'Me sinto conectado com Deus através da arte e adoração.' },
  { id: 30, category: 'louvor', text: 'Tenho sensibilidade espiritual durante o louvor.' },
  // Serviço
  { id: 31, category: 'servico', text: 'Gosto de servir nos bastidores.' },
  { id: 32, category: 'servico', text: 'Tenho prazer em ajudar sem reconhecimento.' },
  { id: 33, category: 'servico', text: 'Vejo facilmente necessidades práticas das pessoas.' },
  { id: 34, category: 'servico', text: 'Sou disposto a trabalhar onde ninguém quer.' },
  { id: 35, category: 'servico', text: 'Sinto alegria em facilitar a vida de outros.' },
  // Administração
  { id: 36, category: 'administracao', text: 'Tenho facilidade para organizar equipes.' },
  { id: 37, category: 'administracao', text: 'Gosto de estruturar processos e projetos.' },
  { id: 38, category: 'administracao', text: 'Pessoas naturalmente seguem minha direção.' },
  { id: 39, category: 'administracao', text: 'Tenho facilidade para resolver problemas.' },
  { id: 40, category: 'administracao', text: 'Consigo liderar sob pressão.' },
  // Missões
  { id: 41, category: 'missoes', text: 'Tenho desejo de alcançar outras culturas e povos.' },
  { id: 42, category: 'missoes', text: 'Me adapto facilmente a novos ambientes.' },
  { id: 43, category: 'missoes', text: 'Sinto paixão pela expansão do Reino de Deus.' },
  { id: 44, category: 'missoes', text: 'Tenho disposição para sair da zona de conforto.' },
  { id: 45, category: 'missoes', text: 'Sonho em impactar nações e comunidades.' },
  // Aconselhamento
  { id: 46, category: 'aconselhamento', text: 'Pessoas se sentem seguras para abrir o coração comigo.' },
  { id: 47, category: 'aconselhamento', text: 'Tenho empatia pelas dores das pessoas.' },
  { id: 48, category: 'aconselhamento', text: 'Consigo perceber emoções facilmente.' },
  { id: 49, category: 'aconselhamento', text: 'Tenho habilidade para restaurar relacionamentos.' },
  { id: 50, category: 'aconselhamento', text: 'Gosto de ajudar pessoas em crises emocionais.' },
  // Comunicação
  { id: 51, category: 'comunicacao', text: 'Tenho facilidade para comunicar ideias.' },
  { id: 52, category: 'comunicacao', text: 'Gosto de redes sociais, mídia ou comunicação digital.' },
  { id: 53, category: 'comunicacao', text: 'Consigo transmitir mensagens de forma criativa.' },
  { id: 54, category: 'comunicacao', text: 'Tenho facilidade diante de câmeras ou público.' },
  { id: 55, category: 'comunicacao', text: 'Sinto desejo de impactar vidas através da comunicação.' },
  // Criatividade
  { id: 56, category: 'criatividade', text: 'Sou naturalmente criativo.' },
  { id: 57, category: 'criatividade', text: 'Gosto de expressar ideias artisticamente.' },
  { id: 58, category: 'criatividade', text: 'Tenho interesse por design, vídeo, teatro, dança ou artes.' },
  { id: 59, category: 'criatividade', text: 'Consigo criar soluções criativas para problemas.' },
  { id: 60, category: 'criatividade', text: 'Acredito que arte também é ferramenta ministerial.' },
  // Empreendedorismo
  { id: 61, category: 'empreendedorismo', text: 'Tenho visão para criar projetos e iniciativas.' },
  { id: 62, category: 'empreendedorismo', text: 'Consigo enxergar oportunidades rapidamente.' },
  { id: 63, category: 'empreendedorismo', text: 'Tenho perfil inovador.' },
  { id: 64, category: 'empreendedorismo', text: 'Gosto de construir algo novo.' },
  { id: 65, category: 'empreendedorismo', text: 'Desejo usar negócios e recursos para expandir o Reino.' },
  // Formação
  { id: 66, category: 'formacao', text: 'Gosto de acompanhar crescimento espiritual contínuo.' },
  { id: 67, category: 'formacao', text: 'Tenho paciência para ensinar processos.' },
  { id: 68, category: 'formacao', text: 'Me alegro vendo pessoas amadurecendo espiritualmente.' },
  { id: 69, category: 'formacao', text: 'Tenho facilidade para desenvolver líderes.' },
  { id: 70, category: 'formacao', text: 'Acredito fortemente em discipulado intencional.' }
];

export const getInterpretation = (score: number) => {
  if (score >= 21) return { label: 'Vocação muito evidente', color: 'text-green-600', bg: 'bg-green-50' };
  if (score >= 16) return { label: 'Forte inclinação ministerial', color: 'text-blue-600', bg: 'bg-blue-50' };
  if (score >= 11) return { label: 'Tendência moderada', color: 'text-stone-600', bg: 'bg-stone-50' };
  return { label: 'Baixa incidência vocacional', color: 'text-stone-400', bg: 'bg-white border-stone-100' };
};
