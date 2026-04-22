import PDFDocument from "pdfkit";
import axios from "axios";

interface LessonPdfData {
  courseTitle: string;
  chapterTitle: string;
  lessonTitle: string;
  lessonContent: string;
  illustrations: { url: string; caption?: string }[];
  glossaryTerms: { term: string; definition: string }[];
  userNotes?: string;
}

interface ChapterData {
  title: string;
  description: string;
  lessons: {
    title: string;
    content: string;
    illustrations: { url: string; caption?: string }[];
  }[];
}

interface CoursePdfData {
  title: string;
  description: string;
  topic: string;
  approach: string;
  chapters: ChapterData[];
  glossaryTerms: { term: string; definition: string }[];
  createdAt: Date;
}

// Colors
const COLORS = {
  primary: "#6366f1",
  primaryDark: "#4f46e5",
  secondary: "#64748b",
  text: "#1a1a2e",
  textLight: "#475569",
  textMuted: "#94a3b8",
  accent: "#f59e0b",
  border: "#e2e8f0",
  bgLight: "#f8fafc",
  bgCode: "#1e293b",
  codeText: "#e2e8f0",
  white: "#ffffff",
  coverGradientStart: "#6366f1",
  coverGradientEnd: "#a855f7",
};

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 10000,
    });
    return Buffer.from(response.data);
  } catch (error) {
    console.error(`Failed to fetch image: ${url}`, error instanceof Error ? error.message : error);
    return null;
  }
}

function stripMarkdown(text: string): string {
  // Remove markdown formatting for plain text rendering
  let result = text;
  result = result.replace(/^#{1,6}\s+/gm, ""); // headers
  result = result.replace(/\*\*(.+?)\*\*/g, "$1"); // bold
  result = result.replace(/\*(.+?)\*/g, "$1"); // italic
  result = result.replace(/`([^`]+)`/g, "$1"); // inline code
  result = result.replace(/```[\s\S]*?```/g, ""); // code blocks
  result = result.replace(/^[-*]\s+/gm, "• "); // list items
  result = result.replace(/^\d+\.\s+/gm, ""); // numbered lists
  return result.trim();
}

interface ParsedBlock {
  type: "heading1" | "heading2" | "heading3" | "paragraph" | "bullet" | "numbered" | "code" | "bold-paragraph";
  text: string;
}

function parseMarkdownBlocks(markdown: string): ParsedBlock[] {
  const lines = markdown.split("\n");
  const blocks: ParsedBlock[] = [];
  let inCodeBlock = false;
  let codeBuffer = "";

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        blocks.push({ type: "code", text: codeBuffer.trim() });
        codeBuffer = "";
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer += line + "\n";
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("### ")) {
      blocks.push({ type: "heading3", text: trimmed.replace(/^###\s+/, "") });
    } else if (trimmed.startsWith("## ")) {
      blocks.push({ type: "heading2", text: trimmed.replace(/^##\s+/, "") });
    } else if (trimmed.startsWith("# ")) {
      blocks.push({ type: "heading1", text: trimmed.replace(/^#\s+/, "") });
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      blocks.push({ type: "bullet", text: trimmed.replace(/^[-*]\s+/, "") });
    } else if (/^\d+\.\s+/.test(trimmed)) {
      blocks.push({ type: "numbered", text: trimmed.replace(/^\d+\.\s+/, "") });
    } else {
      blocks.push({ type: "paragraph", text: trimmed });
    }
  }

  if (codeBuffer.trim()) {
    blocks.push({ type: "code", text: codeBuffer.trim() });
  }

  return blocks;
}

function renderTextWithBold(doc: PDFKit.PDFDocument, text: string, options: { fontSize: number; color: string; lineGap?: number }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  doc.fontSize(options.fontSize);

  for (const part of parts) {
    if (part.startsWith("**") && part.endsWith("**")) {
      const boldText = part.slice(2, -2);
      doc.font("Helvetica-Bold").fillColor(COLORS.primary).text(boldText, { continued: true });
    } else if (part) {
      // Also handle inline code
      const codeParts = part.split(/(`[^`]+`)/g);
      for (const codePart of codeParts) {
        if (codePart.startsWith("`") && codePart.endsWith("`")) {
          const codeText = codePart.slice(1, -1);
          doc.font("Courier").fillColor(COLORS.textLight).text(codeText, { continued: true });
        } else if (codePart) {
          doc.font("Helvetica").fillColor(options.color).text(codePart, { continued: true });
        }
      }
    }
  }
  doc.text("", { continued: false }); // End the line
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  const pageHeight = doc.page.height;
  const bottomMargin = 60;
  if (doc.y + needed > pageHeight - bottomMargin) {
    doc.addPage();
  }
}

