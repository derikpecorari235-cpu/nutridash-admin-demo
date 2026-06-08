import { Construction } from "lucide-react";

export const UnderConstruction = ({ title }: { title: string }) => (
  <div className="space-y-6">
    <h1 className="text-2xl font-bold">{title}</h1>
    <div className="bg-surface border border-border-soft rounded-lg p-12 flex flex-col items-center text-center">
      <Construction size={56} className="text-primary mb-4" />
      <p className="text-lg font-medium">Em construção</p>
      <p className="text-sm text-muted-foreground mt-2">
        Esta seção será disponibilizada em breve.
      </p>
    </div>
  </div>
);

export default UnderConstruction;
