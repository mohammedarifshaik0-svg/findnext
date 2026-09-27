const cliche = /\b(passionate|results-driven|dynamic professional|seasoned professional|proven track record|leverage|synergy|go-getter)\b/i;

function meaningfulTokens(value: string) {
  return new Set(value.toLocaleLowerCase().match(/[a-z0-9£$₹%]+/g) ?? []);
}
export function writingSimilarity(left: string, right: string) {
  const a = meaningfulTokens(left);
  const b = meaningfulTokens(right);
  if (!a.size || !b.size) return 0;
  const shared = [...a].filter((token) => b.has(token)).length;
  return shared / (a.size + b.size - shared);
}

export function hasGenericCliche(value: string) {
  return cliche.test(value);
}

export function hasProfessionalSummaryShape(value: string) {
  const words = value.match(/\S+/g)?.length ?? 0;
  return words >= 55 && /\b(I|my|me)\b/i.test(value);
}
