/**
 * Envio de e-mail transacional. Provedor ainda não escolhido — por ora só
 * loga o conteúdo (visível em `docker compose logs` na VPS), pra dar pra
 * testar o fluxo de convite copiando o link do log. Trocar o corpo desta
 * função pelo provedor real (Resend, SMTP…) quando decidido; a assinatura
 * já é a que o resto do código espera, então nenhum outro arquivo muda.
 */
export async function enviarEmail({
  para,
  assunto,
  html,
}: {
  para: string;
  assunto: string;
  html: string;
}): Promise<void> {
  console.log(
    `[email] (envio ainda não configurado — só log)\nPara: ${para}\nAssunto: ${assunto}\n${html}`,
  );
}
