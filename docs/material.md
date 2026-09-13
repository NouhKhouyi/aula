# Working with your own material

`Material/` is where you put what your course actually uses: the syllabus,
lecture notes, transcripts, a textbook converted to text. The tutor reads it
before planning.

> [!important]
> `Material/` is **git-ignored**. Your textbooks stay on your machine. Don't
> remove that ignore rule, and don't commit copyrighted PDFs to a fork of this
> repo.

## What the tutor does with it

In order of importance — this is also what [`AGENTS.md`](../AGENTS.md) §4 tells
it:

1. **Material defines scope and notation, not pedagogy.** It will *not*
   summarise your notes or walk them front to back. That is precisely what this
   system exists to avoid. It still runs probe → plan → teach. Your material
   tells it *what* is in scope, what terminology your course uses, and how deep
   to go. The *how* stays with the teaching skill.
2. **It matches your notation.** If your lecturer writes $\mathbb{E}[X]$ and not
   $\mu_X$, so does the tutor. What you study and what you are taught should line
   up with no mental translation — that translation is pure overhead and a
   reliable source of exam mistakes.
3. **It bounds Phase 1.** The things worth probing are the ones your material
   takes for granted. That is where the edge that matters sits.
4. **It keeps verifying.** Your notes can be wrong. The accuracy rule still
   applies to them.
5. **If your material contradicts reality, it will say so — and separate the two
   things.** It tells you which version is correct and which one your course
   expects, distinctly. It will not hide the error, and it will not make you fail
   an exam.

## Pointing at it

Just say so. Any of these work:

- `@Material/syllabus.txt` (on agents that support file references)
- "base this on my notes in Material/"
- "chapter 3 of the Bertsekas text I put in Material"

If you mention material without saying which, it will list what is in
`Material/` and ask rather than guess.

## PDFs: convert first

Agent file tools read **text** and **images** (PNG, JPEG, GIF, WEBP, BMP). Every
other format is read as UTF-8 and comes out as binary noise. **PDF, DOCX, PPTX
and EPUB cannot be read directly.**

For PDFs, `pdftotext`:

```bash
pdftotext -layout "Material/lecture-notes.pdf" "Material/lecture-notes.txt"
```

`-layout` preserves columns and tables, which usually matters in lecture notes.
Ask the tutor to run it for you if you'd rather not.

**Getting `pdftotext`:**

| | |
|---|---|
| Windows | Ships with Git for Windows — add `C:\Program Files\Git\mingw64\bin` to PATH. Or `winget install --id oschwartz10612.Poppler` |
| macOS | `brew install poppler` |
| Debian / Ubuntu | `sudo apt install poppler-utils` |

**Scanned PDFs** (images with no text layer) return little or nothing from
`pdftotext`. Screenshot the relevant pages as PNG instead — the tutor can read
images.

**Large books** are fine as text; the tutor reads the table of contents first and
then only the sections in scope. A 250 000-word textbook does not need to fit in
context for chapter 1 to be taught well.

## Good material, ranked

What actually improves the lesson, most useful first:

1. **The syllabus or module outline.** Cheapest to provide, biggest effect on
   scope. It tells the tutor what is *not* in scope, which is half the battle.
2. **Past exams or problem sets.** They reveal the depth and the style of
   reasoning your course rewards, which no textbook states explicitly.
3. **Your own lecture notes**, even messy ones. They show the notation and what
   was actually emphasised.
4. **The textbook.** Useful, but the least information-dense per page for this
   purpose — it defines the ceiling, not the target.
5. **Your last graded assignment, with the marks.** Phase 1 gets a head start on
   where your edge is.
