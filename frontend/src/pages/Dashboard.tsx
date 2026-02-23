import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  BookOpen,
  Calculator,
  Atom,
  FlaskConical,
  Leaf,
  Languages,
  LogOut,
  TrendingUp,
  Target,
  Clock,
  LifeBuoy,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { attemptsApi } from "@/services/api";

const subjects = [
  { id: "algebra", name: "Álgebra", icon: Calculator, color: "primary" },
  { id: "geometry", name: "Geometria", icon: Atom, color: "secondary" },
  { id: "calculus", name: "Cálculo", icon: FlaskConical, color: "accent" },
  { id: "statistics", name: "Estatística", icon: Leaf, color: "success" },
  { id: "trigonometry", name: "Trigonometria", icon: BookOpen, color: "primary" },
  { id: "arithmetic", name: "Aritmética", icon: Languages, color: "secondary" },
];

const colorClasses = {
  primary: {
    bg: "bg-primary/10 hover:bg-primary/20",
    border: "border-primary/20 hover:border-primary/40",
    icon: "bg-primary/20 text-primary",
  },
  secondary: {
    bg: "bg-secondary/10 hover:bg-secondary/20",
    border: "border-secondary/20 hover:border-secondary/40",
    icon: "bg-secondary/20 text-secondary",
  },
  accent: {
    bg: "bg-accent/10 hover:bg-accent/20",
    border: "border-accent/20 hover:border-accent/40",
    icon: "bg-accent/20 text-accent",
  },
  success: {
    bg: "bg-success/10 hover:bg-success/20",
    border: "border-success/20 hover:border-success/40",
    icon: "bg-success/20 text-success",
  },
};

export default function Dashboard() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ["user-stats", user?.id],
    queryFn: async () => {
      try {
        return await attemptsApi.getStats();
      } catch {
        return { total: 0, correct: 0, accuracy: 0 };
      }
    },
    enabled: !!user,
  });

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

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

            <div className="flex items-center gap-4">
              <Link to="/progress">
                <Button variant="ghost" size="sm">
                  Progresso
                </Button>
              </Link>
              <Link to="/history">
                <Button variant="ghost" size="sm">
                  Histórico
                </Button>
              </Link>
              <Link to="/support">
                <Button variant="ghost" size="sm">
                  <LifeBuoy className="w-4 h-4 mr-2" />
                  Suporte
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Olá, {profile?.full_name || "Estudante"}! 👋
          </h1>
          <p className="text-muted-foreground">
            Escolha uma disciplina para começar a praticar.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
                <p className="text-sm text-muted-foreground">Exercícios feitos</p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.accuracy || 0}%</p>
                <p className="text-sm text-muted-foreground">Taxa de acerto</p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.correct || 0}</p>
                <p className="text-sm text-muted-foreground">Respostas corretas</p>
              </div>
            </div>
          </div>
        </div>

        <h2 className="text-xl font-bold mb-4">Escolha uma disciplina</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject) => {
            const colors = colorClasses[subject.color as keyof typeof colorClasses];
            return (
              <Link
                key={subject.id}
                to={`/practice/${subject.id}`}
                className={`group p-6 rounded-2xl border-2 ${colors.bg} ${colors.border} transition-all duration-300 hover:shadow-lg hover:-translate-y-1`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-14 h-14 rounded-xl ${colors.icon} flex items-center justify-center transition-transform group-hover:scale-110`}
                  >
                    <subject.icon className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{subject.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Clique para praticar
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
