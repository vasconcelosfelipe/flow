import { NextRequest, NextResponse } from "next/server";

// O middleware corre no Edge Runtime — sem acesso ao Prisma/Node.js nativo.
// Verificamos apenas a presença do cookie de sessão do Better Auth.
// A validação real da sessão (contra o banco) acontece em requireSessao()
// dentro de cada Server Component ou Server Action.

// Em HTTPS, Better Auth usa o prefixo __Secure-
const SESSION_COOKIE_HTTPS = "__Secure-better-auth.session_token";
const SESSION_COOKIE_HTTP = "better-auth.session_token";
const PUBLIC_PATHS = ["/login", "/api/auth", "/aceitar-convite"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // OpenLiteSpeed occasionally forwards duplicate `origin` headers joined with
  // ", " (e.g. "https://example.com, https://example.com"). Next.js passes the
  // raw value to `new URL()` in its server-action CSRF check, which throws an
  // "Invalid URL" error and aborts every server action. Normalise to the first
  // value before the request reaches the server action handler.
  const origin = request.headers.get("origin");
  if (origin && origin.includes(", ")) {
    const fixedHeaders = new Headers(request.headers);
    fixedHeaders.set("origin", origin.split(", ")[0]);
    return NextResponse.next({ request: { headers: fixedHeaders } });
  }

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const hasSession =
    request.cookies.has(SESSION_COOKIE_HTTPS) ||
    request.cookies.has(SESSION_COOKIE_HTTP);

  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|.*\\.png$).*)",
  ],
};
