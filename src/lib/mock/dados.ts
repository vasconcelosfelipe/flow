import { addDays, startOfMonth, subDays, subMonths } from "date-fns";

import type {
  CategoriaResumo,
  ContaResumo,
  MovimentacaoResumo,
} from "@/services/movimentacoes/dto";
import type { StatusMovimentacao, TipoContato, TipoMovimentacao } from "@/types/dominio";

/**
 * Gerador determinístico de movimentações fictícias.
 *
 * Determinístico de propósito: com dados aleatórios a cada render, servidor e
 * cliente divergem e a tela pisca. Aqui a mesma semente sempre produz o mesmo
 * extrato, o que também deixa as telas comparáveis entre uma revisão e outra.
 */

function geradorPseudoAleatorio(semente: number) {
  let estado = semente;
  return () => {
    estado = (estado * 1664525 + 1013904223) % 4294967296;
    return estado / 4294967296;
  };
}

export const CONTAS_MOCK: ContaResumo[] = [
  { id: "cta_1", nome: "Conta Corrente", cor: "#2563EB", tipo: "CORRENTE" },
  { id: "cta_2", nome: "Conta PJ Digital", cor: "#7C3AED", tipo: "CORRENTE" },
  { id: "cta_3", nome: "Caixa da loja", cor: "#0EA5E9", tipo: "CAIXA" },
];

/**
 * Os ids seguem o mesmo padrão `ctt_${nome}` usado ao gerar os contatos
 * dentro de `MOVIMENTACOES_MOCK` — é o que faz a contagem de uso em Contatos
 * bater com o extrato sem precisar de uma junção de verdade (essa vem só na
 * Fase 2, com chave estrangeira).
 */
export const CONTATOS_MOCK: { id: string; nome: string; tipo: TipoContato; documento: string | null }[] = [
  { id: "ctt_Maria Silva", nome: "Maria Silva", tipo: "CLIENTE", documento: null },
  { id: "ctt_Núcleo Digital", nome: "Núcleo Digital", tipo: "CLIENTE", documento: "12.345.678/0001-01" },
  { id: "ctt_Moda LTDA", nome: "Moda LTDA", tipo: "FORNECEDOR", documento: "23.456.789/0001-02" },
  { id: "ctt_Distribuidora Central", nome: "Distribuidora Central", tipo: "FORNECEDOR", documento: "34.567.890/0001-03" },
  { id: "ctt_Imobiliária Prime", nome: "Imobiliária Prime", tipo: "FORNECEDOR", documento: "45.678.901/0001-04" },
  { id: "ctt_Companhia de Energia", nome: "Companhia de Energia", tipo: "FORNECEDOR", documento: "56.789.012/0001-05" },
  { id: "ctt_Grupo Havana", nome: "Grupo Havana", tipo: "CLIENTE", documento: "67.890.123/0001-06" },
  { id: "ctt_Atacado Boa Vista", nome: "Atacado Boa Vista", tipo: "CLIENTE", documento: "78.901.234/0001-07" },
  { id: "ctt_Loja Norte", nome: "Loja Norte", tipo: "CLIENTE", documento: "89.012.345/0001-08" },
];

/** Sem centro de custo vinculado a nenhuma transação do mock ainda — a
 * conta existe para que Categorização e Movimentações já tenham para onde
 * apontar assim que a Fase 2 ligar o rateio de verdade. */
export const CENTROS_CUSTO_MOCK: { id: string; nome: string; cor: string }[] = [
  { id: "cc_loja", nome: "Loja física", cor: "#2563EB" },
  { id: "cc_online", nome: "E-commerce", cor: "#7C3AED" },
  { id: "cc_admin", nome: "Administrativo", cor: "#64748B" },
];

export const CATEGORIAS_MOCK: CategoriaResumo[] = [
  { id: "cat_1", nome: "Vendas no balcão", icone: "loja", cor: "#10B981" },
  { id: "cat_2", nome: "Vendas online", icone: "vendas", cor: "#059669" },
  { id: "cat_3", nome: "Prestação de serviços", icone: "servicos", cor: "#14B8A6" },
  { id: "cat_4", nome: "Rendimento de aplicação", icone: "juros", cor: "#22C55E" },
  { id: "cat_5", nome: "Fornecedores", icone: "fornecedor", cor: "#EF4444" },
  { id: "cat_6", nome: "Aluguel", icone: "aluguel", cor: "#F97316" },
  { id: "cat_7", nome: "Folha de pagamento", icone: "folha", cor: "#8B5CF6" },
  { id: "cat_8", nome: "Energia elétrica", icone: "energia", cor: "#F59E0B" },
  { id: "cat_9", nome: "Marketing", icone: "marketing", cor: "#EC4899" },
  { id: "cat_10", nome: "Impostos", icone: "impostos", cor: "#64748B" },
  { id: "cat_11", nome: "Tarifas bancárias", icone: "banco", cor: "#94A3B8" },
  { id: "cat_12", nome: "Alimentação", icone: "alimentacao", cor: "#F43F5E" },
  { id: "cat_13", nome: "Transporte", icone: "transporte", cor: "#0EA5E9" },
  { id: "cat_14", nome: "Tecnologia", icone: "tecnologia", cor: "#6366F1" },
];

