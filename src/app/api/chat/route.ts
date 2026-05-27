import Anthropic from "@anthropic-ai/sdk";
import { TOOLS, executeTool } from "@/lib/agent-tools";
import { PLANES } from "@/data/planes";
import { HOSPITALES } from "@/data/hospitales";

export const runtime = "nodejs";
export const maxDuration = 30;

const SYSTEM = `Eres un asistente de seguros de salud para Ecuador. Hablas español claro, sin jerga.

Tu misión: ayudar al paciente a entender CUÁNTO va a pagar antes de atenderse y QUÉ hospital le conviene.

Flujo:
1. Si el paciente no dice su plan, pregúntalo (Básico, Plus, Premium).
2. Pregunta su síntoma o motivo de consulta.
3. Usa sugerir_especialidad para inferir la especialidad.
4. Usa comparar_hospitales para mostrar opciones y recomendar la más económica.
5. Confirma con calcular_copago el detalle del hospital elegido.

Reglas:
- Nunca inventes precios — siempre usa las herramientas.
- Si el plan no cubre la red del hospital, dilo claramente.
- Cierra cada respuesta con un próximo paso concreto.
- Sé breve. Máximo 4-5 líneas por turno salvo que muestres un cálculo.

Planes disponibles: ${PLANES.map(p => `${p.nombre} (id: ${p.id})`).join(", ")}.
Hospitales: ${HOSPITALES.map(h => `${h.nombre} (id: ${h.id}, ${h.ciudad})`).join(", ")}.`;

export async function POST(req: Request) {
  const { messages, planId } = await req.json();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "ANTHROPIC_API_KEY no configurada" }, { status: 500 });

  const client = new Anthropic({ apiKey });
  const conversation: Anthropic.MessageParam[] = [...messages];
  if (planId) {
    conversation.unshift({ role: "user", content: `[Contexto: mi plan es ${planId}]` });
    conversation.unshift({ role: "assistant", content: "Entendido, trabajaré con ese plan." } as Anthropic.MessageParam);
  }

  for (let i = 0; i < 5; i++) {
    const res = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM,
      tools: TOOLS as unknown as Anthropic.Tool[],
      messages: conversation
    });

    if (res.stop_reason === "tool_use") {
      const assistantBlocks = res.content;
      conversation.push({ role: "assistant", content: assistantBlocks });
      const toolResults = assistantBlocks
        .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
        .map(b => ({
          type: "tool_result" as const,
          tool_use_id: b.id,
          content: JSON.stringify(executeTool(b.name, b.input as Record<string, unknown>))
        }));
      conversation.push({ role: "user", content: toolResults });
      continue;
    }

    const text = res.content.filter(b => b.type === "text").map(b => (b as Anthropic.TextBlock).text).join("\n");
    return Response.json({ reply: text });
  }

  return Response.json({ reply: "No pude completar la consulta. Intenta de nuevo." });
}
