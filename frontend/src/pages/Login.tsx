import { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, GraduationCap, Loader2 } from "lucide-react";

import { GoogleLoginButton } from "@/components/GoogleLoginButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { signIn, startGoogleAuth } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleGoogleError = useCallback(
    (message: string) => {
      toast({
        variant: "destructive",
        title: "Erro no login Google",
        description: message,
      });
    },
    [toast]
  );

  const handleGoogleSuccess = async (googleAccessToken: string) => {
    const { data, error } = await startGoogleAuth(googleAccessToken);

    if (error || !data) {
      toast({
        variant: "destructive",
        title: "Erro ao iniciar verificacao",
        description: error?.message || "Nao foi possivel continuar com Google.",
      });
      return;
    }

    toast({
      title: "Codigo enviado",
      description: `Enviamos um codigo para ${data.email}.`,
    });

    const params = new URLSearchParams({
      pending_token: data.pendingToken,
      email: data.email,
    });
    navigate(`/verify-email?${params.toString()}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao entrar",
        description: error.message,
      });
    } else {
      navigate("/dashboard");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-24">
        <div className="max-w-md w-full mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao inicio
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Bem-vindo de volta!</h1>
            <p className="text-muted-foreground">
              Entre na sua conta para continuar praticando.
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <GoogleLoginButton
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              disabled={loading}
            />
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">ou</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="........"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <Button
              type="submit"
              variant="hero"
              className="w-full"
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-muted-foreground">
            Nao tem uma conta?{" "}
            <Link to="/register" className="text-primary font-medium hover:underline">
              Cadastre-se
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary via-primary-glow to-secondary relative overflow-hidden">
        <div className="flex flex-col items-center justify-center w-full p-12 text-white">
          <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center mb-8">
            <GraduationCap className="w-10 h-10" />
          </div>
          <h2 className="text-4xl font-bold mb-4 text-center">ProvaLab</h2>
          <p className="text-xl text-white/80 text-center max-w-md">
            Pratique, aprenda e evolua com exercicios personalizados.
          </p>
        </div>
      </div>
    </div>
  );
}
