import { Link, useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const themeToSubject: Record<string, string> = {
  geometria: "geometry",
  estatistica: "statistics",
  funcoes: "algebra",
  probabilidade: "statistics",
  algebra: "algebra",
};

const difficultyFromLevel: Record<string, string> = {
  fundamental: "easy",
  medio: "medium",
  olimpiada: "hard",
};

export default function Generator() {
  const { user } = useAuth();
  const [params] = useSearchParams();

  const fonte = params.get("fonte") || "geral";
  const tema = params.get("tema") || "matematica";
  const nivel = params.get("nivel") || "medio";
  const ano = params.get("ano");
  const acao = params.get("acao") || "prova";

  const subject = themeToSubject[tema] || params.get("disciplina") || "algebra";
  const difficulty = difficultyFromLevel[nivel] || params.get("dificuldade") || "medium";
  const targetPracticeUrl = `/practice/${subject}?difficulty=${difficulty}&fonte=${fonte}&tema=${tema}&nivel=${nivel}${ano ? `&ano=${ano}` : ""}`;

  return (
    <main className="min-h-screen bg-background">
      <section className="container px-4 py-16 max-w-3xl">
        <h1 className="text-4xl font-bold mb-4">Gerador de Provas ProvaLab</h1>
        <p className="text-muted-foreground leading-7 mb-8">
          Seus filtros foram aplicados: fonte <strong>{fonte}</strong>, tema <strong>{tema}</strong>, nivel{" "}
          <strong>{nivel}</strong>{ano ? (
            <>
              {" "}
              e ano <strong>{ano}</strong>
            </>
          ) : null}
          . Agora escolha a melhor acao para continuar.
        </p>

        <div className="rounded-2xl border border-border bg-card p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Acao selecionada</h2>
          <p className="text-muted-foreground mb-4">
            Tipo: <strong>{acao}</strong>
          </p>
          <p className="text-muted-foreground">
            O ProvaLab usa esse contexto para montar questoes alinhadas ao seu objetivo de estudo.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          {user ? (
            <Button asChild size="lg">
              <Link to={targetPracticeUrl}>Gerar prova automaticamente</Link>
            </Button>
          ) : (
            <Button asChild size="lg">
              <Link to="/register">Criar conta para gerar prova</Link>
            </Button>
          )}
          <Button variant="outline" asChild size="lg">
            <Link to="/login">Entrar na plataforma</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
