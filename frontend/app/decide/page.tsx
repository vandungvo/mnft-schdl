"use client";

import { useQuery } from "@tanstack/react-query";
import { Database, Upload } from "lucide-react";
import Link from "next/link";

import { EmptyState, PageHeader } from "@/components/blocks";
import { useI18n } from "@/components/i18n-provider";
import { ScenarioCard } from "@/components/scenario-card";
import { Button } from "@/components/ui/button";
import { ErrorState, SkeletonCards } from "@/components/ui-states";
import { listAllScheduleRuns, listMasterDatasets } from "@/lib/api";

export default function DecideIndexPage() {
  const { t } = useI18n();
  const datasets = useQuery({ queryKey: ["master-datasets"], queryFn: () => listMasterDatasets() });
  const runs = useQuery({ queryKey: ["schedule-runs", "all"], queryFn: () => listAllScheduleRuns(), refetchInterval: 15_000 });

  return (
    <>
      <PageHeader title={t("Bàn điều độ", "Scheduling desk")}
        description={t("Chọn một kịch bản (bộ dữ liệu nhà máy: đơn hàng, tồn kho, máy, ca) để sinh phương án lịch, so sánh theo chính sách và chốt.", "Pick a scenario (a factory dataset: orders, inventory, machines, shifts) to generate schedule options, compare them by policy and commit one.")}
        actions={<Button variant="outline" asChild><Link href="/master-data"><Upload />{t("Nhập bộ dữ liệu", "Import dataset")}</Link></Button>} />
      {datasets.isLoading && <SkeletonCards count={3} />}
      {datasets.isError && <ErrorState message={t("Không tải được danh sách bộ dữ liệu.", "Could not load the datasets.")} onRetry={() => void datasets.refetch()} />}
      {datasets.data && datasets.data.items.length === 0 && (
        <EmptyState icon={<Database />} title={t("Chưa có kịch bản nào", "No scenarios yet")} description={t("Nhập dữ liệu nhà máy trước, sau đó quay lại đây để sinh và so sánh phương án.", "Import factory data first, then come back here to generate and compare options.")}
          action={<Button asChild><Link href="/master-data">{t("Đi tới Dữ liệu nhà máy", "Go to Factory data")}</Link></Button>} />
      )}
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(360px,100%),1fr))]">
        {datasets.data?.items.map((dataset) => <ScenarioCard key={dataset.id} dataset={dataset} runs={runs.data ?? []} />)}
      </div>
    </>
  );
}