function renderMarkdownContent(doc: PDFKit.PDFDocument, content: string, leftMargin: number, rightMargin: number) {
  const blocks = parseMarkdownBlocks(content);
  const contentWidth = doc.page.width - leftMargin - rightMargin;

  for (const block of blocks) {
    switch (block.type) {
      case "heading1":
        ensureSpace(doc, 40);
        doc.moveDown(0.8);
        doc.font("Helvetica-Bold").fontSize(18).fillColor(COLORS.text);
        doc.text(stripMarkdown(block.text), leftMargin, undefined, { width: contentWidth });
        doc.moveTo(leftMargin, doc.y + 4).lineTo(leftMargin + contentWidth, doc.y + 4).strokeColor(COLORS.border).lineWidth(1).stroke();
        doc.moveDown(0.6);
        break;

      case "heading2":
        ensureSpace(doc, 35);
        doc.moveDown(0.6);
        doc.font("Helvetica-Bold").fontSize(15).fillColor(COLORS.text);
        doc.text(stripMarkdown(block.text), leftMargin, undefined, { width: contentWidth });
        doc.moveDown(0.4);
        break;

      case "heading3":
        ensureSpace(doc, 30);
        doc.moveDown(0.4);
        doc.font("Helvetica-Bold").fontSize(13).fillColor(COLORS.textLight);
        doc.text(stripMarkdown(block.text), leftMargin, undefined, { width: contentWidth });
        doc.moveDown(0.3);
        break;

      case "paragraph":
        ensureSpace(doc, 20);
        doc.font("Helvetica").fontSize(10.5).fillColor(COLORS.text);
        renderTextWithBold(doc, block.text, { fontSize: 10.5, color: COLORS.text });
        doc.moveDown(0.4);
        break;

      case "bullet":
        ensureSpace(doc, 18);
        doc.font("Helvetica").fontSize(10.5).fillColor(COLORS.text);
        doc.text("•  ", leftMargin + 10, undefined, { continued: true, width: contentWidth - 10 });
        renderTextWithBold(doc, block.text, { fontSize: 10.5, color: COLORS.text });
        doc.moveDown(0.2);
        break;

      case "numbered":
        ensureSpace(doc, 18);
        doc.font("Helvetica").fontSize(10.5).fillColor(COLORS.text);
        renderTextWithBold(doc, block.text, { fontSize: 10.5, color: COLORS.text });
        doc.moveDown(0.2);
        break;

      case "code":
        ensureSpace(doc, 40);
        const codeY = doc.y;
        const codeHeight = Math.min(block.text.split("\n").length * 14 + 16, 200);
        doc.roundedRect(leftMargin, codeY, contentWidth, codeHeight, 4)
          .fill(COLORS.bgCode);
        doc.font("Courier").fontSize(9).fillColor(COLORS.codeText);
        doc.text(block.text, leftMargin + 10, codeY + 8, { width: contentWidth - 20 });
        doc.y = codeY + codeHeight + 8;
        doc.moveDown(0.3);
        break;
    }
  }
}

function addPageFooter(doc: PDFKit.PDFDocument, text: string, pageNum: number) {
  const bottomY = doc.page.height - 40;
  doc.font("Helvetica").fontSize(8).fillColor(COLORS.textMuted);
  doc.text(text, 50, bottomY, { width: doc.page.width - 100, align: "center" });
}

// ========================================
// LESSON PDF GENERATION
// ========================================

