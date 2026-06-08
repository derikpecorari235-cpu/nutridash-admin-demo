export const formatarMoeda = (valor: number | null | undefined): string =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor || 0);

export const formatarMes = (data: Date): string =>
  data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

export const nomeMesCurto = (data: Date): string => {
  const s = data.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  return s.charAt(0).toUpperCase() + s.slice(1);
};