type Modelo = {
  descricao: string;
  categoriaId: string | null;
  tipo: TipoMovimentacao;
  min: number;
  max: number;
  contato?: string;
  /** Peso relativo na geração — vendas aparecem muito mais que impostos. */
  peso: number;
};

const MODELOS: Modelo[] = [
  { descricao: "Venda loja física", categoriaId: "cat_1", tipo: "RECEITA", min: 18_000, max: 340_000, peso: 10 },
  { descricao: "Venda online", categoriaId: "cat_2", tipo: "RECEITA", min: 12_000, max: 289_000, peso: 8 },
  { descricao: "Pix recebido", categoriaId: "cat_1", tipo: "RECEITA", min: 8_000, max: 180_000, contato: "Maria Silva", peso: 6 },
  { descricao: "Contrato mensal — consultoria", categoriaId: "cat_3", tipo: "RECEITA", min: 250_000, max: 480_000, contato: "Núcleo Digital", peso: 2 },
  { descricao: "Rendimento CDB", categoriaId: "cat_4", tipo: "RECEITA", min: 3_000, max: 24_000, peso: 1 },
  { descricao: "TED recebida", categoriaId: null, tipo: "RECEITA", min: 40_000, max: 320_000, peso: 2 },

  { descricao: "Fornecedor Moda LTDA", categoriaId: "cat_5", tipo: "DESPESA", min: 45_000, max: 380_000, contato: "Moda LTDA", peso: 6 },
  { descricao: "Distribuidora Central", categoriaId: "cat_5", tipo: "DESPESA", min: 60_000, max: 420_000, contato: "Distribuidora Central", peso: 4 },
  { descricao: "iFood", categoriaId: "cat_12", tipo: "DESPESA", min: 3_500, max: 18_000, peso: 5 },
  { descricao: "Posto Ipiranga", categoriaId: "cat_13", tipo: "DESPESA", min: 15_000, max: 42_000, peso: 3 },
  { descricao: "Anúncios Meta", categoriaId: "cat_9", tipo: "DESPESA", min: 20_000, max: 150_000, peso: 3 },
  { descricao: "Tarifa de manutenção", categoriaId: "cat_11", tipo: "DESPESA", min: 1_200, max: 8_900, peso: 3 },
  { descricao: "Assinatura de software", categoriaId: "cat_14", tipo: "DESPESA", min: 4_900, max: 39_000, peso: 2 },
  { descricao: "Compra no débito", categoriaId: null, tipo: "DESPESA", min: 2_000, max: 60_000, peso: 4 },
  { descricao: "Saque em terminal", categoriaId: null, tipo: "DESPESA", min: 10_000, max: 80_000, peso: 2 },
];

const TOTAL_PESOS = MODELOS.reduce((soma, m) => soma + m.peso, 0);

function sortearModelo(sorteio: number): Modelo {
  let acumulado = sorteio * TOTAL_PESOS;
  for (const modelo of MODELOS) {
    acumulado -= modelo.peso;
    if (acumulado <= 0) return modelo;
  }
  return MODELOS[0];
}

function categoriaPorId(id: string | null): CategoriaResumo | null {
  return id ? (CATEGORIAS_MOCK.find((c) => c.id === id) ?? null) : null;
}

