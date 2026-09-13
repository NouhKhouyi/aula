# Material

Put your source material here: syllabus, lecture notes, transcripts, past exams,
textbooks converted to text.

**Everything in this folder is git-ignored** (except this file). Your textbooks
stay on your machine.

## Quick rules

- **Text and images only.** Agents can read `.txt`, `.md`, `.csv` and images
  (PNG, JPEG, GIF, WEBP, BMP). They **cannot** read PDF, DOCX, PPTX or EPUB.
- **Convert PDFs first:**
  ```bash
  pdftotext -layout "Material/notes.pdf" "Material/notes.txt"
  ```
  `-layout` keeps columns and tables intact.
- **Scanned PDFs** produce nothing useful. Screenshot the pages as PNG instead.

Full detail — including what kinds of material help most — is in
[`docs/material.md`](../docs/material.md).
