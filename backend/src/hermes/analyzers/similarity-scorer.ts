export class SimilarityScorer {
  private tokenize(text: string): Map<string, number> {
    const freq = new Map<string, number>();
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 1)
      .forEach((w) => freq.set(w, (freq.get(w) ?? 0) + 1));
    return freq;
  }

  score(a: string, b: string): number {
    if (!a.trim() || !b.trim()) return 0;
    const va = this.tokenize(a);
    const vb = this.tokenize(b);
    const terms = new Set([...va.keys(), ...vb.keys()]);

    let dot = 0,
      magA = 0,
      magB = 0;
    for (const term of terms) {
      const fa = va.get(term) ?? 0;
      const fb = vb.get(term) ?? 0;
      dot += fa * fb;
      magA += fa * fa;
      magB += fb * fb;
    }

    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
  }
}