export async function generateLessonPdf(data: LessonPdfData): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 50, bottom: 60, left: 50, right: 50 },
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const leftMargin = 50;
      const rightMargin = 50;
      const contentWidth = doc.page.width - leftMargin - rightMargin;

      // Header
      doc.rect(0, 0, doc.page.width, 4).fill(COLORS.primary);
      doc.moveDown(1);

      // Course title
      doc.font("Helvetica").fontSize(11).fillColor(COLORS.primary);
      doc.text(data.courseTitle, leftMargin, undefined, { width: contentWidth });

      // Chapter title
      doc.font("Helvetica").fontSize(10).fillColor(COLORS.secondary);
      doc.text(data.chapterTitle, leftMargin, undefined, { width: contentWidth });
      doc.moveDown(0.3);

      // Lesson title
      doc.font("Helvetica-Bold").fontSize(22).fillColor(COLORS.text);
      doc.text(data.lessonTitle, leftMargin, undefined, { width: contentWidth });

      // Divider
      doc.moveDown(0.5);
      doc.moveTo(leftMargin, doc.y).lineTo(leftMargin + contentWidth, doc.y).strokeColor(COLORS.primary).lineWidth(2).stroke();
      doc.moveDown(0.8);

      // Illustrations at top
      if (data.illustrations.length > 0) {
        for (const ill of data.illustrations) {
          const imgBuffer = await fetchImageBuffer(ill.url);
          if (imgBuffer) {
            ensureSpace(doc, 220);
            try {
              doc.image(imgBuffer, leftMargin, doc.y, {
                fit: [contentWidth, 200],
                align: "center",
              });
              doc.moveDown(0.3);
              if (ill.caption) {
                doc.font("Helvetica-Oblique").fontSize(9).fillColor(COLORS.secondary);
                doc.text(ill.caption, leftMargin, undefined, { width: contentWidth, align: "center" });
              }
              doc.moveDown(0.8);
            } catch (imgErr) {
              console.error("Failed to embed image in PDF:", imgErr);
            }
          }
        }
      }

      // Lesson content
      renderMarkdownContent(doc, data.lessonContent, leftMargin, rightMargin);

      // Glossary terms
      if (data.glossaryTerms.length > 0) {
        doc.addPage();
        doc.rect(0, 0, doc.page.width, 4).fill(COLORS.primary);
        doc.moveDown(1);

        doc.font("Helvetica-Bold").fontSize(16).fillColor(COLORS.text);
        doc.text("Key Terms", leftMargin);
        doc.moveTo(leftMargin, doc.y + 4).lineTo(leftMargin + contentWidth, doc.y + 4).strokeColor(COLORS.primary).lineWidth(2).stroke();
        doc.moveDown(0.8);

        for (const term of data.glossaryTerms) {
          ensureSpace(doc, 40);
          const termY = doc.y;
          doc.roundedRect(leftMargin, termY, contentWidth, 2, 0).fill(COLORS.bgLight);
          doc.rect(leftMargin, termY, 3, 35).fill(COLORS.primary);

          doc.font("Helvetica-Bold").fontSize(11).fillColor(COLORS.text);
          doc.text(term.term, leftMargin + 12, termY + 6, { width: contentWidth - 20 });

          doc.font("Helvetica").fontSize(10).fillColor(COLORS.textLight);
          doc.text(term.definition, leftMargin + 12, undefined, { width: contentWidth - 20 });
          doc.moveDown(0.6);
        }
      }

      // User notes
      if (data.userNotes) {
        ensureSpace(doc, 60);
        doc.moveDown(1);
        doc.font("Helvetica-Bold").fontSize(14).fillColor(COLORS.text);
        doc.text("My Notes", leftMargin);
        doc.moveDown(0.4);

        const notesY = doc.y;
        doc.roundedRect(leftMargin, notesY, contentWidth, 4, 0).fill("#fef3c7");
        doc.rect(leftMargin, notesY, 4, 80).fill(COLORS.accent);

        doc.font("Helvetica").fontSize(10).fillColor("#92400e");
        doc.text(data.userNotes, leftMargin + 14, notesY + 10, { width: contentWidth - 24 });
        doc.moveDown(1);
      }

      // Footer on all pages
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        addPageFooter(doc, `Generated by AI Course Creator • ${new Date().toLocaleDateString()}`, i + 1);
      }

      doc.end();
    } catch (error) {
      console.error("Error generating lesson PDF:", error);
      reject(new Error(`Failed to generate lesson PDF: ${error instanceof Error ? error.message : String(error)}`));
    }
  });
}

// ========================================
// COURSE PDF GENERATION
// ========================================

