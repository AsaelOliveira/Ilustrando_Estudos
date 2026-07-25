import { useState } from "react";
import { Lightbulb, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const MAX_LEN = 500;

/**
 * Caixinha de sugestões: o aluno escreve o que acha que está faltando.
 * Grava na tabela `suggestions` (aditiva, criada em 20260725120000_add_suggestions.sql).
 */
export default function SuggestionBox() {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const remaining = MAX_LEN - message.length;
  const canSend = message.trim().length >= 3 && remaining >= 0 && !sending;

  const handleSend = async () => {
    if (!user || !canSend) return;
    setSending(true);
    const { error } = await supabase
      .from("suggestions")
      .insert({ user_id: user.id, message: message.trim() });
    setSending(false);

    if (error) {
      console.error("suggestions insert:", error);
      toast.error("Não consegui enviar agora. Tenta de novo em instantes!");
      return;
    }
    setMessage("");
    toast.success("Sugestão enviada! Valeu pela ideia ⭐");
  };

  return (
    <div className="rounded-[22px] border-2 border-frame bg-background px-4 py-4">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-yellow/20 text-brand-orange">
          <Lightbulb className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/60">Tem uma ideia?</p>
          <p className="text-xs text-muted-foreground">Conta o que você acha que está faltando na plataforma.</p>
        </div>
      </div>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={MAX_LEN}
        rows={3}
        placeholder="Ex.: queria mais jogos com meu avatar, ranking por disciplina..."
        className="mt-3 w-full resize-none rounded-xl border-2 border-frame bg-card px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className={`text-[11px] font-semibold ${remaining < 50 ? "text-destructive" : "text-muted-foreground"}`}>
          {remaining} caracteres
        </span>
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className="btn-3d btn-3d-blue flex items-center gap-2 px-5 py-2.5 text-sm"
        >
          <Send className="h-4 w-4" />
          {sending ? "Enviando..." : "Enviar"}
        </button>
      </div>
    </div>
  );
}
