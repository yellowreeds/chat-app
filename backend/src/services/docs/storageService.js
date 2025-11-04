import { saveParsedSections } from "../storage/docStorageService.js";

export async function saveSections({ groupId, fileId, pageCount, sections }) {
  const result = await saveParsedSections({ groupId, fileId, pageCount, sections });
  return { count: result.saved };
}