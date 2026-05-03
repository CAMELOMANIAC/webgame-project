import { useEffect, useState } from "react";
import { useAtom, useSetAtom } from "jotai";
import { useNavigate } from "@tanstack/react-router";
import { battleLogAtom, currentTimeAtom } from "@/atoms/globalAtom";
import { useBattleData } from "@/utils/hooks/useBattleData";
import { useStartMonsterBattle } from "@/utils/hooks/useStartMonsterBattle";
import type { CharacterData } from "@/utils/hooks/useGetCharacter";

export function useFieldCombat(characterData: CharacterData | undefined) {
  const navigate = useNavigate();
  const [isCombat, setIsCombat] = useState<boolean>(false);
  const { setBattleLog } = useBattleData();
  const startMonsterBattle = useStartMonsterBattle();
  const setTime = useSetAtom(currentTimeAtom);
  const [battleLog] = useAtom(battleLogAtom);

  // 전투 타이머 로직
  useEffect(() => {
    if (!isCombat || !battleLog) return;
    const timer = setInterval(() => {
      setTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isCombat, battleLog, setTime]);

  const handleEnemyClick = () => {
    if (isCombat || !characterData?.raw.id) return;
    startMonsterBattle.mutate(
      { characterId: characterData.raw.id, level: 1 },
      {
        onSuccess: (log) => {
          setBattleLog(log);
          setTime(0); // 시간 초기화
          setIsCombat(true);
        },
      },
    );
  };

  useEffect(() => {
    if (isCombat) {
      // 전투 시작 시 field로 이동
      navigate({ to: "/field" });
    }
  }, [isCombat, navigate]);

  return { isCombat, setIsCombat, handleEnemyClick, battleLog };
}
