"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";

export function BotaoSair() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function sair() {
    startTransition(async () => {
      await signOut();
      router.push("/login");
    });
  }

  return (
    <Button
      variant="outline"
      className="mt-6 w-full border-white/15 bg-white/5 text-night-text hover:bg-white/10"
      onClick={sair}
      disabled={pending}
    >
      {pending ? "Saindo…" : "Sair"}
    </Button>
  );
}
