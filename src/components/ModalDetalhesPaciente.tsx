import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatarLabel } from "@/lib/formatarLabel";
import { Pencil, Loader2 } from "lucide-react";

interface ModalDetalhesPacienteProps {
  open: boolean;
  onClose: () => void;
  pacienteId: string | null;
  onMarcarComoVisto?: () => void;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return format(parseISO(d), "dd/MM/yyyy");
}

function formatCurrency(v: number | null) {
  if (v == null) return "—";
  return `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value || "—"}</span>
    </div>
  );
}

export default function ModalDetalhesPaciente({
  open,
  onClose,
  pacienteId,
  onMarcarComoVisto,
}: ModalDetalhesPacienteProps) {
  const [paciente, setPaciente] = useState<any>(null);
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [editandoDataFim, setEditandoDataFim] = useState(false);
  const [novaDataFim, setNovaDataFim] = useState<Date | undefined>(undefined);
  const [salvandoDataFim, setSalvandoDataFim] = useState(false);
  const [popoverAberto, setPopoverAberto] = useState(false);

  useEffect(() => {
    if (!open || !pacienteId) return;

    async function carregar() {
      setLoading(true);
      setPaciente(null);
      setLead(null);

      const { data: p } = await supabase
        .from("pacientes")
        .select("*")
        .eq("id", pacienteId)
        .maybeSingle();

      if (!p) {
        toast.error("Paciente não encontrado");
        onClose();
        return;
      }

      setPaciente(p);

      if (p.lead_id) {
        const { data: l } = await supabase
          .from("leads")
          .select("nome, canal_entrada, criado_em")
          .eq("id", p.lead_id)
          .maybeSingle();
        setLead(l);
      }

      if (p.visto_pelo_admin === false) {
        await supabase
          .from("pacientes")
          .update({ visto_pelo_admin: true })
          .eq("id", pacienteId);
        onMarcarComoVisto?.();
      }

      setLoading(false);
    }

    carregar();
  }, [open, pacienteId]);

  const diasVencimento = paciente?.data_fim
    ? differenceInDays(parseISO(paciente.data_fim), new Date())
    : null;

  function renderVencimento() {
    if (diasVencimento == null) return "—";
    if (diasVencimento > 0) return `${diasVencimento} dias até o vencimento`;
    if (diasVencimento === 0) return "Vence hoje";
    return (
      <span className="text-destructive font-semibold">
        Vencido há {Math.abs(diasVencimento)} dias
      </span>
    );
  }

  function statusColor(s: string) {
    if (s === "ativo") return "bg-green-500/15 text-green-600 border-green-500/30";
    if (s === "pausado") return "bg-yellow-500/15 text-yellow-600 border-yellow-500/30";
    return "bg-muted text-muted-foreground";
  }

  useEffect(() => {
    if (paciente?.data_fim) {
      setNovaDataFim(parseISO(paciente.data_fim));
    } else {
      setNovaDataFim(undefined);
    }
    setEditandoDataFim(false);
    setPopoverAberto(false);
  }, [paciente]);

  async function salvarDataFim() {
    if (!pacienteId || !novaDataFim) return;
    setSalvandoDataFim(true);
    const dataStr = format(novaDataFim, "yyyy-MM-dd");
    const { error } = await supabase
      .from("pacientes")
      .update({ data_fim: dataStr })
      .eq("id", pacienteId);

    if (error) {
      toast.error(`Erro ao atualizar data: ${error.message}`);
      setSalvandoDataFim(false);
      return;
    }

    setPaciente((prev: any) => prev ? { ...prev, data_fim: dataStr } : prev);
    setPopoverAberto(false);
    setEditandoDataFim(false);
    setSalvandoDataFim(false);
    toast.success("Data de término atualizada");
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{paciente?.nome_completo || "Detalhes do Paciente"}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4 mt-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : paciente ? (
          <div className="space-y-4 mt-2">
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold">Dados Pessoais</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <InfoRow label="Nome completo" value={paciente.nome_completo} />
                <InfoRow label="WhatsApp" value={paciente.whatsapp} />
                <InfoRow label="Objetivo" value={formatarLabel(paciente.objetivo)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold">Plano</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <InfoRow label="Plano" value={formatarLabel(paciente.plano)} />
                <InfoRow label="Modalidade" value={formatarLabel(paciente.modalidade)} />
                <InfoRow label="Forma de pagamento" value={formatarLabel(paciente.forma_pagamento)} />
                <InfoRow label="Valor" value={formatCurrency(paciente.valor_real)} />
                <InfoRow label="É casal?" value={paciente.is_casal ? "Sim" : "Não"} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold">Período</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <InfoRow label="Data de início" value={formatDate(paciente.data_inicio)} />
                <div className="flex justify-between items-start py-1.5">
                  <span className="text-sm text-muted-foreground">Data de término</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{formatDate(paciente.data_fim)}</span>
                    <Popover open={popoverAberto} onOpenChange={setPopoverAberto}>
                      <PopoverTrigger asChild>
                        <button
                          className="text-muted-foreground hover:text-primary transition-colors"
                          aria-label="Editar data de término"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <div className="p-3 pointer-events-auto">
                          <Calendar
                            mode="single"
                            selected={novaDataFim}
                            onSelect={setNovaDataFim}
                            locale={ptBR}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                          <div className="flex justify-end gap-2 pt-3 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPopoverAberto(false)}
                            >
                              Cancelar
                            </Button>
                            <Button
                              size="sm"
                              onClick={salvarDataFim}
                              disabled={salvandoDataFim || !novaDataFim}
                            >
                              {salvandoDataFim && <Loader2 className="animate-spin h-3 w-3 mr-1" />}
                              Salvar
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <InfoRow label="Vencimento" value={renderVencimento()} />
              </CardContent>
            </Card>

            {paciente.lead_id && lead && (
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold">Origem</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <InfoRow label="Lead origem" value={lead.nome} />
                  <InfoRow label="Canal de entrada" value={formatarLabel(lead.canal_entrada)} />
                  <InfoRow label="Convertido em" value={formatDate(paciente.criado_em)} />
                  <InfoRow label="Lead criado em" value={formatDate(lead.criado_em)} />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold">Status</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <InfoRow
                  label="Status"
                  value={
                    <Badge variant="outline" className={statusColor(paciente.status)}>
                      {formatarLabel(paciente.status)}
                    </Badge>
                  }
                />
                <InfoRow label="Cadastrado em" value={formatDate(paciente.criado_em)} />
              </CardContent>
            </Card>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}