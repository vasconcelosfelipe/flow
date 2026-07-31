import type { TipoMovimentacao } from "@/types/dominio";

/**
 * Parser de extrato OFX (o formato que todo banco brasileiro exporta).
 *
 * OFX é SGML, não XML — nem todo campo fecha a própria tag (`<TRNAMT>123.45`
 * sem `</TRNAMT>` é válido, o valor termina na próxima tag ou quebra de
 * linha). Por isso a extração de campo aceita os dois formatos em vez de
 * assumir um parser de XML estrito, que quebraria em arquivos de bancos que
 * não fecham tag de folha.
 */

export type TransacaoOfx = {
  /** Identificador único do banco para esta transação — chave de dedup. */
  fitId: string;
  data: Date;
  valorCentavos: number;
  tipo: TipoMovimentacao;
  descricao: string;
  /** Texto original do MEMO, sem limpeza — guardado para auditoria. */
  memoOriginal: string | null;
};

export type ExtratoOfx = {
  transacoes: TransacaoOfx[];
};

function extrairCampo(bloco: string, tag: string): string | null {
  const casado = bloco.match(new RegExp(`<${tag}>([^<\\r\\n]*)`, "i"));
  const valor = casado?.[1]?.trim();
  return valor ? valor : null;
}

/** `"20260730120000[-3:BRT]"` → `Date` local, ignorando hora/fuso (só a data de caixa importa). */
function parseDataOfx(valor: string): Date {
  const ano = Number(valor.slice(0, 4));
  const mes = Number(valor.slice(4, 6));
  const dia = Number(valor.slice(6, 8));
  return new Date(ano, mes - 1, dia);
}

/**
 * O MEMO carrega o canal da operação antes dos dois-pontos ("Pix recebido",
 * "Pagamento efetuado", "Credito domicilio cartao"...) e o NAME carrega
 * quem — juntar os dois é mais legível que qualquer um sozinho. Quando o
 * banco manda NAME vazio (comum em boletos), sobra só o MEMO limpo.
 */
function montarDescricao(memo: string | null, name: string | null): string {
  const prefixo = memo?.split(":")[0]?.trim();
  const nome = name?.trim();

  if (prefixo && nome) return `${prefixo} — ${nome}`;
  if (nome) return nome;
  if (memo) return memo.replace(/"/g, "").trim();
  return "Lançamento importado";
}

export function parseOfx(conteudo: string): ExtratoOfx {
  const blocos = conteudo.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) ?? [];
  const transacoes: TransacaoOfx[] = [];

  for (const bloco of blocos) {
    const fitId = extrairCampo(bloco, "FITID");
    const dtPosted = extrairCampo(bloco, "DTPOSTED");
    const trnAmt = extrairCampo(bloco, "TRNAMT");
    if (!fitId || !dtPosted || !trnAmt) continue;

    const valor = Number(trnAmt.replace(",", "."));
    if (!Number.isFinite(valor) || valor === 0) continue;

    const memo = extrairCampo(bloco, "MEMO");
    const name = extrairCampo(bloco, "NAME");

    transacoes.push({
      fitId,
      data: parseDataOfx(dtPosted),
      valorCentavos: Math.round(Math.abs(valor) * 100),
      tipo: valor > 0 ? "RECEITA" : "DESPESA",
      descricao: montarDescricao(memo, name),
      memoOriginal: memo,
    });
  }

  return { transacoes };
}
