"use client";

import { useState, useRef, useEffect } from "react";
import { PLANES } from "@/data/planes";

type ToolEvent = { tool: string; input: any; output: any };
type Msg = { role: "user" | "assistant"; content: string; events?: ToolEvent[] };

const STORAGE_KEY = "copago.session.v1";

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

const INITIAL_MSG: Msg = {
  role: "assistant",
  content: "Hola. Cuéntame qué síntoma tienes o qué necesitas atenderte. Te digo cuánto pagarías y dónde te conviene ir."
};

function HospitalComparison({ event }: { event: ToolEvent }) {
  const opciones = event.output?.opciones ?? [];
  if (!opciones.length) return null;
  const min = opciones[0]?.copagoTotal ?? 0;
  return (
    <div className="space-y-2 mt-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {opciones.map((o: any, i: number) => {
        const isBest = o.copagoTotal === min;
        return (
          <div
            key={i}
            style={{ animationDelay: `${i * 60}ms` }}
            className={`rounded-xl border p-3 transition animate-in fade-in slide-in-from-bottom-1 fill-mode-both ${isBest ? "border-accent bg-accent/5" : "border-ink/10 bg-white"}`}
          >
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{o.hospital}</div>
                <div className="text-xs text-ink/50">{o.ciudad} · red {o.red}</div>
              </div>
              <div className="text-right shrink-0">
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
    <div className="rounded-xl border border-ink/10 bg-white p-4 mt-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="text-xs uppercase tracking-wide text-ink/50">Desglose · {o.hospital}</div>
      <div className="mt-3 space-y-1.5 text-sm">
        <Row label="Tarifa del servicio" value={`$${o.tarifa.toFixed(2)}`} />
        <Row label="Aplicado a tu deducible" value={`-$${o.deducibleAplicado.toFixed(2)}`} />
        <Row label="Coaseguro a tu cargo" value={`+$${o.coaseguroPaciente.toFixed(2)}`} />
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

function ToolTransparency({ events }: { events: ToolEvent[] }) {
  const [open, setOpen] = useState(false);
  if (!events.length) return null;
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-[11px] text-ink/40 hover:text-ink/70 transition underline underline-offset-4 decoration-dotted"
      >
        {open ? "Ocultar" : "Ver"} detalle técnico ({events.length} {events.length === 1 ? "herramienta" : "herramientas"})
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {events.map((e, i) => (
            <details key={i} className="rounded-lg border border-ink/10 bg-ink/[0.02] p-2 text-[11px]">
              <summary className="cursor-pointer text-ink/70 font-mono">{e.tool}</summary>
              <div className="mt-2 grid gap-2">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-ink/40 mb-0.5">Input</div>
                  <pre className="text-[10px] overflow-x-auto bg-white rounded p-2 border border-ink/5">{JSON.stringify(e.input, null, 2)}</pre>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-ink/40 mb-0.5">Output</div>
                  <pre className="text-[10px] overflow-x-auto bg-white rounded p-2 border border-ink/5">{JSON.stringify(e.output, null, 2)}</pre>
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Page() {
  const [planId, setPlanId] = useState<string>("premium");
  const [deducibleConsumido, setDeducibleConsumido] = useState<number>(0);
  const [messages, setMessages] = useState<Msg[]>([INITIAL_MSG]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.planId) setPlanId(s.planId);
        if (typeof s.deducibleConsumido === "number") setDeducibleConsumido(s.deducibleConsumido);
        if (Array.isArray(s.messages) && s.messages.length) setMessages(s.messages);
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ planId, deducibleConsumido, messages }));
    } catch {}
  }, [planId, deducibleConsumido, messages, hydrated]);

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

  function reset() {
    setMessages([INITIAL_MSG]);
    setDeducibleConsumido(0);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  function descargarResumen() {
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
    const last = [...messages].reverse().find(m => m.events?.length);
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
  const hayConvers = messages.length > 1;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <header className="mb-5 sm:mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Copago<span className="text-accent">.</span></h1>
          <p className="text-xs sm:text-sm text-ink/60 mt-1">Estima tu copago y el hospital más conveniente antes de atenderte.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0 text-xs">
          {hayResumen && (
            <button onClick={descargarResumen} className="text-ink/60 hover:text-ink underline underline-offset-4">
              Guardar
            </button>
          )}
          {hayConvers && (
            <button onClick={reset} className="text-ink/60 hover:text-ink underline underline-offset-4">
              Reiniciar
            </button>
          )}
        </div>
      </header>

      <section className="rounded-2xl border border-ink/10 bg-white p-4 mb-3 sm:mb-4">
        <label className="block text-[10px] sm:text-xs uppercase tracking-wide text-ink/50 mb-2">Tu plan</label>
        <div className="flex flex-wrap gap-2">
          {PLANES.map(p => (
            <button
              key={p.id}
              onClick={() => setPlanId(p.id)}
              className={`px-3 py-1.5 rounded-full text-xs sm:text-sm border transition ${planId === p.id ? "bg-ink text-paper border-ink" : "border-ink/15 hover:border-ink/40"}`}
            >
              {p.nombre}
            </button>
          ))}
        </div>
        <div className="mt-3 text-[11px] sm:text-xs text-ink/60 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <span>Prima: <b className="text-ink">${plan.primaMensual}/mes</b></span>
          <span>Deducible: <b className="text-ink">${plan.deducibleAnual}</b></span>
          <span>Coaseguro: <b className="text-ink">{plan.coaseguro * 100}%</b></span>
          <span>Red: <b className="text-ink">{plan.red}</b></span>
        </div>
        {plan.deducibleAnual > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-[11px] sm:text-xs text-ink/60 mb-1">
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

      <section ref={scrollRef} className="h-[55vh] sm:h-[460px] overflow-y-auto rounded-2xl border border-ink/10 bg-white p-3 sm:p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i}>
            <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3.5 sm:px-4 py-2.5 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-ink text-paper" : "bg-ink/5 text-ink"}`}>
                {m.content}
              </div>
            </div>
            {m.events?.map((ev, j) => (
              <div key={j}>
                {ev.tool === "comparar_hospitales" && <HospitalComparison event={ev} />}
                {ev.tool === "calcular_copago" && <CopagoBreakdown event={ev} />}
              </div>
            ))}
            {m.role === "assistant" && m.events && <ToolTransparency events={m.events} />}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 pl-2 text-xs text-ink/50">
            <span className="inline-flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "120ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "240ms" }} />
            </span>
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
              className="text-[11px] sm:text-xs px-3 py-1.5 rounded-full border border-ink/15 hover:border-ink/40 text-ink/70 hover:text-ink transition"
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
          className="flex-1 min-w-0 rounded-full border border-ink/15 px-4 py-2.5 text-sm focus:outline-none focus:border-ink/50"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-accent text-white px-5 py-2.5 text-sm font-medium disabled:opacity-50 shrink-0"
        >
          Enviar
        </button>
      </form>

      <footer className="mt-6 sm:mt-8 text-[10px] sm:text-xs text-ink/40">
        Datos sintéticos con fines demostrativos · hackIAthon Viamatica
      </footer>
    </main>
  );
}
