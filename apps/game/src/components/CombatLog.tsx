import { useAtomValue } from "jotai";
import { AnimatePresence, motion } from "motion/react";
import styled from "styled-components";

import { battleLogAtom, processedEventsAtom } from "@/atoms/globalAtom";
import { FieldWidget } from "@/components/Commons";

const CombatLog = () => {
  const processedEvents = useAtomValue(processedEventsAtom);
  const battle = useAtomValue(battleLogAtom);

  const logHistory = processedEvents.filter((e) => "actorId" in e).slice(-10);

  return (
    <StyledCombatWidget $bracketTone="negative">
      <StyledHeaderRow>
        <StyledTitleGroup>
          <StyledHostileDot />
          <StyledSubTitle>
            {battle?.encounter?.kind === "GHOST" ? "고스트 조우" : "교전 기록"}
          </StyledSubTitle>
        </StyledTitleGroup>
        <StyledStatusBadge>HOSTILE · 전투 재생 중</StyledStatusBadge>
      </StyledHeaderRow>

      {battle?.encounter && (
        <StyledEncounter>
          <strong>{battle.encounter.name}</strong>
          {battle.encounter.kind === "NPC" && (
            <span>
              {battle.encounter.faction} · {battle.encounter.role} ·{" "}
              {battle.encounter.reason}
            </span>
          )}
          {battle.encounter.kind === "GHOST" && (
            <span>
              {battle.encounter.worldlineCode} · 개체{" "}
              {battle.encounter.sourceCharacterId?.slice(0, 8) ?? "기록"} ·{" "}
              {battle.encounter.recordedRound}라운드 기록 ·{" "}
              {battle.encounter.recordedAt
                ? new Date(battle.encounter.recordedAt).toLocaleString("ko-KR")
                : ""}
            </span>
          )}
        </StyledEncounter>
      )}

      <StyledActionLogList>
        <AnimatePresence initial={false} mode="popLayout">
          {[...logHistory].reverse().map((event) => (
            <StyledActionLogItem
              key={`${event.id}-${event.timestamp}`}
              as={motion.li}
              layout
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
            >
              <StyledActionLogType>{event.type}</StyledActionLogType>
              <StyledActionLogActor>
                {"actorId" in event
                  ? (battle?.initialState.players.find(
                      (player) => player.id === event.actorId,
                    )?.name ?? event.actorId)
                  : "SYSTEM"}
              </StyledActionLogActor>
            </StyledActionLogItem>
          ))}
        </AnimatePresence>
      </StyledActionLogList>
    </StyledCombatWidget>
  );
};

export default CombatLog;

const StyledCombatWidget = styled(FieldWidget)`
  gap: 10px;
  padding: 14px;
`;

const StyledHeaderRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
`;

const StyledTitleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const StyledHostileDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ff7162;
`;

const StyledSubTitle = styled.h3`
  font-size: 13px;
  font-weight: 700;
  color: #fafafa;
  margin: 0;
`;

const StyledStatusBadge = styled.span`
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255, 113, 98, 0.14);
  border: 1px solid rgba(255, 113, 98, 0.3);
  color: #ff7162;
`;

const StyledEncounter = styled.p`
  color: #fafafa;
  font-size: 12px;
  margin: 0;

  strong {
    font-weight: 600;
    color: #85adff;
  }

  span {
    display: block;
    font-family: var(--font-mono);
    font-size: 11px;
    color: #a1a1aa;
    line-height: 1.45;
    margin-top: 3px;
    font-variant-numeric: tabular-nums;
  }
`;

const StyledActionLogList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: row;
  gap: 6px;
  width: 100%;
  overflow-x: auto;
`;

const StyledActionLogItem = styled.li`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  min-width: 84px;
  padding: 6px 8px;
  gap: 2px;
  flex: none;
  background: #0c0c0f;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-left: 2px solid #ff7162;
  border-radius: 4px;
`;

const StyledActionLogType = styled.p`
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  color: #fafafa;
`;

const StyledActionLogActor = styled.p`
  font-size: 11px;
  font-weight: 500;
  color: #a1a1aa;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
