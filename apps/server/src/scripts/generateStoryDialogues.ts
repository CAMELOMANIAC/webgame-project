import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { parseStoryManuscript } from "../logic/storyManuscript";

// docs/quest-story-dialogue.md 원고를 서버 대화 정의(storyDialogues.generated.ts)로 변환한다.
// 실행: pnpm --filter server story:generate
const root = resolve(__dirname, "../../../..");
const source = readFileSync(resolve(root, "docs/quest-story-dialogue.md"), "utf8");
const missions = parseStoryManuscript(source);
const output = `// 자동 생성 파일입니다. docs/quest-story-dialogue.md를 고친 뒤 \`pnpm --filter server story:generate\`로 다시 만드세요.
import type { ManuscriptMission } from "./storyManuscript";

export const STORY_MANUSCRIPT_MISSIONS: readonly ManuscriptMission[] = ${JSON.stringify(missions, null, 2)};
`;
writeFileSync(resolve(root, "apps/server/src/logic/storyDialogues.generated.ts"), output);
console.log(`임무 ${missions.length}개를 생성했습니다: ${missions.map((mission) => mission.id).join(", ")}`);
