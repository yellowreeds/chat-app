import axios from "axios";
const RERANKER_API = process.env.RERANKER_API || "http://127.0.0.1:8001";

export async function rerankChunks(query, chunks) {
  if (!chunks?.length) {
    console.warn("⚠️ [Reranker] No chunks to rerank.");
    return chunks;
  }
  if (!query?.trim()) {
    console.warn("⚠️ [Reranker] Empty query — skipping rerank.");
    return chunks;
  }

  try {
    const passages = chunks.map((c) => c.text || "").filter((t) => t.trim());
    if (!passages.length) {
      console.warn("⚠️ [Reranker] All chunks were empty.");
      return chunks;
    }

    const res = await axios.post(`${RERANKER_API}/rerank`, {
      query,
      texts: passages,
    });

    const ranked = res.data?.results || [];
    if (!ranked.length) {
      console.warn("⚠️ [Reranker] No results returned from API.");
      return chunks;
    }

    // 🔁 Merge reranker results back with metadata
    const merged = ranked.map((r) => {
      const match = chunks.find((c) => c.text === r.text);
      let bonus = 0;

      /* -------------------------------------------------------------- */
      /* 🎯 1️⃣ Optional: Section / Header Matching Bonus               */
      /* -------------------------------------------------------------- */
      const headerMatch = /section\s*\d+/i.exec(query || "");
      if (headerMatch && match?.header) {
        const headerLower = match.header.toLowerCase();
        const target = headerMatch[0].toLowerCase();
        if (headerLower.includes(target)) bonus += 0.4; // tweakable
      }

      /* -------------------------------------------------------------- */
      /* ⚙️ 2️⃣ Manufacturing / Industrial Bias Boost                  */
      /* -------------------------------------------------------------- */
      if (/manufacturing|predictive maintenance|process optimization|factory|industrial/i.test(match?.text || "")) {
        bonus += 0.6; // tweakable domain bias
      }

      return {
        ...match,
        rerankScore: (r.score ?? 0) + bonus,
      };
    });

    // 🧩 Sort descending by combined score
    merged.sort((a, b) => b.rerankScore - a.rerankScore);
    return merged;
  } catch (err) {
    console.warn("⚠️ [Reranker] API error:", err.response?.data || err.message);
    return chunks; // graceful fallback
  }
}