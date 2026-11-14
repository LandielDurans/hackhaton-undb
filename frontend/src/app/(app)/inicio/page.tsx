"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { paginaInicial, useAuth } from "@/lib/auth";
import { PageLoading } from "@/components/ui/states";

export default function Inicio() {
  const { usuario } = useAuth();
  const router = useRouter();
  useEffect(() => { if (usuario) router.replace(paginaInicial(usuario)); }, [usuario, router]);
  return <PageLoading />;
}
