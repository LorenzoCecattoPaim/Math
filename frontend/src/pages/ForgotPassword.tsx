import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { authApi } from "@/services/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await authApi.forgotPassword(email);
      toast({
        title: "Solicitacao recebida",
        description: response.message,
      });
      setEmail("");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao processar",
        description: (error as Error).message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-md">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para login
        </Link>

        <div className="mb-6 space-y-2">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Mail className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold">Esqueci minha senha</h1>
          <p className="text-sm text-muted-foreground">
            Informe seu email para receber o link de redefinicao.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
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

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar link"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
