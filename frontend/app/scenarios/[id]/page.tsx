"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";

import { ScenarioWorkspace } from "@/components/scenario/workspace";
import { SkeletonCards } from "@/components/ui-states";
import { getMasterDataset } from "@/lib/api";

/* A scenario a planning period compiled is worked on from that period (its inputs live there),
   so deep links into it (runs, palette, old bookmarks) land on the period with the same tab. */
function Scenario() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const dataset = useQuery({ queryKey: ["master-dataset", id], queryFn: () => getMasterDataset(id) });
  const owner = dataset.data?.owner_period_id;
  useEffect(() => {
    if (owner) router.replace(`/periods/${owner}${window.location.search}`);
  }, [owner, router]);
  if (owner) return <SkeletonCards count={4} />;
  return <ScenarioWorkspace id={id} />;
}

export default function ScenarioPage() {
  return <Suspense fallback={<SkeletonCards count={4} />}><Scenario /></Suspense>;
}
