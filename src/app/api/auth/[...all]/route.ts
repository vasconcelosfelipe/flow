import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// Nunca gerar versão estática — sempre dinâmico (precisa de banco e cookies)
export const dynamic = "force-dynamic";

export const { GET, POST } = toNextJsHandler(auth);
