import { useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { exercisesApi, attemptsApi } from "@/services/api";
import {
  GraduationCap,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Zap,
  CheckCircle,
  XCircle,
  ChevronRight,
  Target,
  Trophy,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTimer } from "@/hooks/useTimer";

type Difficulty = "easy" | "medium" | "hard";

interface Exercise {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

const difficultyLabels = {
  easy: { label: "Fácil", color: "bg-success/10 text-success border-success/30" },
  medium: { label: "Médio", color: "bg-accent/10 text-accent border-accent/30" },
  hard: { label: "Difícil", color: "bg-destructive/10 text-destructive border-destructive/30" },
};

const subjectNames: Record<string, string> = {
  algebra: "Álgebra",
  geometry: "Geometria",
  calculus: "Cálculo",
  statistics: "Estatística",
  trigonometry: "Trigonometria",
  arithmetic: "Aritmética",
};

const fallbackExercises: Record<string, Record<Difficulty, Exercise[]>> = {
  algebra: {
    easy: [
      { id: "1", question: "Quanto é 15 + 27?", options: ["40", "42", "44", "38"], correctAnswer: "42", explanation: "15 + 27 = 42" },
      { id: "2", question: "Resolva: x + 5 = 12", options: ["5", "6", "7", "8"], correctAnswer: "7", explanation: "x = 12 - 5 = 7" },
    ],
    medium: [
      { id: "3", question: "Resolva: 3x + 5 = 20", options: ["3", "4", "5", "6"], correctAnswer: "5", explanation: "3x = 15 → x = 5" },
    ],
    hard: [
      { id: "4", question: "Resolva: 2x + y = 10 e x - y = 2. Qual é x?", options: ["3", "4", "5", "6"], correctAnswer: "4", explanation: "x = 4" },
    ],
  },
  geometry: {
    easy: [{ id: "5", question: "Quantos lados tem um hexágono?", options: ["5", "6", "7", "8"], correctAnswer: "6", explanation: "Hexágono = 6 lados" }],
    medium: [{ id: "6", question: "Área de retângulo 8×5 cm?", options: ["35", "40", "45", "50"], correctAnswer: "40", explanation: "8 × 5 = 40" }],
    hard: [{ id: "7", question: "Volume esfera raio 3?", options: ["113", "85", "57", "28"], correctAnswer: "113", explanation: "V = (4/3)πr³" }],
  },
  calculus: {
    easy: [{ id: "8", question: "Derivada de f(x) = x²?", options: ["x", "2x", "2", "x²"], correctAnswer: "2x", explanation: "d/dx(x²) = 2x" }],
    medium: [{ id: "9", question: "Integral de f(x) = 2x?", options: ["x²", "x² + C", "2x²", "2x² + C"], correctAnswer: "x² + C", explanation: "∫2x dx = x² + C" }],
    hard: [{ id: "10", question: "Derivada de x³ + 2x²?", options: ["3x² + 4x", "3x² + 2x", "x² + 4x", "3x + 4"], correctAnswer: "3x² + 4x", explanation: "3x² + 4x" }],
  },
  statistics: {
    easy: [{ id: "11", question: "Média de 2, 4, 6, 8?", options: ["4", "5", "6", "7"], correctAnswer: "5", explanation: "20/4 = 5" }],
    medium: [{ id: "12", question: "Mediana de 3, 7, 2, 9, 5?", options: ["3", "5", "7", "9"], correctAnswer: "5", explanation: "Ordenado: 2,3,5,7,9 → 5" }],
    hard: [{ id: "13", question: "Variância 16, desvio padrão?", options: ["2", "4", "8", "16"], correctAnswer: "4", explanation: "√16 = 4" }],
  },
  trigonometry: {
    easy: [{ id: "14", question: "sen(90°)?", options: ["0", "0.5", "1", "-1"], correctAnswer: "1", explanation: "sen(90°) = 1" }],
    medium: [{ id: "15", question: "cos(60°)?", options: ["0", "0.5", "√2/2", "√3/2"], correctAnswer: "0.5", explanation: "cos(60°) = 0.5" }],
    hard: [{ id: "16", question: "tan(45°)?", options: ["0", "0.5", "1", "√3"], correctAnswer: "1", explanation: "tan(45°) = 1" }],
  },
  arithmetic: {
    easy: [{ id: "17", question: "8 × 7?", options: ["54", "56", "58", "52"], correctAnswer: "56", explanation: "8 × 7 = 56" }],
    medium: [{ id: "18", question: "MDC de 12 e 18?", options: ["2", "3", "6", "9"], correctAnswer: "6", explanation: "MDC = 6" }],
    hard: [{ id: "19", question: "MMC de 8 e 12?", options: ["24", "48", "96", "4"], correctAnswer: "24", explanation: "MMC = 24" }],
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
        explanation: apiExercise.explanation || "",
      });
    } catch {
      const subjectExercises = fallbackExercises[subject];
      if (subjectExercises && subjectExercises[difficulty]) {
        const exercises = subjectExercises[difficulty];
        const randomExercise = exercises[Math.floor(Math.random() * exercises.length)];
        setCurrentExercise(randomExercise);
      }
    }

    setSelectedAnswer(null);
    setIsSubmitted(false);
    setLoading(false);
    exerciseTimer.reset(0);
    exerciseTimer.start();
  }, [difficulty, subject, exerciseTimer]);

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
    } catch (error) {
      console.error("Error saving attempt:", error);
    }

    toast({
      title: isCorrect ? "Resposta correta! 🎉" : "Resposta incorreta",
      description: isCorrect
        ? "Parabéns! Continue praticando!"
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
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
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
              {(["easy", "medium", "hard"] as Difficulty[]).map((diff) => {
                const config = {
                  easy: { label: "Fácil", description: "Conceitos básicos", icon: Zap, color: "success" },
                  medium: { label: "Médio", description: "Questões intermediárias", icon: Target, color: "accent" },
                  hard: { label: "Difícil", description: "Desafios avançados", icon: Trophy, color: "destructive" },
                };
                const c = config[diff];
                return (
                  <button
                    key={diff}
                    onClick={() => setDifficulty(diff)}
                    className={`p-6 rounded-2xl border-2 bg-${c.color}/10 border-${c.color}/30 text-left transition-all hover:shadow-lg hover:scale-[1.02]`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl bg-${c.color}/20 flex items-center justify-center`}>
                          <c.icon className={`w-6 h-6 text-${c.color}`} />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold">{c.label}</h3>
                          <p className="text-sm text-muted-foreground">{c.description}</p>
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
            <div className={`px-3 py-1.5 rounded-full text-sm font-medium border ${difficultyLabels[difficulty].color}`}>
              {difficultyLabels[difficulty].label}
            </div>
          </div>
        </div>
      </header>

      <main className="container px-4 py-8">
        <button
          onClick={() => { setDifficulty(null); setCurrentExercise(null); }}
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
                  {loading ? <><Loader2 className="w-5 h-5 animate-spin mr-2" />Gerando...</> : <><Zap className="w-5 h-5 mr-2" />Gerar Exercício</>}
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
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                            isSubmitted && isCorrect ? "bg-success text-white" :
                            isSubmitted && isSelected && !isCorrect ? "bg-destructive text-white" :
                            isSelected ? "bg-primary text-white" : "bg-muted"
                          }`}>
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
                    <h3 className="font-semibold mb-2">💡 Explicação</h3>
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
                      Próximo Exercício
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
