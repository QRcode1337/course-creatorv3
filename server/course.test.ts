import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the AI module
vi.mock("./ai", () => ({
  generateLessonMedia: vi.fn().mockResolvedValue({
    url: "https://example.com/generated-image.png",
  }),
  chatAboutLesson: vi.fn().mockResolvedValue("This is an AI response about the lesson."),
  generateCourseFromDocument: vi.fn().mockResolvedValue({
    title: "Document Course",
    description: "Course from document",
    chapters: [
      {
        title: "Chapter 1",
        description: "First chapter",
        lessons: [
          {
            title: "Lesson 1",
            content: "Lesson content from document",
            keyTerms: [{ term: "Doc Term", definition: "Doc definition" }],
          },
        ],
      },
    ],
    relatedTopics: [{ name: "Doc Topic", relationship: "sibling", description: "Related" }],
  }),
  analyzeDocumentContent: vi.fn().mockResolvedValue({
    suggestedTitle: "Suggested Title",
    summary: "Document summary",
    mainTopics: ["Topic 1", "Topic 2"],
    estimatedChapters: 5,
    recommendedApproach: "balanced",
    recommendedDepth: "intermediate",
  }),
  generateCourseStructure: vi.fn().mockResolvedValue({
    title: "Test Course",
    description: "A test course description",
    chapters: [
      {
        title: "Chapter 1",
        description: "First chapter",
        lessons: [
          {
            title: "Lesson 1",
            content: "Lesson content here",
            keyTerms: [
              { term: "Term 1", definition: "Definition 1" },
            ],
          },
        ],
      },
    ],
    relatedTopics: [
      { name: "Related Topic 1", relationship: "sibling", description: "A related topic" },
    ],
  }),
  generateLessonContent: vi.fn().mockResolvedValue({
    content: "Generated lesson content",
    keyTerms: [{ term: "New Term", definition: "New definition" }],
  }),
  generateQuiz: vi.fn().mockResolvedValue({
    questions: [
      {
        type: "multiple_choice",
        question: "What is 2+2?",
        options: ["3", "4", "5", "6"],
        correctAnswer: "4",
        explanation: "Basic math",
      },
      {
        type: "short_answer",
        question: "Explain addition",
        correctAnswer: "Addition is combining numbers",
        explanation: "Mathematical operation",
      },
    ],
  }),
  evaluateShortAnswer: vi.fn().mockResolvedValue({
    score: 85,
    feedback: "Good answer!",
  }),
  generateGlossaryDefinition: vi.fn().mockResolvedValue({
    definition: "A generated definition",
  }),
}));

