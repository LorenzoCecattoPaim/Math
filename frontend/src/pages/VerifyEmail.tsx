import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

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
          title: "Link invalido",
          description: error.message,
        });
        return;
      }

      toast({
        title: "Email verificado",
        description: "Login concluido com sucesso.",
      });
      navigate("/dashboard");
    };

    void runMagicVerification();
  }, [magicToken, navigate, toast, verifyGoogleMagicLink]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!pendingToken) {
      toast({
        variant: "destructive",
        title: "Sessao de verificacao invalida",
        description: "Inicie o login com Google novamente.",
      });
      return;
    }

    if (!/^[0-9]{6}$/.test(code.trim())) {
      toast({
        variant: "destructive",
        title: "Codigo invalido",
        description: "Informe um codigo numerico de 6 digitos.",
      });
      return;
    }

    setLoading(true);
    const { error } = await verifyGoogleEmailCode(pendingToken, code);
    setLoading(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Nao foi possivel validar o codigo",
        description: error.message,
      });
      return;
    }

    toast({
      title: "Email verificado",
      description: "Login concluido com sucesso.",
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
          <h1 className="text-2xl font-bold">Verificar Email</h1>
          <p className="text-sm text-muted-foreground">
            Enviamos um link e um codigo de 6 digitos para {email || "seu email"}.
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
              <Label htmlFor="verificationCode">Codigo</Label>
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
                "Confirmar codigo"
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
