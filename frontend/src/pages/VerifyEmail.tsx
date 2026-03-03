import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/services/api";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { verifyGoogleEmailCode, verifyGoogleMagicLink } = useAuth();

  const pendingToken = searchParams.get("pending_token") || "";
  const magicToken = searchParams.get("magic_token") || "";
  const email = searchParams.get("email") || "";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicChecking, setMagicChecking] = useState(Boolean(magicToken));
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(60);
  const [resendAttempts, setResendAttempts] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null);

  useEffect(() => {
    if (!magicToken) {
      setMagicChecking(false);
      return;
    }

    const runMagicVerification = async () => {
      const { error } = await verifyGoogleMagicLink(magicToken);
      setMagicChecking(false);

      if (error) {
        toast({
          variant: "destructive",
          title: "Link inválido",
          description: error.message,
        });
        return;
      }

      toast({
        title: "E-mail verificado",
        description: "Login concluído com sucesso.",
      });
      navigate("/dashboard");
    };

    void runMagicVerification();
  }, [magicToken, navigate, toast, verifyGoogleMagicLink]);

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCooldownSeconds((previous) => Math.max(0, previous - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldownSeconds]);

  useEffect(() => {
    if (!blockedUntil) {
      return;
    }

    const now = Date.now();
    if (now >= blockedUntil) {
      setBlockedUntil(null);
      setResendAttempts(0);
      return;
    }

    const timer = window.setInterval(() => {
      if (Date.now() >= blockedUntil) {
        setBlockedUntil(null);
        setResendAttempts(0);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [blockedUntil]);

  const blockedSeconds = blockedUntil ? Math.max(0, Math.ceil((blockedUntil - Date.now()) / 1000)) : 0;

  const handleResendCode = async () => {
    if (!pendingToken) {
      toast({
        variant: "destructive",
        title: "Sessão de verificação inválida",
        description: "Inicie o acesso novamente para receber um novo código.",
      });
      return;
    }

    if (cooldownSeconds > 0 || blockedSeconds > 0) {
      return;
    }

    setResendLoading(true);
    try {
      const response = await authApi.resendVerificationCode(pendingToken);

      const nextPendingToken = response.pending_token || pendingToken;
      const params = new URLSearchParams(searchParams);
      params.set("pending_token", nextPendingToken);
      if (response.email) {
        params.set("email", response.email);
      }
      navigate(`/verify-email?${params.toString()}`, { replace: true });

      setCooldownSeconds(60);
      setResendAttempts((previous) => {
        const nextAttempts = previous + 1;
        if (nextAttempts >= 5) {
          setBlockedUntil(Date.now() + 60 * 60 * 1000);
        }
        return nextAttempts;
      });

      toast({
        title: "Código reenviado",
        description: response.message || "Novo código enviado para seu e-mail.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Falha ao reenviar",
        description: (error as Error).message,
      });
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!pendingToken) {
      toast({
        variant: "destructive",
        title: "Sessão de verificação inválida",
        description: "Inicie o acesso novamente para receber um novo código.",
      });
      return;
    }

    if (!/^[0-9]{6}$/.test(code.trim())) {
      toast({
        variant: "destructive",
        title: "Código inválido",
        description: "Informe um código numérico de 6 dígitos.",
      });
      return;
    }

    setLoading(true);
    const { error } = await verifyGoogleEmailCode(pendingToken, code);
    setLoading(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Não foi possível validar o código",
        description: error.message,
      });
      return;
    }

    toast({
      title: "E-mail verificado",
      description: "Login concluído com sucesso.",
    });
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-md">
        <Link
          to="/register"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>

        <div className="mb-6 space-y-2">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold">Verificar e-mail</h1>
          <p className="text-sm text-muted-foreground">
            Enviamos um link e um código de 6 dígitos para {email || "seu e-mail"}.
          </p>
        </div>

        {magicChecking ? (
          <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Validando link automaticamente...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="verificationCode">Código</Label>
              <Input
                id="verificationCode"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="h-12 text-center tracking-[0.35em] text-lg"
                required
              />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Confirmando...
                </>
              ) : (
                "Confirmar código"
              )}
            </Button>

            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={resendLoading || cooldownSeconds > 0 || blockedSeconds > 0}
                onClick={handleResendCode}
              >
                {resendLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Reenviando...
                  </>
                ) : cooldownSeconds > 0 ? (
                  `Reenviar código em ${cooldownSeconds}s`
                ) : blockedSeconds > 0 ? (
                  `Reenvio bloqueado por ${blockedSeconds}s`
                ) : (
                  "Reenviar código"
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Você pode reenviar até 5 vezes por hora.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
