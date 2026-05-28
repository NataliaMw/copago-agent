"use client";

import { useState, useRef, useEffect } from "react";
import { PLANES } from "@/data/planes";

type ToolEvent = { tool: string; input: any; output: any };
type Msg = { role: "user" | "assistant"; content: string; events?: ToolEvent[] };

const SUGERENCIAS = [
  "Me duele el pecho desde ayer",
  "Tengo dolor abdominal fuerte",
  "Quiero un control ginecológico",
  "Me lastimé la rodilla jugando"
];

const TOOL_LABEL: Record<string, string> = {
  sugerir_especialidad: "Identificando especialidad",
  comparar_hospitales: "Comparando hospitales de tu red",
  calcular_copago: "Calculando copago"
};

function HospitalComparison({ event }: { event: ToolEvent }) {
  const opciones = event.output?.opciones ?? [];
  if (!opciones.length) return null;
  const min = opciones[0]?.copagoTotal ?? 0;
  return (
    <div className="space-y-2 mt-3">
      {opciones.map((o: any, i: number) => {
        const isBest = o.copagoTotal === min;
        return (
          <div
            key={i}
            className={`rounded-xl border p-3 transition ${isBest ? "border-accent bg-accent/5" : "border-ink/10 bg-white"}`}
          >
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <div className="font-medium text-sm">{o.hospital}</div>
                <div className="text-xs text-ink/50">{o.ciudad} · red {o.red}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold tabular-nums">${o.copagoTotal.toFixed(2)}</div>
                <div className="text-[10px] text-ink/50 uppercase tracking-wide">tu pago</div>
              </div>
            </div>
            {isBest && (
              <div className="mt-2 text-[11px] text-accent font-medium uppercase tracking-wide">Más conveniente</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CopagoBreakdown({ event }: { event: ToolEvent }) {
  const o = event.output;
  if (!o || o.error || typeof o.copagoTotal !== "number") return null;
  return (
    <div className="rounded-xl border border-ink/10 bg-white p-4 mt-3">
      <div className="text-xs uppercase tracking-wide text-ink/50">Desglose · {o.hospital}</div>
      <div className="mt-3 space-y-1.5 text-sm">
        <Row label="Tarifa del servicio" value={`$${o.tarifa.toFixed(2)}`} />
        <Row label="Aplicado a tu deducible" value={`-$${o.deducibleAplicado.toFixed(2)}`} />
        <Row label={`Coaseguro a tu cargo`} value={`+$${o.coaseguroPaciente.toFixed(2)}`} />
        <div className="border-t border-ink/10 my-2" />
        <Row label="Tu copago" value={`$${o.copagoTotal.toFixed(2)}`} bold />
        <Row label="Cubre el seguro" value={`$${o.cubreSeguro.toFixed(2)}`} muted />
      </div>
    </div>
  );
}

function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={muted ? "text-ink/50" : "text-ink/70"}>{label}</span>
      <span className={`tabular-nums ${bold ? "font-semibold text-base" : ""} ${muted ? "text-ink/50" : ""}`}>{value}</span>
    </div>
  );
}

export default function Page() {
  const [planId, setPlanId] = useState<string>("plus");
  const [deducibleConsumido, setDeducibleConsumido] = useState<number>(0);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hola. Cuéntame qué síntoma tienes o qué necesitas atenderte. Te digo cuánto pagarías y dónde te conviene ir." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }); }, [messages, loading]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || loading) return;
    const next = [...messages, { role: "user" as const, content: t }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setStage("Pensando");
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next.map(m => ({ role: m.role, content: m.content })), planId, deducibleConsumido })
      });
      const data = await r.json();
      const events: ToolEvent[] = data.toolEvents ?? [];
      if (events.length) setStage(TOOL_LABEL[events[events.length - 1].tool] ?? "Procesando");
      setMessages(m => [...m, { role: "assistant", content: data.reply ?? data.error ?? "Sin respuesta.", events }]);
    } catch {
      setMessages(m => [...m, { role: "assistant", content: "Algo falló en la conexión." }]);
    } finally {
      setLoading(false);
      setStage("");
    }
  }

  function descargarResumen() {
    const last = [...messages].reverse().find(m => m.role === "assistant" && m.events?.length);
    const lines: string[] = [
      "RESUMEN DE ESTIMACIÓN DE COPAGO",
      "================================",
      `Fecha: ${new Date().toLocaleString("es-EC")}`,
      `Plan: ${PLANES.find(p => p.id === planId)?.nombre}`,
      `Deducible consumido: $${deducibleConsumido}`,
      "",
      "Conversación:"
    ];
    messages.forEach(m => {
      lines.push(`\n[${m.role === "user" ? "Paciente" : "Asistente"}]`);
      lines.push(m.content);
    });
    if (last?.events) {
      lines.push("\nDatos calculados:");
      lines.push(JSON.stringify(last.events.map(e => e.output), null, 2));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `copago-resumen-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const plan = PLANES.find(p => p.id === planId)!;
  const hayResumen = messages.some(m => m.events?.length);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Copago<span className="text-accent">.</span></h1>
          <p className="text-sm text-ink/60 mt-1">Estima tu copago y el hospital más conveniente antes de atenderte.</p>
        </div>
        {hayResumen && (
          <button onClick={descargarResumen} className="text-xs text-ink/60 hover:text-ink underline underline-offset-4">
            Guardar resumen
          </button>
        )}
      </header>

      <section className="rounded-2xl border border-ink/10 bg-white p-4 mb-4">
        <label className="block text-xs uppercase tracking-wide text-ink/50 mb-2">Tu plan</label>
        <div className="flex flex-wrap gap-2">
          {PLANES.map(p => (
            <button
              key={p.id}
              onClick={() => setPlanId(p.id)}
              className={`px-3 py-1.5 rounded-full text-sm border transition ${planId === p.id ? "bg-ink text-paper border-ink" : "border-ink/15 hover:border-ink/40"}`}
            >
              {p.nombre}
            </button>
          ))}
        </div>
        <div className="mt-3 text-xs text-ink/60 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <span>Prima: <b className="text-ink">${plan.primaMensual}/mes</b></span>
          <span>Deducible: <b className="text-ink">${plan.deducibleAnual}</b></span>
          <span>Coaseguro: <b className="text-ink">{plan.coaseguro * 100}%</b></span>
          <span>Red: <b className="text-ink">{plan.red}</b></span>
        </div>
        {plan.deducibleAnual > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-ink/60 mb-1">
              <span>Deducible consumido este año</span>
              <span className="tabular-nums">${deducibleConsumido} / ${plan.deducibleAnual}</span>
            </div>
            <input
              type="range"
              min={0}
              max={plan.deducibleAnual}
              step={10}
              value={Math.min(deducibleConsumido, plan.deducibleAnual)}
              onChange={e => setDeducibleConsumido(Number(e.target.value))}
              className="w-full accent-accent"
            />
          </div>
        )}
      </section>

      <section ref={scrollRef} className="h-[460px] overflow-y-auto rounded-2xl border border-ink/10 bg-white p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i}>
            <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-ink text-paper" : "bg-ink/5 text-ink"}`}>
                {m.content}
              </div>
            </div>
            {m.events?.map((ev, j) => (
              <div key={j}>
                {ev.tool === "comparar_hospitales" && <HospitalComparison event={ev} />}
                {ev.tool === "calcular_copago" && <CopagoBreakdown event={ev} />}
              </div>
            ))}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 pl-2 text-xs text-ink/50">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            {stage || "Pensando"}…
          </div>
        )}
      </section>

      {messages.length <= 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGERENCIAS.map(s => (
            <button
              key={s}
              onClick={() => send(s)}
              className="text-xs px-3 py-1.5 rounded-full border border-ink/15 hover:border-ink/40 text-ink/70 hover:text-ink transition"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={e => { e.preventDefault(); send(input); }} className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Describe tu síntoma o consulta"
          className="flex-1 rounded-full border border-ink/15 px-4 py-2.5 text-sm focus:outline-none focus:border-ink/50"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-accent text-white px-5 py-2.5 text-sm font-medium disabled:opacity-50"
        >
          Enviar
        </button>
      </form>

      <footer className="mt-8 text-xs text-ink/40">
        Datos sintéticos con fines demostrativos · hackIAthon Viamatica
      </footer>
    </main>
  );
}
