import { StatusPost } from "./types";

const map: Record<StatusPost, { label: string; className: string }> = {
  pendente_revisao: {
    label: "Pendente",
    className: "bg-warning/15 text-warning border-warning/30",
  },
  aprovado: {
    label: "Aprovado",
    className: "bg-success/15 text-success border-success/30",
  },
  publicado: {
    label: "Publicado",
    className: "bg-primary/20 text-primary border-primary/40",
  },
  descartado: {
    label: "Descartado",
    className: "bg-destructive/15 text-destructive border-destructive/30",
  },
};

export const StatusBadge = ({ status }: { status: StatusPost }) => {
  const { label, className } = map[status];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${className}`}
    >
      {label}
    </span>
  );
};
