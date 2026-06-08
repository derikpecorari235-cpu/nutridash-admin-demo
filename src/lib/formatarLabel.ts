const LABELS = {
  basic: 'Basic',
  basic_plus: 'Basic+',
  premium: 'Premium',
  premium_plus: 'Premium+',
  personalizado: 'Personalizado',
  mensal: 'Mensal',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
  pix: 'Pix',
  cartao: 'Cartão',
  emagrecimento: 'Emagrecimento',
  hipertrofia: 'Hipertrofia',
  definicao_muscular: 'Definição muscular',
  saude_qualidade_vida: 'Saúde e qualidade de vida',
  ativo: 'Ativo',
  inativo: 'Inativo',
  pausado: 'Pausado',
  novo: 'Novo',
  em_atendimento: 'Em atendimento',
  agendado: 'Agendado',
  fechado: 'Fechado',
  perdido: 'Perdido',
  convertido: 'Convertido',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  meta_ads: 'Meta Ads',
  direto: 'Direto',
  ferramentas: 'Ferramentas',
  aion: 'Serviços de Tecnologia',
  contador: 'Contador',
  impostos: 'Impostos',
  outros: 'Outros',
} as const;

export function formatarLabel(valor: string | null | undefined): string {
  if (!valor) return '';
  return LABELS[valor as keyof typeof LABELS] ?? valor;
}

export const OPCOES_PLANO = [
  { value: 'basic', label: 'Basic' },
  { value: 'basic_plus', label: 'Basic+' },
  { value: 'premium', label: 'Premium' },
  { value: 'premium_plus', label: 'Premium+' },
  { value: 'personalizado', label: 'Personalizado' },
];

export const OPCOES_MODALIDADE = [
  { value: 'mensal', label: 'Mensal' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral', label: 'Semestral' },
  { value: 'anual', label: 'Anual' },
];

export const OPCOES_FORMA_PAGAMENTO = [
  { value: 'pix', label: 'Pix' },
  { value: 'cartao', label: 'Cartão' },
];

export const OPCOES_OBJETIVO = [
  { value: 'emagrecimento', label: 'Emagrecimento' },
  { value: 'hipertrofia', label: 'Hipertrofia' },
  { value: 'definicao_muscular', label: 'Definição muscular' },
  { value: 'saude_qualidade_vida', label: 'Saúde e qualidade de vida' },
];

export const OPCOES_STATUS_PACIENTE = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'inativo', label: 'Inativo' },
  { value: 'pausado', label: 'Pausado' },
];

export const OPCOES_CATEGORIAS_DESPESA = [
  { value: 'meta_ads', label: 'Meta Ads' },
  { value: 'ferramentas', label: 'Ferramentas' },
  { value: 'aion', label: 'Serviços de Tecnologia' },
  { value: 'contador', label: 'Contador' },
  { value: 'impostos', label: 'Impostos' },
  { value: 'outros', label: 'Outros' },
];

export function formatarMotivoLembrete(motivo: string | null | undefined): string {
  if (!motivo) return '';
  const matchDias = motivo.match(/^lembrete_recente_(.+)_dias$/);
  if (matchDias) return `Lembrete enviado há ${matchDias[1]} dias`;
  if (motivo === 'paciente_inativo') return 'Paciente inativo';
  if (motivo === 'sem_whatsapp') return 'WhatsApp não cadastrado';
  return motivo;
}