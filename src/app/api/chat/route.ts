import Anthropic from "@anthropic-ai/sdk";
import { TOOLS, executeTool } from "@/lib/agent-tools";
import { PLANES } from "@/data/planes";
import { HOSPITALES } from "@/data/hospitales";

export const runtime = "nodejs";
export const maxDuration = 30;

const HITS = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (HITS.get(ip) ?? []).filter(t => now - t < WINDOW_MS);
  recent.push(now);
  HITS.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

const SYSTEM = `Eres un asistente de seguros de salud para Ecuador. Hablas español claro, sin jerga.

Tu misión: ayudar al paciente a entender CUÁNTO va a pagar antes de atenderse y QUÉ hospital le conviene.

Flujo:
1. El plan del paciente viene en el contexto. Úsalo.
2. Pregunta su síntoma o motivo de consulta si no lo dio.
3. Usa sugerir_especialidad para inferir la especialidad.
4. Usa comparar_hospitales para mostrar opciones y recomendar la más económica.
5. Si el usuario pide detalle de un hospital específico, usa calcular_copago.

Reglas:
- Nunca inventes precios — siempre usa las herramientas.
- "opciones" del comparador YA está filtrado a la red del plan. Si tiene resultados, ESOS son los hospitales cubiertos.
- Sé breve y cálido. Máximo 3 líneas por turno. No repitas la tabla — la UI ya la muestra.
- Después de comparar_hospitales, NO listes los hospitales en texto: la UI los renderiza. Sólo da un comentario corto: la recomendación y un próximo paso.
- PROHIBIDO usar emojis. Cero emojis. Tono profesional, directo, sin alarmismo.
- No menciones IDs internos (basico/plus/premium ni alcivar/kennedy/metropolitano) — usa nombres legibles.

Planes: ${PLANES.map(p => p.nombre).join(", ")}.
Hospitales: ${HOSPITALES.map(h => `${h.nombre} (${h.ciudad})`).join(", ")}.`;

type ToolEvent = { tool: string; input: unknown; output: unknown };

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "anon";
  if (rateLimited(ip)) return Response.json({ error: "Demasiadas consultas. Espera un minuto." }, { status: 429 });

  const { messages, planId, deducibleConsumido } = await req.json();
  if (!Array.isArray(messages) || messages.length > 30) {
    return Response.json({ error: "Conversación inválida o demasiado larga." }, { status: 400 });
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "ANTHROPIC_API_KEY no configurada" }, { status: 500 });

  const client = new Anthropic({ apiKey });
  const conversation: Anthropic.MessageParam[] = [...messages];
  const contextLine = `[Contexto del paciente: plan=${planId}, deducibleConsumido=${deducibleConsumido ?? 0}. Usa estos valores en las herramientas.]`;
  conversation.unshift({ role: "assistant", content: "Entendido." });
  conversation.unshift({ role: "user", content: contextLine });

  const toolEvents: ToolEvent[] = [];

  for (let i = 0; i < 5; i++) {
    const res = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM,
      tools: TOOLS as unknown as Anthropic.Tool[],
      messages: conversation
    });

    if (res.stop_reason === "tool_use") {
      conversation.push({ role: "assistant", content: res.content });
      const toolResults = res.content
        .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
        .map(b => {
          const output = executeTool(b.name, b.input as Record<string, unknown>);
          toolEvents.push({ tool: b.name, input: b.input, output });
          return {
            type: "tool_result" as const,
            tool_use_id: b.id,
            content: JSON.stringify(output)
          };
        });
      conversation.push({ role: "user", content: toolResults });
      continue;
    }

    const text = res.content.filter(b => b.type === "text").map(b => (b as Anthropic.TextBlock).text).join("\n");
    return Response.json({ reply: text, toolEvents });
  }

  return Response.json({ reply: "No pude completar la consulta. Intenta de nuevo.", toolEvents });
}
