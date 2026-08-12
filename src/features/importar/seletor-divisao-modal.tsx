"use client";

import { useEffect, useState } from "react";
import { Link2, Plus, Trash2 } from "lucide-react";

import { GatilhoSelecao } from "@/components/shared/gatilho-selecao";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
import { SeletorListaModal } from "@/components/shared/seletor-lista-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SeletorCategoriaContatoModal } from "@/features/importar/seletor-categoria-contato-modal";
import { formatarMoeda, parseMoeda } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { CategoriaCompleta } from "@/services/categorias/dto";
import type { ContatoCompleto } from "@/services/contatos/dto";
import type { ParteDivisao } from "@/services/importacao/dto";
import type { LinhaDreOpcao } from "@/services/linhas-dre/dto";
import type { MovimentacaoResumo } from "@/services/movimentacoes/dto";
import type { TipoEmpresa, TipoMovimentacao } from "@/types/dominio";

const SEM_CATEGORIA = "nenhuma";
const SEM_FORNECEDOR = "nenhum";

function novaParte(valorCentavos: number): ParteDivisao {
  return {
    id: crypto.randomUUID(),
    valorCentavos,
    descricao: "",
    categoriaId: null,
    contatoId: null,
    fechaPendenciaId: null,
  };
}

/**
 * Editor de divisão de uma linha do OFX: um pagamento único que na verdade
 * cobre várias despesas. Cada parte vira seu próprio lançamento, ou fecha
 * uma pendência existente (dados travados nos da pendência, ver `Parte`).
 * Salvar só libera quando a soma das partes bate exatamente com o valor da
 * linha original.
 */
