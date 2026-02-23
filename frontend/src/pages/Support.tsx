import { ArrowLeft, GraduationCap, Mail, MessageCircleMore } from "lucide-react";
import { Link } from "react-router-dom";

const WHATSAPP_URL = "https://wa.me/5554999403920";
const SUPPORT_EMAIL = "devlorenzo587@gmail.com";

export default function Support() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container px-4">
          <div className="flex h-16 items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-glow">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">ProvaLab</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="container px-4 py-8">
        <Link
          to="/dashboard"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao painel
        </Link>

        <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-6">
          <h1 className="mb-2 text-2xl font-bold">Suporte</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Fale com o atendimento pelo canal que preferir.
          </p>

          <div className="space-y-3">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-success px-4 py-3 text-sm font-semibold text-success-foreground transition hover:opacity-90"
            >
              <MessageCircleMore className="h-4 w-4" />
              Falar no WhatsApp (+55 54 99940-3920)
            </a>

            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-3 text-sm font-semibold transition hover:bg-muted/40"
            >
              <Mail className="h-4 w-4" />
              Enviar e-mail ({SUPPORT_EMAIL})
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