/** Extrato dos últimos `dias`, do mais recente para o mais antigo. */
function gerarExtrato(dias: number, hoje: Date): MovimentacaoResumo[] {
  const aleatorio = geradorPseudoAleatorio(20250715);
  const movimentacoes: MovimentacaoResumo[] = [];

  for (let diasAtras = 0; diasAtras < dias; diasAtras += 1) {
    const data = subDays(hoje, diasAtras);
    const fimDeSemana = data.getDay() === 0 || data.getDay() === 6;
    const quantidade = fimDeSemana
      ? Math.floor(aleatorio() * 3)
      : 2 + Math.floor(aleatorio() * 4);

    for (let i = 0; i < quantidade; i += 1) {
      const modelo = sortearModelo(aleatorio());
      const valor =
        modelo.min + Math.floor(aleatorio() * (modelo.max - modelo.min));

      movimentacoes.push({
        id: `mov_${diasAtras}_${i}`,
        descricao: modelo.descricao,
        valorCentavos: valor,
        tipo: modelo.tipo,
        status: "CONCILIADO",
        data,
        dataVencimento: null,
        categoria: categoriaPorId(modelo.categoriaId),
        conta: CONTAS_MOCK[Math.floor(aleatorio() * CONTAS_MOCK.length)],
        contato: modelo.contato ? { id: `ctt_${modelo.contato}`, nome: modelo.contato } : null,
        numeroParcela: null,
        totalParcelas: null,
        recorrente: false,
      });
    }
  }

  return movimentacoes;
}

/** Compromissos assumidos que ainda não passaram pelo extrato. */
function gerarPendencias(hoje: Date): MovimentacaoResumo[] {
  const fixas: Array<{
    descricao: string;
    categoriaId: string;
    tipo: TipoMovimentacao;
    valor: number;
    emDias: number;
    status: StatusMovimentacao;
    contato?: string;
    parcela?: [number, number];
    recorrente?: boolean;
  }> = [
    { descricao: "Aluguel da loja", categoriaId: "cat_6", tipo: "DESPESA", valor: 380_000, emDias: 5, status: "PREVISTO", contato: "Imobiliária Prime", recorrente: true },
    { descricao: "Folha de pagamento", categoriaId: "cat_7", tipo: "DESPESA", valor: 1_240_000, emDias: 8, status: "PREVISTO", recorrente: true },
    { descricao: "Energia elétrica", categoriaId: "cat_8", tipo: "DESPESA", valor: 92_400, emDias: 3, status: "PENDENTE", contato: "Companhia de Energia" },
    { descricao: "Simples Nacional", categoriaId: "cat_10", tipo: "DESPESA", valor: 486_000, emDias: 12, status: "PREVISTO", recorrente: true },
    { descricao: "Notebook — parcela", categoriaId: "cat_14", tipo: "DESPESA", valor: 58_250, emDias: 9, status: "PENDENTE", parcela: [4, 12] },
    { descricao: "Fornecedor Moda LTDA", categoriaId: "cat_5", tipo: "DESPESA", valor: 320_000, emDias: -4, status: "PENDENTE", contato: "Moda LTDA" },
    { descricao: "Distribuidora Central", categoriaId: "cat_5", tipo: "DESPESA", valor: 178_900, emDias: -11, status: "PENDENTE", contato: "Distribuidora Central" },

    { descricao: "Contrato mensal — consultoria", categoriaId: "cat_3", tipo: "RECEITA", valor: 450_000, emDias: 6, status: "PREVISTO", contato: "Núcleo Digital", recorrente: true },
    { descricao: "Nota fiscal 2841", categoriaId: "cat_3", tipo: "RECEITA", valor: 268_000, emDias: 2, status: "PENDENTE", contato: "Grupo Havana" },
    { descricao: "Nota fiscal 2836", categoriaId: "cat_3", tipo: "RECEITA", valor: 134_500, emDias: -7, status: "PENDENTE", contato: "Atacado Boa Vista" },
    { descricao: "Venda parcelada — 2/6", categoriaId: "cat_2", tipo: "RECEITA", valor: 96_600, emDias: 14, status: "PREVISTO", contato: "Loja Norte", parcela: [2, 6] },
  ];

  return fixas.map((item, indice) => ({
    id: `pend_${indice}`,
    descricao: item.descricao,
    valorCentavos: item.valor,
    tipo: item.tipo,
    status: item.status,
    data: null,
    dataVencimento: addDays(hoje, item.emDias),
    categoria: categoriaPorId(item.categoriaId),
    conta: CONTAS_MOCK[0],
    contato: item.contato ? { id: `ctt_${item.contato}`, nome: item.contato } : null,
    numeroParcela: item.parcela?.[0] ?? null,
    totalParcelas: item.parcela?.[1] ?? null,
    recorrente: item.recorrente ?? false,
  }));
}

const HOJE = new Date();

export const MOVIMENTACOES_MOCK: MovimentacaoResumo[] = [
  ...gerarPendencias(HOJE),
  ...gerarExtrato(120, HOJE),
];

export const PRIMEIRO_DIA_DO_MES = startOfMonth(HOJE);
export const MES_ANTERIOR = subMonths(HOJE, 1);