export async function generateCoursePdf(data: CoursePdfData): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 50, bottom: 60, left: 50, right: 50 },
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const leftMargin = 50;
      const rightMargin = 50;
      const contentWidth = doc.page.width - leftMargin - rightMargin;
      const pageHeight = doc.page.height;

      // ============================
      // COVER PAGE
      // ============================
      // Purple gradient background
      const grad = doc.linearGradient(0, 0, doc.page.width, pageHeight);
      grad.stop(0, COLORS.coverGradientStart);
      grad.stop(1, COLORS.coverGradientEnd);
      doc.rect(0, 0, doc.page.width, pageHeight).fill(grad);

      // Badge
      const badgeText = "AI-Generated Course";
      const badgeWidth = 180;
      const badgeX = (doc.page.width - badgeWidth) / 2;
      doc.roundedRect(badgeX, 200, badgeWidth, 30, 15).fill("rgba(255,255,255,0.2)");
      doc.font("Helvetica").fontSize(10).fillColor(COLORS.white);
      doc.text(badgeText, badgeX, 208, { width: badgeWidth, align: "center" });

      // Title
      doc.font("Helvetica-Bold").fontSize(32).fillColor(COLORS.white);
      doc.text(data.title, leftMargin + 20, 270, {
        width: contentWidth - 40,
        align: "center",
        lineGap: 6,
      });

      // Description
      doc.moveDown(1);
      doc.font("Helvetica").fontSize(13).fillColor("rgba(255,255,255,0.9)");
      doc.text(data.description, leftMargin + 40, undefined, {
        width: contentWidth - 80,
        align: "center",
        lineGap: 4,
      });

      // Stats
      const totalLessons = data.chapters.reduce((sum, ch) => sum + ch.lessons.length, 0);
      const statsY = 520;
      const statWidth = 120;
      const statsStartX = (doc.page.width - statWidth * 3) / 2;

      // Chapters stat
      doc.font("Helvetica-Bold").fontSize(28).fillColor(COLORS.white);
      doc.text(String(data.chapters.length), statsStartX, statsY, { width: statWidth, align: "center" });
      doc.font("Helvetica").fontSize(9).fillColor("rgba(255,255,255,0.7)");
      doc.text("CHAPTERS", statsStartX, statsY + 34, { width: statWidth, align: "center" });

      // Lessons stat
      doc.font("Helvetica-Bold").fontSize(28).fillColor(COLORS.white);
      doc.text(String(totalLessons), statsStartX + statWidth, statsY, { width: statWidth, align: "center" });
      doc.font("Helvetica").fontSize(9).fillColor("rgba(255,255,255,0.7)");
      doc.text("LESSONS", statsStartX + statWidth, statsY + 34, { width: statWidth, align: "center" });

      // Terms stat
      doc.font("Helvetica-Bold").fontSize(28).fillColor(COLORS.white);
      doc.text(String(data.glossaryTerms.length), statsStartX + statWidth * 2, statsY, { width: statWidth, align: "center" });
      doc.font("Helvetica").fontSize(9).fillColor("rgba(255,255,255,0.7)");
      doc.text("KEY TERMS", statsStartX + statWidth * 2, statsY + 34, { width: statWidth, align: "center" });

      // Meta info
      doc.font("Helvetica").fontSize(9).fillColor("rgba(255,255,255,0.6)");
      doc.text(
        `${data.approach} approach • Generated ${data.createdAt.toLocaleDateString()}`,
        leftMargin,
        680,
        { width: contentWidth, align: "center" }
      );

      // ============================
      // TABLE OF CONTENTS
      // ============================
      doc.addPage();
      doc.rect(0, 0, doc.page.width, 4).fill(COLORS.primary);
      doc.moveDown(1.5);

      doc.font("Helvetica-Bold").fontSize(24).fillColor(COLORS.text);
      doc.text("Table of Contents", leftMargin);
      doc.moveDown(1);

      let lessonCounter = 0;
      for (let ci = 0; ci < data.chapters.length; ci++) {
        const chapter = data.chapters[ci];
        ensureSpace(doc, 30);

        doc.font("Helvetica-Bold").fontSize(13).fillColor(COLORS.primary);
        doc.text(`Chapter ${ci + 1}: ${chapter.title}`, leftMargin);
        doc.moveDown(0.2);

        for (const lesson of chapter.lessons) {
          lessonCounter++;
          ensureSpace(doc, 18);
          doc.font("Helvetica").fontSize(10.5).fillColor(COLORS.textLight);
          doc.text(`    ${lessonCounter}. ${lesson.title}`, leftMargin + 15);
          doc.moveDown(0.1);
        }
        doc.moveDown(0.5);
      }

      // ============================
      // CHAPTER & LESSON CONTENT
      // ============================
      lessonCounter = 0;
      for (let ci = 0; ci < data.chapters.length; ci++) {
        const chapter = data.chapters[ci];

        // Chapter title page
        doc.addPage();
        doc.rect(0, 0, doc.page.width, 4).fill(COLORS.primary);

        doc.moveDown(4);
        doc.font("Helvetica").fontSize(12).fillColor(COLORS.primary);
        doc.text(`CHAPTER ${ci + 1}`, leftMargin, undefined, { width: contentWidth, align: "center" });
        doc.moveDown(0.3);

        doc.font("Helvetica-Bold").fontSize(26).fillColor(COLORS.text);
        doc.text(chapter.title, leftMargin, undefined, { width: contentWidth, align: "center", lineGap: 4 });
        doc.moveDown(0.8);

        doc.font("Helvetica").fontSize(11).fillColor(COLORS.textLight);
        doc.text(chapter.description, leftMargin + 30, undefined, {
          width: contentWidth - 60,
          align: "center",
          lineGap: 3,
        });

        // Lessons
        for (const lesson of chapter.lessons) {
          lessonCounter++;
          doc.addPage();
          doc.rect(0, 0, doc.page.width, 4).fill(COLORS.primary);
          doc.moveDown(1);

          // Lesson header
          doc.font("Helvetica").fontSize(10).fillColor(COLORS.primary);
          doc.text(`Chapter ${ci + 1} • Lesson ${lessonCounter}`, leftMargin);
          doc.moveDown(0.3);

          doc.font("Helvetica-Bold").fontSize(18).fillColor(COLORS.text);
          doc.text(lesson.title, leftMargin, undefined, { width: contentWidth });

          doc.moveDown(0.3);
          doc.moveTo(leftMargin, doc.y).lineTo(leftMargin + contentWidth, doc.y).strokeColor(COLORS.primary).lineWidth(1.5).stroke();
          doc.moveDown(0.6);

          // Illustrations
          if (lesson.illustrations && lesson.illustrations.length > 0) {
            for (const ill of lesson.illustrations) {
              const imgBuffer = await fetchImageBuffer(ill.url);
              if (imgBuffer) {
                ensureSpace(doc, 220);
                try {
                  doc.image(imgBuffer, leftMargin, doc.y, {
                    fit: [contentWidth, 200],
                    align: "center",
                  });
                  doc.moveDown(0.3);
                  if (ill.caption) {
                    doc.font("Helvetica-Oblique").fontSize(9).fillColor(COLORS.secondary);
                    doc.text(ill.caption, leftMargin, undefined, { width: contentWidth, align: "center" });
                  }
                  doc.moveDown(0.6);
                } catch (imgErr) {
                  console.error("Failed to embed image:", imgErr);
                }
              }
            }
          }

          // Lesson content
          renderMarkdownContent(doc, lesson.content, leftMargin, rightMargin);
        }
      }

      // ============================
      // GLOSSARY
      // ============================
      if (data.glossaryTerms.length > 0) {
        doc.addPage();
        doc.rect(0, 0, doc.page.width, 4).fill(COLORS.primary);
        doc.moveDown(1.5);

        doc.font("Helvetica-Bold").fontSize(24).fillColor(COLORS.text);
        doc.text("Glossary", leftMargin);
        doc.moveDown(0.3);
        doc.moveTo(leftMargin, doc.y).lineTo(leftMargin + contentWidth, doc.y).strokeColor(COLORS.primary).lineWidth(2).stroke();
        doc.moveDown(0.8);

        const sortedTerms = [...data.glossaryTerms].sort((a, b) => a.term.localeCompare(b.term));

        for (const term of sortedTerms) {
          ensureSpace(doc, 45);

          doc.font("Helvetica-Bold").fontSize(11).fillColor(COLORS.primary);
          doc.text(term.term, leftMargin + 8, undefined, { width: contentWidth - 16 });

          doc.font("Helvetica").fontSize(10).fillColor(COLORS.textLight);
          doc.text(term.definition, leftMargin + 8, undefined, { width: contentWidth - 16 });
          doc.moveDown(0.5);
        }
      }

      // Footer on all pages
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        const footerText = i === 0 ? "" : `${data.title} • Page ${i + 1}`;
        if (footerText) {
          addPageFooter(doc, footerText, i + 1);
        }
      }

      doc.end();
    } catch (error) {
      console.error("Error generating course PDF:", error);
      reject(new Error(`Failed to generate course PDF: ${error instanceof Error ? error.message : String(error)}`));
    }
  });
}
