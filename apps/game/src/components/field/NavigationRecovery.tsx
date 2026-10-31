import { useQueryClient } from "@tanstack/react-query";
import type { BattleLog } from "@webgame/types";
import { useAtom, useAtomValue, useSetAtom } from "jotai";

import {
  pendingNavigationAtom,
  pendingNavigationKey,
} from "@/atoms/pendingNavigationAtom";
import {
  currentNodeIdAtom,
  isCombatAtom,
  isInventoryDirtyAtom,
  isNavigatingAtom,
  playerCoordsAtom,
  targetNodeIdAtom,
} from "@/atoms/raidAtom";
import type { CharacterData } from "@/utils/hooks/useGetCharacter";
import type { useNavigateRaid } from "@/utils/hooks/useNavigateRaid";
import { ApiError } from "@/utils/request";

import * as styles from "./NavigationRecovery.css";

interface Props {
  character: CharacterData | undefined;
  navigation: ReturnType<typeof useNavigateRaid>;
  triggerCombat: (log: BattleLog) => void;
}

export default function NavigationRecovery({
  character,
  navigation,
  triggerCombat,
}: Props) {
  const [pending, setPending] = useAtom(pendingNavigationAtom);
  const isMoving = useAtomValue(isNavigatingAtom);
  const isCombat = useAtomValue(isCombatAtom);
  const setNode = useSetAtom(currentNodeIdAtom);
  const setCoords = useSetAtom(playerCoordsAtom);
  const setTarget = useSetAtom(targetNodeIdAtom);
  const setDirty = useSetAtom(isInventoryDirtyAtom);
  const queryClient = useQueryClient();
  const key = pendingNavigationKey(character?.raw.userId, character?.raw.id);
  const request = pending[key];
  if (!request || isMoving || isCombat) return null;

  const recover = () =>
    navigation.mutate(request.params, {
      onSuccess: (result) => {
        setNode(result.stopNodeId ?? result.raid.currentNodeId);
        setCoords(null);
        setTarget(null);
        setDirty(false);
        if (result.battleLog) triggerCombat(result.battleLog);
        else void queryClient.invalidateQueries({ queryKey: ["character"] });
      },
    });
  const reloadRejectedRequest = async () => {
    await queryClient.invalidateQueries({ queryKey: ["character"] });
    setDirty(false);
    setCoords(null);
    setTarget(null);
    setPending((records) => {
      const remaining = { ...records };
      delete remaining[key];
      return remaining;
    });
    navigation.reset();
  };
  const rejected =
    navigation.error instanceof ApiError &&
    [400, 403, 404, 409].includes(navigation.error.status);

  return (
    <aside className={styles.recovery} role="alert">
      <strong className={styles.title}>이동 결과 확인이 필요합니다</strong>
      <p className={styles.description}>
        저장된 요청으로 서버 결과를 확인합니다. 전투나 보상은 중복 처리되지
        않습니다.
      </p>
      {navigation.error && (
        <p className={styles.description}>{navigation.error.message}</p>
      )}
      <button
        type="button"
        className={styles.button}
        disabled={navigation.isPending}
        onClick={recover}
      >
        {navigation.isPending ? "결과를 확인하는 중…" : "이동 결과 다시 확인"}
      </button>
      {rejected && (
        <button
          type="button"
          className={styles.button}
          disabled={navigation.isPending}
          onClick={() => void reloadRejectedRequest()}
        >
          현재 서버 상태로 돌아가기
        </button>
      )}
    </aside>
  );
}
