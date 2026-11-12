export const getBuildingCenter = (building: { coordinates: { x: number; y: number }[] }) => {
  if (!building.coordinates || building.coordinates.length === 0) return { x: 0, y: 0 };
  let sumX = 0;
  let sumY = 0;
  building.coordinates.forEach((p) => {
    sumX += p.x;
    sumY += p.y;
  });
  return {
    x: sumX / building.coordinates.length,
    y: sumY / building.coordinates.length,
  };
};
