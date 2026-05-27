import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Copago — estima tu copago antes de atenderte",
  description: "Agente conversacional que estima tu copago y te recomienda el hospital más conveniente.",
  authors: [{ name: "Natalia Mawyin" }]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
