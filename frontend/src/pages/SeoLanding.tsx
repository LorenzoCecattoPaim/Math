import { useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { seoLandingPages } from "@/data/seoLandingConfig";
import { exercisesApi, type SeoExercise } from "@/services/api";

type FallbackQuestion = Pick<SeoExercise, "question" | "options" | "correct_answer" | "explanation">;

function toQueryString(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  return search.toString();
}

function normalizeFiltersForQuery(filters: Record<string, string | number | undefined>) {
  const normalized: Record<string, string> = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) {
      normalized[key] = String(value);
    }
  });
  return normalized;
}

function buildLongFormParagraphs(keyword: string, h1: string): string[] {
  return [
    `${h1} e uma busca muito comum entre estudantes, professores e responsaveis que querem material de qualidade para estudar matematica com foco em resultado. No ProvaLab, a ideia e simples: transformar a preparacao em um processo objetivo, com selecao automatica de questoes, estrutura de simulado e organizacao por temas. Isso reduz o tempo gasto para montar listas manualmente e aumenta o tempo util de treino.`,
    `Quando o aluno pesquisa por ${keyword}, geralmente ele quer tres coisas: questoes confiaveis, gabarito claro e um formato de estudo que possa ser repetido ao longo da semana. Por isso, esta pagina combina explicacao, exemplos e um caminho direto para gerar provas personalizadas. A proposta e sair do estudo aleatorio e evoluir para uma rotina com metas, revisao e acompanhamento consistente de desempenho.`,
    `Outro ponto importante e a personalizacao. Nem todo estudante esta no mesmo momento de aprendizagem, entao o gerador do ProvaLab permite filtrar por fonte, tema, nivel e ano. Com esse filtro, voce consegue montar um treino mais inteligente para reforcar lacunas especificas, como geometria, estatistica ou funcoes, sem depender de selecao manual a cada sessao de estudo.`,
    `Para professores, esse fluxo acelera a producao de atividades e simulados. Em vez de procurar questoes em varios lugares, o docente configura os parametros desejados e gera uma prova pronta para aplicar ou revisar em sala. Isso tambem facilita a diferenciacao pedagogica: turmas diferentes podem receber listas ajustadas por nivel, mantendo o mesmo objetivo didatico.`,
    `Se o foco e vestibulares e olimpiadas, o ganho e ainda mais claro. O aluno pode repetir ciclos de treino com temas estrategicos, comparar resultados e ajustar o plano de estudo com base em evidencias. Em provas como ENEM e OBMEP, essa repeticao orientada tende a melhorar tempo de resolucao, seguranca na interpretacao e precisao no uso de tecnicas matematicas.`,
    `Esta pagina foi criada para ser o ponto de partida dessa rotina. Use os exemplos abaixo para aquecer e, em seguida, clique no botao de geracao para montar seu simulado completo. Com um processo simples e rapido, fica mais facil manter constancia, revisar com criterio e construir desempenho real em matematica ao longo do tempo.`,
  ];
}

function buildFallbackQuestions(keyword: string): FallbackQuestion[] {
  return [
    {
      question: `Questao exemplo (${keyword}): Resolva 2x + 5 = 17.`,
      options: ["x = 4", "x = 5", "x = 6", "x = 7"],
      correct_answer: "x = 6",
      explanation: "Subtraindo 5 dos dois lados, temos 2x = 12. Em seguida, x = 6.",
    },
    {
      question: `Questao exemplo (${keyword}): A media de 7, 8 e 10 e:`,
      options: ["8", "8,3", "8,5", "9"],
      correct_answer: "8,3",
      explanation: "A media e (7 + 8 + 10) / 3 = 25/3 = 8,3.",
    },
    {
      question: `Questao exemplo (${keyword}): Em um triangulo retangulo com catetos 9 e 12, a hipotenusa vale:`,
      options: ["13", "14", "15", "16"],
      correct_answer: "15",
      explanation: "Pelo teorema de Pitagoras, h^2 = 9^2 + 12^2 = 225, logo h = 15.",
    },
  ];
}

