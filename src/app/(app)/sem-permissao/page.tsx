import { ShieldOff } from "lucide-react";

import { Container } from "@/components/layout/container";
import { EmptyState } from "@/components/shared/empty-state";

/**
 * Destino de quem tenta acessar por URL uma função que o próprio papel
 * (`LEITOR`) não permite — o gate de verdade é sempre no servidor (Server
 * Actions e páginas de escrita pura, como `/importar`, redirecionam pra cá);
 * esta página só explica o motivo em vez de deixar a pessoa num erro cru.
 */
export default function SemPermissaoPage() {
  return (
    <Container className="flex min-h-[60vh] items-center pt-5">
      <EmptyState
        icone={ShieldOff}
        titulo="Sem permissão"
        descricao="Você não tem acesso a esta função. Fale com quem administra sua empresa."
        acao={{ rotulo: "Voltar para o início", href: "/" }}
        className="w-full"
      />
    </Container>
  );
}
