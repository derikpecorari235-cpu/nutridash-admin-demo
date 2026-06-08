import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  OPCOES_PLANO,
  OPCOES_MODALIDADE,
  OPCOES_FORMA_PAGAMENTO,
  OPCOES_OBJETIVO,
} from "@/lib/formatarLabel";

interface ModalCadastroPacienteProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  dadosIniciais?: {
    nome?: string;
    whatsapp?: string;
    objetivo?: string;
    leadId?: string;
  };
}

const MODALIDADE_MESES: Record<string, number> = {
  mensal: 1,
  trimestral: 3,
  semestral: 6,
  anual: 12,
};

function criarFormVazio() {
  return {
    nome_completo: "",
    whatsapp: "",
    plano: "",
    modalidade: "",
    forma_pagamento: "",
    valor_real: "",
    is_casal: false,
    data_inicio: format(new Date(), "yyyy-MM-dd"),
    data_fim: "",
    objetivo: "",
  };
}

export default function ModalCadastroPaciente({
  open,
  onClose,
  onSuccess,
  dadosIniciais,
}: ModalCadastroPacienteProps) {
  const [form, setForm] = useState(criarFormVazio());
  const [valorSugerido, setValorSugerido] = useState<number | null>(null);
  const [isSalvando, setIsSalvando] = useState(false);

  const isPersonalizado = form.plano === "personalizado";

  useEffect(() => {
    if (open) {
      const novo = criarFormVazio();
      if (dadosIniciais) {
        novo.nome_completo = dadosIniciais.nome || "";
        novo.whatsapp = dadosIniciais.whatsapp || "";
        novo.objetivo = dadosIniciais.objetivo || "";
      }
      setForm(novo);
      setValorSugerido(null);
    }
  }, [open, dadosIniciais]);

  const fetchValor = useCallback(async () => {
    if (!form.plano || !form.modalidade || !form.forma_pagamento || isPersonalizado) {
      setValorSugerido(null);
      if (isPersonalizado) {
        setForm((prev) => ({ ...prev, valor_real: "" }));
      }
      return;
    }
    const { data } = await supabase
      .from("tabela_precos")
      .select("valor")
      .eq("plano", form.plano)
      .eq("modalidade", form.modalidade)
      .eq("forma_pagamento", form.forma_pagamento)
      .maybeSingle();

    if (data) {
      let valor = Number(data.valor);
      if (form.is_casal) valor = valor * 0.9;
      setValorSugerido(valor);
      setForm((prev) => ({ ...prev, valor_real: valor.toFixed(2) }));
    } else {
      setValorSugerido(null);
    }
  }, [form.plano, form.modalidade, form.forma_pagamento, form.is_casal, isPersonalizado]);

  useEffect(() => {
    fetchValor();
  }, [fetchValor]);

  useEffect(() => {
    if (isPersonalizado) return;
    const meses = MODALIDADE_MESES[form.modalidade];
    if (meses && form.data_inicio) {
      const dataFim = addMonths(parseISO(form.data_inicio), meses);
      setForm((prev) => ({ ...prev, data_fim: format(dataFim, "yyyy-MM-dd") }));
    }
  }, [form.data_inicio, form.modalidade, isPersonalizado]);

  function updateField(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function validar(): string[] {
    const erros: string[] = [];
    if (!form.nome_completo.trim()) erros.push("Nome completo");
    if (!form.whatsapp.trim()) erros.push("WhatsApp");
    if (!form.plano) erros.push("Plano");
    if (!form.modalidade) erros.push("Modalidade");
    if (!form.forma_pagamento) erros.push("Forma de pagamento");
    if (!form.valor_real || Number(form.valor_real) <= 0) erros.push("Valor real");
    if (!form.data_inicio) erros.push("Data de início");
    if (!form.data_fim) erros.push("Data de término");
    return erros;
  }

  async function salvar() {
    const erros = validar();
    if (erros.length > 0) {
      toast.error(`Campos obrigatórios: ${erros.join(", ")}`);
      return;
    }

    setIsSalvando(true);
    const { data: pacienteCriado, error: erroInsert } = await supabase.from("pacientes").insert({
      lead_id: dadosIniciais?.leadId || null,
      nome_completo: form.nome_completo.trim(),
      whatsapp: form.whatsapp.trim(),
      plano: form.plano,
      modalidade: form.modalidade,
      forma_pagamento: form.forma_pagamento,
      valor_real: Number(form.valor_real),
      is_casal: form.is_casal,
      data_inicio: form.data_inicio,
      data_fim: form.data_fim,
      objetivo: form.objetivo || null,
      status: "ativo",
      visto_pelo_admin: false,
    }).select("id").single();

    if (erroInsert) {
      toast.error(`Erro ao cadastrar: ${erroInsert.message}`);
      setIsSalvando(false);
      return;
    }

    if (dadosIniciais?.leadId && pacienteCriado) {
      const { error: erroUpdate } = await supabase
        .from("leads")
        .update({
          status: "convertido",
          paciente_id: pacienteCriado.id,
        })
        .eq("id", dadosIniciais.leadId);

      if (erroUpdate) {
        toast.warning("Paciente criado, mas falhou ao atualizar lead. Confira manualmente.");
        console.error("Erro ao atualizar lead:", erroUpdate);
      }
    }

    setIsSalvando(false);
    toast.success("Paciente cadastrado com sucesso");
    onSuccess?.();
    onClose();
    setForm(criarFormVazio());
    setValorSugerido(null);
  }

  const dataInicioDate = form.data_inicio ? parseISO(form.data_inicio) : undefined;
  const dataFimDate = form.data_fim ? parseISO(form.data_fim) : undefined;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Paciente</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Nome completo *</Label>
            <Input
              autoFocus
              value={form.nome_completo}
              onChange={(e) => updateField("nome_completo", e.target.value)}
              placeholder="Nome completo do paciente"
            />
          </div>

          <div className="space-y-1.5">
            <Label>WhatsApp *</Label>
            <Input
              value={form.whatsapp}
              onChange={(e) => updateField("whatsapp", e.target.value)}
              placeholder="(DDD sem +)"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Plano *</Label>
            <Select value={form.plano} onValueChange={(v) => updateField("plano", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o plano" />
              </SelectTrigger>
              <SelectContent>
                {OPCOES_PLANO.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Modalidade *</Label>
            <Select value={form.modalidade} onValueChange={(v) => updateField("modalidade", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a modalidade" />
              </SelectTrigger>
              <SelectContent>
                {OPCOES_MODALIDADE.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Forma de pagamento *</Label>
            <Select value={form.forma_pagamento} onValueChange={(v) => updateField("forma_pagamento", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {OPCOES_FORMA_PAGAMENTO.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isPersonalizado && (
            <div className="space-y-1.5">
              <Label>Valor sugerido (R$)</Label>
              <Input
                readOnly
                disabled
                value={
                  valorSugerido !== null
                    ? `R$ ${valorSugerido.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : ""
                }
                placeholder="Selecione plano, modalidade e forma de pagamento"
                className="bg-muted/60 text-muted-foreground border-dashed"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Valor real (R$) *</Label>
            <Input
              type="number"
              step="0.01"
              value={form.valor_real}
              onChange={(e) => updateField("valor_real", e.target.value)}
              placeholder={isPersonalizado ? "Digite o valor" : "Valor cobrado"}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="isCasal"
              checked={form.is_casal}
              onCheckedChange={(v) => updateField("is_casal", v === true)}
            />
            <Label htmlFor="isCasal" className="cursor-pointer">
              É casal? (-10%)
            </Label>
          </div>

          <div className="space-y-1.5">
            <Label>Data de início *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataInicioDate ? format(dataInicioDate, "dd/MM/yyyy") : "Selecione"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dataInicioDate}
                  onSelect={(d) =>
                    d && updateField("data_inicio", format(d, "yyyy-MM-dd"))
                  }
                  locale={ptBR}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <Label>Data de término *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dataFimDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataFimDate ? format(dataFimDate, "dd/MM/yyyy") : "Selecione"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dataFimDate}
                  onSelect={(d) =>
                    d && updateField("data_fim", format(d, "yyyy-MM-dd"))
                  }
                  locale={ptBR}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <Label>Objetivo</Label>
            <Select value={form.objetivo} onValueChange={(v) => updateField("objetivo", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {OPCOES_OBJETIVO.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button className="w-full" disabled={isSalvando} onClick={salvar}>
            {isSalvando ? "Salvando..." : "Salvar Paciente"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}