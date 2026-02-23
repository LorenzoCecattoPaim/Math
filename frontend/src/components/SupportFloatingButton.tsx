import { Mail, MessageCircleQuestion, MessageCircleMore } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const WHATSAPP_URL = "https://wa.me/5554999403920";
const SUPPORT_EMAIL = "devlorenzo587@gmail.com";

export function SupportFloatingButton() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full bg-success px-4 py-2.5 text-sm font-semibold text-success-foreground shadow-lg transition hover:opacity-90"
      >
        <MessageCircleMore className="h-4 w-4" />
        Falar no WhatsApp
      </a>
      <span className="rounded-full bg-background/95 px-3 py-1 text-center text-xs text-muted-foreground shadow-sm">
        Atendimento rapido
      </span>
      <a
        href={`mailto:${SUPPORT_EMAIL}`}
        className="inline-flex items-center gap-2 rounded-full bg-background px-4 py-2.5 text-sm font-semibold text-foreground shadow-lg transition hover:bg-muted/40"
      >
        <Mail className="h-4 w-4" />
        E-mail suporte
      </a>
      <Link
        to="/support"
        className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition hover:bg-primary/90"
      >
        <MessageCircleQuestion className="h-4 w-4" />
        Suporte
      </Link>
    </div>
  );
}
