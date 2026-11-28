import { createFileRoute } from "@tanstack/react-router";

import { MissionChatPage } from "@/components/lobby/MissionChatPage";

export const Route = createFileRoute("/base/quest/$contactId")({
  validateSearch: (search: Record<string, unknown>): { questId?: string } => ({
    questId: typeof search.questId === "string" ? search.questId : undefined,
  }),
  component: BaseQuestChatRoute,
});

function BaseQuestChatRoute() {
  const { contactId } = Route.useParams();
  const { questId } = Route.useSearch();
  return <MissionChatPage contactId={contactId} questId={questId} backTo="/base/quest" />;
}
