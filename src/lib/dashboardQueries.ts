import { supabase } from "@/integrations/supabase/client";

function inicioMes(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function fimMes(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}
function iso(d: Date) {
  return d.toISOString();
}
function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function getLeadsCaptadosMes(): Promise<number> {
  const now = new Date();
  const ini = inicioMes(now);
  const fim = fimMes(now);
  const { count, error } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .gte("criado_em", iso(ini))
    .lte("criado_em", iso(fim));
  if (error) throw error;
  return count ?? 0;
}

export async function getTaxaConversao(): Promise<number | null> {
  const now = new Date();
  const ini = inicioMes(now);
  const fim = fimMes(now);
  const { data, error } = await supabase
    .from("leads")
    .select("status")
    .gte("criado_em", iso(ini))
    .lte("criado_em", iso(fim));
  if (error) throw error;
  const total = data?.length ?? 0;
  if (total === 0) return null;
  const conv = data!.filter((l: any) => l.status === "convertido").length;
  return (conv * 100) / total;
}

export async function getPacientesAtivos(): Promise<number> {
  const hoje = isoDate(new Date());
  const { count, error } = await supabase
    .from("pacientes")
    .select("*", { count: "exact", head: true })
    .eq("status", "ativo")
    .eq("arquivado", false)
    .gte("data_fim", hoje);
  if (error) throw error;
  return count ?? 0;
}

export async function getFaturamentoBruto(): Promise<number> {
  const hoje = isoDate(new Date());
  const { data, error } = await supabase
    .from("pacientes")
    .select("valor_real")
    .eq("status", "ativo")
    .eq("arquivado", false)
    .gte("data_fim", hoje);
  if (error) throw error;
  return (data ?? []).reduce((s: number, p: any) => s + Number(p.valor_real || 0), 0);
}

export async function getDespesasMes(mesRef?: Date): Promise<number> {
  const ref = mesRef ?? new Date();
  const ini = inicioMes(ref);
  const fim = fimMes(ref);
  const { data, error } = await supabase
    .from("despesas")
    .select("valor")
    .gte("data_referencia", isoDate(ini))
    .lte("data_referencia", isoDate(fim));
  if (error) throw error;
  return (data ?? []).reduce((s: number, d: any) => s + Number(d.valor || 0), 0);
}

export async function getNovosPacientesMes(): Promise<number> {
  const now = new Date();
  const ini = inicioMes(now);
  const fim = fimMes(now);
  const { count, error } = await supabase
    .from("pacientes")
    .select("*", { count: "exact", head: true })
    .eq("arquivado", false)
    .gte("data_inicio", isoDate(ini))
    .lte("data_inicio", isoDate(fim));
  if (error) throw error;
  return count ?? 0;
}

export interface PontoEvolucao {
  mes: Date;
  faturamento: number;
  despesas: number;
  lucro: number;
}

export async function getEvolucaoLucro(): Promise<PontoEvolucao[]> {
  const hoje = new Date();
  const meses: Date[] = [
    new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1),
    new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1),
    new Date(hoje.getFullYear(), hoje.getMonth(), 1),
  ];

  const resultados: PontoEvolucao[] = [];
  for (const mes of meses) {
    const ini = inicioMes(mes);
    const fim = fimMes(mes);
    const { data: pacs, error: errP } = await supabase
      .from("pacientes")
      .select("valor_real, data_inicio, data_fim, status")
      .eq("status", "ativo")
      .eq("arquivado", false)
      .lte("data_inicio", isoDate(fim))
      .gte("data_fim", isoDate(ini));
    if (errP) throw errP;
    const fat = (pacs ?? []).reduce((s: number, p: any) => s + Number(p.valor_real || 0), 0);
    const desp = await getDespesasMes(mes);
    resultados.push({ mes, faturamento: fat, despesas: desp, lucro: fat - desp });
  }
  return resultados;
}

export async function getDistribuicaoPlanos(): Promise<{ plano: string; total: number }[]> {
  const { data, error } = await supabase.from("pacientes").select("plano").eq("arquivado", false);
  if (error) throw error;
  const counts = new Map<string, number>();
  for (const p of data ?? []) {
    const k = (p as any).plano ?? "—";
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([plano, total]) => ({ plano, total }))
    .sort((a, b) => b.total - a.total);
}