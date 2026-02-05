import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { attemptsApi } from "@/services/api";
import { GraduationCap, ArrowLeft, Flame, Target, TrendingUp, Calendar, Loader2 } from "lucide-react";
import { format, subDays, eachDayOfInterval, isSameDay, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from "recharts";

const subjectConfig = {
  algebra: { name: "Álgebra", color: "hsl(220, 70%, 45%)" },
  geometry: { name: "Geometria", color: "hsl(170, 60%, 45%)" },
  calculus: { name: "Cálculo", color: "hsl(38, 95%, 55%)" },
  statistics: { name: "Estatística", color: "hsl(150, 60%, 45%)" },
  trigonometry: { name: "Trigonometria", color: "hsl(217, 91%, 60%)" },
  arithmetic: { name: "Aritmética", color: "hsl(280, 80%, 60%)" },
};

export default function ProgressPage() {
  const { user } = useAuth();

  const { data: progressData, isLoading } = useQuery({
    queryKey: ["progress-data", user?.id],
    queryFn: async () => {
      try {
        return await attemptsApi.getProgressData();
      } catch {
        return { attempts: [], stats: { total: 0, correct: 0, accuracy: 0 } };
      }
    },
    enabled: !!user,
  });

  const attempts = progressData?.attempts || [];
  const stats = progressData?.stats || { total: 0, correct: 0, accuracy: 0 };

  const calculateStreak = () => {
    if (!attempts || attempts.length === 0) return 0;
    const today = startOfDay(new Date());
    const uniqueDays = [...new Set(
      attempts.map((a: any) => startOfDay(new Date(a.created_at)).getTime())
    )].sort((a, b) => (b as number) - (a as number));

    let streak = 0;
    let checkDate = today;

    for (const dayTime of uniqueDays) {
      if (isSameDay(new Date(dayTime as number), checkDate) ||
          isSameDay(new Date(dayTime as number), subDays(checkDate, 1))) {
        streak++;
        checkDate = new Date(dayTime as number);
      } else {
        break;
      }
    }
    return streak;
  };

  const getPerformanceData = () => {
    if (!attempts) return [];
    const last14Days = eachDayOfInterval({ start: subDays(new Date(), 13), end: new Date() });

    return last14Days.map(day => {
      const dayAttempts = attempts.filter((a: any) => isSameDay(new Date(a.created_at), day));
      const correct = dayAttempts.filter((a: any) => a.is_correct).length;
      return {
        date: format(day, "dd/MM"),
        exercicios: dayAttempts.length,
        acertos: correct,
      };
    });
  };

  const getSubjectData = () => {
    if (!attempts) return [];
    const subjectCounts: Record<string, { total: number; correct: number }> = {};

    attempts.forEach((attempt: any) => {
      const subject = attempt.exercise?.subject || "algebra";
      if (!subjectCounts[subject]) subjectCounts[subject] = { total: 0, correct: 0 };
      subjectCounts[subject].total++;
      if (attempt.is_correct) subjectCounts[subject].correct++;
    });

    return Object.entries(subjectCounts).map(([subject, data]) => ({
      name: subjectConfig[subject as keyof typeof subjectConfig]?.name || subject,
      value: data.total,
      correct: data.correct,
      color: subjectConfig[subject as keyof typeof subjectConfig]?.color || "#ccc",
      percentage: Math.round((data.correct / data.total) * 100),
    }));
  };

  const streak = calculateStreak();
  const performanceData = getPerformanceData();
  const subjectData = getSubjectData();

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

        <h1 className="text-3xl font-bold mb-2">Seu Progresso</h1>
        <p className="text-muted-foreground mb-8">Acompanhe seu desempenho e evolução.</p>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-6 rounded-2xl bg-card border border-border">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Flame className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{streak}</p>
                    <p className="text-sm text-muted-foreground">Dias de sequência</p>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-card border border-border">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Target className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{stats.total}</p>
                    <p className="text-sm text-muted-foreground">Total de exercícios</p>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-card border border-border">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{stats.accuracy}%</p>
                    <p className="text-sm text-muted-foreground">Taxa de acerto</p>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-card border border-border">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{stats.correct}</p>
                    <p className="text-sm text-muted-foreground">Respostas corretas</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border">
              <h2 className="text-xl font-bold mb-6">Desempenho nos Últimos 14 Dias</h2>
              {performanceData.some(d => d.exercicios > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={performanceData}>
                    <XAxis dataKey="date" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="exercicios" stroke="hsl(220, 70%, 45%)" fill="hsl(220, 70%, 45%, 0.2)" />
                    <Area type="monotone" dataKey="acertos" stroke="hsl(150, 60%, 45%)" fill="hsl(150, 60%, 45%, 0.2)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  Pratique exercícios para ver seu progresso!
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-card border border-border">
                <h2 className="text-xl font-bold mb-6">Exercícios por Área</h2>
                {subjectData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={subjectData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value">
                        {subjectData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    Nenhum exercício realizado ainda.
                  </div>
                )}
              </div>

              <div className="p-6 rounded-2xl bg-card border border-border">
                <h2 className="text-xl font-bold mb-6">Desempenho por Área</h2>
                {subjectData.length > 0 ? (
                  <div className="space-y-4">
                    {subjectData.map((subject, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: subject.color }} />
                            <span className="font-medium">{subject.name}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {subject.correct}/{subject.value} ({subject.percentage}%)
                          </span>
                        </div>
                        <Progress value={subject.percentage} className="h-2" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    Pratique para ver seu desempenho!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
