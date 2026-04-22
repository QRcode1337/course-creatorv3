import { describe, it, expect } from "vitest";
import { generateCoursePdf, generateLessonPdf } from "./pdfGenerator";

describe("PDF Generation (pdfkit)", () => {
  it("should generate course PDF with valid data", async () => {
    const testData = {
      title: "Test Course",
      description: "A test course for validation",
      topic: "Testing",
      approach: "balanced",
      chapters: [
        {
          title: "Chapter 1: Introduction",
          description: "First chapter covering basics",
          lessons: [
            {
              title: "Lesson 1: Getting Started",
              content: "# Getting Started\n\nThis is the **first lesson** with some content.\n\n## Key Concepts\n\n- Concept one\n- Concept two\n- Concept three\n\n### Details\n\nSome detailed explanation here.",
              illustrations: [],
            },
            {
              title: "Lesson 2: Advanced Topics",
              content: "# Advanced Topics\n\nThis lesson covers **advanced** material.\n\n```\ncode example here\n```\n\nMore content follows.",
              illustrations: [],
            },
          ],
        },
        {
          title: "Chapter 2: Deep Dive",
          description: "Second chapter with deeper content",
          lessons: [
            {
              title: "Lesson 3: Deep Analysis",
              content: "## Deep Analysis\n\nAnalyzing the topic in depth with `inline code` examples.",
              illustrations: [],
            },
          ],
        },
      ],
      glossaryTerms: [
        { term: "Testing", definition: "The process of verifying software behavior" },
        { term: "PDF", definition: "Portable Document Format" },
        { term: "Algorithm", definition: "A step-by-step procedure for solving a problem" },
      ],
      createdAt: new Date(),
    };

    const buffer = await generateCoursePdf(testData);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    // PDF files start with %PDF
    expect(buffer.toString("ascii", 0, 4)).toBe("%PDF");
  }, 15000);

  it("should generate lesson PDF with valid data", async () => {
    const testData = {
      courseTitle: "Test Course",
      chapterTitle: "Chapter 1: Introduction",
      lessonTitle: "Lesson 1: Getting Started",
      lessonContent: "# Getting Started\n\nThis is the **first lesson** with some content.\n\n## Key Concepts\n\n- Concept one\n- Concept two\n\n### Code Example\n\n```\nconst x = 1;\n```",
      illustrations: [],
      glossaryTerms: [
        { term: "Testing", definition: "The process of verifying software behavior" },
        { term: "PDF", definition: "Portable Document Format" },
      ],
    };

    const buffer = await generateLessonPdf(testData);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    // PDF files start with %PDF
    expect(buffer.toString("ascii", 0, 4)).toBe("%PDF");
  }, 10000);

  it("should generate lesson PDF with user notes", async () => {
    const testData = {
      courseTitle: "Test Course",
      chapterTitle: "Chapter 1",
      lessonTitle: "Lesson with Notes",
      lessonContent: "Some lesson content here.",
      illustrations: [],
      glossaryTerms: [],
      userNotes: "These are my personal notes about this lesson.",
    };

    const buffer = await generateLessonPdf(testData);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  }, 10000);

  it("should generate course PDF with empty chapters", async () => {
    const testData = {
      title: "Empty Course",
      description: "A course with no chapters",
      topic: "Nothing",
      approach: "balanced",
      chapters: [],
      glossaryTerms: [],
      createdAt: new Date(),
    };

    const buffer = await generateCoursePdf(testData);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  }, 10000);

  it("should handle markdown formatting correctly", async () => {
    const testData = {
      courseTitle: "Markdown Test",
      chapterTitle: "Chapter 1",
      lessonTitle: "Markdown Lesson",
      lessonContent: [
        "# Heading 1",
        "## Heading 2",
        "### Heading 3",
        "",
        "Regular paragraph with **bold text** and *italic text*.",
        "",
        "- Bullet item 1",
        "- Bullet item 2",
        "",
        "1. Numbered item 1",
        "2. Numbered item 2",
        "",
        "```",
        "const code = 'block';",
        "```",
        "",
        "Inline `code` example.",
      ].join("\n"),
      illustrations: [],
      glossaryTerms: [],
    };

    const buffer = await generateLessonPdf(testData);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  }, 10000);
});
