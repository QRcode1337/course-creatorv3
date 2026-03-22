import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { generateCoursePdf, generateLessonPdf } from "./pdfGenerator";

describe("PDF Generation", () => {
  // Set longer timeout for all tests in this suite
  vi.setConfig({ testTimeout: 35000 });
  it(
    "should generate course PDF with valid data",
    async () => {
      console.log("[test] Starting course PDF generation test...");
      const testData = {
        title: "Test Course",
        description: "A test course",
        topic: "Testing",
        approach: "balanced",
        chapters: [
          {
            title: "Chapter 1",
            description: "First chapter",
            lessons: [
              {
                title: "Lesson 1",
                content: "# Lesson Content\n\nThis is test content.",
                illustrations: [],
              },
            ],
          },
        ],
        glossaryTerms: [{ term: "Test", definition: "A test term" }],
        createdAt: new Date(),
      };

      console.log("[test] Calling generateCoursePdf...");
      const buffer = await generateCoursePdf(testData);
      console.log(`[test] Course PDF generated: ${buffer.length} bytes`);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    },
    30000  // 30 seconds for course PDF with multiple chapters
  );

  it(
    "should generate lesson PDF with valid data",
    async () => {
      const testData = {
        courseTitle: "Test Course",
        chapterTitle: "Chapter 1",
        lessonTitle: "Lesson 1",
        lessonContent: "# Lesson Content\n\nThis is test content.",
        illustrations: [],
        glossaryTerms: [{ term: "Test", definition: "A test term" }],
      };

      console.log("[test] Calling generateLessonPdf...");
      const buffer = await generateLessonPdf(testData);
      console.log(`[test] Lesson PDF generated: ${buffer.length} bytes`);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    },
    20000  // 20 seconds for lesson PDF
  );
});
