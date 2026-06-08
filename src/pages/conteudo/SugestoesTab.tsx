import { useEffect, useState, useCallback } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  PostRow,
  StatusPost,
  Sugestao,
  parseSugestoes,
  buildConteudoCompleto,
} from "./types";
import { StatusBadge } from "./StatusBadge";
import { SugestaoModal } from "./SugestaoModal";

type FilterValue = "todos" | StatusPost;

const filters: { value: FilterValue; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "pendente_revisao", label: "Pendente revisão" },
  { value: "aprovado", label: "Aprovado" },
  { value: "publicado", label: "Publicado" },
  { value: "descartado", label: "Descartado" },
];

const truncate = (s: string, n: number) =>
  s.length > n ? s.slice(0, n) + "..." : s;

export const SugestoesTab = () => {
  const [rows, setRows] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterValue>("todos");
  const [modal, setModal] = useState<{
    postId: string;
    sugestao: Sugestao;
    status: StatusPost;
  } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("sugestoes_posts")
      .select("*")
      .order("data_geracao", { ascending: false });
    if (error) {
      setError(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as PostRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = rows.filter((r) => filter === "todos" || r.status === filter);

  const handleCopiar = async (e: React.MouseEvent, sugestao: Sugestao) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(buildConteudoCompleto(sugestao));
    toast.success("Texto copiado");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => {
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3.5 py-1.5 rounded-md text-sm transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "border border-border-soft text-muted-foreground hover:text-foreground hover:border-primary"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-36 rounded-lg bg-surface border border-border-soft animate-pulse"
            />
          ))}
        </div>
      )}

      {!loading && error && (
        <p className="text-sm text-muted-foreground">
          Erro ao carregar.{" "}
          <button onClick={fetchData} className="text-primary hover:underline">
            Tentar novamente
          </button>
        </p>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="py-16 text-center text-muted-foreground text-sm">
          Nenhuma sugestão de post nesta categoria ainda
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.flatMap((row) => {
            const sugs = parseSugestoes(row.sugestoes);
            return sugs.map((s, idx) => (
              <button
                key={`${row.id}-${idx}`}
                onClick={() =>
                  setModal({ postId: row.id, sugestao: s, status: row.status })
                }
                className="text-left bg-surface border border-border-soft rounded-lg p-4 hover:border-primary transition-colors duration-150 cursor-pointer flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[15px] font-semibold text-foreground line-clamp-2 flex-1">
                    {s.gancho}
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={row.status} />
                    <span
                      onClick={(e) => handleCopiar(e, s)}
                      className="text-muted-foreground hover:text-foreground p-1 -m-1"
                      role="button"
                      aria-label="Copiar"
                    >
                      <Copy size={14} />
                    </span>
                  </div>
                </div>
                <p className="text-[13px] text-muted-foreground">
                  {truncate(s.cta, 80)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-auto">
                  Semana de {row.semana}
                </p>
              </button>
            ));
          })}
        </div>
      )}

      {modal && (
        <SugestaoModal
          postId={modal.postId}
          sugestao={modal.sugestao}
          status={modal.status}
          onClose={() => setModal(null)}
          onChanged={fetchData}
        />
      )}
    </div>
  );
};
