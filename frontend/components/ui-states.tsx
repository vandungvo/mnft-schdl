"use client";

import { AlertCircle, RotateCw } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  compact?: boolean;
}

export function ErrorState({ title: titleProp, message, onRetry, compact }: ErrorStateProps) {
  const { t } = useI18n();
  const title = titleProp ?? t("Không thể tải dữ liệu", "Could not load data");
  if (compact) {
    return (
      <Alert variant="destructive" className="border-destructive/30 bg-danger-soft">
        <AlertCircle />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription className="flex flex-wrap items-center justify-between gap-2">{message}{onRetry && <Button size="sm" variant="outline" onClick={onRetry}><RotateCw />{t("Thử lại", "Retry")}</Button>}</AlertDescription>
      </Alert>
    );
  }
  return (
    <div role="alert" className="flex flex-col items-center rounded-lg border bg-card px-6 py-10 text-center">
      <div className="mb-3 grid size-10 place-items-center rounded-full bg-danger-soft text-destructive"><AlertCircle className="size-5" /></div>
      <strong>{title}</strong>
      <p className="mt-1 max-w-[56ch] text-sm text-muted-foreground">{message}</p>
      {onRetry && <Button className="mt-4" variant="outline" size="sm" onClick={onRetry}><RotateCw />{t("Thử lại", "Retry")}</Button>}
    </div>
  );
}

export function SkeletonCards({ count = 4 }: { count?: number }) {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label={t("Đang tải dữ liệu", "Loading data")}>
      {Array.from({ length: count }, (_, index) => <div className="space-y-3 rounded-lg border bg-card p-5" key={index}><Skeleton className="h-3 w-1/3" /><Skeleton className="h-7 w-1/2" /><Skeleton className="h-3 w-2/3" /></div>)}
    </div>
  );
}

export function SkeletonTable({ rows = 3 }: { rows?: number }) {
  const { t } = useI18n();
  return (
    <div className="divide-y rounded-lg border bg-card" aria-label={t("Đang tải dữ liệu", "Loading data")}>
      {Array.from({ length: rows }, (_, index) => <div key={index} className="grid grid-cols-[1.5fr_repeat(3,1fr)] gap-5 p-4"><Skeleton className="h-3.5" /><Skeleton className="h-3.5" /><Skeleton className="h-3.5" /><Skeleton className="h-3.5" /></div>)}
    </div>
  );
}
