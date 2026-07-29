import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gera `.next/standalone` com só o necessário para rodar em produção —
  // sem isso a imagem Docker carregaria o node_modules inteiro.
  output: "standalone",
};

export default nextConfig;
