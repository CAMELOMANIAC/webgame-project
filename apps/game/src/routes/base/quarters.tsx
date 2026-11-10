import { createFileRoute } from "@tanstack/react-router";

import { BaseScreen } from "@/components/lobby/BaseScreen";
import CharacterCollection from "@/components/lobby/CharacterCollection";

export const Route = createFileRoute("/base/quarters")({
  component: () => (
    <BaseScreen
      title="숙소"
      description="보유 개체의 상태를 확인하고 다음 탐사에 출격할 개체를 선택합니다."
    >
      <CharacterCollection />
    </BaseScreen>
  ),
});
