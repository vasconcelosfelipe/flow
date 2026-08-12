"use client";

import { useEffect, useState } from "react";

import { PassoConfirmacao } from "@/features/importar/passo-confirmacao";
import { PassoRevisao } from "@/features/importar/passo-revisao";
import { PassoUpload } from "@/features/importar/passo-upload";
import { cn } from "@/lib/utils";
import { confirmarImportacao } from "@/services/importacao/actions";
import type { ParteDivisao, ResultadoConfirmacao, ResumoImportacao } from "@/services/importacao/dto";
import type { CategoriaCompleta } from "@/services/categorias/dto";
import type { ContatoCompleto } from "@/services/contatos/dto";
import type { LinhaDreOpcao } from "@/services/linhas-dre/dto";
import type { TipoEmpresa } from "@/types/dominio";

type OpcaoConta = { id: string; nome: string };
type Passo = "upload" | "revisao" | "confirmacao";

const PASSOS: { chave: Passo; rotulo: string }[] = [
  { chave: "upload", rotulo: "Arquivo" },
  { chave: "revisao", rotulo: "Revisão" },
  { chave: "confirmacao", rotulo: "Concluído" },
];

const CHAVE_STORAGE = "flow:importacao-revisao";

/**
 * A revisão de um extrato pode envolver ir cadastrar uma categoria nova no
 * meio do caminho — sem persistir, voltar da tela de Categorias perderia
 * toda a categorização já feita nas linhas. `sessionStorage` (não
 * localStorage) de propósito: o trabalho é da aba/sessão atual, não algo
 * pra sobreviver semanas — fecha a aba, esvazia sozinho.
 */
function salvarRevisao(resumo: ResumoImportacao | null) {
  try {
    if (!resumo) {
      sessionStorage.removeItem(CHAVE_STORAGE);
      return;
    }
    sessionStorage.setItem(CHAVE_STORAGE, JSON.stringify(resumo));
  } catch {
    // sessionStorage indisponível (aba anônima, quota) — segue sem persistir
  }
}

function carregarRevisao(): ResumoImportacao | null {
  try {
    const bruto = sessionStorage.getItem(CHAVE_STORAGE);
    if (!bruto) return null;
    const dados = JSON.parse(bruto);
    const reviverDatas = (m: ResumoImportacao["pendenciasAbertas"][number]) => ({
      ...m,
      data: m.data ? new Date(m.data) : null,
      dataVencimento: m.dataVencimento ? new Date(m.dataVencimento) : null,
    });
    return {
      ...dados,
      linhas: dados.linhas.map(
        (l: ResumoImportacao["linhas"][number]) => ({
          ...l,
          data: new Date(l.data),
          conciliaCom: l.conciliaCom ? reviverDatas(l.conciliaCom) : null,
        }),
      ),
      pendenciasAbertas: (dados.pendenciasAbertas ?? []).map(reviverDatas),
    };
  } catch {
    return null;
  }
}

/**
 * Orquestra os três passos e guarda a seleção de linhas em memória — nada
 * disto precisa da URL porque a importação não é um estado para compartilhar
 * ou revisitar, é uma tarefa que se conclui numa sentada.
 */
