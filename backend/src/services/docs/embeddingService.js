import { buildFaissIndex } from "../embedding/embedService.js";

export async function indexGroup(groupId) {
  const result = await buildFaissIndex(groupId);
  return { count: result?.vectors?.length || 0 };
}