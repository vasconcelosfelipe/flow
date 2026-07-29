import { addDays, subDays } from "date-fns";

import { CATEGORIAS_MOCK, CONTAS_MOCK, MOVIMENTACOES_MOCK } from "@/lib/mock/dados";
import type { ResumoImportacao } from "@/services/importacao/dto";

/**
 * Fase 1: um extrato fictício fixo, desenhado para conter os três casos que a
 * revisão precisa saber tratar. Fase 2: o mesmo formato de saída, alimentado
 * pelo parser real de OFX — a tela de revisão não muda.
 */

function categoria(id: string) {
  return CATEGORIAS_MOCK.find((c) => c.id === id) ?? null;
}

function pendenciaPorDescricao(descricao: string) {
  return MOVIMENTACOES_MOCK.find((m) => m.descricao === descricao && m.data === null) ?? null;
}

export function processarArquivo(arquivoNome: string, contaId: string): ResumoImportacao {
  const conta = CONTAS_MOCK.find((c) => c.id === contaId) ?? CONTAS_MOCK[0];
  const hoje = new Date();

  return {
    arquivoNome,
    conta,
    linhas: [
      {
        id: "imp_1",
        descricao: "Venda cartão débito",
        data: subDays(hoje, 1),
        valorCentavos: 218_000,
        tipo: "RECEITA",
        status: "NOVA",
        categoriaSugerida: categoria("cat_1"),
        conciliaCom: null,
        incluir: true,
      },
      {
        id: "imp_2",
        descricao: "Pix recebido — Maria Silva",
        data: subDays(hoje, 1),
        valorCentavos: 95_000,
        tipo: "RECEITA",
        status: "NOVA",
        categoriaSugerida: categoria("cat_1"),
        conciliaCom: null,
        incluir: true,
      },
      {
        id: "imp_3",
        descricao: "Energia elétrica",
        data: subDays(hoje, 2),
        valorCentavos: 92_400,
        tipo: "DESPESA",
        status: "CONCILIAVEL",
        categoriaSugerida: categoria("cat_8"),
        conciliaCom: pendenciaPorDescricao("Energia elétrica"),
        incluir: true,
      },
      {
        id: "imp_4",
        descricao: "Aluguel da loja",
        data: subDays(hoje, 2),
        valorCentavos: 380_000,
        tipo: "DESPESA",
        status: "CONCILIAVEL",
        categoriaSugerida: categoria("cat_6"),
        conciliaCom: pendenciaPorDescricao("Aluguel da loja"),
        incluir: true,
      },
      {
        id: "imp_5",
        descricao: "Venda loja física",
        data: subDays(hoje, 0),
        valorCentavos: 187_500,
        tipo: "RECEITA",
        status: "DUPLICADA",
        categoriaSugerida: categoria("cat_1"),
        conciliaCom: null,
        incluir: false,
      },
      {
        id: "imp_6",
        descricao: "iFood",
        data: subDays(hoje, 3),
        valorCentavos: 8_900,
        tipo: "DESPESA",
        status: "NOVA",
        categoriaSugerida: categoria("cat_12"),
        conciliaCom: null,
        incluir: true,
      },
      {
        id: "imp_7",
        descricao: "Posto Ipiranga",
        data: subDays(hoje, 3),
        valorCentavos: 24_000,
        tipo: "DESPESA",
        status: "NOVA",
        categoriaSugerida: categoria("cat_13"),
        conciliaCom: null,
        incluir: true,
      },
      {
        id: "imp_8",
        descricao: "Fornecedor Moda LTDA",
        data: subDays(hoje, 4),
        valorCentavos: 320_000,
        tipo: "DESPESA",
        status: "CONCILIAVEL",
        categoriaSugerida: categoria("cat_5"),
        conciliaCom: pendenciaPorDescricao("Fornecedor Moda LTDA"),
        incluir: true,
      },
      {
        id: "imp_9",
        descricao: "Anúncios Meta",
        data: subDays(hoje, 4),
        valorCentavos: 67_000,
        tipo: "DESPESA",
        status: "NOVA",
        categoriaSugerida: categoria("cat_9"),
        conciliaCom: null,
        incluir: true,
      },
      {
        id: "imp_10",
        descricao: "TED recebida",
        data: subDays(hoje, 0),
        valorCentavos: 156_000,
        tipo: "RECEITA",
        status: "DUPLICADA",
        categoriaSugerida: null,
        conciliaCom: null,
        incluir: false,
      },
      {
        id: "imp_11",
        descricao: "Tarifa de manutenção",
        data: subDays(hoje, 5),
        valorCentavos: 3_900,
        tipo: "DESPESA",
        status: "NOVA",
        categoriaSugerida: categoria("cat_11"),
        conciliaCom: null,
        incluir: true,
      },
      {
        id: "imp_12",
        descricao: "Nota fiscal 2836",
        data: addDays(hoje, 0),
        valorCentavos: 134_500,
        tipo: "RECEITA",
        status: "CONCILIAVEL",
        categoriaSugerida: categoria("cat_3"),
        conciliaCom: pendenciaPorDescricao("Nota fiscal 2836"),
        incluir: true,
      },
      {
        id: "imp_13",
        descricao: "Assinatura de software",
        data: subDays(hoje, 6),
        valorCentavos: 14_900,
        tipo: "DESPESA",
        status: "NOVA",
        categoriaSugerida: categoria("cat_14"),
        conciliaCom: null,
        incluir: true,
      },
      {
        id: "imp_14",
        descricao: "Compra no débito",
        data: subDays(hoje, 6),
        valorCentavos: 12_400,
        tipo: "DESPESA",
        status: "NOVA",
        categoriaSugerida: null,
        conciliaCom: null,
        incluir: true,
      },
    ],
  };
}
