import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the AI module
vi.mock("./ai", () => ({
  generateCourseStructure: vi.fn().mockResolvedValue({
    title: "Preview Course: Quantum Physics",
    description: "A short introductory course on quantum physics",
    chapters: [
      {
        title: "Chapter 1: Wave-Particle Duality",
        description: "Understanding the dual nature of light and matter",
        lessons: [
          {
            title: "Introduction to Quantum Mechanics",
            content: "Quantum mechanics is a fundamental theory in physics...",
            keyTerms: [
              { term: "Wave-particle duality", definition: "The concept that particles exhibit both wave and particle properties" },
              { term: "Photon", definition: "A quantum of electromagnetic radiation" },
            ],
          },
          {
            title: "The Double-Slit Experiment",
            content: "The double-slit experiment demonstrates wave-particle duality...",
            keyTerms: [
              { term: "Interference pattern", definition: "A pattern formed by overlapping waves" },
            ],
          },
        ],
      },
      {
        title: "Chapter 2: Quantum States",
        description: "Exploring superposition and measurement",
        lessons: [
          {
            title: "Superposition Principle",
            content: "A quantum system can exist in multiple states simultaneously...",
            keyTerms: [
              { term: "Superposition", definition: "A quantum state that is a combination of multiple possible states" },
            ],
          },
        ],
      },
    ],
    relatedTopics: [
      { name: "Classical Mechanics", relationship: "parent", description: "The foundation that quantum mechanics extends" },
    ],
  }),
  generateLessonMedia: vi.fn(),
  chatAboutLesson: vi.fn(),
  generateCourseFromDocument: vi.fn(),
  analyzeDocumentContent: vi.fn(),
  generateLessonContent: vi.fn(),
  generateQuiz: vi.fn(),
  evaluateShortAnswer: vi.fn(),
  generateGlossaryDefinition: vi.fn(),
}));

// Mock the db module (preview doesn't use DB, but other routers need it)
vi.mock("./db", () => ({
  createIllustration: vi.fn(),
  getLessonById: vi.fn(),
  deleteRelatedTopicsByCourseId: vi.fn(),
  deleteGlossaryTermsByCourseId: vi.fn(),
  deleteIllustrationsByCourseId: vi.fn(),
  deleteFlashcardsByCourseId: vi.fn(),
  deleteQuizzesByCourseId: vi.fn(),
  deleteNotesByCourseId: vi.fn(),
  deleteLessonProgressByCourseId: vi.fn(),
  deleteLessonsByCourseId: vi.fn(),
  deleteChaptersByCourseId: vi.fn(),
  getFlashcardsByUserId: vi.fn().mockResolvedValue([]),
  createCourse: vi.fn(),
  createChapter: vi.fn(),
  createLesson: vi.fn(),
  createGlossaryTerms: vi.fn(),
  createRelatedTopics: vi.fn(),
  getCoursesByUserId: vi.fn().mockResolvedValue([]),
  getCourseById: vi.fn(),
  getChaptersByCourseId: vi.fn().mockResolvedValue([]),
  getChapterById: vi.fn(),
  getIllustrationsByLessonId: vi.fn().mockResolvedValue([]),
  getUserNote: vi.fn(),
  getLessonsByChapterId: vi.fn().mockResolvedValue([]),
  getGlossaryTermsByLessonId: vi.fn().mockResolvedValue([]),
  getGlossaryTermsByCourseId: vi.fn().mockResolvedValue([]),
  getRelatedTopicsByCourseId: vi.fn().mockResolvedValue([]),
  deleteCourse: vi.fn(),
  getFlashcardStats: vi.fn().mockResolvedValue({ total: 0, due: 0, learning: 0, mastered: 0 }),
  getDueFlashcards: vi.fn().mockResolvedValue([]),
  createFlashcard: vi.fn(),
  updateFlashcardReview: vi.fn(),
  updateFlashcard: vi.fn(),
  createFlashcardReview: vi.fn(),
  createStudyActivity: vi.fn(),
  updateStudyStreak: vi.fn(),
  getOrCreateStudyStreak: vi.fn().mockResolvedValue({
    id: 1, userId: 1, currentStreak: 0, longestStreak: 0, lastStudyDate: new Date(),
    createdAt: new Date(), updatedAt: new Date(),
  }),
  getOrCreateUserSettings: vi.fn().mockResolvedValue({
    id: 1, userId: 1, preferredProvider: "manus",
    anthropicApiKey: null, anthropicModel: null,
    openaiApiKey: null, openaiModel: null,
    openrouterApiKey: null, openrouterModel: null,
    grokApiKey: null, grokModel: null,
    createdAt: new Date(), updatedAt: new Date(),
  }),
  updateUserSettings: vi.fn(),
  calculateCourseCompletion: vi.fn(),
  getStudyActivitiesByUserId: vi.fn().mockResolvedValue([]),
  getLessonProgressByUserId: vi.fn().mockResolvedValue([]),
  markLessonComplete: vi.fn(),
  recordStudyActivity: vi.fn(),
  createImportedDocument: vi.fn(),
  getImportedDocumentById: vi.fn(),
  getImportedDocumentsByUserId: vi.fn().mockResolvedValue([]),
  getUnlinkedImportedDocuments: vi.fn().mockResolvedValue([]),
  updateImportedDocument: vi.fn(),
  deleteImportedDocument: vi.fn(),
  linkDocumentToCourse: vi.fn(),
  getAllCourses: vi.fn().mockResolvedValue([]),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Course Preview (Public)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates a preview course without authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.course.preview({ topic: "Quantum Physics" });

    expect(result).toBeDefined();
    expect(result.title).toContain("Quantum Physics");
    expect(result.chapters).toHaveLength(2);
    expect(result.chapters[0].lessons).toHaveLength(2);
    expect(result.chapters[1].lessons).toHaveLength(1);
  });

  it("returns chapters with lessons and key terms", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.course.preview({ topic: "Quantum Physics" });

    const firstLesson = result.chapters[0].lessons[0];
    expect(firstLesson.title).toBe("Introduction to Quantum Mechanics");
    expect(firstLesson.content).toBeTruthy();
    expect(firstLesson.keyTerms).toHaveLength(2);
    expect(firstLesson.keyTerms[0].term).toBe("Wave-particle duality");
  });

  it("returns related topics", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.course.preview({ topic: "Quantum Physics" });

    expect(result.relatedTopics).toHaveLength(1);
    expect(result.relatedTopics[0].name).toBe("Classical Mechanics");
  });

  it("rejects empty topic", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.course.preview({ topic: "" })).rejects.toThrow();
  });

  it("calls generateCourseStructure with preview defaults", async () => {
    const ai = await import("./ai");
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await caller.course.preview({ topic: "Quantum Physics" });

    expect(ai.generateCourseStructure).toHaveBeenCalledWith(
      "Quantum Physics",
      "easy",
      "short",
      "few",
      "introductory"
    );
  });
});
