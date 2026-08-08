"use client";

import { useState, useTransition } from "react";
import { Check, Plus } from "lucide-react";

import { ResponsiveModal } from "@/components/shared/responsive-modal";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { FORM_ID_CATEGORIA, FormularioCategoria } from "@/features/categorias/formulario-categoria";
import { FORM_ID_CONTATO, FormularioContato } from "@/features/contatos/formulario-contato";
import type { ChaveIcone } from "@/lib/icones";
import { cn } from "@/lib/utils";
import { criarCategoria } from "@/services/categorias/actions";
import type { CategoriaCompleta, FormularioCategoria as DadosCategoria } from "@/services/categorias/dto";
import { criarContato } from "@/services/contatos/actions";
import type { ContatoCompleto, FormularioContato as DadosContato } from "@/services/contatos/dto";
import type { LinhaDreOpcao } from "@/services/linhas-dre/dto";
import type { TipoEmpresa, TipoMovimentacao } from "@/types/dominio";

type OpcaoLista = { value: string; label: string };

type Props =
  | {
      tipo: "categoria";
      aberto: boolean;
      aoMudarAberto: (aberto: boolean) => void;
      value: string;
      onValueChange: (value: string) => void;
      opcoes: OpcaoLista[];
      categorias: CategoriaCompleta[];
      linhas: LinhaDreOpcao[];
      tipoEspaco: TipoEmpresa;
      /** Receita/Despesa do lançamento que abriu este seletor — a categoria
       * nova nasce com o mesmo tipo, em vez de sempre cair em Despesa. */
      tipoPadrao?: TipoMovimentacao;
      aoCriar: (categoria: CategoriaCompleta) => void;
    }
  | {
      tipo: "contato";
      aberto: boolean;
      aoMudarAberto: (aberto: boolean) => void;
      value: string;
      onValueChange: (value: string) => void;
      opcoes: OpcaoLista[];
      aoCriar: (contato: ContatoCompleto) => void;
    };

/**
 * Escolher categoria/fornecedor na revisão de OFX, mas em folha cheia — a
 * lista pequena dentro de um popover não dava espaço nem pra buscar direito.
 * "+ Nova" troca o conteúdo desta mesma folha pro formulário de cadastro
 * completo (mesmo padrão de troca de conteúdo do detalhe de movimentação),
 * nunca abre um segundo modal por cima.
 */
export function SeletorCategoriaContatoModal(props: Props) {
  const { aberto, aoMudarAberto, value, onValueChange, opcoes } = props;
  const [modo, setModo] = useState<"lista" | "criar">("lista");
  const [pending, startTransition] = useTransition();

  function fechar() {
    setModo("lista");
    aoMudarAberto(false);
  }

  function selecionar(v: string) {
    onValueChange(v);
    fechar();
  }

  function salvarCategoria(dados: DadosCategoria) {
    startTransition(async () => {
      const criada = await criarCategoria(dados);
      if (props.tipo !== "categoria") return;
      const linhaNome =
        props.linhas.find((l) => l.id === criada.linhaDreId)?.nome ?? "Sem linha de DRE vinculada";
      const completa: CategoriaCompleta = {
        id: criada.id,
        nome: criada.nome,
        icone: criada.icone as ChaveIcone,
        cor: criada.cor,
        tipo: criada.tipo,
        linhaDreId: criada.linhaDreId,
        linhaDreNome: linhaNome,
        categoriaPaiId: criada.categoriaPaiId,
        quantidadeMovimentacoes: 0,
      };
      props.aoCriar(completa);
      onValueChange(completa.id);
      fechar();
    });
  }

  function salvarContato(dados: DadosContato) {
    startTransition(async () => {
      const criado = await criarContato(dados);
      if (props.tipo !== "contato") return;
      const completo: ContatoCompleto = {
        id: criado.id,
        nome: criado.nome,
        tipo: criado.tipo,
        documento: criado.documento,
        quantidadeMovimentacoes: 0,
      };
      props.aoCriar(completo);
      onValueChange(completo.id);
      fechar();
    });
  }

  const rotuloNovo = props.tipo === "categoria" ? "Nova categoria" : "Novo fornecedor/cliente";

  return (
    <ResponsiveModal
      aberto={aberto}
      aoMudarAberto={(a) => !a && fechar()}
      titulo={
        modo === "criar"
          ? rotuloNovo
          : props.tipo === "categoria"
            ? "Escolher categoria"
            : "Escolher fornecedor/cliente"
      }
      descricao={
        modo === "criar"
          ? "Preencha os dados para cadastrar."
          : "Toque numa opção da lista ou crie uma nova."
      }
      rodape={
        modo === "criar" ? (
          <>
            <Button type="button" variant="outline" className="flex-1" onClick={() => setModo("lista")}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form={props.tipo === "categoria" ? FORM_ID_CATEGORIA : FORM_ID_CONTATO}
              className="flex-1"
              disabled={pending}
            >
              Salvar
            </Button>
          </>
        ) : (
          <Button variant="outline" className="w-full" onClick={fechar}>
            Fechar
          </Button>
        )
      }
    >
      {modo === "lista" ? (
        <div className="flex flex-col gap-3 py-2">
          <Button
            type="button"
            variant="outline"
            className="gap-1.5"
            onClick={() => setModo("criar")}
          >
            <Plus className="size-4" aria-hidden="true" />
            {rotuloNovo}
          </Button>
          <Command className="rounded-xl border border-line">
            <CommandInput placeholder="Buscar…" />
            <CommandList>
              <CommandEmpty>Nada encontrado.</CommandEmpty>
              <CommandGroup>
                {opcoes.map((o) => (
                  <CommandItem key={o.value} value={o.label} onSelect={() => selecionar(o.value)}>
                    <Check
                      className={cn("size-4", value === o.value ? "opacity-100" : "opacity-0")}
                      aria-hidden="true"
                    />
                    <span className="truncate">{o.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      ) : props.tipo === "categoria" ? (
        <FormularioCategoria
          categoria={null}
          categorias={props.categorias}
          linhas={props.linhas}
          tipoEspaco={props.tipoEspaco}
          tipoPadrao={props.tipoPadrao}
          aoSalvar={salvarCategoria}
        />
      ) : (
        <FormularioContato contato={null} aoSalvar={salvarContato} />
      )}
    </ResponsiveModal>
  );
}
