export function nextAppendPosition(maxPosition: number | null | undefined) {
  return Number(maxPosition ?? 0) + 1000;
}

export function midpoint(a: number, b: number) {
  return (a + b) / 2;
}

/** If siblings get too close, renumber with gaps of 1000. */
export function needsRenumber(positions: number[]) {
  const sorted = [...positions].sort((x, y) => x - y);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i]! - sorted[i - 1]! < 1e-6) return true;
  }
  return false;
}

export function renumber(idsInOrder: string[]) {
  return idsInOrder.map((id, index) => ({
    id,
    position: (index + 1) * 1000,
  }));
}