export function WizardImportacao({
  contas,
  categorias: categoriasIniciais = [],
  contatos: contatosIniciais = [],
  linhas = [],
  tipoEspaco,
}: {
  contas: OpcaoConta[];
  categorias?: CategoriaCompleta[];
  contatos?: ContatoCompleto[];
  linhas?: LinhaDreOpcao[];
  tipoEspaco: TipoEmpresa;
}) {
  const [passo, setPasso] = useState<Passo>("upload");
  const [resumo, setResumo] = useState<ResumoImportacao | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoConfirmacao | null>(null);
  const [contaConfirmadaNome, setContaConfirmadaNome] = useState("");
  // Categoria/fornecedor criados no meio da revisão de OFX precisam entrar
  // nessas listas na hora — a revisão é 100% client-side, sem round-trip ao
  // servidor, então `router.refresh()` não repovoa props já espalhadas.
  const [categorias, setCategorias] = useState(categoriasIniciais);
  const [contatos, setContatos] = useState(contatosIniciais);

  // Restaura uma revisão em andamento ao montar — só no cliente, sessionStorage
  // não existe durante a renderização no servidor.
  useEffect(() => {
    const salva = carregarRevisao();
    if (salva) {
      setResumo(salva);
      setPasso("revisao");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persiste a cada mudança — cadastrar uma categoria nova no meio da revisão
  // e voltar não pode perder o que já foi categorizado.
  useEffect(() => {
    salvarRevisao(resumo);
  }, [resumo]);

  function processar(novoResumo: ResumoImportacao) {
    setResumo(novoResumo);
    setPasso("revisao");
  }

  function alternarLinha(id: string) {
    setResumo((atual) =>
      atual
        ? {
            ...atual,
            linhas: atual.linhas.map((l) =>
              l.id === id
                ? { ...l, incluir: !l.incluir, ignorarPermanentemente: false }
                : l,
            ),
          }
        : atual,
    );
  }

  function atualizarLinha(
    id: string,
    ajuste: {
      categoriaId?: string | null;
      contatoId?: string | null;
      origemSugestao?: "ia" | "trigrama" | null;
      descricao?: string;
      ehTransferencia?: boolean;
      contaTransferenciaId?: string | null;
      divisao?: ParteDivisao[] | null;
    },
  ) {
    setResumo((atual) =>
      atual
        ? {
            ...atual,
            linhas: atual.linhas.map((l) => (l.id === id ? { ...l, ...ajuste } : l)),
          }
        : atual,
    );
  }

  function alternarIgnorarPermanentemente(id: string) {
    setResumo((atual) =>
      atual
        ? {
            ...atual,
            linhas: atual.linhas.map((l) => {
              if (l.id !== id) return l;
              const ignorar = !l.ignorarPermanentemente;
              // Marcar pra ignorar sempre também tira do que vai ser
              // importado agora; desmarcar devolve pro estado normal.
              return { ...l, ignorarPermanentemente: ignorar, incluir: !ignorar };
            }),
          }
        : atual,
    );
  }

  async function confirmar() {
    if (!resumo) return;
    setConfirmando(true);
    try {
      const relevantes = resumo.linhas.filter((l) => l.incluir || l.ignorarPermanentemente);
      const r = await confirmarImportacao({
        nomeArquivo: resumo.arquivoNome,
        contaId: resumo.conta.id,
        linhas: relevantes,
      });
      setResultado(r);
      setContaConfirmadaNome(resumo.conta.nome);
      setPasso("confirmacao");
      // Já foi gravado — não é mais "revisão em andamento" pra restaurar.
      setResumo(null);
    } finally {
      setConfirmando(false);
    }
  }

  function reiniciar() {
    setResumo(null);
    setResultado(null);
    setPasso("upload");
  }

  const indiceAtual = PASSOS.findIndex((p) => p.chave === passo);

  return (
    <div>
      <ol className="mb-6 flex items-center gap-2">
        {PASSOS.map((p, indice) => (
          <li key={p.chave} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full text-nano font-semibold",
                indice < indiceAtual && "bg-positive-text text-white",
                indice === indiceAtual && "bg-brand text-white",
                indice > indiceAtual && "bg-muted text-ink-muted",
              )}
            >
              {indice + 1}
            </span>
            <span
              className={cn(
                "text-micro font-medium",
                indice === indiceAtual ? "text-ink" : "text-ink-muted",
              )}
            >
              {p.rotulo}
            </span>
            {indice < PASSOS.length - 1 && (
              <span className="h-px flex-1 bg-line" aria-hidden="true" />
            )}
          </li>
        ))}
      </ol>

      {passo === "upload" && <PassoUpload contas={contas} aoProcessar={processar} />}

      {passo === "revisao" && resumo && (
        <PassoRevisao
          arquivoNome={resumo.arquivoNome}
          contaAtualId={resumo.conta.id}
          contaAtualNome={resumo.conta.nome}
          linhas={resumo.linhas}
          pendenciasAbertas={resumo.pendenciasAbertas}
          contas={contas}
          categorias={categorias}
          contatos={contatos}
          linhasDre={linhas}
          tipoEspaco={tipoEspaco}
          confirmando={confirmando}
          aoAlternarLinha={alternarLinha}
          aoAtualizarLinha={atualizarLinha}
          aoAlternarIgnorarPermanentemente={alternarIgnorarPermanentemente}
          aoCriarCategoria={(categoria) => setCategorias((atual) => [...atual, categoria])}
          aoCriarContato={(contato) => setContatos((atual) => [...atual, contato])}
          aoVoltar={reiniciar}
          aoConfirmar={confirmar}
        />
      )}

      {passo === "confirmacao" && resultado && (
        <PassoConfirmacao
          resultado={resultado}
          contaNome={contaConfirmadaNome}
          aoImportarOutro={reiniciar}
        />
      )}
    </div>
  );
}
