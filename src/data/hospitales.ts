export type Hospital = {
  id: string;
  nombre: string;
  ciudad: string;
  red: "preferente" | "completa";
  tarifas: Record<string, number>;
};

export const HOSPITALES: Hospital[] = [
  {
    id: "alcivar",
    nombre: "Clínica Alcívar",
    ciudad: "Guayaquil",
    red: "preferente",
    tarifas: {
      "medicina-general": 35,
      cardiologia: 80,
      dermatologia: 70,
      ginecologia: 75,
      traumatologia: 90,
      gastroenterologia: 85,
      pediatria: 55,
      urgencias: 120
    }
  },
  {
    id: "kennedy",
    nombre: "Hospital Kennedy",
    ciudad: "Guayaquil",
    red: "completa",
    tarifas: {
      "medicina-general": 50,
      cardiologia: 110,
      dermatologia: 95,
      ginecologia: 100,
      traumatologia: 130,
      gastroenterologia: 115,
      pediatria: 70,
      urgencias: 180
    }
  },
  {
    id: "metropolitano",
    nombre: "Hospital Metropolitano",
    ciudad: "Quito",
    red: "completa",
    tarifas: {
      "medicina-general": 55,
      cardiologia: 125,
      dermatologia: 100,
      ginecologia: 110,
      traumatologia: 140,
      gastroenterologia: 120,
      pediatria: 75,
      urgencias: 200
    }
  }
];

export const SINTOMAS_A_ESPECIALIDAD: Record<string, { especialidad: string; razonamiento: string }> = {
  "dolor de pecho": { especialidad: "cardiologia", razonamiento: "El dolor torácico requiere descartar causas cardíacas." },
  palpitaciones: { especialidad: "cardiologia", razonamiento: "Alteraciones del ritmo cardíaco." },
  "manchas en la piel": { especialidad: "dermatologia", razonamiento: "Lesiones cutáneas a evaluar." },
  acne: { especialidad: "dermatologia", razonamiento: "Trastorno dermatológico común." },
  "dolor abdominal": { especialidad: "gastroenterologia", razonamiento: "Origen digestivo probable." },
  acidez: { especialidad: "gastroenterologia", razonamiento: "Reflujo o gastritis." },
  "dolor de rodilla": { especialidad: "traumatologia", razonamiento: "Lesión articular o muscular." },
  fractura: { especialidad: "traumatologia", razonamiento: "Lesión ósea." },
  embarazo: { especialidad: "ginecologia", razonamiento: "Control prenatal." },
  "dolor menstrual": { especialidad: "ginecologia", razonamiento: "Evaluación ginecológica." },
  fiebre: { especialidad: "medicina-general", razonamiento: "Evaluación inicial recomendada." },
  resfriado: { especialidad: "medicina-general", razonamiento: "Cuadro viral común." },
  "fiebre niño": { especialidad: "pediatria", razonamiento: "Paciente pediátrico." }
};
