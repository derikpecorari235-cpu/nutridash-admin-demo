import { useState } from "react";
import { X, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Sugestao, StatusPost, buildConteudoCompleto } from "./types";

type Props = {
  postId: string;
  sugestao: Sugestao;
  status: StatusPost;
  onClose: () => void;
  onChanged: () => void;
};

export const SugestaoModal = ({ postId, sugestao, status, onClose, onChanged }: Props) => {
  const [busy, setBusy] = useState(false);

  const handleCopiar = async () => {
    await navigator.clipboard.writeText(buildConteudoCompleto(sugestao));
    toast.success("Texto copiado");
  };

  const handleAprovar = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("sugestoes_posts")
      .update({
        status: "aprovado",
        data_revisao: new Date().toISOString(),
        post_aprovado_1: buildConteudoCompleto(sugestao),
      })
      .eq("id", postId);
    setBusy(false);
    if (error) toast.error("Erro ao aprovar");
    else {
      toast.success("Sugestão aprovada");
      onChanged();
      onClose();
    }
  };

  const handleDescartar = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("sugestoes_posts")
      .update({ status: "descartado", data_revisao: new Date().toISOString() })
      .eq("id", postId);
    setBusy(false);
    if (error) toast.error("Erro ao descartar");
    else {
      toast.success("Sugestão descartada");
      onChanged();
      onClose();
    }
  };

  const handlePublicar = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("sugestoes_posts")
      .update({ status: "publicado", data_publicacao: new Date().toISOString() })
      .eq("id", postId);
    setBusy(false);
    if (error) toast.error("Erro ao publicar");
    else {
      toast.success("Marcado como publicado");
      onChanged();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-auto bg-surface border border-border-soft rounded-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-soft sticky top-0 bg-surface">
          <h2 className="text-base font-semibold">Sugestão de Post</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
              Gancho
            </p>
            <p className="text-base font-semibold">{sugestao.gancho}</p>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
              Corpo
            </p>
            <p className="text-sm whitespace-pre-line leading-relaxed">{sugestao.corpo}</p>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
              CTA
            </p>
            <p className="text-sm">{sugestao.cta}</p>
          </div>

          {sugestao.hashtags.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Hashtags
              </p>
              <div className="flex flex-wrap gap-1.5">
                {sugestao.hashtags.map((h, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 rounded text-xs bg-primary/15 text-primary border border-primary/30"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleCopiar}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-surface-2 border border-border-soft text-sm hover:border-primary transition-colors"
          >
            <Copy size={14} />
            Copiar texto completo
          </button>
        </div>

        <div className="flex flex-wrap gap-2 px-6 py-4 border-t border-border-soft sticky bottom-0 bg-surface">
          {status === "pendente_revisao" && (
            <>
              <button
                disabled={busy}
                onClick={handleAprovar}
                className="px-4 py-2 rounded-md bg-success text-white text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
              >
                Aprovar
              </button>
              <button
                disabled={busy}
                onClick={handleDescartar}
                className="px-4 py-2 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
              >
                Descartar
              </button>
            </>
          )}
          {status === "aprovado" && (
            <button
              disabled={busy}
              onClick={handlePublicar}
              className="px-4 py-2 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-medium transition disabled:opacity-50"
            >
              Marcar como Publicado
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
