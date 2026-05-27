import { PLANES, type Plan } from "@/data/planes";
import { HOSPITALES, SINTOMAS_A_ESPECIALIDAD } from "@/data/hospitales";

export const TOOLS = [
  {
    name: "sugerir_especialidad",
    description: "Dado un síntoma del paciente, sugiere la especialidad médica más apropiada.",
    input_schema: {
      type: "object",
      properties: { sintoma: { type: "string", description: "Síntoma descrito por el paciente" } },
      required: ["sintoma"]
    }
  },
  {
    name: "calcular_copago",
    description: "Calcula el copago estimado del paciente en un hospital específico para una especialidad, según su plan.",
    input_schema: {
      type: "object",
      properties: {
        planId: { type: "string", enum: ["basico", "plus", "premium"] },
        hospitalId: { type: "string", enum: ["alcivar", "kennedy", "metropolitano"] },
        especialidad: { type: "string" },
        deducibleConsumido: { type: "number", description: "Cuánto del deducible anual ya consumió", default: 0 }
      },
      required: ["planId", "hospitalId", "especialidad"]
    }
  },
  {
    name: "comparar_hospitales",
    description: "Compara el copago en todos los hospitales de la red del plan para una especialidad. Devuelve el más conveniente.",
    input_schema: {
      type: "object",
      properties: {
        planId: { type: "string", enum: ["basico", "plus", "premium"] },
        especialidad: { type: "string" },
        deducibleConsumido: { type: "number", default: 0 }
      },
      required: ["planId", "especialidad"]
    }
  }
] as const;

function calcCopago(plan: Plan, tarifa: number, deducibleConsumido: number) {
  const deducibleRestante = Math.max(0, plan.deducibleAnual - deducibleConsumido);
  const aplicaDeducible = Math.min(deducibleRestante, tarifa);
  const restoTrasDeducible = tarifa - aplicaDeducible;
  const coaseguroPaciente = restoTrasDeducible * plan.coaseguro;
  const copago = aplicaDeducible + coaseguroPaciente;
  return {
    tarifa,
    deducibleAplicado: Number(aplicaDeducible.toFixed(2)),
    coaseguroPaciente: Number(coaseguroPaciente.toFixed(2)),
    copagoTotal: Number(copago.toFixed(2)),
    cubreSeguro: Number((tarifa - copago).toFixed(2))
  };
}

export function executeTool(name: string, input: Record<string, unknown>): unknown {
  if (name === "sugerir_especialidad") {
    const sintoma = String(input.sintoma ?? "").toLowerCase();
    const match = Object.entries(SINTOMAS_A_ESPECIALIDAD).find(([k]) => sintoma.includes(k));
    if (match) return { especialidad: match[1].especialidad, razonamiento: match[1].razonamiento };
    return { especialidad: "medicina-general", razonamiento: "Sin coincidencia clara — comenzar con medicina general." };
  }

  if (name === "calcular_copago") {
    const plan = PLANES.find(p => p.id === input.planId);
    const hospital = HOSPITALES.find(h => h.id === input.hospitalId);
    if (!plan || !hospital) return { error: "plan u hospital no encontrado" };
    const tarifa = hospital.tarifas[String(input.especialidad)];
    if (!tarifa) return { error: `especialidad ${input.especialidad} no disponible en ${hospital.nombre}` };
    if (hospital.red === "completa" && plan.red === "preferente") {
      return { error: `${hospital.nombre} no está en la red del plan ${plan.nombre}. Sólo cubre red preferente.` };
    }
    return {
      hospital: hospital.nombre,
      ciudad: hospital.ciudad,
      plan: plan.nombre,
      especialidad: input.especialidad,
      ...calcCopago(plan, tarifa, Number(input.deducibleConsumido ?? 0))
    };
  }

  if (name === "comparar_hospitales") {
    const plan = PLANES.find(p => p.id === input.planId);
    if (!plan) return { error: "plan no encontrado" };
    const esp = String(input.especialidad);
    const elegibles = HOSPITALES.filter(h => plan.red === "completa" || h.red === "preferente");
    const opciones = elegibles
      .filter(h => h.tarifas[esp])
      .map(h => ({
        hospital: h.nombre,
        ciudad: h.ciudad,
        red: h.red,
        ...calcCopago(plan, h.tarifas[esp], Number(input.deducibleConsumido ?? 0))
      }))
      .sort((a, b) => a.copagoTotal - b.copagoTotal);
    return { opciones, recomendado: opciones[0]?.hospital ?? null };
  }

  return { error: `tool desconocida: ${name}` };
}