// Mock the db module
vi.mock("./db", () => ({
  createIllustration: vi.fn().mockResolvedValue(1),
  getLessonById: vi.fn().mockResolvedValue({
    id: 1,
    chapterId: 1,
    courseId: 1,
    title: "Test Lesson",
    content: "Test content",
    orderIndex: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  deleteRelatedTopicsByCourseId: vi.fn().mockResolvedValue(undefined),
  deleteGlossaryTermsByCourseId: vi.fn().mockResolvedValue(undefined),
  deleteIllustrationsByCourseId: vi.fn().mockResolvedValue(undefined),
  deleteFlashcardsByCourseId: vi.fn().mockResolvedValue(undefined),
  deleteQuizzesByCourseId: vi.fn().mockResolvedValue(undefined),
  deleteNotesByCourseId: vi.fn().mockResolvedValue(undefined),
  deleteLessonProgressByCourseId: vi.fn().mockResolvedValue(undefined),
  deleteLessonsByCourseId: vi.fn().mockResolvedValue(undefined),
  deleteChaptersByCourseId: vi.fn().mockResolvedValue(undefined),
  getFlashcardsByUserId: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 1,
      courseId: 1,
      lessonId: 1,
      front: "What is X?",
      back: "X is Y",
      easeFactor: 2.5,
      interval: 1,
      repetitions: 0,
      nextReviewDate: new Date(),
      status: "new",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  createCourse: vi.fn().mockResolvedValue(1),
  createChapter: vi.fn().mockResolvedValue(1),
  createLesson: vi.fn().mockResolvedValue(1),
  createGlossaryTerms: vi.fn().mockResolvedValue(undefined),
  createRelatedTopics: vi.fn().mockResolvedValue(undefined),
  getCoursesByUserId: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 1,
      title: "Test Course",
      description: "Test description",
      topic: "Testing",
      approach: "balanced",
      courseLength: "medium",
      lessonsPerChapter: "moderate",
      contentDepth: "intermediate",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getCourseById: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    title: "Test Course",
    description: "Test description",
    topic: "Testing",
    approach: "balanced",
    courseLength: "medium",
    lessonsPerChapter: "moderate",
    contentDepth: "intermediate",
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  getChaptersByCourseId: vi.fn().mockResolvedValue([
    { id: 1, courseId: 1, title: "Chapter 1", description: "First chapter", orderIndex: 0 },
  ]),
  getChapterById: vi.fn().mockResolvedValue({
    id: 1, courseId: 1, title: "Chapter 1", description: "First chapter", orderIndex: 0,
  }),
  getIllustrationsByLessonId: vi.fn().mockResolvedValue([
    { id: 1, lessonId: 1, courseId: 1, imageUrl: "https://example.com/image.png", prompt: "Test illustration" },
  ]),
  getUserNote: vi.fn().mockResolvedValue({
    id: 1, userId: 1, lessonId: 1, courseId: 1, content: "My notes",
  }),
  getLessonsByChapterId: vi.fn().mockResolvedValue([
    { id: 1, chapterId: 1, courseId: 1, title: "Lesson 1", content: "Content", orderIndex: 0 },
  ]),
  getGlossaryTermsByLessonId: vi.fn().mockResolvedValue([
    { id: 1, lessonId: 1, courseId: 1, term: "Term 1", definition: "Definition 1" },
  ]),
  getGlossaryTermsByCourseId: vi.fn().mockResolvedValue([
    { id: 1, lessonId: 1, courseId: 1, term: "Term 1", definition: "Definition 1" },
  ]),
  getRelatedTopicsByCourseId: vi.fn().mockResolvedValue([
    { id: 1, courseId: 1, topicName: "Related Topic", relationship: "sibling", description: "Description" },
  ]),
  deleteCourse: vi.fn().mockResolvedValue(undefined),
  
  getFlashcardStats: vi.fn().mockResolvedValue({
    total: 10,
    due: 3,
    learning: 5,
    mastered: 2,
  }),
  getDueFlashcards: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 1,
      courseId: 1,
      lessonId: 1,
      front: "What is X?",
      back: "X is Y",
      easeFactor: 2.5,
      interval: 1,
      repetitions: 0,
      nextReviewDate: new Date(),
      status: "new",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  createFlashcard: vi.fn().mockResolvedValue(1),
  updateFlashcardReview: vi.fn().mockResolvedValue(undefined),
  updateFlashcard: vi.fn().mockResolvedValue(undefined),
  createFlashcardReview: vi.fn().mockResolvedValue(1),
  createStudyActivity: vi.fn().mockResolvedValue(1),
  updateStudyStreak: vi.fn().mockResolvedValue(undefined),
  getOrCreateStudyStreak: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    currentStreak: 5,
    longestStreak: 10,
    lastStudyDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  getOrCreateUserSettings: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    preferredProvider: "manus",
    anthropicApiKey: null,
    anthropicModel: null,
    openaiApiKey: null,
    openaiModel: null,
    openrouterApiKey: null,
    openrouterModel: null,
    grokApiKey: null,
    grokModel: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  updateUserSettings: vi.fn().mockResolvedValue(undefined),
  calculateCourseCompletion: vi.fn().mockResolvedValue(50),
  getStudyActivitiesByUserId: vi.fn().mockResolvedValue([]),
  getLessonProgressByUserId: vi.fn().mockResolvedValue([]),
  markLessonComplete: vi.fn().mockResolvedValue(undefined),
  recordStudyActivity: vi.fn().mockResolvedValue(undefined),
  createImportedDocument: vi.fn().mockResolvedValue(1),
  getImportedDocumentById: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    fileName: "test.pdf",
    fileType: "pdf",
    fileUrl: "https://example.com/test.pdf",
    fileKey: "documents/test.pdf",
    fileSize: 1024,
    extractedContent: "This is the extracted content from the document.",
    status: "ready",
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  getImportedDocumentsByUserId: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 1,
      fileName: "test.pdf",
      fileType: "pdf",
      fileUrl: "https://example.com/test.pdf",
      fileKey: "documents/test.pdf",
      fileSize: 1024,
      extractedContent: "Extracted content",
      status: "ready",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getUnlinkedImportedDocuments: vi.fn().mockResolvedValue([]),
  updateImportedDocument: vi.fn().mockResolvedValue(undefined),
  deleteImportedDocument: vi.fn().mockResolvedValue(undefined),
  linkDocumentToCourse: vi.fn().mockResolvedValue(undefined),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Course Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists courses for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const courses = await caller.course.list();

    expect(courses).toHaveLength(1);
    expect(courses[0].title).toBe("Test Course");
  });

  it("gets a specific course by ID", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const course = await caller.course.get({ id: 1 });

    expect(course).toBeDefined();
    expect(course?.title).toBe("Test Course");
    expect(course?.chapters).toBeDefined();
  });

  it("creates a new course with AI generation", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.course.create({
      topic: "Machine Learning",
      approach: "balanced",
      courseLength: "medium",
      lessonsPerChapter: "moderate",
      contentDepth: "intermediate",
    });

    expect(result.courseId).toBe(1);
    expect(result.title).toBe("Test Course");
  });

  it("deletes a course owned by the user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.course.delete({ id: 1 });

    expect(result.success).toBe(true);
  });
});

