// services/retrieval/fusionHelper.js

function normalize(list, key = "score") {
  if (!list?.length) return [];
  const vals = list.map((x) => x[key] ?? 0);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  if (max === min) return list.map((x) => ({ ...x, norm: 1 }));
  return list.map((x, i) => ({ ...x, norm: (vals[i] - min) / (max - min) }));
}

export function fuseScores({ semantic = [], lexical = [], alpha = 0.7, topK = 5 }) {
  const sNorm = normalize(semantic, "score");
  const lNorm = normalize(lexical, "score");

  const map = new Map();
  for (const s of sNorm) {
    const id = s.metadata?.chunkId || s.chunkId;
    if (!id) continue;
    map.set(id, {
      chunkId: id,
      header: s.metadata?.header || s.header,
      fileId: s.metadata?.fileId || s.fileId,
      s: s.norm,
      l: 0,
      sRaw: s.score,
      lRaw: 0,
    });
  }

  for (const l of lNorm) {
    const id = l.metadata?.chunkId || l.chunkId;
    const prev = map.get(id) || {
      chunkId: id,
      header: l.header,
      fileId: l.fileId,
      s: 0,
      l: 0,
      sRaw: 0,
      lRaw: 0,
    };
    prev.l = l.norm;
    prev.lRaw = l.score;
    map.set(id, prev);
  }

  const fused = Array.from(map.values()).map((x) => ({
    chunkId: x.chunkId,
    fileId: x.fileId,
    header: x.header,
    fusedScore: alpha * x.s + (1 - alpha) * x.l,
    semanticScore: x.sRaw,
    lexicalScore: x.lRaw,
  }));

  fused.sort((a, b) => b.fusedScore - a.fusedScore);
  return fused.slice(0, topK);
}