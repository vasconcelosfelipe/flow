import { Container } from "@/components/layout/container";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Fallback de navegação pro grupo `(app)` inteiro — o layout (cabeçalho,
 * navegação inferior) já renderizou na hora; só a área de conteúdo troca
 * pra este esqueleto enquanto a página de destino busca os dados dela. Sem
 * isso, toda navegação parecia travar (tela parada, sem nenhum feedback) até
 * o round-trip do servidor terminar, mesmo quando a busca em si era rápida.
 */
export default function CarregandoApp() {
  return (
    <Container className="space-y-4 pt-5">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-11 w-full rounded-2xl" />
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    </Container>
  );
}
