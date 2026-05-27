export type Plan = {
  id: string;
  nombre: string;
  primaMensual: number;
  deducibleAnual: number;
  coaseguro: number;
  topeAnual: number;
  red: "preferente" | "completa";
  carencias: Record<string, number>;
  excluye: string[];
};

export const PLANES: Plan[] = [
  {
    id: "basico",
    nombre: "Salud Básica",
    primaMensual: 38,
    deducibleAnual: 600,
    coaseguro: 0.3,
    topeAnual: 25000,
    red: "preferente",
    carencias: { maternidad: 10, cirugia: 6, oncologia: 12 },
    excluye: ["estetica", "fertilidad"]
  },
  {
    id: "plus",
    nombre: "Salud Plus",
    primaMensual: 72,
    deducibleAnual: 300,
    coaseguro: 0.2,
    topeAnual: 60000,
    red: "completa",
    carencias: { maternidad: 8, cirugia: 3, oncologia: 6 },
    excluye: ["estetica"]
  },
  {
    id: "premium",
    nombre: "Salud Premium",
    primaMensual: 145,
    deducibleAnual: 0,
    coaseguro: 0.1,
    topeAnual: 250000,
    red: "completa",
    carencias: { maternidad: 6, cirugia: 0, oncologia: 3 },
    excluye: []
  }
];
