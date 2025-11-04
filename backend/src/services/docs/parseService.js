import { extractPdfStructurePyMuPDF } from "../parsers/pdfParser.js";

export async function parsePdf(filePath) {
  const parsed = await extractPdfStructurePyMuPDF(filePath);
  return {
    pages: parsed.pages,
    sections: parsed.sections,
  };
}