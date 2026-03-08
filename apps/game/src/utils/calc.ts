/**
 * 두 좌표 간의 각도를 0도에서 360도 사이의 값으로 계산합니다.
 * @param {number} startX 드래그 시작 X 좌표
 * @param {number} startY 드래그 시작 Y 좌표
 * @param {number} currentX 현재 X 좌표
 * @param {number} currentY 현재 Y 좌표
 * @returns {number} 0 ~ 360도 사이의 각도 (Degree)
 */
function getDragAngle(
  startX: number,
  startY: number,
  currentX: number,
  currentY: number
): number {
  const deltaX = currentX - startX;
  const deltaY = currentY - startY;

  // 1. Math.atan2를 사용하여 라디안 각도를 계산합니다.
  const angleInRadians = Math.atan2(deltaY, deltaX);

  // 2. 라디안을 도로 변환합니다.
  let angleInDegrees = angleInRadians * (180 / Math.PI);

  // 3. 각도를 0도 ~ 360도 범위로 정규화합니다.
  // 수평 우측이 0도, 아래쪽이 90도, 왼쪽이 180도, 위쪽이 270도가 됩니다.
  if (angleInDegrees < 0) {
    angleInDegrees += 360;
  }

  return angleInDegrees;
}

export { getDragAngle };
