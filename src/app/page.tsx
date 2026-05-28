"use client";

import { useState, useRef, useEffect } from "react";
import { PLANES } from "@/data/planes";

type Msg = { role: "user" | "assistant"; content: string };

export default function Page() {
  const [planId, setPlanId] = useState<string>("plus");
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hola. Soy tu asistente de copago. Cuéntame qué síntoma tienes o qué necesitas atenderte y te digo cuánto pagarías y dónde te conviene ir." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }); }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next, planId })
      });
      const data = await r.json();
      setMessages(m => [...m, { role: "assistant", content: data.reply ?? data.error ?? "Sin respuesta." }]);
    } catch {
      setMessages(m => [...m, { role: "assistant", content: "Algo falló en la conexión." }]);
    } finally {
      setLoading(false);
    }
  }

  const plan = PLANES.find(p => p.id === planId)!;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Copago<span className="text-accent">.</span></h1>
        <p className="text-sm text-ink/60 mt-1">Estima tu copago y el hospital más conveniente antes de atenderte.</p>
      </header>

      <section className="rounded-2xl border border-ink/10 bg-white p-4 mb-4">
        <label className="block text-xs uppercase tracking-wide text-ink/50 mb-2">Tu plan actual</label>
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
      </section>

      <section ref={scrollRef} className="h-[420px] overflow-y-auto rounded-2xl border border-ink/10 bg-white p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-ink text-paper" : "bg-ink/5 text-ink"}`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div className="text-xs text-ink/40 pl-2">pensando…</div>}
      </section>

      <form
        onSubmit={e => { e.preventDefault(); send(); }}
        className="mt-3 flex gap-2"
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ej: tengo dolor de pecho desde ayer"
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
