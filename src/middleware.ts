import { NextResponse, type NextRequest } from "next/server";

function deny(reason: string) {
  return new NextResponse(JSON.stringify({ error: reason }), {
    status: 403,
    headers: { "content-type": "application/json" }
  });
}

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api/")) {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");

    if (!origin || !host) return deny("Solicitud sin origen.");

    let originHost: string;
    try {
      originHost = new URL(origin).host;
    } catch {
      return deny("Origen inválido.");
    }

    if (originHost !== host) return deny("Origen no permitido.");
  }

  const res = NextResponse.next();
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
