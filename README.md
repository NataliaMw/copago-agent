# Copago — Estimador Agéntico de Copago y Cobertura

Reto #3 del hackIAthon Viamatica. Agente conversacional que ayuda al paciente a entender su beneficio antes de atenderse: recibe un síntoma, sugiere la especialidad, cruza datos con el plan de seguro y le dice cuánto pagará y qué hospital de la red le conviene más económicamente.

---

## Cómo funciona

El paciente conversa en español natural. El agente decide cuándo llamar a las herramientas para no inventar precios:

| Herramienta | Qué hace |
|---|---|
| `sugerir_especialidad` | Mapea síntoma → especialidad médica |
| `comparar_hospitales` | Calcula copago en cada hospital elegible de la red, ordena por más barato |
| `calcular_copago` | Detalla deducible, coaseguro y total para un hospital específico |

La lógica financiera vive en `src/lib/agent-tools.ts` — el LLM **nunca** estima precios solo, siempre llama la tool. Esto evita alucinaciones de cifras, que es lo más peligroso en un caso de uso de seguros.

### Modelo de cálculo

```
deducibleAplicado = min(tarifa, deducibleAnual - deducibleConsumido)
restoTrasDeducible = tarifa - deducibleAplicado
coaseguroPaciente = restoTrasDeducible × coaseguro_plan
copagoTotal = deducibleAplicado + coaseguroPaciente
```

### Datos sintéticos

- **3 planes**: Básico, Plus, Premium (`src/data/planes.ts`)
- **3 hospitales** ecuatorianos: Alcívar, Kennedy, Metropolitano (`src/data/hospitales.ts`)
- **8 especialidades** con tarifas diferenciadas por hospital
- **Reglas de red**: el plan Básico sólo cubre red preferente — el agente lo respeta y avisa al paciente

---

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind
- **Claude Sonnet 4.6** vía `@anthropic-ai/sdk` con **tool use**
- Deploy en **Vercel**

---

## Correr localmente

```bash
pnpm install   # o npm install
cp .env.example .env.local
# pega tu ANTHROPIC_API_KEY
pnpm dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Entregables hackIAthon

- **Agente funcional (público)**: _(URL de Vercel)_
- **Repositorio**: este repo

## Decisiones de diseño

1. **Tool use sobre prompt-only**: confiar en el LLM para sumar deducibles + coaseguro es un error caro. Cálculo determinista en TypeScript, LLM sólo orquesta y comunica.
2. **Selector de plan en UI**: en vez de hacer al paciente declarar su plan en lenguaje natural cada turno, lo seleccionas una vez y el contexto va al sistema.
3. **Bucle de tool calls limitado a 5 iteraciones**: previene loops infinitos si el modelo se confunde.
4. **Mensajes cortos**: el system prompt limita a 4-5 líneas — pacientes confundidos no leen párrafos.

## Qué falta para producción real

- Histórico del paciente (deducible consumido real desde el sistema del seguro)
- Pre-existencias y carencias activas
- Verificación de credenciales del paciente
- Auditoría de cada cálculo (log inmutable)
- Manejo de copagos de emergencia vs. ambulatorio vs. hospitalización
