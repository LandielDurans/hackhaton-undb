"use client";
import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Estado de filtros sincronizado com a URL (compartilhável e persistente na navegação). */
export function useFiltrosUrl<K extends string>(chaves: readonly K[]) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const valores = useMemo(() => {
    const o = {} as Record<K, string>;
    chaves.forEach(k => { o[k] = sp.get(k) ?? ""; });
    return o;
  }, [sp, chaves]);
  const set = useCallback((patch: Partial<Record<K, string>>) => {
    const p = new URLSearchParams(sp.toString());
    Object.entries(patch).forEach(([k, v]) => { if (v) p.set(k, v as string); else p.delete(k); });
    const q = p.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [sp, router, pathname]);
  return [valores, set] as const;
}
