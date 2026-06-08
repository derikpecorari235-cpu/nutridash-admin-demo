import { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge"; 
import { Loader2, Camera, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatarLabel, OPCOES_STATUS_PACIENTE, formatarMotivoLembrete } from "@/lib/formatarLabel";
import { format, parseISO } from "date-fns";
import ModalDetalhesPaciente from "@/components/ModalDetalhesPaciente";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DetalheLembrete = {
  paciente_id: string;
  nome: string;
  status: 'enviado' | 'pulado';
  motivo: string | null;
};

type RespostaLembrete = {
  sucesso: boolean;
  total_processado: number;
  total_enviado: number;
  total_pulado: number;
  detalhes: DetalheLembrete[];
};

const Pacientes = () => {
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<RespostaLembrete | null>(null);
  const [resultadoOpen, setResultadoOpen] = useState(false);
  const [arquivarOpen, setArquivarOpen] = useState(false);
  const [arquivando, setArquivando] = useState(false);
  const [pacienteParaArquivar, setPacienteParaArquivar] = useState<any>(null);

  const fetchPacientes = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("pacientes")
      .select("*")
      .eq("arquivado", false)
      .order("criado_em", { ascending: false });
    setPacientes(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPacientes();
  }, [fetchPacientes]);

  function getStatusBadgeStyle(status: string): string {
    const styles: Record<string, string> = {
      ativo: 'bg-green-100 text-green-800 border-green-200',
      pausado: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      inativo: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return styles[status] || '';
  }

  async function atualizarStatus(pacienteId: string, novoStatus: string) {
    const { error } = await supabase
      .from('pacientes')
      .update({ status: novoStatus })
      .eq('id', pacienteId);

    if (error) {
      toast.error(`Erro ao atualizar status: ${error.message}`);
      return;
    }

    setPacientes(prev =>
      prev.map(p => p.id === pacienteId ? { ...p, status: novoStatus } : p)
    );
    toast.success(`Status atualizado para ${formatarLabel(novoStatus)}`);
  }

  function abrirDetalhes(id: string) {
    setSelectedId(id);
    setModalOpen(true);
  }

  function toggleSelecionado(id: string) {
    setSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelecionarTodos() {
    if (selecionados.size === pacientes.length && pacientes.length > 0) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(pacientes.map(p => p.id)));
    }
  }

  const todosSelecionados = pacientes.length > 0 && selecionados.size === pacientes.length;

  async function enviarLembretes() {
    setEnviando(true);
    try {
      const res = await fetch(import.meta.env.VITE_N8N_WEBHOOK_LEMBRETE_FOTOS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paciente_ids: Array.from(selecionados) }),
      });
      if (!res.ok) throw new Error('Erro de rede');
      const data: RespostaLembrete = await res.json();
      if (!data.sucesso) throw new Error('Resposta sem sucesso');

      setConfirmOpen(false);

      if (data.total_pulado === 0) {
        toast.success(`✅ ${data.total_enviado} lembretes enviados com sucesso`, { duration: 4000 });
        setSelecionados(new Set());
      } else {
        setResultado(data);
        setResultadoOpen(true);
      }
    } catch (e) {
      toast.error('❌ Erro ao enviar lembretes. Tente novamente.');
      setConfirmOpen(false);
    } finally {
      setEnviando(false);
    }
  }

  function fecharResultado() {
    setResultadoOpen(false);
    setResultado(null);
    setSelecionados(new Set());
  }

  function abrirArquivar(paciente: any) {
    setPacienteParaArquivar(paciente);
    setArquivarOpen(true);
  }

  async function arquivarPaciente() {
    if (!pacienteParaArquivar) return;
    setArquivando(true);
    const { error } = await supabase
      .from('pacientes')
      .update({ arquivado: true })
      .eq('id', pacienteParaArquivar.id);

    if (error) {
      toast.error(`Erro ao arquivar: ${error.message}`);
      setArquivando(false);
      return;
    }

    setPacientes(prev => prev.filter(p => p.id !== pacienteParaArquivar.id));
    setSelecionados(prev => {
      const next = new Set(prev);
      next.delete(pacienteParaArquivar.id);
      return next;
    });
    setArquivarOpen(false);
    setPacienteParaArquivar(null);
    setArquivando(false);
    toast.success(`${pacienteParaArquivar.nome_completo} arquivado com sucesso`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pacientes</h1>
        <Button
          disabled={selecionados.size === 0}
          onClick={() => setConfirmOpen(true)}
        >
          <Camera />
          {selecionados.size > 0
            ? `Enviar lembrete de fotos (${selecionados.size})`
            : 'Enviar lembrete de fotos'}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : pacientes.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">Nenhum paciente cadastrado.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={todosSelecionados}
                    onCheckedChange={toggleSelecionarTodos}
                    aria-label="Selecionar todos"
                  />
                </TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Modalidade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data início</TableHead>
                <TableHead>Data fim</TableHead>
                <TableHead className="w-[60px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pacientes.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Checkbox
                      checked={selecionados.has(p.id)}
                      onCheckedChange={() => toggleSelecionado(p.id)}
                      aria-label={`Selecionar ${p.nome_completo}`}
                    />
                  </TableCell>
                  <TableCell
                    className="font-medium cursor-pointer hover:underline"
                    onClick={() => abrirDetalhes(p.id)}
                  >
                    {p.nome_completo}
                    {!p.visto_pelo_admin && (
                      <Badge className="ml-2 bg-blue-500/15 text-blue-600 border-blue-500/30" variant="outline">
                        Novo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{formatarLabel(p.plano)}</TableCell>
                  <TableCell>{formatarLabel(p.modalidade)}</TableCell>
                  <TableCell>
                    <Select
                      value={p.status}
                      onValueChange={(novoStatus) => atualizarStatus(p.id, novoStatus)}
                    >
                      <SelectTrigger className={`w-[130px] h-8 text-xs font-medium border ${getStatusBadgeStyle(p.status)}`}>
                        <SelectValue>{formatarLabel(p.status)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {OPCOES_STATUS_PACIENTE.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{p.data_inicio ? format(parseISO(p.data_inicio), "dd/MM/yyyy") : "—"}</TableCell>
                  <TableCell>{p.data_fim ? format(parseISO(p.data_fim), "dd/MM/yyyy") : "—"}</TableCell>
                  <TableCell>
                    <button
                      onClick={() => abrirArquivar(p)}
                      className="text-muted-foreground hover:text-red-600 transition-colors"
                      aria-label={`Arquivar ${p.nome_completo}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ModalDetalhesPaciente
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        pacienteId={selectedId}
        onMarcarComoVisto={fetchPacientes}
      />

      <AlertDialog open={confirmOpen} onOpenChange={(o) => !enviando && setConfirmOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar lembrete de fotos</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a enviar lembrete de fotos de progresso para {selecionados.size} paciente(s). Tem certeza?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={enviando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={enviando}
              onClick={(e) => { e.preventDefault(); enviarLembretes(); }}
            >
              {enviando && <Loader2 className="animate-spin" />}
              Enviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={resultadoOpen} onOpenChange={(o) => { if (!o) fecharResultado(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {resultado && resultado.total_enviado === 0 ? 'Nenhum lembrete enviado' : 'Lembretes processados'}
            </DialogTitle>
            <DialogDescription>
              {resultado ? `${resultado.total_enviado} enviados, ${resultado.total_pulado} pulados` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {resultado?.detalhes.map((d) => (
              <div key={d.paciente_id} className="flex items-start gap-2 p-2 rounded border">
                {d.status === 'enviado' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                )}
                <div className="flex-1">
                  <div className="text-sm font-medium">{d.nome}</div>
                  {d.status === 'pulado' && d.motivo && (
                    <div className="text-xs text-muted-foreground">{formatarMotivoLembrete(d.motivo)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={fecharResultado}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={arquivarOpen} onOpenChange={(o) => !arquivando && setArquivarOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar paciente</AlertDialogTitle>
            <AlertDialogDescription>
              Arquivar {pacienteParaArquivar?.nome_completo}? Ele sai da lista, mas o histórico continua salvo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={arquivando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={arquivando}
              onClick={(e) => { e.preventDefault(); arquivarPaciente(); }}
            >
              {arquivando && <Loader2 className="animate-spin" />}
              Arquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Pacientes;
