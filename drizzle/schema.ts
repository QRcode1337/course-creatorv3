import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, float, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * User settings for AI provider configuration
 */
export const userSettings = mysqlTable("user_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  preferredProvider: mysqlEnum("preferredProvider", ["manus", "anthropic", "openai", "openrouter", "grok"]).default("manus").notNull(),
  anthropicApiKey: text("anthropicApiKey"),
  anthropicModel: varchar("anthropicModel", { length: 64 }),
  openaiApiKey: text("openaiApiKey"),
  openaiModel: varchar("openaiModel", { length: 64 }),
  openrouterApiKey: text("openrouterApiKey"),
  openrouterModel: varchar("openrouterModel", { length: 128 }),
  grokApiKey: text("grokApiKey"),
  grokModel: varchar("grokModel", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = typeof userSettings.$inferInsert;

/**
 * Courses table - main course entity
 */
export const courses = mysqlTable("courses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  topic: varchar("topic", { length: 255 }).notNull(),
  approach: mysqlEnum("approach", ["balanced", "rigorous", "easy"]).default("balanced").notNull(),
  courseLength: mysqlEnum("courseLength", ["short", "medium", "comprehensive"]).default("medium").notNull(),
  lessonsPerChapter: mysqlEnum("lessonsPerChapter", ["few", "moderate", "many"]).default("moderate").notNull(),
  contentDepth: mysqlEnum("contentDepth", ["introductory", "intermediate", "advanced"]).default("intermediate").notNull(),
  completionPercentage: float("completionPercentage").default(0).notNull(),
  isPublished: boolean("isPublished").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Course = typeof courses.$inferSelect;
export type InsertCourse = typeof courses.$inferInsert;

/**
 * Chapters table - course chapters
 */
export const chapters = mysqlTable("chapters", {
  id: int("id").autoincrement().primaryKey(),
  courseId: int("courseId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  orderIndex: int("orderIndex").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Chapter = typeof chapters.$inferSelect;
export type InsertChapter = typeof chapters.$inferInsert;

/**
 * Lessons table - individual lessons within chapters
 */
export const lessons = mysqlTable("lessons", {
  id: int("id").autoincrement().primaryKey(),
  chapterId: int("chapterId").notNull(),
  courseId: int("courseId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  orderIndex: int("orderIndex").notNull(),
  isCompleted: boolean("isCompleted").default(false).notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Lesson = typeof lessons.$inferSelect;
export type InsertLesson = typeof lessons.$inferInsert;

/**
 * Glossary terms extracted from lessons
 */
export const glossaryTerms = mysqlTable("glossary_terms", {
  id: int("id").autoincrement().primaryKey(),
  lessonId: int("lessonId").notNull(),
  courseId: int("courseId").notNull(),
  term: varchar("term", { length: 255 }).notNull(),
  definition: text("definition"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GlossaryTerm = typeof glossaryTerms.$inferSelect;
export type InsertGlossaryTerm = typeof glossaryTerms.$inferInsert;

/**
 * Flashcards generated from glossary terms with SM-2 algorithm data
 */
export const flashcards = mysqlTable("flashcards", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  glossaryTermId: int("glossaryTermId").notNull(),
  lessonId: int("lessonId").notNull(),
  courseId: int("courseId").notNull(),
  front: text("front").notNull(),
  back: text("back").notNull(),
  // SM-2 algorithm fields
  easeFactor: float("easeFactor").default(2.5).notNull(),
  interval: int("interval").default(0).notNull(),
  repetitions: int("repetitions").default(0).notNull(),
  nextReviewDate: timestamp("nextReviewDate").defaultNow().notNull(),
  status: mysqlEnum("status", ["new", "learning", "review", "mastered"]).default("new").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Flashcard = typeof flashcards.$inferSelect;
export type InsertFlashcard = typeof flashcards.$inferInsert;

/**
 * Flashcard review history
 */
export const flashcardReviews = mysqlTable("flashcard_reviews", {
  id: int("id").autoincrement().primaryKey(),
  flashcardId: int("flashcardId").notNull(),
  userId: int("userId").notNull(),
  quality: int("quality").notNull(), // 0-5 rating
  reviewedAt: timestamp("reviewedAt").defaultNow().notNull(),
});

export type FlashcardReview = typeof flashcardReviews.$inferSelect;
export type InsertFlashcardReview = typeof flashcardReviews.$inferInsert;

/**
 * Quizzes for lessons
 */
export const quizzes = mysqlTable("quizzes", {
  id: int("id").autoincrement().primaryKey(),
  lessonId: int("lessonId").notNull(),
  courseId: int("courseId").notNull(),
  questions: json("questions").notNull(), // Array of quiz questions
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Quiz = typeof quizzes.$inferSelect;
export type InsertQuiz = typeof quizzes.$inferInsert;

/**
 * Quiz results/attempts
 */
export const quizResults = mysqlTable("quiz_results", {
  id: int("id").autoincrement().primaryKey(),
  quizId: int("quizId").notNull(),
  userId: int("userId").notNull(),
  lessonId: int("lessonId").notNull(),
  score: float("score").notNull(),
  totalQuestions: int("totalQuestions").notNull(),
  answers: json("answers").notNull(), // User's answers
  feedback: json("feedback"), // AI feedback for short answers
  completedAt: timestamp("completedAt").defaultNow().notNull(),
});

export type QuizResult = typeof quizResults.$inferSelect;
export type InsertQuizResult = typeof quizResults.$inferInsert;

/**
 * Illustrations/media for lessons
 */
export const illustrations = mysqlTable("illustrations", {
  id: int("id").autoincrement().primaryKey(),
  lessonId: int("lessonId").notNull(),
  courseId: int("courseId").notNull(),
  imageUrl: text("imageUrl").notNull(),
  fileKey: varchar("fileKey", { length: 512 }),
  mediaType: mysqlEnum("mediaType", ["illustration", "infographic", "data_visualization", "diagram"]).default("illustration").notNull(),
  visualStyle: mysqlEnum("visualStyle", ["minimalist", "detailed", "colorful", "technical", "modern"]).default("modern").notNull(),
  prompt: text("prompt"),
  caption: text("caption"),
  orderIndex: int("orderIndex").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Illustration = typeof illustrations.$inferSelect;
export type InsertIllustration = typeof illustrations.$inferInsert;

/**
 * User notes for lessons
 */
export const userNotes = mysqlTable("user_notes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  lessonId: int("lessonId").notNull(),
  courseId: int("courseId").notNull(),
  content: text("content"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserNote = typeof userNotes.$inferSelect;
export type InsertUserNote = typeof userNotes.$inferInsert;

/**
 * Related topics for knowledge graph
 */
export const relatedTopics = mysqlTable("related_topics", {
  id: int("id").autoincrement().primaryKey(),
  courseId: int("courseId").notNull(),
  relatedCourseId: int("relatedCourseId"),
  topicName: varchar("topicName", { length: 255 }).notNull(),
  relationship: mysqlEnum("relationship", ["parent", "child", "sibling"]).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RelatedTopic = typeof relatedTopics.$inferSelect;
export type InsertRelatedTopic = typeof relatedTopics.$inferInsert;

/**
 * Lesson completion tracking for progress
 */
export const lessonProgress = mysqlTable("lesson_progress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  lessonId: int("lessonId").notNull(),
  courseId: int("courseId").notNull(),
  isCompleted: boolean("isCompleted").default(false).notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LessonProgress = typeof lessonProgress.$inferSelect;
export type InsertLessonProgress = typeof lessonProgress.$inferInsert;

/**
 * Study streaks tracking
 */
export const studyStreaks = mysqlTable("study_streaks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  currentStreak: int("currentStreak").default(0).notNull(),
  longestStreak: int("longestStreak").default(0).notNull(),
  lastStudyDate: timestamp("lastStudyDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StudyStreak = typeof studyStreaks.$inferSelect;
export type InsertStudyStreak = typeof studyStreaks.$inferInsert;

/**
 * Study activity log for calendar
 */
export const studyActivities = mysqlTable("study_activities", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  activityType: mysqlEnum("activityType", ["lesson_completed", "flashcard_review", "quiz_completed"]).notNull(),
  courseId: int("courseId"),
  lessonId: int("lessonId"),
  flashcardCount: int("flashcardCount"),
  quizScore: float("quizScore"),
  activityDate: timestamp("activityDate").defaultNow().notNull(),
});

export type StudyActivity = typeof studyActivities.$inferSelect;
export type InsertStudyActivity = typeof studyActivities.$inferInsert;


/**
 * Imported documents for course generation
 */
export const importedDocuments = mysqlTable("imported_documents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  courseId: int("courseId"), // Linked after course is generated
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileType: mysqlEnum("fileType", ["pdf", "docx", "txt", "md"]).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  fileSize: int("fileSize").notNull(), // in bytes
  extractedContent: text("extractedContent"), // Parsed text content
  status: mysqlEnum("status", ["uploading", "processing", "ready", "error"]).default("uploading").notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ImportedDocument = typeof importedDocuments.$inferSelect;
export type InsertImportedDocument = typeof importedDocuments.$inferInsert;
