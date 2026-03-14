export interface SeoFilters {
  source?: "ENEM" | "OBMEP";
  theme?: "geometria" | "funcoes" | "estatistica" | "probabilidade" | "algebra";
  level?: "fundamental" | "medio" | "olimpiada";
  exam_year?: number;
  subject?: "algebra" | "geometry" | "statistics" | "arithmetic";
  difficulty?: "easy" | "medium" | "hard";
}

export interface SeoLandingConfig {
  slug: string;
  title: string;
  description: string;
  h1: string;
  primaryKeyword: string;
  filters: SeoFilters;
}

export const seoLandingPages: SeoLandingConfig[] = [
  {
    slug: "questoes-obmep",
    title: "Questoes da OBMEP com Gabarito e Simulado | ProvaLab",
    description: "Treine com questoes da OBMEP com resposta comentada e gere simulados automaticamente no ProvaLab.",
    h1: "Questoes da OBMEP com Gabarito",
    primaryKeyword: "questoes da OBMEP",
    filters: { source: "OBMEP", level: "olimpiada" },
  },
  {
    slug: "questoes-obmep-nivel-1",
    title: "Questoes OBMEP Nivel 1 para Treinar | ProvaLab",
    description: "Acesse questoes da OBMEP nivel 1 e crie simulados para estudar matematica de forma estruturada.",
    h1: "Questoes OBMEP Nivel 1",
    primaryKeyword: "questoes obmep nivel 1",
    filters: { source: "OBMEP", level: "olimpiada", difficulty: "easy" },
  },
  {
    slug: "questoes-obmep-nivel-2",
    title: "Questoes OBMEP Nivel 2 com Resolucao | ProvaLab",
    description: "Pratique com questoes da OBMEP nivel 2 e monte provas de matematica para impressao em PDF.",
    h1: "Questoes OBMEP Nivel 2",
    primaryKeyword: "questoes obmep nivel 2",
    filters: { source: "OBMEP", level: "olimpiada", difficulty: "medium" },
  },
  {
    slug: "questoes-obmep-nivel-3",
    title: "Questoes OBMEP Nivel 3 para Olimpíada | ProvaLab",
    description: "Treine com questoes desafiadoras da OBMEP nivel 3 e crie simulados automaticos no ProvaLab.",
    h1: "Questoes OBMEP Nivel 3",
    primaryKeyword: "questoes obmep nivel 3",
    filters: { source: "OBMEP", level: "olimpiada", difficulty: "hard" },
  },
  {
    slug: "simulado-obmep",
    title: "Simulado OBMEP Online com Gabarito | ProvaLab",
    description: "Monte simulado OBMEP com filtros por nivel e tema para melhorar seu desempenho em olimpiadas.",
    h1: "Simulado OBMEP de Matematica",
    primaryKeyword: "simulado obmep",
    filters: { source: "OBMEP", level: "olimpiada" },
  },
  {
    slug: "questoes-enem-matematica",
    title: "Questoes de Matematica do ENEM com Gabarito | ProvaLab",
    description: "Treine com questoes de matematica do ENEM e gere simulados automaticos com correcoes.",
    h1: "Questoes de Matematica do ENEM",
    primaryKeyword: "questoes de matematica do enem",
    filters: { source: "ENEM", level: "medio" },
  },
  {
    slug: "simulado-enem-matematica",
    title: "Simulado ENEM Matematica Online | ProvaLab",
    description: "Crie seu simulado de matematica do ENEM com questoes filtradas por tema e nivel.",
    h1: "Simulado ENEM de Matematica",
    primaryKeyword: "simulado enem matematica",
    filters: { source: "ENEM", level: "medio" },
  },
  {
    slug: "questoes-enem-geometria",
    title: "Questoes ENEM de Geometria para Treinar | ProvaLab",
    description: "Estude geometria para o ENEM com questoes comentadas e simulados personalizados.",
    h1: "Questoes ENEM de Geometria",
    primaryKeyword: "questoes enem geometria",
    filters: { source: "ENEM", theme: "geometria", subject: "geometry", level: "medio" },
  },
  {
    slug: "questoes-enem-estatistica",
    title: "Questoes ENEM de Estatistica com Resposta | ProvaLab",
    description: "Pratique estatistica do ENEM com questoes reais e gere listas de exercicios em PDF.",
    h1: "Questoes ENEM de Estatistica",
    primaryKeyword: "questoes enem estatistica",
    filters: { source: "ENEM", theme: "estatistica", subject: "statistics", level: "medio" },
  },
  {
    slug: "questoes-enem-funcoes",
    title: "Questoes ENEM de Funcoes para Revisao | ProvaLab",
    description: "Resolva questoes ENEM sobre funcoes e monte provas de matematica para imprimir.",
    h1: "Questoes ENEM de Funcoes",
    primaryKeyword: "questoes enem funcoes",
    filters: { source: "ENEM", theme: "funcoes", subject: "algebra", level: "medio" },
  },
  {
    slug: "simulado-matematica",
    title: "Simulado de Matematica Online com Gabarito | ProvaLab",
    description: "Gere simulados de matematica por tema e nivel com questoes atualizadas no ProvaLab.",
    h1: "Simulado de Matematica",
    primaryKeyword: "simulado matematica",
    filters: { level: "fundamental" },
  },
  {
    slug: "simulado-matematica-6-ano",
    title: "Simulado Matematica 6 Ano para Imprimir | ProvaLab",
    description: "Monte simulados de matematica para o 6 ano com questoes selecionadas automaticamente.",
    h1: "Simulado Matematica 6 Ano",
    primaryKeyword: "simulado matematica 6 ano",
    filters: { level: "fundamental", difficulty: "easy" },
  },
  {
    slug: "simulado-matematica-7-ano",
    title: "Simulado Matematica 7 Ano com Gabarito | ProvaLab",
    description: "Treine com simulado de matematica para 7 ano, com exercicios por tema e nivel.",
    h1: "Simulado Matematica 7 Ano",
    primaryKeyword: "simulado matematica 7 ano",
    filters: { level: "fundamental", difficulty: "easy" },
  },
  {
    slug: "simulado-matematica-8-ano",
    title: "Simulado Matematica 8 Ano Online | ProvaLab",
    description: "Crie simulados de matematica para 8 ano e acompanhe seus resultados por assunto.",
    h1: "Simulado Matematica 8 Ano",
    primaryKeyword: "simulado matematica 8 ano",
    filters: { level: "fundamental", difficulty: "medium" },
  },
  {
    slug: "simulado-matematica-9-ano",
    title: "Simulado Matematica 9 Ano em PDF | ProvaLab",
    description: "Gere provas e simulados de matematica para 9 ano com resposta e explicacao.",
    h1: "Simulado Matematica 9 Ano",
    primaryKeyword: "simulado matematica 9 ano",
    filters: { level: "fundamental", difficulty: "medium" },
  },
  {
    slug: "simulado-matematica-ensino-medio",
    title: "Simulado Matematica Ensino Medio | ProvaLab",
    description: "Treine matematica do ensino medio com simulados automaticos e questoes por tema.",
    h1: "Simulado Matematica Ensino Medio",
    primaryKeyword: "simulado matematica ensino medio",
    filters: { level: "medio", difficulty: "medium" },
  },
  {
    slug: "gerador-de-provas-matematica",
    title: "Gerador de Provas de Matematica Online | ProvaLab",
    description: "Use o gerador de provas de matematica do ProvaLab para criar provas em minutos.",
    h1: "Gerador de Provas de Matematica",
    primaryKeyword: "gerador de provas matematica",
    filters: {},
  },
  {
    slug: "lista-de-exercicios-matematica-pdf",
    title: "Lista de Exercicios de Matematica em PDF | ProvaLab",
    description: "Monte lista de exercicios de matematica em PDF com gabarito e temas personalizados.",
    h1: "Lista de Exercicios de Matematica em PDF",
    primaryKeyword: "lista de exercicios matematica pdf",
    filters: {},
  },
  {
    slug: "prova-de-matematica-para-imprimir",
    title: "Prova de Matematica para Imprimir Gratis | ProvaLab",
    description: "Crie prova de matematica para imprimir com questoes selecionadas automaticamente.",
    h1: "Prova de Matematica para Imprimir",
    primaryKeyword: "prova de matematica para imprimir",
    filters: {},
  },
];
