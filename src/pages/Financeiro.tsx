import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatarLabel, OPCOES_CATEGORIAS_DESPESA } from "@/lib/formatarLabel";
import { formatarMoeda } from "@/lib/formatadores";
import ModalDespesa, { DespesaRow } from "@/components/ModalDespesa";

const CATEGORIA_BADGE: Record<string, string> = {
  meta_ads: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  ferramentas: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  aion: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  contador: "bg-gray-500/15 text-gray-300 border-gray-500/30",
  impostos: "bg-red-500/15 text-red-400 border-red-500/30",
  outros: "bg-muted text-muted-foreground border-border",
};

function ultimosMeses(n: number): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    let label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    label = label.charAt(0).toUpperCase() + label.slice(1);
    out.push({ value, label });
  }
  return out;
}

function intervaloMes(mesValue: string): { inicio: string; fim: string } {
  const [y, m] = mesValue.split("-").map(Number);
  const inicio = new Date(y, m - 1, 1);
  const fim = new Date(y, m, 1);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { inicio: fmt(inicio), fim: fmt(fim) };
}

function formatarData(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

const Financeiro = () => {
  const meses = useMemo(() => ultimosMeses(12), []);
  const [mes, setMes] = useState(meses[0].value);
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todas");
  const [despesas, setDespesas] = useState<DespesaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<DespesaRow | null>(null);
  const [paraDeletar, setParaDeletar] = useState<DespesaRow | null>(null);

  const fetchDespesas = useCallback(async () => {
    setLoading(true);
    setErro(null);
    const { inicio, fim } = intervaloMes(mes);
    let q = supabase
      .from("despesas")
      .select("*")
      .gte("data_referencia", inicio)
      .lt("data_referencia", fim)
      .order("data_referencia", { ascending: false });
    if (filtroCategoria !== "todas") q = q.eq("categoria", filtroCategoria);
    const { data, error } = await q;
    if (error) {
      setErro(error.message);
      setDespesas([]);
    } else {
      setDespesas((data ?? []) as DespesaRow[]);
    }
    setLoading(false);
  }, [mes, filtroCategoria]);

  useEffect(() => {
    fetchDespesas();
  }, [fetchDespesas]);

  const total = despesas.reduce((s, d) => s + Number(d.valor), 0);
  const lancamentos = despesas.length;

  const porCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    OPCOES_CATEGORIAS_DESPESA.forEach((o) => (map[o.value] = 0));
    despesas.forEach((d) => {
      map[d.categoria] = (map[d.categoria] ?? 0) + Number(d.valor);
    });
    return OPCOES_CATEGORIAS_DESPESA.map((o) => ({
      categoria: o.value,
      label: o.label,
      valor: map[o.value] ?? 0,
    })).sort((a, b) => b.valor - a.valor);
  }, [despesas]);

  const maiorCategoria = porCategoria[0]?.valor ? porCategoria[0] : null;

  const handleDelete = async () => {
    if (!paraDeletar) return;
    const { error } = await supabase.from("despesas").delete().eq("id", paraDeletar.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("🗑️ Despesa deletada");
    setParaDeletar(null);
    fetchDespesas();
  };

  const abrirNovo = () => {
    setEditando(null);
    setModalOpen(true);
  };

  const abrirEdicao = async (id: string) => {
    const { data } = await supabase.from("despesas").select("*").eq("id", id).maybeSingle();
    if (!data) {
      toast.error("Despesa não encontrada");
      return;
    }
    setEditando(data as DespesaRow);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-semibold">Financeiro</h1>
        <div className="flex items-center gap-3">
          <Select value={mes} onValueChange={setMes}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {meses.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={abrirNovo}>
            <Plus className="h-4 w-4" /> Nova despesa
          </Button>
        </div>
      </div>

      {/* Cards resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de despesas do mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-semibold">{formatarMoeda(total)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Número de lançamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-semibold">{lancamentos}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Maior categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-40" />
            ) : maiorCategoria ? (
              <div>
                <div className="text-lg font-semibold">{maiorCategoria.label}</div>
                <div className="text-sm text-muted-foreground">{formatarMoeda(maiorCategoria.valor)}</div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">—</div>
            )}
          </CardContent>
        </Card>
      </div>

      {erro && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="flex items-center justify-between py-4">
            <span className="text-sm text-destructive">Erro ao carregar despesas: {erro}</span>
            <Button variant="outline" size="sm" onClick={fetchDespesas}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Lista + gráfico */}
      <div className="grid gap-4 lg:grid-cols-5 items-start">
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-base">Despesas do mês</CardTitle>
            <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as categorias</SelectItem>
                {OPCOES_CATEGORIAS_DESPESA.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-[100px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : despesas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <p className="text-muted-foreground mb-3">Nenhuma despesa registrada neste mês</p>
                      <Button variant="outline" size="sm" onClick={abrirNovo}>
                        <Plus className="h-4 w-4" /> Adicionar primeira despesa
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  despesas.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>{formatarData(d.data_referencia)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={CATEGORIA_BADGE[d.categoria] ?? ""}>
                          {formatarLabel(d.categoria)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[280px] truncate">
                        {d.descricao || "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatarMoeda(Number(d.valor))}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => abrirEdicao(d.id)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setParaDeletar(d)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Despesas por categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={porCategoria} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis
                    type="category"
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                    width={80}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => formatarMoeda(v)}
                  />
                  <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <ModalDespesa
        open={modalOpen}
        onOpenChange={setModalOpen}
        despesa={editando}
        onSaved={fetchDespesas}
      />

      <AlertDialog open={!!paraDeletar} onOpenChange={(o) => !o && setParaDeletar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar despesa</AlertDialogTitle>
            <AlertDialogDescription>
              {paraDeletar &&
                `Tem certeza que deseja deletar a despesa de ${formatarLabel(
                  paraDeletar.categoria,
                )} no valor de ${formatarMoeda(Number(paraDeletar.valor))}? Esta ação não pode ser desfeita.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Financeiro;