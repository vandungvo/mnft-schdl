"use client";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  compact?: boolean;
}

export function ErrorState({ title = "Không thể tải dữ liệu", message, onRetry, compact }: ErrorStateProps) {
  return <div className={compact ? "error-state error-state-compact" : "panel error-state"} role="alert"><span aria-hidden="true">!</span><div><strong>{title}</strong><p>{message}</p></div>{onRetry && <button className="button button-small" onClick={onRetry}>Thử lại</button>}</div>;
}

export function SkeletonCards({ count = 4 }: { count?: number }) {
  return <div className="skeleton-grid" aria-label="Đang tải dữ liệu">{Array.from({ length: count }, (_, index) => <div className="skeleton-card" key={index}><i /><i /><i /></div>)}</div>;
}

export function SkeletonTable({ rows = 3 }: { rows?: number }) {
  return <div className="panel skeleton-table" aria-label="Đang tải dữ liệu">{Array.from({ length: rows }, (_, index) => <div key={index}><i /><i /><i /><i /></div>)}</div>;
}
