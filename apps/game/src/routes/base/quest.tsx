import { createFileRoute } from "@tanstack/react-router";

import { MissionJournal } from "@/components/lobby/MissionJournal";

export const Route = createFileRoute("/base/quest")({
  component: () => <MissionJournal mode="base" />,
});
