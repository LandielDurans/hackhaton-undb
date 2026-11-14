"use client";
import * as T from "@radix-ui/react-tabs";
import { cn } from "@/lib/format";

export const Tabs = T.Root;
export const TabsContent = T.Content;

export function TabsList({ className, ...p }: T.TabsListProps) {
  return <T.List className={cn("flex gap-1 border-b border-line overflow-x-auto", className)} {...p} />;
}
export function TabsTrigger({ className, ...p }: T.TabsTriggerProps) {
  return (
    <T.Trigger
      className={cn("relative px-3 py-2.5 text-sm font-medium text-ink-3 whitespace-nowrap hover:text-ink",
        "data-[state=active]:text-azulejo-700 data-[state=active]:after:absolute data-[state=active]:after:inset-x-2 data-[state=active]:after:-bottom-px data-[state=active]:after:h-0.5 data-[state=active]:after:bg-azulejo-700 data-[state=active]:after:rounded-full", className)}
      {...p}
    />
  );
}
