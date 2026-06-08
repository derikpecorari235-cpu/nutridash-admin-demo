import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatarLabel } from "@/lib/formatarLabel";
import { formatarMes, formatarMoeda, nomeMesCurto } from "@/lib/formatadores";
import {
  getDespesasMes,
  getDistribuicaoPlanos,
  getEvolucaoLucro,
  getFaturamentoBruto,
  getLeadsCaptadosMes,
  getNovosPacientesMes,
  getPacientesAtivos,
  getTaxaConversao,
  type PontoEvolucao,
} from "@/lib/dashboardQueries";

type Estado<T> = { loading: boolean; data: T | null; erro: boolean };
const inicial = <T,>(): Estado<T> => ({ loading: true, data: null, erro: false });

const MetricCard = ({
  titulo,
  subtitulo,
  estado,
  render,
  className,
  desabilitado,
}: {
  titulo: string;
  subtitulo?: string;
  estado?: Estado<any>;
  render?: (data: any) => React.ReactNode;
  className?: string;
  desabilitado?: boolean;
}) => (
  <Card className={desabilitado ? "opacity-60" : undefined}>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{titulo}</CardTitle>
    </CardHeader>
    <CardContent>
      {desabilitado ? (
        <div className="text-3xl font-semibold text-muted-foreground">—</div>
      ) : estado?.loading ? (
        <Skeleton className="h-9 w-32" />
      ) : estado?.erro ? (
        <div className="text-sm text-destructive">Erro ao carregar</div>
      ) : (
        <div className={`text-3xl font-semibold ${className ?? ""}`}>{render?.(estado?.data)}</div>
      )}
      {subtitulo && <p className="text-xs text-muted-foreground mt-2">{subtitulo}</p>}
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const hoje = new Date();
  const labelMes = formatarMes(hoje);

  const [leads, setLeads] = useState<Estado<number>>(inicial);
  const [taxa, setTaxa] = useState<Estado<number | null>>(inicial);
  const [ativos, setAtivos] = useState<Estado<number>>(inicial);
  const [faturamento, setFaturamento] = useState<Estado<number>>(inicial);
  const [despesas, setDespesas] = useState<Estado<number>>(inicial);
  const [novos, setNovos] = useState<Estado<number>>(inicial);
  const [evolucao, setEvolucao] = useState<Estado<PontoEvolucao[]>>(inicial);
  const [planos, setPlanos] = useState<Estado<{ plano: string; total: number }[]>>(inicial);

  const carregar = useCallback(async () => {
    setLeads(inicial());
    setTaxa(inicial());
    setAtivos(inicial());
    setFaturamento(inicial());
    setDespesas(inicial());
    setNovos(inicial());
    setEvolucao(inicial());
    setPlanos(inicial());

    const run = <T,>(p: Promise<T>, set: (s: Estado<T>) => void) =>
      p
        .then((data) => set({ loading: false, data, erro: false }))
        .catch((e) => {
          console.error(e);
          set({ loading: false, data: null, erro: true });
        });

    await Promise.all([
      run(getLeadsCaptadosMes(), setLeads),
      run(getTaxaConversao(), setTaxa),
      run(getPacientesAtivos(), setAtivos),
      run(getFaturamentoBruto(), setFaturamento),
      run(getDespesasMes(), setDespesas),
      run(getNovosPacientesMes(), setNovos),
      run(getEvolucaoLucro(), setEvolucao),
      run(getDistribuicaoPlanos(), setPlanos),
    ]);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const lucroValor =
    faturamento.data != null && despesas.data != null
      ? faturamento.data - despesas.data
      : null;

  const dadosEvolucao =
    evolucao.data?.map((p) => ({
      mes: nomeMesCurto(p.mes),
      lucro: p.lucro,
    })) ?? [];

  const dadosPlanos =
    planos.data?.map((p) => ({
      plano: formatarLabel(p.plano) || p.plano,
      total: p.total,
    })) ?? [];

  const carregandoAlguma =
    leads.loading ||
    taxa.loading ||
    ativos.loading ||
    faturamento.loading ||
    despesas.loading ||
    novos.loading ||
    evolucao.loading ||
    planos.loading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground capitalize">{labelMes}</p>
        </div>
        <Button variant="outline" size="sm" onClick={carregar} disabled={carregandoAlguma}>
          <RefreshCw size={16} className={carregandoAlguma ? "animate-spin" : ""} />
          Atualizar
        </Button>
      </div>

      {/* Linha 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          titulo="Visitas à LP"
          subtitulo="Aguardando integração com tracking"
          desabilitado
        />
        <MetricCard
          titulo="Leads captados"
          subtitulo={`no mês de ${labelMes}`}
          estado={leads}
          render={(v) => v}
        />
        <MetricCard
          titulo="Taxa de conversão"
          subtitulo={`no mês de ${labelMes}`}
          estado={taxa}
          render={(v: number | null) => (v == null ? "—" : `${v.toFixed(1)}%`)}
        />
        <MetricCard
          titulo="Pacientes ativos"
          subtitulo="no total"
          estado={ativos}
          render={(v) => v}
        />
      </div>

      {/* Linha 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          titulo="Faturamento bruto"
          subtitulo="receita ativa atual"
          estado={faturamento}
          render={(v: number) => formatarMoeda(v)}
        />
        <MetricCard
          titulo="Despesas totais"
          subtitulo={`no mês de ${labelMes}`}
          estado={despesas}
          render={(v: number) => formatarMoeda(v)}
        />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lucro líquido
            </CardTitle>
          </CardHeader>
          <CardContent>
            {faturamento.loading || despesas.loading ? (
              <Skeleton className="h-9 w-32" />
            ) : faturamento.erro || despesas.erro || lucroValor == null ? (
              <div className="text-sm text-destructive">Erro ao carregar</div>
            ) : (
              <div
                className={`text-3xl font-semibold ${
                  lucroValor >= 0 ? "text-emerald-500" : "text-destructive"
                }`}
              >
                {formatarMoeda(lucroValor)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">receita - despesas</p>
          </CardContent>
        </Card>
        <MetricCard
          titulo="Novos pacientes"
          subtitulo={`no mês de ${labelMes}`}
          estado={novos}
          render={(v) => v}
        />
      </div>

      {/* Linha 3 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolução do lucro líquido (últimos 3 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          {evolucao.loading ? (
            <Skeleton className="h-64 w-full" />
          ) : evolucao.erro ? (
            <div className="text-sm text-destructive">Erro ao carregar</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dadosEvolucao}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(v) => formatarMoeda(v)}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                    formatter={(v: number) => formatarMoeda(v)}
                  />
                  <Line
                    type="monotone"
                    dataKey="lucro"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Linha 4 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="text-base">Origem do tráfego</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
              Aguardando integração com tracking
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pacientes por plano (todos os tempos)</CardTitle>
          </CardHeader>
          <CardContent>
            {planos.loading ? (
              <Skeleton className="h-64 w-full" />
            ) : planos.erro ? (
              <div className="text-sm text-destructive">Erro ao carregar</div>
            ) : dadosPlanos.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                Sem dados
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosPlanos} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="plano"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      width={110}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                      }}
                    />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;