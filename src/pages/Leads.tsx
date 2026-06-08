import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, ArrowRightToLine, Loader2 } from "lucide-react";
import ModalCadastroPaciente from "@/components/ModalCadastroPaciente";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { formatarLabel } from "@/lib/formatarLabel";
import { format, parseISO } from "date-fns";

const Leads = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dadosIniciais, setDadosIniciais] = useState<any>(undefined);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("leads")
      .select("*")
      .neq("status", "convertido")
      .order("criado_em", { ascending: false });
    setLeads(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  function abrirCadastroManual() {
    setDadosIniciais(undefined);
    setModalOpen(true);
  }

  function converterLead(lead: any) {
    setDadosIniciais({
      nome: lead.nome,
      whatsapp: lead.whatsapp || "",
      objetivo: lead.objetivo,
      leadId: lead.id,
    });
    setModalOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leads</h1>
        <Button onClick={abrirCadastroManual}>
          <UserPlus className="mr-2 h-4 w-4" />
          Cadastrar Paciente Manualmente
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : leads.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">Nenhum lead encontrado.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Objetivo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.nome || "—"}</TableCell>
                  <TableCell>{lead.whatsapp || "—"}</TableCell>
                  <TableCell>{formatarLabel(lead.objetivo) || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{formatarLabel(lead.status)}</Badge>
                  </TableCell>
                  <TableCell>{formatarLabel(lead.canal_entrada) || "—"}</TableCell>
                  <TableCell>
                    {lead.criado_em ? format(parseISO(lead.criado_em), "dd/MM/yyyy") : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => converterLead(lead)}
                          >
                            <ArrowRightToLine className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Converter em paciente</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ModalCadastroPaciente
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchLeads}
        dadosIniciais={dadosIniciais}
      />
    </div>
  );
};

export default Leads;
