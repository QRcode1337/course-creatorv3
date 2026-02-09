import { describe, it, expect, vi } from "vitest";
import { generateCoursePdf, generateLessonPdf } from "./pdfGenerator";

describe("PDF Generation", () => {
  it(
    "should generate course PDF with valid data",
    async () => {
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

      const buffer = await generateCoursePdf(testData);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    },
    15000
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

      const buffer = await generateLessonPdf(testData);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    },
    15000
  );
});
