import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle,
  ChevronRight,
  GraduationCap,
  Loader2,
  RefreshCw,
  Target,
  Trophy,
  XCircle,
  Zap,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTimer } from "@/hooks/useTimer";
import { attemptsApi, exercisesApi, profileApi, vestibularApi } from "@/services/api";

const HOTMART_CHECKOUT_URL =
  import.meta.env.VITE_HOTMART_CHECKOUT_URL || "https://provalab-launchpad.vercel.app";

type Difficulty = "easy" | "medium" | "hard";

interface Exercise {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

const difficultyLabels: Record<Difficulty, { label: string; colorClass: string }> = {
  easy: { label: "Fácil", colorClass: "bg-success/10 text-success border-success/30" },
  medium: { label: "Médio", colorClass: "bg-accent/10 text-accent border-accent/30" },
  hard: { label: "Difícil", colorClass: "bg-destructive/10 text-destructive border-destructive/30" },
};

const subjectNames: Record<string, string> = {
  algebra: "Álgebra",
  geometry: "Geometria",
  calculus: "Cálculo",
  statistics: "Estatística",
  trigonometry: "Trigonometria",
  arithmetic: "Aritmética",
  vestibular: "Vestibulares",
};

const difficultyCards: Record<
  Difficulty,
  {
    label: string;
    description: string;
    icon: typeof Zap;
    buttonClass: string;
    iconClass: string;
    iconContainerClass: string;
  }
> = {
  easy: {
    label: "Fácil",
    description: "Conceitos básicos",
    icon: Zap,
    buttonClass: "bg-success/10 border-success/30",
    iconClass: "text-success",
    iconContainerClass: "bg-success/20",
  },
  medium: {
    label: "Médio",
    description: "Questões intermediárias",
    icon: Target,
    buttonClass: "bg-accent/10 border-accent/30",
    iconClass: "text-accent",
    iconContainerClass: "bg-accent/20",
  },
  hard: {
    label: "Difícil",
    description: "Desafios avançados",
    icon: Trophy,
    buttonClass: "bg-destructive/10 border-destructive/30",
    iconClass: "text-destructive",
    iconContainerClass: "bg-destructive/20",
  },
};

export default function Practice() {
  const { subject } = useParams<{ subject: string }>();
  const { user } = useAuth();
  const { toast } = useToast();

  const isVestibular = subject === "vestibular";
  const availableDifficulties = useMemo<Difficulty[]>(
    () => (isVestibular ? ["medium", "hard"] : ["easy", "medium", "hard"]),
    [isVestibular]
  );

  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const exerciseTimer = useTimer({ initialTime: 0 });
  const subjectName = subject ? subjectNames[subject] || subject : "Disciplina";

  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: ["user-plan-practice", user?.id],
    queryFn: () => profileApi.getPlan(),
    enabled: !!user && isVestibular,
    staleTime: 30_000,
  });

  const isPremiumUser = plan?.is_premium || plan?.plan === "premium";

  useEffect(() => {
    if (isVestibular && !planLoading && plan && !isPremiumUser) {
      window.location.href = HOTMART_CHECKOUT_URL;
    }
  }, [isVestibular, planLoading, plan, isPremiumUser]);

  const resetExerciseState = useCallback(() => {
    setSelectedAnswer(null);
    setIsSubmitted(false);
    exerciseTimer.reset(0);
    exerciseTimer.start();
  }, [exerciseTimer]);

  const generateExercise = useCallback(async () => {
    if (!difficulty || !subject) return;
    setLoading(true);

    try {
      if (isVestibular) {
        const page = await vestibularApi.getVestibularExercises(1, 0, difficulty);
        const apiExercise = page.items[0];
        if (!apiExercise) {
          throw new Error("Não há mais exercícios vestibulares disponíveis para esse nível.");
        }
        setCurrentExercise({
          id: apiExercise.id,
          question: apiExercise.question,
          options: apiExercise.options || [],
          correctAnswer: "",
          explanation: "",
        });
      } else {
        const apiExercise = await exercisesApi.getRandomExercise(subject, difficulty);
        setCurrentExercise({
          id: apiExercise.id,
          question: apiExercise.question,
          options: apiExercise.options || [],
          correctAnswer: apiExercise.correct_answer,
          explanation: apiExercise.explanation || "Sem explicação disponível.",
        });
      }
      resetExerciseState();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Não foi possível carregar o exercício",
        description: (error as Error).message || "Tente novamente em instantes.",
      });
      setCurrentExercise(null);
    } finally {
      setLoading(false);
    }
  }, [difficulty, subject, isVestibular, resetExerciseState, toast]);

  const handleSubmit = async () => {
    if (!selectedAnswer || !currentExercise || !user || !subject) return;

    exerciseTimer.pause();

    if (isVestibular) {
      try {
        const result = await vestibularApi.submitVestibularAnswer(currentExercise.id, selectedAnswer);
        setCurrentExercise((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            correctAnswer: result.correct_answer || prev.correctAnswer,
            explanation: result.explanation || "Sem explicação disponível.",
          };
        });
        setIsSubmitted(true);

        toast({
          title: result.correct ? "Resposta correta!" : "Resposta incorreta",
          description: result.correct
            ? `Parabéns! Sua taxa atual no Vestibular é ${result.accuracy}%.`
            : `A resposta correta era: ${result.correct_answer || "indisponivel"}. Taxa atual: ${result.accuracy}%.`,
          variant: result.correct ? "default" : "destructive",
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Falha ao registrar resposta",
          description: (error as Error).message || "Não foi possível salvar sua resposta.",
        });
      }
      return;
    }

    setIsSubmitted(true);
    const isCorrect = selectedAnswer === currentExercise.correctAnswer;

    try {
      await attemptsApi.submitAttempt({
        exercise_id: currentExercise.id,
        user_answer: selectedAnswer,
        is_correct: isCorrect,
        time_spent_seconds: exerciseTimer.time,
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Falha ao registrar tentativa",
        description: "Sua resposta foi exibida, mas não conseguimos salvar seu histórico.",
      });
    }

    toast({
      title: isCorrect ? "Resposta correta!" : "Resposta incorreta",
      description: isCorrect
        ? "Parabéns! Continue praticando."
        : `A resposta correta era: ${currentExercise.correctAnswer}`,
      variant: isCorrect ? "default" : "destructive",
    });
  };

  if (isVestibular && planLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!difficulty) {
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

          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-lg">
                <span className="text-4xl">📐</span>
              </div>
              <h1 className="text-3xl font-bold mb-2">{subjectName}</h1>
              <p className="text-muted-foreground">Escolha o nível de dificuldade.</p>
            </div>

            <div className="grid gap-4">
              {availableDifficulties.map((diff) => {
                const card = difficultyCards[diff];
                return (
                  <button
                    key={diff}
                    onClick={() => setDifficulty(diff)}
                    className={`p-6 rounded-2xl border-2 text-left transition-all hover:shadow-lg hover:scale-[1.02] ${card.buttonClass}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.iconContainerClass}`}
                        >
                          <card.icon className={`w-6 h-6 ${card.iconClass}`} />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold">{card.label}</h3>
                          <p className="text-sm text-muted-foreground">{card.description}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-6 h-6 text-muted-foreground" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    );
  }

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
            <div className={`px-3 py-1.5 rounded-full text-sm font-medium border ${difficultyLabels[difficulty].colorClass}`}>
              {difficultyLabels[difficulty].label}
            </div>
          </div>
        </div>
      </header>

      <main className="container px-4 py-8">
        <button
          onClick={() => {
            setDifficulty(null);
            setCurrentExercise(null);
          }}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Trocar dificuldade
        </button>

        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📐</span>
              <h1 className="text-2xl font-bold">{subjectName}</h1>
            </div>
            {currentExercise && (
              <div className="px-4 py-2 rounded-2xl bg-card border border-border font-mono">
                {exerciseTimer.getFormattedTime()}
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {!currentExercise ? (
              <motion.div key="generate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                <div className="text-6xl mb-6">🧠</div>
                <p className="text-muted-foreground mb-8 text-lg">Pronto para praticar?</p>
                <Button variant="hero" size="lg" onClick={generateExercise} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 mr-2" />
                      Gerar exercício
                    </>
                  )}
                </Button>
              </motion.div>
            ) : (
              <motion.div key="exercise" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="p-6 rounded-2xl bg-gradient-to-br from-card to-muted/30 border border-border shadow-lg mb-6">
                  <h2 className="text-lg font-medium">{currentExercise.question}</h2>
                </div>

                <div className="grid gap-3 mb-6">
                  {currentExercise.options.map((option, index) => {
                    const isSelected = selectedAnswer === option;
                    const isCorrect = option === currentExercise.correctAnswer;
                    const letter = String.fromCharCode(65 + index);

                    let optionClass = "p-4 rounded-xl border-2 text-left transition-all ";
                    if (isSubmitted) {
                      if (isCorrect) optionClass += "bg-success/10 border-success";
                      else if (isSelected) optionClass += "bg-destructive/10 border-destructive";
                      else optionClass += "bg-muted/30 border-border/50 opacity-50";
                    } else {
                      optionClass += isSelected
                        ? "bg-primary/10 border-primary shadow-md"
                        : "bg-card border-border hover:border-primary/50";
                    }

                    return (
                      <button
                        key={index}
                        onClick={() => !isSubmitted && setSelectedAnswer(option)}
                        disabled={isSubmitted}
                        className={optionClass}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                              isSubmitted && isCorrect
                                ? "bg-success text-white"
                                : isSubmitted && isSelected && !isCorrect
                                ? "bg-destructive text-white"
                                : isSelected
                                ? "bg-primary text-white"
                                : "bg-muted"
                            }`}
                          >
                            {letter}
                          </div>
                          <span className="font-medium flex-1">{option}</span>
                          {isSubmitted && isCorrect && <CheckCircle className="w-6 h-6 text-success" />}
                          {isSubmitted && isSelected && !isCorrect && <XCircle className="w-6 h-6 text-destructive" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {isSubmitted && (
                  <div className="p-6 rounded-2xl bg-muted/50 border border-border mb-6">
                    <h3 className="font-semibold mb-2">Explicação</h3>
                    <p className="text-muted-foreground">{currentExercise.explanation}</p>
                  </div>
                )}

                <div className="flex gap-4">
                  {!isSubmitted ? (
                    <Button variant="hero" className="flex-1" onClick={handleSubmit} disabled={!selectedAnswer}>
                      Verificar Resposta
                    </Button>
                  ) : (
                    <Button variant="hero" className="flex-1" onClick={generateExercise}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Próximo exercício
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
