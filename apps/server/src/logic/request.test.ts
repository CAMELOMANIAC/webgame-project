import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ApiError,
  readApiResponse,
  requestJsonWithTimeout,
} from "../../../game/src/utils/request";

test("통신 성공은 서버 응답을 반환한다", async () => {
  const result = await requestJsonWithTimeout<{ version: number }>(async () =>
    Response.json({ version: 2 }),
  );
  assert.equal(result.version, 2);
});

test("서버의 상태 충돌은 재시도 정책에서 구분할 수 있다", async () => {
  await assert.rejects(
    () =>
      readApiResponse(
        Response.json({ error: "state changed" }, { status: 409 }),
      ),
    (error: unknown) => error instanceof ApiError && error.status === 409,
  );
});

test("응답 지연은 요청을 취소하고 전투 없는 성공으로 바꾸지 않는다", async () => {
  let aborted = false;
  await assert.rejects(
    () =>
      requestJsonWithTimeout(
        (signal) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener("abort", () => {
              aborted = true;
              reject(new DOMException("Aborted", "AbortError"));
            });
          }),
        5,
      ),
    (error: unknown) => error instanceof ApiError && error.status === 408,
  );
  assert.equal(aborted, true);
});

test("연결 실패는 결과 확인이 필요한 오류로 유지한다", async () => {
  await assert.rejects(
    () =>
      requestJsonWithTimeout(async () => {
        throw new TypeError("Failed to fetch");
      }),
    (error: unknown) => error instanceof ApiError && error.status === 0,
  );
});
