import { useCallback, useState } from "react";
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

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTimer } from "@/hooks/useTimer";
import { attemptsApi, exercisesApi } from "@/services/api";

type Difficulty = "easy" | "medium" | "hard";

interface Exercise {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

const difficultyLabels: Record<Difficulty, { label: string; colorClass: string }> = {
  easy: { label: "Facil", colorClass: "bg-success/10 text-success border-success/30" },
  medium: { label: "Medio", colorClass: "bg-accent/10 text-accent border-accent/30" },
  hard: { label: "Dificil", colorClass: "bg-destructive/10 text-destructive border-destructive/30" },
};

const subjectNames: Record<string, string> = {
  algebra: "Algebra",
  geometry: "Geometria",
  calculus: "Calculo",
  statistics: "Estatistica",
  trigonometry: "Trigonometria",
  arithmetic: "Aritmetica",
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
    label: "Facil",
    description: "Conceitos basicos",
    icon: Zap,
    buttonClass: "bg-success/10 border-success/30",
    iconClass: "text-success",
    iconContainerClass: "bg-success/20",
  },
  medium: {
    label: "Medio",
    description: "Questoes intermediarias",
    icon: Target,
    buttonClass: "bg-accent/10 border-accent/30",
    iconClass: "text-accent",
    iconContainerClass: "bg-accent/20",
  },
  hard: {
    label: "Dificil",
    description: "Desafios avancados",
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

  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const exerciseTimer = useTimer({ initialTime: 0 });
  const subjectName = subject ? subjectNames[subject] || subject : "Disciplina";

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
      const apiExercise = await exercisesApi.getRandomExercise(subject, difficulty);
      setCurrentExercise({
        id: apiExercise.id,
        question: apiExercise.question,
        options: apiExercise.options || [],
        correctAnswer: apiExercise.correct_answer,
        explanation: apiExercise.explanation || "Sem explicacao disponivel.",
      });
      resetExerciseState();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Nao foi possivel carregar o exercicio",
        description: (error as Error).message || "Tente novamente em instantes.",
      });
      setCurrentExercise(null);
    } finally {
      setLoading(false);
    }
  }, [difficulty, subject, resetExerciseState, toast]);

  const handleSubmit = async () => {
    if (!selectedAnswer || !currentExercise || !user) return;

    setIsSubmitted(true);
    exerciseTimer.pause();
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
        description: "Sua resposta foi exibida, mas nao conseguimos salvar seu historico.",
      });
    }

    toast({
      title: isCorrect ? "Resposta correta!" : "Resposta incorreta",
      description: isCorrect
        ? "Parabens! Continue praticando."
        : `A resposta correta era: ${currentExercise.correctAnswer}`,
      variant: isCorrect ? "default" : "destructive",
    });
  };

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
              <p className="text-muted-foreground">Escolha o nivel de dificuldade.</p>
            </div>

            <div className="grid gap-4">
              {(Object.keys(difficultyCards) as Difficulty[]).map((diff) => {
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
                <div className="text-6xl mb-6">🧮</div>
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
                      Gerar Exercicio
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
                    const letters = ["A", "B", "C", "D"];

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
                            {letters[index]}
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
                    <h3 className="font-semibold mb-2">Explicacao</h3>
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
                      Proximo Exercicio
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
