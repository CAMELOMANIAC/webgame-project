export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function readApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data: { error?: string } = await response.json().catch(() => ({}));
    throw new ApiError(
      data.error ?? "서버 요청을 처리하지 못했습니다.",
      response.status,
    );
  }
  return response.json();
}

export async function requestJsonWithTimeout<T>(
  perform: (signal: AbortSignal) => Promise<Response>,
  timeoutMs = 15000,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await readApiResponse<T>(await perform(controller.signal));
  } catch (error) {
    if (controller.signal.aborted)
      throw new ApiError(
        "서버 응답이 늦어 이동을 멈췄습니다. 결과를 다시 확인하세요.",
        408,
      );
    if (error instanceof TypeError)
      throw new ApiError(
        "서버에 연결할 수 없습니다. 연결 후 이동 결과를 다시 확인하세요.",
        0,
      );
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