describe("Flashcard Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gets flashcard statistics", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.flashcard.getStats({ courseId: 1 });

    expect(stats.total).toBe(10);
    expect(stats.due).toBe(3);
    expect(stats.learning).toBe(5);
    expect(stats.mastered).toBe(2);
  });

  it("gets due flashcards for review", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const flashcards = await caller.flashcard.getDue();

    expect(flashcards).toHaveLength(1);
    expect(flashcards[0].front).toBe("What is X?");
  });

  it("reviews a flashcard with SM-2 algorithm", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.flashcard.review({
      flashcardId: 1,
      quality: 4,
    });

    expect(result.success).toBe(true);
    expect(result.nextReviewDate).toBeDefined();
  });
});

describe("Progress Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gets study streak", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const streak = await caller.progress.getStreak();

    expect(streak.currentStreak).toBe(5);
    expect(streak.longestStreak).toBe(10);
  });

  it("gets overall progress", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const progress = await caller.progress.getOverall();

    expect(progress.courses).toBeDefined();
    expect(progress.flashcardStats).toBeDefined();
    expect(progress.streak).toBeDefined();
  });
});

describe("Settings Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gets user settings", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const settings = await caller.settings.get();

    expect(settings.preferredProvider).toBe("manus");
  });

  it("updates user settings", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.settings.update({
      preferredProvider: "anthropic",
      anthropicApiKey: "test-key",
    });

    expect(result.success).toBe(true);
  });
});

describe("Document Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists user documents", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const documents = await caller.document.list();

    expect(documents).toHaveLength(1);
    expect(documents[0].fileName).toBe("test.pdf");
    expect(documents[0].status).toBe("ready");
  });

  it("gets a specific document by ID", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const document = await caller.document.getById({ id: 1 });

    expect(document.fileName).toBe("test.pdf");
    expect(document.extractedContent).toBe("This is the extracted content from the document.");
  });

  it("analyzes document content", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const analysis = await caller.document.analyze({ documentId: 1 });

    expect(analysis.suggestedTitle).toBe("Suggested Title");
    expect(analysis.summary).toBe("Document summary");
    expect(analysis.mainTopics).toContain("Topic 1");
    expect(analysis.recommendedApproach).toBe("balanced");
  });

  it("generates course from documents", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.document.generateCourse({
      documentIds: [1],
      approach: "balanced",
      courseLength: "medium",
      lessonsPerChapter: "moderate",
      contentDepth: "intermediate",
    });

    expect(result.success).toBe(true);
    expect(result.courseId).toBeDefined();
  });

  it("deletes a document", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.document.delete({ id: 1 });

    expect(result.success).toBe(true);
  });
});


describe("AI Chat Router", () => {
  it("responds to lesson chat", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.aiChat.chat({
      lessonId: 1,
      messages: [
        { role: "user", content: "Explain the main concept" }
      ],
    });

    expect(result).toHaveProperty("response");
    expect(typeof result.response).toBe("string");
  });
});


// Mock puppeteer for PDF generation test
vi.mock("puppeteer", () => ({
  default: {
    launch: vi.fn().mockResolvedValue({
      newPage: vi.fn().mockResolvedValue({
        setContent: vi.fn().mockResolvedValue(undefined),
        pdf: vi.fn().mockResolvedValue(Buffer.from("PDF content")),
      }),
      close: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

describe("Lesson PDF Export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports lesson as PDF with all content", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.lesson.exportPdf({ lessonId: 1 });

    expect(result.pdf).toBeDefined();
    expect(result.filename).toContain(".pdf");
    // PDF is base64 encoded
    expect(typeof result.pdf).toBe("string");
  });
});


describe("Batch Image Generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates illustrations for all lessons in a course", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.illustration.generateAll({
      courseId: 1,
      mediaType: "illustration",
      visualStyle: "modern",
      skipExisting: true,
    });

    expect(result.success).toBe(true);
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("generated");
    expect(result).toHaveProperty("skipped");
    expect(result).toHaveProperty("failed");
  });
});
