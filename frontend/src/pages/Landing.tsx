import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BookMarked,
  BookOpen,
  Brain,
  CheckCircle,
  Clock,
  GraduationCap,
  Rocket,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";

function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">ProvaLab</span>
          </Link>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Entrar</Link>
            </Button>
            <Button variant="default" size="sm" asChild>
              <Link to="/register">Cadastrar</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
      <div
        className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float"
        style={{ animationDelay: "-3s" }}
      />

      <div className="container relative z-10 px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-primary/10 border border-primary/20 text-primary animate-fade-in">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Plataforma de estudos inteligente</span>
          </div>

          <h1
            className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight animate-fade-in"
            style={{ animationDelay: "0.1s" }}
          >
            Pratique, <span className="gradient-text">Aprenda</span> e{" "}
            <span className="gradient-text">Evolua</span>
          </h1>

          <p
            className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-fade-in"
            style={{ animationDelay: "0.2s" }}
          >
            Exercicios personalizados, correcao automatica e acompanhamento do seu progresso.
            Sua jornada de aprendizado comeca aqui.
          </p>

          <div
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-in"
            style={{ animationDelay: "0.3s" }}
          >
            <Button variant="hero" size="xl" asChild>
              <Link to="/register">
                Comecar Gratuitamente
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <Button variant="outline" size="xl" asChild>
              <Link to="/login">Ja tenho conta</Link>
            </Button>
          </div>

          <div
            className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto animate-fade-in"
            style={{ animationDelay: "0.4s" }}
          >
            <div className="flex items-center gap-3 justify-center p-4 rounded-xl bg-card/50 backdrop-blur border border-border/50">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <span className="font-medium">Multiplas Disciplinas</span>
            </div>
            <div className="flex items-center gap-3 justify-center p-4 rounded-xl bg-card/50 backdrop-blur border border-border/50">
              <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-secondary" />
              </div>
              <span className="font-medium">Correcao Instantanea</span>
            </div>
            <div className="flex items-center gap-3 justify-center p-4 rounded-xl bg-card/50 backdrop-blur border border-border/50">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-accent" />
              </div>
              <span className="font-medium">Historico Completo</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    {
      icon: Brain,
      title: "Exercicios Dinamicos",
      description: "Geracao automatica de questoes adaptadas ao seu nivel.",
      iconContainerClass: "bg-primary/10",
      iconClass: "text-primary",
    },
    {
      icon: Zap,
      title: "Correcao Instantanea",
      description: "Receba feedback imediato sobre suas respostas.",
      iconContainerClass: "bg-secondary/10",
      iconClass: "text-secondary",
    },
    {
      icon: BarChart3,
      title: "Acompanhe seu Progresso",
      description: "Visualize sua evolucao com estatisticas completas.",
      iconContainerClass: "bg-accent/10",
      iconClass: "text-accent",
    },
    {
      icon: BookMarked,
      title: "Multiplas Disciplinas",
      description: "Algebra, Geometria, Calculo e muito mais.",
      iconContainerClass: "bg-primary/10",
      iconClass: "text-primary",
    },
    {
      icon: CheckCircle,
      title: "Niveis de Dificuldade",
      description: "Escolha entre facil, medio e dificil.",
      iconContainerClass: "bg-secondary/10",
      iconClass: "text-secondary",
    },
    {
      icon: Clock,
      title: "Estude no seu Ritmo",
      description: "Pratique quando e onde quiser.",
      iconContainerClass: "bg-accent/10",
      iconClass: "text-accent",
    },
  ];

  return (
    <section className="py-24 bg-muted/30">
      <div className="container px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Tudo que voce precisa para <span className="gradient-text">aprender melhor</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Uma plataforma completa para maximizar seu aprendizado.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group p-8 rounded-2xl bg-card border border-border hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div
                className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 ${feature.iconContainerClass}`}
              >
                <feature.icon className={`w-7 h-7 ${feature.iconClass}`} />
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary-glow to-secondary opacity-90" />
      <div className="container relative z-10 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-white/10 border border-white/20 text-white">
            <Rocket className="w-4 h-4" />
            <span className="text-sm font-medium">Comece sua jornada hoje</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Pronto para transformar sua forma de estudar?
          </h2>
          <p className="text-xl text-white/80 mb-10">
            Junte-se a estudantes que ja estao evoluindo com o ProvaLab.
          </p>
          <Button size="xl" className="bg-white text-primary hover:bg-white/90 shadow-xl" asChild>
            <Link to="/register">
              Criar Conta Gratuita
              <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-12 bg-foreground text-background">
      <div className="container px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-background flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-foreground" />
            </div>
            <span className="text-xl font-bold">ProvaLab</span>
          </Link>
          <p className="text-sm text-background/60">
            &copy; {new Date().getFullYear()} ProvaLab. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <Features />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
