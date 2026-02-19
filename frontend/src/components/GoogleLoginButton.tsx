import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GoogleLoginButtonProps {
  onSuccess: (googleAccessToken: string) => Promise<void> | void;
  onError: (message: string) => void;
  disabled?: boolean;
}

const GOOGLE_SCRIPT_ID = "google-identity-service";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="w-5 h-5">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.2-1.4 3.6-5.5 3.6-3.3 0-6-2.8-6-6.2s2.7-6.2 6-6.2c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 2.7 14.6 2 12 2 6.9 2 2.8 6.3 2.8 11.5S6.9 21 12 21c6.9 0 8.7-4.9 8.7-7.4 0-.5 0-.9-.1-1.3H12z"
      />
    </svg>
  );
}

export function GoogleLoginButton({
  onSuccess,
  onError,
  disabled = false,
}: GoogleLoginButtonProps) {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const clientRef = useRef<{
    requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
  } | null>(null);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!googleClientId) {
      onError("Google Login nao configurado no frontend.");
      return;
    }

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      if (window.google?.accounts?.oauth2) {
        setScriptLoaded(true);
      } else {
        existingScript.addEventListener("load", () => setScriptLoaded(true), { once: true });
      }
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => onError("Nao foi possivel carregar o login do Google.");
    document.body.appendChild(script);
  }, [googleClientId, onError]);

  const ensureTokenClient = () => {
    if (clientRef.current) {
      return clientRef.current;
    }

    if (!window.google?.accounts?.oauth2 || !googleClientId) {
      return null;
    }

    // Usa OAuth popup para obter access token do Google sem sair da tela.
    clientRef.current = window.google.accounts.oauth2.initTokenClient({
      client_id: googleClientId,
      scope: "openid email profile",
      callback: async (response) => {
        if (response.error || !response.access_token) {
          setAuthLoading(false);
          onError("Falha ao autenticar com Google. Tente novamente.");
          return;
        }

        try {
          await onSuccess(response.access_token);
        } finally {
          setAuthLoading(false);
        }
      },
    });

    return clientRef.current;
  };

  const handleClick = () => {
    if (!googleClientId || !scriptLoaded) {
      return;
    }

    const tokenClient = ensureTokenClient();
    if (!tokenClient) {
      onError("Configuracao Google invalida.");
      return;
    }

    setAuthLoading(true);
    tokenClient.requestAccessToken({ prompt: "select_account" });
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full"
      onClick={handleClick}
      disabled={disabled || authLoading || !googleClientId || !scriptLoaded}
    >
      {authLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Conectando...
        </>
      ) : !googleClientId ? (
        "Google nao configurado"
      ) : !scriptLoaded ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando Google...
        </>
      ) : (
        <>
          <GoogleIcon />
          Continuar com Google
        </>
      )}
    </Button>
  );
}
