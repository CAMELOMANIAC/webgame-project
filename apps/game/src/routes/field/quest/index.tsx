import { createFileRoute } from "@tanstack/react-router";

import { MissionJournal } from "@/components/lobby/MissionJournal";

export const Route = createFileRoute("/field/quest/")({
  component: () => <MissionJournal mode="raid" />,
});
