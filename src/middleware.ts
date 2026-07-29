import { NextRequest, NextResponse } from "next/server";

// O middleware corre no Edge Runtime — sem acesso ao Prisma/Node.js nativo.
// Verificamos apenas a presença do cookie de sessão do Better Auth.
// A validação real da sessão (contra o banco) acontece em requireSessao()
// dentro de cada Server Component ou Server Action.

// Em HTTPS, Better Auth usa o prefixo __Secure-
const SESSION_COOKIE_HTTPS = "__Secure-better-auth.session_token";
const SESSION_COOKIE_HTTP = "better-auth.session_token";
const PUBLIC_PATHS = ["/login", "/api/auth"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
