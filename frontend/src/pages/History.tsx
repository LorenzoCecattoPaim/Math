import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { attemptsApi } from "@/services/api";
import { GraduationCap, ArrowLeft, CheckCircle, XCircle, Calendar, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const subjectNames: Record<string, string> = {
  algebra: "Álgebra",
  geometry: "Geometria",
  calculus: "Cálculo",
  statistics: "Estatística",
  trigonometry: "Trigonometria",
  arithmetic: "Aritmética",
};

const difficultyLabels: Record<string, { label: string; color: string }> = {
  easy: { label: "Fácil", color: "bg-success/10 text-success" },
  medium: { label: "Médio", color: "bg-accent/10 text-accent" },
  hard: { label: "Difícil", color: "bg-destructive/10 text-destructive" },
};

export default function History() {
  const { user } = useAuth();

  const { data: attempts, isLoading } = useQuery({
    queryKey: ["exercise-history", user?.id],
    queryFn: async () => {
      try {
        return await attemptsApi.getHistory(50);
      } catch {
        return [];
      }
    },
    enabled: !!user,
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">ProvaLab</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="container px-4 py-8">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao painel
        </Link>

        <h1 className="text-3xl font-bold mb-2">Histórico de Exercícios</h1>
        <p className="text-muted-foreground mb-8">
          Veja todos os exercícios que você já praticou.
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : attempts?.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              Você ainda não praticou nenhum exercício.
            </p>
            <Link to="/dashboard" className="text-primary font-medium hover:underline">
              Comece a praticar agora →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {attempts?.map((attempt: any) => {
              const exercise = attempt.exercise;
              const difficultyInfo = difficultyLabels[exercise?.difficulty] || difficultyLabels.easy;

              return (
                <div key={attempt.id} className="p-6 rounded-2xl bg-card border border-border">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-sm font-medium text-primary">
                          {subjectNames[exercise?.subject] || "Disciplina"}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${difficultyInfo.color}`}>
                          {difficultyInfo.label}
                        </span>
                      </div>

                      <p className="font-medium mb-3">{exercise?.question}</p>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(attempt.created_at), "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                        </span>
                        <span>
                          Sua resposta: <strong>{attempt.user_answer}</strong>
                        </span>
                      </div>
                    </div>

                    <div className={`p-3 rounded-full ${attempt.is_correct ? "bg-success/10" : "bg-destructive/10"}`}>
                      {attempt.is_correct ? (
                        <CheckCircle className="w-6 h-6 text-success" />
                      ) : (
                        <XCircle className="w-6 h-6 text-destructive" />
                      )}
                    </div>
                  </div>

                  {!attempt.is_correct && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-sm text-muted-foreground">
                        Resposta correta: <strong className="text-success">{exercise?.correct_answer}</strong>
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
