"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

import { LogoMark } from "@/components/layout/logo";

/**
 * Tela de abertura do app — só aparece uma vez por sessão de navegador
 * (sessionStorage), na entrada real (login), não em cada volta à mesma aba.
 * Cobre a tela inteira com o mesmo fundo do layout de acesso, então o
 * desaparecimento não gera nenhum salto: o que estava "atrás" já é a mesma
 * cena, só sem a marca animada por cima.
 */
export function SplashScreen() {
  const [visivel, setVisivel] = useState(false);
  const semAnimacao = useReducedMotion();

  useEffect(() => {
    if (sessionStorage.getItem("flow-splash-visto")) return;
    sessionStorage.setItem("flow-splash-visto", "1");
    setVisivel(true);

    const duracao = semAnimacao ? 400 : 1400;
    const t = setTimeout(() => setVisivel(false), duracao);
    return () => clearTimeout(t);
  }, [semAnimacao]);

  return (
    <AnimatePresence>
      {visivel && (
        <motion.div
          className="textura-noite fixed inset-0 z-[100] flex flex-col items-center justify-center bg-night"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          <motion.div
            initial={semAnimacao ? false : { scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <LogoMark className="size-20" />
          </motion.div>
          <motion.span
            initial={semAnimacao ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: semAnimacao ? 0 : 0.35, ease: "easeOut" }}
            className="font-logo mt-4 text-5xl font-bold tracking-[-0.02em] text-night-text"
          >
            flow
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