export function SeletorDivisaoModal({
  aberto,
  aoMudarAberto,
  tipo,
  valorTotalCentavos,
  descricaoOriginal,
  divisaoAtual,
  pendenciasAbertas,
  categorias,
  contatos,
  linhasDre,
  tipoEspaco,
  aoSalvar,
  aoCriarCategoria,
  aoCriarContato,
}: {
  aberto: boolean;
  aoMudarAberto: (aberto: boolean) => void;
  tipo: TipoMovimentacao;
  valorTotalCentavos: number;
  descricaoOriginal: string;
  divisaoAtual: ParteDivisao[] | null;
  pendenciasAbertas: MovimentacaoResumo[];
  categorias: CategoriaCompleta[];
  contatos: ContatoCompleto[];
  linhasDre: LinhaDreOpcao[];
  tipoEspaco: TipoEmpresa;
  aoSalvar: (partes: ParteDivisao[]) => void;
  aoCriarCategoria: (categoria: CategoriaCompleta) => void;
  aoCriarContato: (contato: ContatoCompleto) => void;
}) {
  const [partes, setPartes] = useState<ParteDivisao[]>(
    () =>
      divisaoAtual ?? [
        { ...novaParte(0), descricao: descricaoOriginal },
        novaParte(valorTotalCentavos),
      ],
  );
  // Texto exatamente como a pessoa digitou no campo de valor de cada parte,
  // por id — o campo NÃO deriva o texto de `valorCentavos` a cada tecla
  // (isso reformata o valor a cada dígito e trava a digitação no meio, como
  // qualquer campo de dinheiro controlado direto pelo número já formatado).
  // `parseMoeda` só converte pra centavos em paralelo, pra soma/validação.
  const [valoresTexto, setValoresTexto] = useState<Record<string, string>>(() =>
    Object.fromEntries(partes.map((p) => [p.id, (p.valorCentavos / 100).toFixed(2).replace(".", ",")])),
  );
  const [modalAberto, setModalAberto] = useState<
    | { indice: number; tipo: "categoria" | "contato" | "pendencia" }
    | null
  >(null);

  const categoriasDoTipo = categorias.filter((c) => c.tipo === tipo);
  const pendenciasDoTipo = pendenciasAbertas.filter((p) => p.tipo === tipo);

  // A última parte que não fecha pendência (valor não travado por fora)
  // preenche sozinha com o saldo — só ela é "automática"; as demais são
  // sempre digitadas à mão. Com 2 partes, preencher a primeira já resolve a
  // segunda; com N, N-1 ficam manuais e a última fecha a conta.
  const indiceAuto = (() => {
    for (let i = partes.length - 1; i >= 0; i--) {
      if (!partes[i].fechaPendenciaId) return i;
    }
    return -1;
  })();
  const somaManualCentavos = partes.reduce(
    (soma, p, i) => (i === indiceAuto ? soma : soma + p.valorCentavos),
    0,
  );
  const valorAutoCentavos = indiceAuto === -1 ? 0 : valorTotalCentavos - somaManualCentavos;

  // Mantém o valor computado da parte automática sincronizado no estado —
  // sem isso, quando ela deixar de ser a última (uma nova parte for
  // adicionada depois dela) ela vira manual carregando um valor desatualizado.
  useEffect(() => {
    if (indiceAuto === -1) return;
    const id = partes[indiceAuto].id;
    setPartes((atual) =>
      atual[indiceAuto]?.valorCentavos === valorAutoCentavos
        ? atual
        : atual.map((p, i) => (i === indiceAuto ? { ...p, valorCentavos: valorAutoCentavos } : p)),
    );
    setValoresTexto((atual) => ({
      ...atual,
      [id]: (valorAutoCentavos / 100).toFixed(2).replace(".", ","),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indiceAuto, valorAutoCentavos]);

  const partesEfetivas =
    indiceAuto === -1
      ? partes
      : partes.map((p, i) => (i === indiceAuto ? { ...p, valorCentavos: valorAutoCentavos } : p));

  const somaCentavos = partesEfetivas.reduce((soma, p) => soma + p.valorCentavos, 0);
  const bate = somaCentavos === valorTotalCentavos;
  const todasValidas = partesEfetivas.every((p) => p.valorCentavos > 0 && p.descricao.trim().length > 0);
  const podeSalvar = bate && todasValidas && partes.length >= 2;

  function atualizarParte(indice: number, ajuste: Partial<ParteDivisao>) {
    setPartes((atual) => atual.map((p, i) => (i === indice ? { ...p, ...ajuste } : p)));
  }

  function adicionarParte() {
    setPartes((atual) => [...atual, novaParte(0)]);
  }

  function removerParte(indice: number) {
    setPartes((atual) => atual.filter((_, i) => i !== indice));
  }

  function alternarModo(indice: number) {
    const parte = partes[indice];
    if (parte.fechaPendenciaId) {
      // Volta pra "nova": destrava os campos, mas não some com o que a
      // pessoa já tinha escolhido antes de trocar pra pendência.
      atualizarParte(indice, { fechaPendenciaId: null });
    } else {
      setModalAberto({ indice, tipo: "pendencia" });
    }
  }

  function escolherPendencia(indice: number, pendenciaId: string) {
    const pendencia = pendenciasAbertas.find((p) => p.id === pendenciaId);
    if (!pendencia) return;
    atualizarParte(indice, {
      fechaPendenciaId: pendencia.id,
      valorCentavos: pendencia.valorCentavos,
      descricao: pendencia.descricao,
      categoriaId: pendencia.categoria?.id ?? null,
      contatoId: pendencia.contato?.id ?? null,
    });
    setValoresTexto((atual) => ({
      ...atual,
      [partes[indice].id]: (pendencia.valorCentavos / 100).toFixed(2).replace(".", ","),
    }));
  }

  return (
    <ResponsiveModal
      aberto={aberto}
      aoMudarAberto={aoMudarAberto}
      titulo="Dividir lançamento"
      descricao="Divida este pagamento em várias partes — cada uma vira um lançamento ou fecha uma pendência."
      rodape={
        <>
          <Button type="button" variant="outline" className="flex-1" onClick={() => aoMudarAberto(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="flex-1"
            disabled={!podeSalvar}
            onClick={() => {
              aoSalvar(partesEfetivas);
              aoMudarAberto(false);
            }}
          >
            Salvar
          </Button>
        </>
      }
    >
      <div className="space-y-3 py-2">
        {indiceAuto !== -1 ? (
          <div
            className={cn(
              "flex items-center justify-between rounded-lg px-3 py-2 text-micro font-medium",
              valorAutoCentavos > 0
                ? "bg-positive-wash text-positive-text"
                : "bg-negative-wash text-negative-text",
            )}
          >
            <span>
              {valorAutoCentavos > 0 ? "Última parte preenche sozinha" : "Já passou do valor do lançamento"}
            </span>
            <span>{formatarMoeda(valorAutoCentavos)}</span>
          </div>
        ) : (
          <div
            className={cn(
              "flex items-center justify-between rounded-lg px-3 py-2 text-micro font-medium",
              bate ? "bg-positive-wash text-positive-text" : "bg-negative-wash text-negative-text",
            )}
          >
            <span>Soma das partes</span>
            <span>
              {formatarMoeda(somaCentavos)} de {formatarMoeda(valorTotalCentavos)}
            </span>
          </div>
        )}

        {partes.map((parte, indice) => {
          const categoriaSelecionada = categorias.find((c) => c.id === parte.categoriaId);
          const contatoSelecionado = contatos.find((c) => c.id === parte.contatoId);
          const travadaPendencia = parte.fechaPendenciaId !== null;
          const ehAuto = indice === indiceAuto;
          const travada = travadaPendencia || ehAuto;

          return (
            <div key={parte.id} className="space-y-2 rounded-xl border border-line p-3">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => alternarModo(indice)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-nano font-medium transition-colors",
                    travadaPendencia
                      ? "bg-positive-wash text-positive-text"
                      : "bg-muted text-ink-muted hover:bg-muted/70",
                  )}
                >
                  <Link2 className="size-3" aria-hidden="true" />
                  {travadaPendencia ? "Fecha uma pendência" : "Novo lançamento"}
                </button>
                {partes.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removerParte(indice)}
                    className="grid size-7 place-items-center rounded-md text-ink-muted hover:bg-muted"
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                    <span className="sr-only">Remover parte</span>
                  </button>
                )}
              </div>

              <div>
                <Input
                  inputMode="decimal"
                  placeholder="Valor"
                  disabled={travada}
                  value={valoresTexto[parte.id] ?? ""}
                  onChange={(e) => {
                    const texto = e.target.value;
                    setValoresTexto((atual) => ({ ...atual, [parte.id]: texto }));
                    atualizarParte(indice, { valorCentavos: parseMoeda(texto) ?? 0 });
                  }}
                  className="h-9 text-micro"
                />
                {ehAuto && !travadaPendencia && (
                  <p className="mt-1 text-nano text-ink-muted">Preenchido automaticamente com o saldo</p>
                )}
              </div>
              <Input
                placeholder="Descrição"
                disabled={travadaPendencia}
                value={parte.descricao}
                onChange={(e) => atualizarParte(indice, { descricao: e.target.value })}
                className="h-9 text-micro"
              />

              <div className="grid grid-cols-2 gap-1.5">
                <GatilhoSelecao
                  size="sm"
                  label={categoriaSelecionada?.nome ?? null}
                  placeholder="Sem categoria"
                  disabled={travadaPendencia}
                  onClick={() => setModalAberto({ indice, tipo: "categoria" })}
                />
                <GatilhoSelecao
                  size="sm"
                  label={contatoSelecionado?.nome ?? null}
                  placeholder="Sem fornecedor"
                  disabled={travadaPendencia}
                  onClick={() => setModalAberto({ indice, tipo: "contato" })}
                />
              </div>
            </div>
          );
        })}

        <Button type="button" variant="outline" className="w-full gap-1.5" onClick={adicionarParte}>
          <Plus className="size-4" aria-hidden="true" />
          Adicionar parte
        </Button>
      </div>

      {modalAberto?.tipo === "categoria" && (
        <SeletorCategoriaContatoModal
          tipo="categoria"
          aberto
          aoMudarAberto={(a) => !a && setModalAberto(null)}
          value={partes[modalAberto.indice].categoriaId ?? SEM_CATEGORIA}
          onValueChange={(v) =>
            atualizarParte(modalAberto.indice, { categoriaId: v === SEM_CATEGORIA ? null : v })
          }
          opcoes={[
            { value: SEM_CATEGORIA, label: "Sem categoria" },
            ...categoriasDoTipo.map((c) => ({ value: c.id, label: c.nome })),
          ]}
          categorias={categorias}
          linhas={linhasDre}
          tipoEspaco={tipoEspaco}
          tipoPadrao={tipo}
          aoCriar={aoCriarCategoria}
        />
      )}

      {modalAberto?.tipo === "contato" && (
        <SeletorCategoriaContatoModal
          tipo="contato"
          aberto
          aoMudarAberto={(a) => !a && setModalAberto(null)}
          value={partes[modalAberto.indice].contatoId ?? SEM_FORNECEDOR}
          onValueChange={(v) =>
            atualizarParte(modalAberto.indice, { contatoId: v === SEM_FORNECEDOR ? null : v })
          }
          opcoes={[
            { value: SEM_FORNECEDOR, label: "Sem fornecedor/cliente" },
            ...contatos.map((c) => ({ value: c.id, label: c.nome })),
          ]}
          aoCriar={aoCriarContato}
        />
      )}

      {modalAberto?.tipo === "pendencia" && (
        <SeletorListaModal
          aberto
          aoMudarAberto={(a) => !a && setModalAberto(null)}
          titulo="Qual pendência este pagamento fecha?"
          value=""
          onValueChange={(v) => {
            escolherPendencia(modalAberto.indice, v);
            setModalAberto(null);
          }}
          opcoes={pendenciasDoTipo.map((p) => ({
            value: p.id,
            label: p.descricao,
            description: formatarMoeda(p.valorCentavos),
          }))}
        />
      )}
    </ResponsiveModal>
  );
}
