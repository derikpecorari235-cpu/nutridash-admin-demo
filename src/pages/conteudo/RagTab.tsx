import { useEffect, useState, useCallback } from "react";
import { Trash2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DocumentoIndice } from "./types";

const categorias = ["Geral", "Plano Basic", "Plano Premium", "Receitas", "Protocolos"];
const WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_RAG_UPLOAD;
const SUGERIR_POST_URL = import.meta.env.VITE_N8N_WEBHOOK_SUGERIR_POST;
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

interface RagTabProps {
  onSugestoesGeradas?: () => void;
}

const formatDate = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export const RagTab = ({ onSugestoesGeradas }: RagTabProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [categoria, setCategoria] = useState(categorias[0]);
  const [descricao, setDescricao] = useState("");
  const [uploading, setUploading] = useState(false);

  const [docs, setDocs] = useState<DocumentoIndice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gerando, setGerando] = useState<string | null>(null);
  const [removendo, setRemovendo] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("documentos_indice")
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(50);
    if (error) {
      setError(error.message);
      setDocs([]);
    } else {
      setDocs((data ?? []) as DocumentoIndice[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const resetForm = () => {
    setFile(null);
    setCategoria(categorias[0]);
    setDescricao("");
    const input = document.getElementById("rag-file-input") as HTMLInputElement | null;
    if (input) input.value = "";
  };

  const handleIndexar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast.error("Selecione um PDF para indexar");
      return;
    }
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      toast.error("Apenas arquivos PDF são aceitos");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("Arquivo muito grande. Máximo 10MB");
      return;
    }

    setUploading(true);
    try {
      const arquivo_base64 = await fileToBase64(file);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          arquivo_base64,
          nome_arquivo: file.name,
          categoria,
          descricao,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("Erro N8N:", res.status, text);
        toast.error("Erro ao indexar documento. Tente novamente.");
        return;
      }

      toast.success("Documento indexado com sucesso!");
      resetForm();
      fetchDocs();
    } catch (err) {
      console.error("Erro ao enviar para N8N:", err);
      toast.error("Erro ao indexar documento. Tente novamente.");
    } finally {
      setUploading(false);
    }
  };

  const handleGerarSugestoes = async (documentoId: string) => {
    setGerando(documentoId);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);

      const res = await fetch(SUGERIR_POST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documento_id: documentoId }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        toast.error("Erro ao gerar sugestões. Tente novamente em alguns segundos.");
        return;
      }

      toast.success("Sugestões geradas com sucesso! Verifique a aba Sugestões de Posts", { duration: 5000 });
      setTimeout(() => {
        onSugestoesGeradas?.();
      }, 1500);
    } catch (err) {
      console.error("Erro ao gerar sugestões:", err);
      toast.error("Erro ao gerar sugestões. Tente novamente em alguns segundos.");
    } finally {
      setGerando(null);
    }
  };

  const handleRemover = async (doc: DocumentoIndice) => {
    setRemovendo(doc.id);
    console.log('[DELETE] Iniciando remoção:', {
      id: doc.id,
      documento_id: doc.documento_id,
      nome_arquivo: doc.nome_arquivo
    });
    try {
      // 1. Storage: listar e deletar arquivos do bucket
      try {
        const { data: files } = await supabase.storage
          .from("documentos-rag")
          .list("", { limit: 100 });
        if (files && files.length > 0) {
          const toDelete = files
            .filter((f) => f.name.startsWith(doc.documento_id))
            .map((f) => f.name);
          if (toDelete.length > 0) {
            await supabase.storage.from("documentos-rag").remove(toDelete);
          }
          console.log('[DELETE] Storage OK, arquivos removidos:', toDelete?.length || 0);
        }
      } catch (storageErr) {
        console.warn("Aviso: falha ao remover do storage", storageErr);
      }

      // 2. RPC para deletar chunks + índice
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('deletar_documento', { p_documento_id: doc.documento_id });
      if (rpcError) {
        toast.error("Erro ao remover documento: " + rpcError.message);
        return;
      }
      console.log('[DELETE] RPC executou:', rpcResult);

      toast.success("Documento removido com sucesso!");
      fetchDocs();
    } catch (err) {
      console.error("Erro ao remover:", err);
      toast.error("Erro ao remover documento.");
    } finally {
      setRemovendo(null);
    }
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleIndexar}
        className="bg-surface border border-border-soft rounded-lg p-6 space-y-4"
      >
        <h2 className="text-base font-semibold">Upload de Documento</h2>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Arquivo (PDF)
          </label>
          <input
            id="rag-file-input"
            type="file"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={uploading}
            className="w-full text-sm text-foreground file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-surface-2 file:text-foreground file:text-sm hover:file:bg-border-soft cursor-pointer"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Categoria
          </label>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            disabled={uploading}
            className="w-full px-3 py-2 rounded-md bg-surface-2 border border-border-soft text-sm focus:outline-none focus:border-primary transition-colors"
          >
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Descrição (opcional)
          </label>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={3}
            disabled={uploading}
            className="w-full px-3 py-2 rounded-md bg-surface-2 border border-border-soft text-sm focus:outline-none focus:border-primary transition-colors resize-none"
            placeholder="Breve descrição do conteúdo…"
          />
        </div>

        <button
          type="submit"
          disabled={!file || uploading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading && <Loader2 size={16} className="animate-spin" />}
          {uploading ? "Indexando... (isso leva ~20s)" : "Indexar Documento"}
        </button>
      </form>

      <div className="bg-surface border border-border-soft rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-border-soft">
          <h2 className="text-base font-semibold">Documentos Indexados</h2>
        </div>

        {loading && (
          <div className="p-6 space-y-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-10 rounded bg-surface-2 animate-pulse"
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <p className="p-6 text-sm text-muted-foreground">
            Erro ao carregar.{" "}
            <button onClick={fetchDocs} className="text-primary hover:underline">
              Tentar novamente
            </button>
          </p>
        )}

        {!loading && !error && docs.length === 0 && (
          <p className="p-12 text-center text-sm text-muted-foreground">
            Nenhum documento indexado ainda
          </p>
        )}

        {!loading && !error && docs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-muted-foreground border-b border-border-soft">
                  <th className="px-6 py-3 font-medium">Arquivo</th>
                  <th className="px-6 py-3 font-medium">Categoria</th>
                  <th className="px-6 py-3 font-medium">Descrição</th>
                  <th className="px-6 py-3 font-medium">Data</th>
                  <th className="px-6 py-3 font-medium text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-border-soft last:border-0 hover:bg-surface-2/50 transition-colors"
                  >
                    <td className="px-6 py-3 font-medium">{d.nome_arquivo}</td>
                    <td className="px-6 py-3 text-muted-foreground">{d.categoria}</td>
                    <td className="px-6 py-3 text-muted-foreground max-w-xs truncate">
                      {d.descricao || "—"}
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {formatDate(d.criado_em)}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleGerarSugestoes(d.documento_id)}
                          disabled={gerando === d.documento_id}
                          className="text-primary hover:text-primary/80 transition-colors p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Criar sugestões de posts a partir deste PDF"
                          aria-label="Gerar sugestões"
                        >
                          {gerando === d.documento_id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Sparkles size={16} />
                          )}
                        </button>
                        <button
                          onClick={() => handleRemover(d)}
                          disabled={removendo === d.id}
                          className="text-destructive hover:text-destructive/80 transition-colors p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Remover"
                        >
                          {removendo === d.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
