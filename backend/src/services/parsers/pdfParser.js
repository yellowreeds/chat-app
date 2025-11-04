import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * ---------------------------------------------------------------------------
 * 🧩 Extract structured sections from a PDF using PyMuPDF (Python)
 * ---------------------------------------------------------------------------
 * Returns:
 * {
 *   pages: <number>,
 *   sections: [ { header: "Section 1", text: "..." }, ... ]
 * }
 */
export async function extractPdfStructurePyMuPDF(absPath) {
  const scriptPath = path.join(__dirname, "pymupdf_extractor.py");
  const PYTHON_PATH = process.env.PYTHON_BIN_PATH || "python3";

  console.log(`🔍 [PyMuPDF] Parsing file: ${absPath}`);
  console.log(`🐍 Python script path: ${scriptPath}`);

  // === Validate paths ===
  if (!fs.existsSync(absPath)) {
    throw new Error(`❌ PDF file not found at: ${absPath}`);
  }
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`❌ Python extractor script missing: ${scriptPath}`);
  }

  try {
    // === Execute the Python script ===
    const { stdout, stderr } = await execFileAsync(PYTHON_PATH, [scriptPath, absPath], {
      maxBuffer: 20 * 1024 * 1024, // allow up to 20MB output
    });

    if (stderr) console.warn("⚠️ Python stderr:", stderr.trim());

    // === Parse JSON output ===
    const parsed = JSON.parse(stdout);
    if (!parsed?.sections || !Array.isArray(parsed.sections)) {
      throw new Error("Invalid extractor output: missing 'sections'");
    }

    console.log(`✅ Parsed ${parsed.sections.length} sections from ${parsed.pages} pages`);
    return parsed;
  } catch (err) {
    console.error("💥 Python execution error:", err.message);
    throw new Error(`PyMuPDF extraction failed: ${err.message}`);
  }
}