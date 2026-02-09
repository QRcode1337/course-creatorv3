import { generateCoursePdf } from './server/pdfGenerator.ts';

// Test data
const testData = {
  title: "Test Course",
  description: "A test course for PDF export",
  topic: "Testing",
  approach: "balanced",
  chapters: [
    {
      title: "Chapter 1",
      description: "First chapter",
      lessons: [
        {
          title: "Lesson 1",
          content: "# Lesson Content\n\nThis is a test lesson with **bold** text and *italic* text.",
          illustrations: []
        }
      ]
    }
  ],
  glossaryTerms: [
    { term: "Test", definition: "A test term" }
  ],
  createdAt: new Date()
};

try {
  console.log("Generating PDF...");
  const buffer = await generateCoursePdf(testData);
  console.log("PDF generated successfully, size:", buffer.length, "bytes");
} catch (error) {
  console.error("Error generating PDF:", error);
}
