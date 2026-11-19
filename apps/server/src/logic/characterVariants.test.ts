import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BASE_CHARACTER_STATS,
  CHARACTER_VARIANT_CATALOG,
  getCharacterVariantSpec,
} from "@webgame/types";

describe("기본 생존자 캐릭터 카탈로그", () => {
  it("캐릭터당 단일 기본 항목만 유지하며 모든 캐릭터는 동일한 기본 능력치를 가진다", () => {
    assert.equal(CHARACTER_VARIANT_CATALOG.length, 3);
    const definitionIds = new Set(
      CHARACTER_VARIANT_CATALOG.map((c) => c.definitionId),
    );
    assert.equal(definitionIds.size, CHARACTER_VARIANT_CATALOG.length);

    for (const entry of CHARACTER_VARIANT_CATALOG) {
      assert.deepEqual(entry.stats, BASE_CHARACTER_STATS);
    }

    assert.ok(getCharacterVariantSpec("legacy-origin"));
    assert.ok(getCharacterVariantSpec("haerin-origin"));
    assert.ok(getCharacterVariantSpec("jiwon-origin"));
  });
});
