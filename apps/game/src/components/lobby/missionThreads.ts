import type { JournalMissionItem, JournalView } from "@webgame/types";

import choPortrait from "@/assets/cho-portrait.png";
import choiPortrait from "@/assets/choi-portrait.png";
import yoonPortrait from "@/assets/yoon-portrait.png";

export const STATUS_LABELS: Record<JournalMissionItem["status"], string> = {
  OFFERED: "수락 대기",
  ACTIVE: "회수 중",
  RECOVERED: "탈출 필요",
  READY: "보고 가능",
  COMPLETE: "보고 완료",
  LOCKED: "종료",
};

export const STATUS_PRIORITY: Record<JournalMissionItem["status"], number> = {
  OFFERED: 1,
  RECOVERED: 2,
  READY: 3,
  ACTIVE: 4,
  COMPLETE: 5,
  LOCKED: 6,
};

const CONTACT_PORTRAITS: Record<string, string> = {
  "relief-contact": choPortrait,
  "market-contact": choiPortrait,
  "lab-contact": yoonPortrait,
  "조 시설과장": choPortrait,
  "최 사장": choiPortrait,
  "윤 책임연구원": yoonPortrait,
};

export function isActiveStatus(status: JournalMissionItem["status"]) {
  return status !== "COMPLETE" && status !== "LOCKED";
}

export function statusTone(status: JournalMissionItem["status"]) {
  if (status === "RECOVERED") return "negative" as const;
  if (status === "COMPLETE" || status === "LOCKED") return "neutral" as const;
  return "positive" as const;
}

/**
 * 서버 응답에 issuerContactId가 누락되거나 contacts와 어긋나더라도
 * 항상 안정적인 비어있지 않은 담당자 키를 반환한다.
 */
export function resolveMissionContactId(
  mission: JournalMissionItem,
  contacts: JournalView["contacts"],
): string {
  const rawId = mission.issuerContactId?.trim();
  if (rawId) return rawId;
  const byName = contacts.find((contact) => contact.name === mission.issuerName);
  if (byName?.id) return byName.id;
  return mission.issuerName?.trim() || mission.id;
}

function resolvePortrait(contactId: string, name: string): string | undefined {
  return CONTACT_PORTRAITS[contactId] ?? CONTACT_PORTRAITS[name];
}

export interface NpcThreadSummary {
  contactId: string;
  name: string;
  role: string;
  portraitSrc?: string;
  missions: JournalMissionItem[];
  primaryMission: JournalMissionItem | null;
  unread: number;
  preview: string;
  isIdle: boolean;
}

export function buildNpcThreads(
  contacts: JournalView["contacts"],
  missions: JournalMissionItem[],
): NpcThreadSummary[] {
  const byContact = new Map<string, JournalMissionItem[]>();
  for (const mission of missions) {
    const contactId = resolveMissionContactId(mission, contacts);
    const list = byContact.get(contactId) ?? [];
    list.push(mission);
    byContact.set(contactId, list);
  }

  const knownIds = new Set<string>();
  const baseContacts: { id: string; name: string; role: string }[] = [];

  for (const contact of contacts) {
    // 비발주 인물(entityId가 있는 후반부 관측 대상)은 발주한 임무가 있을 때만 대화 목록에 포함
    if (contact.entityId && !byContact.has(contact.id)) continue;
    knownIds.add(contact.id);
    baseContacts.push({ id: contact.id, name: contact.name, role: contact.role });
  }

  for (const mission of missions) {
    const contactId = resolveMissionContactId(mission, contacts);
    if (knownIds.has(contactId)) continue;
    knownIds.add(contactId);
    baseContacts.push({
      id: contactId,
      name: mission.issuerName,
      role: mission.issuerRole,
    });
  }

  const threads = baseContacts.map((contact): NpcThreadSummary => {
    const npcMissions = byContact.get(contact.id) ?? [];
    const unread = npcMissions.reduce((sum, item) => sum + item.unread, 0);
    const activeMissions = npcMissions.filter((item) => isActiveStatus(item.status));
    const primaryMission =
      [...activeMissions].sort((a, b) => {
        if ((b.unread > 0) !== (a.unread > 0)) return b.unread > 0 ? 1 : -1;
        return STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
      })[0] ??
      npcMissions[npcMissions.length - 1] ??
      null;

    const isIdle = !primaryMission || !isActiveStatus(primaryMission.status);
    const preview = !primaryMission
      ? "연락 없음"
      : isIdle
        ? "진행 중인 의뢰 없음"
        : primaryMission.lastMessagePreview ||
          primaryMission.briefing ||
          primaryMission.title;

    return {
      contactId: contact.id,
      name: contact.name,
      role: contact.role,
      portraitSrc: resolvePortrait(contact.id, contact.name),
      missions: npcMissions,
      primaryMission,
      unread,
      preview,
      isIdle,
    };
  });

  return threads.sort((a, b) => {
    if ((b.unread > 0) !== (a.unread > 0)) return b.unread > 0 ? 1 : -1;
    const prioA = a.primaryMission ? STATUS_PRIORITY[a.primaryMission.status] : 99;
    const prioB = b.primaryMission ? STATUS_PRIORITY[b.primaryMission.status] : 99;
    return prioA - prioB;
  });
}