export default function SeoLanding() {
  const location = useLocation();
  const slug = location.pathname.replace(/^\/+/, "");

  const config = useMemo(
    () => seoLandingPages.find((entry) => entry.slug === slug),
    [slug]
  );

  const { data: apiQuestions, isLoading } = useQuery({
    queryKey: ["seo-landing-questions", slug],
    queryFn: () => exercisesApi.listSeoExercises({ ...config?.filters, limit: 5 }),
    enabled: Boolean(config),
  });

  const paragraphs = useMemo(
    () => buildLongFormParagraphs(config?.primaryKeyword ?? "questoes de matematica", config?.h1 ?? "Questoes de Matematica"),
    [config?.h1, config?.primaryKeyword]
  );

  const fallbackQuestions = useMemo(
    () => buildFallbackQuestions(config?.primaryKeyword ?? "questoes de matematica"),
    [config?.primaryKeyword]
  );

  const questions = (apiQuestions?.length ? apiQuestions : fallbackQuestions).slice(0, 5);

  const generatorBaseQuery = useMemo(() => {
    if (!config) return "";
    return toQueryString(
      normalizeFiltersForQuery({
        fonte: config.filters.source,
        tema: config.filters.theme,
        nivel: config.filters.level,
        ano: config.filters.exam_year,
        disciplina: config.filters.subject,
        dificuldade: config.filters.difficulty,
      })
    );
  }, [config]);

  useEffect(() => {
    if (!config) return;

    document.title = config.title;

    const descriptionTag = document.querySelector('meta[name="description"]');
    if (descriptionTag) {
      descriptionTag.setAttribute("content", config.description);
    }

    let robotsTag = document.querySelector('meta[name="robots"]');
    if (!robotsTag) {
      robotsTag = document.createElement("meta");
      robotsTag.setAttribute("name", "robots");
      document.head.appendChild(robotsTag);
    }
    robotsTag.setAttribute("content", "index, follow");

    let canonicalTag = document.querySelector('link[rel="canonical"]');
    if (!canonicalTag) {
      canonicalTag = document.createElement("link");
      canonicalTag.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalTag);
    }
    canonicalTag.setAttribute("href", `${window.location.origin}${location.pathname}`);

    const schema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: questions.slice(0, 5).map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.explanation || `Gabarito: ${item.correct_answer}`,
        },
      })),
    };

    let schemaScript = document.querySelector('script[data-seo-schema="questions"]') as HTMLScriptElement | null;
    if (!schemaScript) {
      schemaScript = document.createElement("script");
      schemaScript.type = "application/ld+json";
      schemaScript.setAttribute("data-seo-schema", "questions");
      document.head.appendChild(schemaScript);
    }
    schemaScript.textContent = JSON.stringify(schema);
  }, [config, location.pathname, questions]);

  if (!config) {
    return (
      <main className="container px-4 py-16">
        <h1 className="text-3xl font-bold mb-4">Pagina nao encontrada</h1>
        <p className="text-muted-foreground mb-6">A rota SEO solicitada nao existe.</p>
        <Button asChild>
          <Link to="/">Voltar para a home</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <section className="container px-4 py-12 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">{config.h1}</h1>
        <div className="space-y-5 text-base leading-8 text-muted-foreground">
          {paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section className="container px-4 pb-10 max-w-4xl">
        <h2 className="text-2xl md:text-3xl font-bold mb-6">Exemplos de questoes</h2>
        {isLoading ? (
          <p className="text-muted-foreground">Carregando questoes...</p>
        ) : (
          <div className="grid gap-5">
            {questions.map((item, index) => (
              <article key={`${item.question}-${index}`} className="rounded-2xl border border-border bg-card p-6">
                <h3 className="font-semibold text-lg mb-4">{item.question}</h3>
                <ul className="grid gap-2 mb-4 text-sm">
                  {(item.options || []).map((option, optionIndex) => (
                    <li key={`${option}-${optionIndex}`} className="rounded-lg bg-muted/60 px-3 py-2">
                      {String.fromCharCode(65 + optionIndex)}. {option}
                    </li>
                  ))}
                </ul>
                <p className="text-sm mb-2">
                  <strong>Gabarito:</strong> {item.correct_answer}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Explicacao:</strong> {item.explanation || "Sem explicacao cadastrada."}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="container px-4 pb-16 max-w-4xl">
        <h2 className="text-2xl md:text-3xl font-bold mb-5">Gerar prova no ProvaLab</h2>
        <div className="flex flex-col md:flex-row gap-4">
          <Button asChild size="lg">
            <Link to={`/gerador${generatorBaseQuery ? `?${generatorBaseQuery}&acao=prova` : "?acao=prova"}`}>
              Gerar prova agora
            </Link>
          </Button>
          <Button variant="outline" asChild size="lg">
            <Link to={`/gerador${generatorBaseQuery ? `?${generatorBaseQuery}&acao=simulado` : "?acao=simulado"}`}>
              Criar simulado automatico
            </Link>
          </Button>
          <Button variant="secondary" asChild size="lg">
            <Link to={`/gerador${generatorBaseQuery ? `?${generatorBaseQuery}&acao=pdf` : "?acao=pdf"}`}>
              Baixar prova em PDF
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
