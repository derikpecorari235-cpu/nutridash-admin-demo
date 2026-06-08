import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { OPCOES_CATEGORIAS_DESPESA } from "@/lib/formatarLabel";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type DespesaRow = {
  id: string;
  categoria: string;
  descricao: string | null;
  valor: number;
  data_referencia: string;
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  despesa?: DespesaRow | null;
  onSaved: () => void;
}

function parseBRLToNumber(s: string): number {
  const cleaned = s.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function formatBRLInput(s: string): string {
  const digits = s.replace(/\D/g, "");
  if (!digits) return "";
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const ModalDespesa = ({ open, onOpenChange, despesa, onSaved }: Props) => {
  const editando = !!despesa;
  const [categoria, setCategoria] = useState<string>("");
  const [valorStr, setValorStr] = useState<string>("");
  const [data, setData] = useState<Date | undefined>(new Date());
  const [descricao, setDescricao] = useState<string>("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (open) {
      if (despesa) {
        setCategoria(despesa.categoria);
        setValorStr(
          Number(despesa.valor).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        );
        const [y, m, d] = despesa.data_referencia.split("-").map(Number);
        setData(new Date(y, m - 1, d));
        setDescricao(despesa.descricao ?? "");
      } else {
        setCategoria("");
        setValorStr("");
        setData(new Date());
        setDescricao("");
      }
    }
  }, [open, despesa]);

  const handleSubmit = async () => {
    const valor = parseBRLToNumber(valorStr);
    if (!categoria) return toast.error("Selecione uma categoria");
    if (!valor || valor <= 0) return toast.error("Valor deve ser maior que zero");
    if (!data) return toast.error("Selecione a data de referência");

    setSalvando(true);
    const payload = {
      categoria,
      valor,
      data_referencia: format(data, "yyyy-MM-dd"),
      descricao: descricao.trim() || null,
    };

    const { error } = editando
      ? await supabase.from("despesas").update(payload).eq("id", despesa!.id)
      : await supabase.from("despesas").insert(payload);
    setSalvando(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editando ? "✅ Despesa atualizada" : "✅ Despesa registrada");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar despesa" : "Nova despesa"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Categoria *</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {OPCOES_CATEGORIAS_DESPESA.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Valor (R$) *</Label>
            <Input
              inputMode="numeric"
              placeholder="R$ 0,00"
              value={valorStr}
              onChange={(e) => setValorStr(formatBRLInput(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>Data de referência *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !data && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {data ? format(data, "dd/MM/yyyy") : "Selecione"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={data}
                  onSelect={setData}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Textarea
              maxLength={200}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Detalhes adicionais..."
            />
            <p className="text-xs text-muted-foreground">{descricao.length}/200</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={salvando}>
            {editando ? "Salvar alterações" : "Salvar despesa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ModalDespesa;