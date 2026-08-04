/** Nome do cookie que guarda a empresa ativa — lido em `requireSessao()`
 * (`src/lib/sessao.ts`) e gravado por `selecionarEmpresa`
 * (`src/services/empresas/actions.ts`). Fica num módulo à parte porque um
 * arquivo `"use server"` só pode exportar funções async — uma constante
 * simples ali quebra o bundle quando importado por um Client Component. */
export const COOKIE_EMPRESA_ATIVA = "empresa-ativa";
