import type { BattleEvent } from "@webgame/types";
import { useAtomValue } from "jotai";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { FaPause } from "react-icons/fa6";
import styled from "styled-components";

import { currentTimeAtom, flattenedTimelineAtom } from "@/atoms/globalAtom";
import { FieldWidget } from "@/components/Commons";

import portrait from "../assets/portrait.png";

const CombatLog = () => {
  const events = useAtomValue(flattenedTimelineAtom);
  const currentTime = useAtomValue(currentTimeAtom);
  const [displayEvents, setDisplayEvents] = useState<BattleEvent[]>([]);

  // currentTime 변경 시 새로운 이벤트만 상태에 추가
  useEffect(() => {
    const activeEvents = events.filter((e) => e.timestamp <= currentTime && "actorId" in e);
    // 최신 5개만 유지
    setDisplayEvents((prev) => {
      // 내용이 실제로 바뀌었는지 비교 후 업데이트
      if (JSON.stringify(prev) !== JSON.stringify(activeEvents)) {
        return activeEvents;
      }
      return prev;
    });
  }, [events, currentTime]);

  return (
    <FieldWidget>
      <Row $justifyContent={"space-between"} $padding="0 0 16px">
        <SubTitle>BATTLE LOG</SubTitle>
        <ResumeButton>
          <FaPause />
          RESUME
        </ResumeButton>
      </Row>
      <Row>
        <ActionLogList>
          <AnimatePresence initial={false} mode="popLayout">
            {[...displayEvents].reverse().map((event) => (
              <ActionLogItem
                key={`${event.id}-${event.timestamp}`}
                as={motion.li}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <BackgroundImgDiv></BackgroundImgDiv>
                <ActionLogItemTextContainer>
                  <ActionLogUnitName>{event.type}</ActionLogUnitName>
                  <ActionLogUnitAction>{"actorId" in event ? event.actorId : "system"}</ActionLogUnitAction>
                </ActionLogItemTextContainer>
              </ActionLogItem>
            ))}
          </AnimatePresence>
        </ActionLogList>
      </Row>
    </FieldWidget>
  );
};

export default CombatLog;

const SubTitle = styled.h3`
  font-size: 12px;
  font-weight: 600;
  color: white;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0;
`;

type RowProps = {
  $justifyContent?: string;
  $padding?: string;
};
const Row = styled.div<RowProps>`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: ${(props) => props.$justifyContent || "flex-start"};
  padding: ${(props) => props.$padding || "0"};
`;

const ResumeButton = styled.button`
  box-sizing: border-box;

  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: 2px 6px;
  gap: 4px;

  width: auto;
  height: auto;

  background: rgba(255, 113, 108, 0.1);
  border: 1px solid rgba(255, 113, 108, 0.3);
  border-radius: 4px;

  font-size: 8px;
  font-weight: 300;
  color: #ff716c;
`;

const ActionLogList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: row;
  gap: 8px;
  width: 100%;
  overflow-y: auto;
`;

const ActionLogItem = styled.li`
  display: flex;
  flex-direction: column;
  position: relative;
  gap: 0.4rem;
  width: 80px;
  height: 40px;

  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  flex: none;

  background: #111111;
  border-left: 2px solid #ff716c;
  border-radius: 8px;
  overflow: hidden;
`;

const BackgroundImgDiv = styled.div`
  width: 46px;
  height: 46px;
  background: url(${portrait});
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  position: relative;
  left: -10px;
  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: -10px;
    width: 100%;
    height: 100%;
    background: linear-gradient(to right, rgba(0, 0, 0, 0) 0%, rgba(17, 17, 17, 1) 110%);
  }
`;

const ActionLogItemTextContainer = styled.div`
  position: absolute;
  flex-direction: column;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  padding-right: 8px;
  gap: 2px;
`;

const ActionLogUnitName = styled.p`
  font-size: 10px;
  font-weight: 300;
  color: white;
`;

const ActionLogUnitAction = styled.p`
  font-size: 8px;
  font-weight: 300;
  color: #ff716c;
`;
