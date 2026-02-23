import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, KeyRound, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { authApi } from "@/services/api";

const PASSWORD_MIN_LENGTH = 6;

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const token = searchParams.get("token") || "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordTooShort = newPassword.length > 0 && newPassword.length < PASSWORD_MIN_LENGTH;
  const passwordMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const formDisabled = useMemo(
    () => loading || passwordTooShort || passwordMismatch || !token,
    [loading, passwordTooShort, passwordMismatch, token]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token) {
      toast({
        variant: "destructive",
        title: "Link invalido",
        description: "Este link de redefinicao nao e valido.",
      });
      return;
    }

    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      toast({
        variant: "destructive",
        title: "Senha muito curta",
        description: `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`,
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Senhas diferentes",
        description: "Senha e confirmacao precisam ser identicas.",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.resetPassword(token, newPassword);
      toast({
        title: "Senha alterada",
        description: response.message,
      });
      navigate("/login");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Falha ao redefinir senha",
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
            <KeyRound className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold">Redefinir senha</h1>
          <p className="text-sm text-muted-foreground">
            Cadastre sua nova senha para continuar usando sua conta.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nova senha</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              placeholder="........"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={PASSWORD_MIN_LENGTH}
              required
              className="h-12"
            />
            <p className={passwordTooShort ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
              Minimo de {PASSWORD_MIN_LENGTH} caracteres
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="........"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={PASSWORD_MIN_LENGTH}
              required
              className="h-12"
            />
            {passwordMismatch ? (
              <p className="text-xs text-destructive">As senhas nao coincidem.</p>
            ) : (
              <p className="text-xs text-muted-foreground">Repita a nova senha.</p>
            )}
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={formDisabled}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar nova senha"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
