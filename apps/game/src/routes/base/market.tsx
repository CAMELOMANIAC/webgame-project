import { createFileRoute } from "@tanstack/react-router";

import { BaseScreen } from "@/components/lobby/BaseScreen";

export const Route = createFileRoute("/base/market")({
  component: () => (
    <BaseScreen title="거래소" description="거래소는 준비 중입니다." />
  ),
});
