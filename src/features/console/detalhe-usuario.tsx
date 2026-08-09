"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, useMemo } from "react";
import { Building2, Plus, PowerOff, Search, Trash2, ShieldCheck } from "lucide-react";

import { GatilhoSelecao } from "@/components/shared/gatilho-selecao";
import { SeletorListaModal } from "@/components/shared/seletor-lista-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  alternarUsuarioAtivo,
  atribuirEmpresa,
  atualizarPapel,
  excluirUsuario,
  removerEmpresa,
} from "@/services/console/actions";
import { ROTULO_PAPEL, type PapelMembro } from "@/types/dominio";
import type { EmpresaConsole, UsuarioConsole } from "@/services/console/dto";

const PAPEIS: PapelMembro[] = ["DONO", "ADMIN", "MEMBRO", "LEITOR"];

export function DetalheUsuarioConsole({
  usuario,
  todasEmpresas,
  aoExcluir,
}: {
  usuario: UsuarioConsole;
  todasEmpresas: EmpresaConsole[];
  /** Chamado depois que a conta é apagada de verdade — fecha o sheet. */
  aoExcluir: () => void;
}) {
  const router = useRouter();
  const [membros, setMembros] = useState(usuario.empresas);
  const [ativo, setAtivo] = useState(usuario.ativo);
  const [busca, setBusca] = useState("");
  const [papelNovo, setPapelNovo] = useState<PapelMembro>("MEMBRO");
  const [empresaSelecionada, setEmpresaSelecionada] =
    useState<EmpresaConsole | null>(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [emailDigitado, setEmailDigitado] = useState("");
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // "papelNovo" é o seletor do bloco "Adicionar espaço"; qualquer outro
  // valor é o empresaId da linha de membro cujo papel está sendo trocado.
  const [modalPapelAberto, setModalPapelAberto] = useState<string | "papelNovo" | null>(null);

  function alternarAtiva() {
    startTransition(async () => {
      await alternarUsuarioAtivo(usuario.id);
      setAtivo((a) => !a);
      router.refresh();
    });
  }

  function excluir() {
    setErroExclusao(null);
    startTransition(async () => {
      try {
        await excluirUsuario(usuario.id, emailDigitado);
        aoExcluir();
      } catch (e) {
        setErroExclusao(e instanceof Error ? e.message : "Não deu pra excluir.");
      }
    });
  }

  const idsVinculados = new Set(membros.map((m) => m.empresaId));

  const empresasFiltradas = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    return todasEmpresas.filter(
      (e) =>
        !idsVinculados.has(e.id) &&
        (e.nome.toLowerCase().includes(termo) ||
          e.cnpj?.replace(/\D/g, "").includes(termo)),
    );
  }, [busca, todasEmpresas, membros]);

  function handleAtribuir() {
    if (!empresaSelecionada) return;
    const empresa = empresaSelecionada;
    const papel = papelNovo;

    startTransition(async () => {
      await atribuirEmpresa(usuario.id, empresa.id, papel);
      setMembros((prev) => [
        ...prev,
        { empresaId: empresa.id, empresaNome: empresa.nome, papel },
      ]);
      setBusca("");
      setEmpresaSelecionada(null);
      setPapelNovo("MEMBRO");
    });
  }

  function handleRemover(empresaId: string) {
    startTransition(async () => {
      await removerEmpresa(usuario.id, empresaId);
      setMembros((prev) => prev.filter((m) => m.empresaId !== empresaId));
    });
  }

  function handlePapel(empresaId: string, papel: PapelMembro) {
    startTransition(async () => {
      await atualizarPapel(usuario.id, empresaId, papel);
      setMembros((prev) =>
        prev.map((m) => (m.empresaId === empresaId ? { ...m, papel } : m)),
      );
    });
  }

  return (
    <div className="space-y-5 py-2 pb-6">
      {/* Cabeçalho do usuário */}
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-sm font-semibold text-brand">
          {usuario.nome
            .split(" ")
            .slice(0, 2)
            .map((p) => p[0])
            .join("")
            .toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-ink">{usuario.nome}</p>
          <p className="truncate text-micro text-ink-muted">{usuario.email}</p>
          {usuario.adminPlataforma && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-nano font-medium text-brand">
              <ShieldCheck className="size-3" />
              Super admin
            </span>
          )}
        </div>
      </div>

      {/* Espaços vinculados */}
      <div className="space-y-2">
        <p className="text-nano font-medium tracking-wide text-ink-muted uppercase">
          Espaços vinculados
        </p>

        {membros.length === 0 ? (
          <p className="text-micro text-ink-muted">Nenhum espaço vinculado.</p>
        ) : (
          <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {membros.map((m) => (
              <div key={m.empresaId} className="flex items-center gap-3 px-4 py-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-wash text-brand">
                  <Building2 className="size-4" />
                </span>

                <span className="flex-1 min-w-0 truncate text-corpo text-ink">
                  {m.empresaNome}
                </span>

                <GatilhoSelecao
                  size="sm"
                  label={ROTULO_PAPEL[m.papel]}
                  placeholder="Escolher papel"
                  className="w-32"
                  disabled={pending}
                  onClick={() => setModalPapelAberto(m.empresaId)}
                />

                <button
                  onClick={() => handleRemover(m.empresaId)}
                  disabled={pending}
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-negative/10 hover:text-negative-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-40"
                  aria-label={`Remover acesso a ${m.empresaNome}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Adicionar espaço */}
      <div className="space-y-2">
        <p className="text-nano font-medium tracking-wide text-ink-muted uppercase">
          Adicionar espaço
        </p>

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" />
          <Input
            placeholder="Buscar espaço por nome ou CNPJ…"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setEmpresaSelecionada(null);
            }}
            className="pl-9"
          />
        </div>

        {/* Resultados da busca */}
        {busca.trim() && (
          <div className="max-h-48 overflow-y-auto rounded-2xl border border-line bg-surface shadow-card">
            {empresasFiltradas.length === 0 ? (
              <p className="px-4 py-3 text-micro text-ink-muted">
                Nenhum espaço encontrado.
              </p>
            ) : (
              empresasFiltradas.map((e) => (
                <button
                  key={e.id}
                  onClick={() => {
                    setEmpresaSelecionada(e);
                    setBusca(e.nome);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
                >
                  <Building2 className="size-4 shrink-0 text-ink-muted" />
                  <span className="flex-1 min-w-0">
                    <span className="block truncate text-corpo text-ink">
                      {e.nome}
                    </span>
                    {e.cnpj && (
                      <span className="text-nano text-ink-muted">{e.cnpj}</span>
                    )}
                  </span>
                </button>
              ))
            )}
          </div>
        )}

        {/* Papel + botão — só aparecem quando um espaço está selecionado */}
        {empresaSelecionada && (
          <div className="flex gap-2">
            <GatilhoSelecao
              label={ROTULO_PAPEL[papelNovo]}
              placeholder="Escolher papel"
              className="h-10 flex-1"
              onClick={() => setModalPapelAberto("papelNovo")}
            />

            <Button
              onClick={handleAtribuir}
              disabled={pending}
              className="gap-1.5"
            >
              <Plus className="size-4" />
              Adicionar
            </Button>
          </div>
        )}
      </div>

      {/* Ativo/Inativo */}
      <div className="rounded-xl border border-line p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-micro font-medium text-ink">
              {ativo ? "Usuário ativo" : "Usuário inativo"}
            </p>
            <p className="text-nano text-ink-muted">
              {ativo
                ? "Inativar impede novos acessos sem apagar a conta."
                : "Reative para liberar o acesso novamente."}
            </p>
          </div>
          <Button
            type="button"
            variant={ativo ? "destructive" : "outline"}
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={alternarAtiva}
            disabled={pending}
          >
            <PowerOff className="size-3.5" aria-hidden="true" />
            {ativo ? "Inativar" : "Reativar"}
          </Button>
        </div>
      </div>

      {/* Excluir conta */}
      <div className="rounded-xl border border-negative/30 bg-negative/5 p-3">
        {confirmandoExclusao ? (
          <div className="space-y-3">
            <p className="text-micro text-ink">
              Isso vai apagar a conta de <strong>{usuario.nome}</strong> de vez: login e acesso a
              todos os espaços vinculados. Não apaga movimentações nem dados dos espaços. Não
              pode ser desfeito.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="confirmacao-email">
                Digite <strong>{usuario.email}</strong> para confirmar
              </Label>
              <Input
                id="confirmacao-email"
                value={emailDigitado}
                onChange={(e) => setEmailDigitado(e.target.value)}
                className="h-11"
                autoComplete="off"
              />
            </div>
            {erroExclusao && <p className="text-nano text-negative-text">{erroExclusao}</p>}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  setConfirmandoExclusao(false);
                  setEmailDigitado("");
                  setErroExclusao(null);
                }}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                className="flex-1 border-transparent bg-negative text-white hover:bg-negative/90"
                onClick={excluir}
                disabled={pending || emailDigitado.trim() !== usuario.email}
              >
                {pending ? "Excluindo…" : "Excluir definitivamente"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-micro font-medium text-ink">Excluir usuário</p>
              <p className="text-nano text-ink-muted">Apaga a conta. Não pode ser desfeito.</p>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="shrink-0 gap-1.5"
              onClick={() => setConfirmandoExclusao(true)}
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              Excluir
            </Button>
          </div>
        )}
      </div>

      {modalPapelAberto && (
        <SeletorListaModal
          aberto
          aoMudarAberto={(a) => !a && setModalPapelAberto(null)}
          titulo="Papel"
          value={modalPapelAberto === "papelNovo" ? papelNovo : (membros.find((m) => m.empresaId === modalPapelAberto)?.papel ?? "MEMBRO")}
          onValueChange={(v) => {
            if (modalPapelAberto === "papelNovo") setPapelNovo(v as PapelMembro);
            else handlePapel(modalPapelAberto, v as PapelMembro);
          }}
          opcoes={PAPEIS.map((p) => ({ value: p, label: ROTULO_PAPEL[p] }))}
          buscavel={false}
        />
      )}
    </div>
  );
}
