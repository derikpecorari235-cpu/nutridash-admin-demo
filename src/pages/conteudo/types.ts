export type StatusPost =
  | "pendente_revisao"
  | "aprovado"
  | "publicado"
  | "descartado";

export type Sugestao = {
  gancho: string;
  corpo: string;
  cta: string;
  hashtags: string[];
};

export type PostRow = {
  id: string;
  semana: string;
  tema_principal: string;
  materiais_usados: string | null;
  sugestoes: string;
  status: StatusPost;
  post_aprovado_1: string | null;
  data_geracao: string;
  data_revisao: string | null;
  data_publicacao: string | null;
};

export type DocumentoIndice = {
  id: string;
  documento_id: string;
  nome_arquivo: string;
  categoria: string;
  descricao: string | null;
  total_chunks: number;
  status: string;
  criado_em: string;
};

export const parseSugestoes = (raw: string): Sugestao[] => {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((s: any) => ({
      gancho: s?.gancho ?? "",
      corpo: s?.corpo ?? "",
      cta: s?.cta ?? "",
      hashtags: Array.isArray(s?.hashtags) ? s.hashtags : [],
    }));
  } catch {
    console.error("Erro ao parsear sugestoes:", raw);
    return [];
  }
};

export const buildConteudoCompleto = (s: Sugestao) =>
  s.gancho + "\n\n" + s.corpo + "\n\n" + s.cta + "\n\n" + s.hashtags.join(" ");
