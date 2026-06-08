import { useState, useCallback } from "react";
import { SugestoesTab } from "./conteudo/SugestoesTab";
import { RagTab } from "./conteudo/RagTab";

type Tab = "sugestoes" | "rag";

const Conteudo = () => {
  const [tab, setTab] = useState<Tab>("sugestoes");
  const [sugestoesKey, setSugestoesKey] = useState(0);
  const refreshSugestoes = useCallback(() => setSugestoesKey((k) => k + 1), []);

  const tabBtn = (value: Tab, label: string) => {
    const active = tab === value;
    return (
      <button
        onClick={() => setTab(value)}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          active
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <h1 className="text-2xl font-bold">Conteúdo</h1>

      <div className="flex gap-2 border-b border-border-soft pb-3">
        {tabBtn("sugestoes", "Sugestões de Posts")}
        {tabBtn("rag", "Base de Documentos (RAG)")}
      </div>

      {tab === "sugestoes" ? <SugestoesTab key={sugestoesKey} /> : <RagTab onSugestoesGeradas={refreshSugestoes} />}
    </div>
  );
};

export default Conteudo;
