import fitz
import json
import sys
import re
from pathlib import Path

def extract_sections(pdf_path):
    doc = fitz.open(pdf_path)
    full_text = []

    for page in doc:
        text = page.get_text("text")
        full_text.append(text)

    combined = "\n".join(full_text)

    # --- Normalize ---
    clean = combined.replace("\r", "").replace("\f", "\n")

    # --- Split into lines ---
    lines = [l.strip() for l in clean.split("\n") if l.strip()]

    sections = []
    current = {"header": "Untitled", "content": []}

    # === Header detection logic ===
    def is_header(line):
        # 1️⃣ Match "Section X" or "SECTION X"
        if re.match(r"^(section|SECTION)\s+\d+", line):
            return True
        # 2️⃣ Match numbered subsections like "4.2", "5.3.1", "2.1.3.4"
        if re.match(r"^\d+(\.\d+)+\s+.+", line):
            return True
        # 3️⃣ Match short ALL CAPS lines (titles)
        if line.isupper() and len(line) < 100:
            return True
        return False

    for line in lines:
        if is_header(line):
            # Save previous chunk
            if current["content"]:
                sections.append({
                    "header": current["header"],
                    "text": "\n".join(current["content"]).strip()
                })
            current = {"header": line, "content": []}
        else:
            current["content"].append(line)

    # Append the last one
    if current["content"]:
        sections.append({
            "header": current["header"],
            "text": "\n".join(current["content"]).strip()
        })

    # === Merge tiny fragments (avoid one-line headers) ===
    merged = []
    for sec in sections:
        if len(sec["text"]) < 60 and merged:
            merged[-1]["text"] += "\n" + sec["header"] + "\n" + sec["text"]
        else:
            merged.append(sec)

    return {
        "pages": doc.page_count,
        "sections": merged
    }

if __name__ == "__main__":
    pdf_path = Path(sys.argv[1])
    try:
        result = extract_sections(pdf_path)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e)}))