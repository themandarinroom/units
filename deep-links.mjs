export function readUnitLibraryLocation(search) {
  const params = new URLSearchParams(search);
  return { unitId: params.get("unit") || "", lessonId: params.get("lesson") || "" };
}

export function unitLibraryUrl(unitId, lessonId = "") {
  const params = new URLSearchParams({ unit: unitId });
  if (lessonId) params.set("lesson", lessonId);
  return `https://themandarinroom.github.io/units/view.html?${params.toString()}`;
}
