"use client";
import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/format";

export function Dialog({ open, onOpenChange, title, description, children, wide }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: string; children: React.ReactNode; wide?: boolean;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-[1000] bg-ink/40 backdrop-blur-[2px]" />
        <D.Content className={cn("fixed left-1/2 top-1/2 z-[1001] max-h-[90vh] w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-surface p-6 shadow-[var(--shadow-pop)]",
          wide ? "max-w-2xl" : "max-w-lg")}>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <D.Title className="text-lg font-semibold">{title}</D.Title>
              {description && <D.Description className="text-sm text-ink-3 mt-1">{description}</D.Description>}
            </div>
            <D.Close className="rounded-md p-1 text-ink-3 hover:bg-canvas" aria-label="Fechar"><X size={18} /></D.Close>
          </div>
          {children}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
