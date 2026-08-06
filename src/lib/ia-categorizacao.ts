import type { TipoMovimentacao } from "@/types/dominio";

const MODELO = "deepseek/deepseek-v4-flash";
// O OpenRouter liga "reasoning" por padrão pra modelo que suporta — pra
// classificação simples (escolher de uma lista curta) isso só soma tempo de
// pensar sem melhorar a resposta, sem ganho de qualidade aqui. Mas mesmo
// desligado, disparar muitos lotes ao mesmo tempo (ver `processarArquivoOfx`)
// trava metade deles até o timeout — parece limite de conexões simultâneas
// do provedor por trás do OpenRouter, não latência de resposta em si. Com a
// concorrência agora limitada lá, 20s de folga cobre bem o que sobrar.
const TIMEOUT_MS = 20_000;

export type LinhaParaSugestao = { id: string; descricao: string; tipo: TipoMovimentacao };
export type OpcaoCategoria = { id: string; nome: string; tipo: TipoMovimentacao };
export type OpcaoContato = { id: string; nome: string };
export type SugestaoIA = { id: string; categoriaId: string | null; contatoId: string | null };

/**
 * Pede pro modelo sugerir categoria/fornecedor de cada lançamento novo, com
 * base no que já existe cadastrado — mesma ideia do aprendizado por
 * trigrama (`services/importacao/actions.ts`), só que entendendo a
 * descrição de verdade em vez de contar caracteres em comum. Devolve `null`
 * (nunca lança) sempre que não dá pra confiar na resposta — sem chave
 * configurada, erro de rede, timeout, ou JSON fora do formato esperado —
 * pra quem chama sempre ter o fallback de trigrama à mão.
 */
export async function sugerirComIA(input: {
  linhas: LinhaParaSugestao[];
  categorias: OpcaoCategoria[];
  contatos: OpcaoContato[];
}): Promise<SugestaoIA[] | null> {
  const apiKey = process.env.API_KEY_OPENROUTER;
  if (!apiKey) {
    console.warn("[ia-categorizacao] API_KEY_OPENROUTER não configurada — pulando sugestão por IA.");
    return null;
  }
  if (input.linhas.length === 0) return null;

  const categoriaIds = new Set(input.categorias.map((c) => c.id));
  const contatoIds = new Set(input.contatos.map((c) => c.id));

  const prompt = montarPrompt(input);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const resposta = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODELO,
        response_format: { type: "json_object" },
        temperature: 0,
        // Prioriza os provedores mais rápidos por trás do modelo — reduz a
        // chance de cair num provedor lento como o que estourou 20s antes.
        provider: { sort: "latency" },
        // Tarefa de classificação simples não precisa de "pensar" — isso só
        // adiciona tokens de raciocínio (tempo) sem ganho de qualidade aqui.
        reasoning: { enabled: false },
        messages: [
          {
            role: "system",
            content:
              "Você categoriza lançamentos financeiros. Responda só com o JSON pedido, " +
              "sem texto ao redor. Nunca invente um id que não esteja nas listas fornecidas — " +
              "quando não tiver certeza razoável, devolva null pro campo em dúvida.",
          },
          { role: "user", content: prompt },
        ],
      }),
      signal: controller.signal,
    });

    if (!resposta.ok) {
      console.error(
        `[ia-categorizacao] OpenRouter respondeu ${resposta.status}:`,
        await resposta.text().catch(() => "(sem corpo)"),
      );
      return null;
    }

    const dados = await resposta.json();
    const conteudo: string | undefined = dados?.choices?.[0]?.message?.content;
    if (!conteudo) {
      console.error("[ia-categorizacao] Resposta sem conteúdo:", JSON.stringify(dados));
      return null;
    }

    const parsed: unknown = JSON.parse(conteudo);
    const sugestoes = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>).sugestoes : null;
    if (!Array.isArray(sugestoes)) {
      console.error("[ia-categorizacao] JSON sem array \"sugestoes\":", conteudo);
      return null;
    }

    const resultado = sugestoes
      .filter((s: unknown): s is { id: unknown; categoriaId: unknown; contatoId: unknown } =>
        typeof s === "object" && s !== null && "id" in s,
      )
      .map((s) => ({
        id: String(s.id),
        // Nunca confia cegamente no id devolvido — só aceita o que realmente
        // existe nas listas mandadas, mesmo que o modelo tenha alucinado.
        categoriaId: typeof s.categoriaId === "string" && categoriaIds.has(s.categoriaId) ? s.categoriaId : null,
        contatoId: typeof s.contatoId === "string" && contatoIds.has(s.contatoId) ? s.contatoId : null,
      }));

    const comSugestao = resultado.filter((r) => r.categoriaId || r.contatoId).length;
    console.log(
      `[ia-categorizacao] ${input.linhas.length} linha(s) enviada(s), ${resultado.length} resposta(s), ${comSugestao} com categoria/fornecedor.`,
    );
    return resultado;
  } catch (e) {
    console.error("[ia-categorizacao] Falha ao chamar a IA:", e);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function montarPrompt(input: {
  linhas: LinhaParaSugestao[];
  categorias: OpcaoCategoria[];
  contatos: OpcaoContato[];
}): string {
  const categoriasPorTipo = (tipo: TipoMovimentacao) =>
    input.categorias
      .filter((c) => c.tipo === tipo)
      .map((c) => `${c.id}: ${c.nome}`)
      .join("\n");

  const contatos = input.contatos.map((c) => `${c.id}: ${c.nome}`).join("\n");

  const linhas = input.linhas
    .map((l) => `- id ${l.id} (${l.tipo}): "${l.descricao}"`)
    .join("\n");

  return `Lançamentos de extrato bancário pra categorizar:
${linhas}

Categorias disponíveis para DESPESA (id: nome):
${categoriasPorTipo("DESPESA") || "(nenhuma cadastrada)"}

Categorias disponíveis para RECEITA (id: nome):
${categoriasPorTipo("RECEITA") || "(nenhuma cadastrada)"}

Fornecedores/clientes disponíveis (id: nome):
${contatos || "(nenhum cadastrado)"}

Pra cada lançamento, sugira a categoria (só da lista do tipo certo — DESPESA
só pode usar categoria de DESPESA) e o fornecedor/cliente, quando a
descrição deixar claro o suficiente. Descrição genérica ou ambígua demais
(ex.: só "PIX", "TED", um nome de pessoa sem contexto) não deve receber
categoria nem fornecedor — melhor null do que chute.

Responda só com este JSON, sem nenhum texto antes ou depois:
{"sugestoes": [{"id": "<id do lançamento>", "categoriaId": "<id ou null>", "contatoId": "<id ou null>"}, ...]}`;
}
