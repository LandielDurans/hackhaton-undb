"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import type { Meta } from "./types";

export function useMeta() {
  return useQuery({ queryKey: ["meta"], queryFn: () => api.get<Meta>("/api/meta"), staleTime: 10 * 60_000 });
}
