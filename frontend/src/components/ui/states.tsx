import { AlertTriangle, Inbox, Lock } from "lucide-react";
import { cn } from "@/lib/format";
import { Button } from "./button";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-line/70", className)} />;
}

export function LoadingBlock({ linhas = 3, className }: { linhas?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)} role="status" aria-label="Carregando">
      {Array.from({ length: linhas }).map((_, i) => <Skeleton key={i} className={cn("h-4", i % 3 === 2 ? "w-2/3" : "w-full")} />)}
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="space-y-5" role="status" aria-label="Carregando página">
      <Skeleton className="h-8 w-72" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}</div>
      <Skeleton className="h-80" />
    </div>
  );
}

export function EmptyState({ title, children, icon }: { title: string; children?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-6">
      <div className="mb-3 rounded-full bg-canvas p-3 text-ink-3">{icon ?? <Inbox size={20} />}</div>
      <p className="font-medium text-ink-2">{title}</p>
      {children && <div className="mt-1 text-sm text-ink-3 max-w-md">{children}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const status = (error as { status?: number })?.status;
  const msg = error instanceof Error ? error.message : "Não foi possível carregar os dados.";
  if (status === 403) return <RestrictedNotice mensagem={msg} />;
  return (
    <div className="rounded-xl border border-atencao/25 bg-atencao-bg p-5 flex items-start gap-3" role="alert">
      <AlertTriangle className="text-atencao shrink-0 mt-0.5" size={18} />
      <div className="flex-1">
        <p className="font-medium text-ink">Não foi possível carregar</p>
        <p className="text-sm text-ink-2 mt-0.5">{msg}</p>
      </div>
      {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Tentar novamente</Button>}
    </div>
  );
}

export function RestrictedNotice({ mensagem, children }: { mensagem: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-azulejo-100 bg-azulejo-50 p-5 flex items-start gap-3" role="note">
      <Lock className="text-azulejo-700 shrink-0 mt-0.5" size={18} />
      <div className="flex-1">
        <p className="font-medium text-azulejo-900">Acesso restrito por perfil (LGPD)</p>
        <p className="text-sm text-ink-2 mt-0.5">{mensagem}</p>
        {children}
      </div>
    </div>
  );
}
