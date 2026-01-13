import { eq, and, desc, asc, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  courses, InsertCourse, Course,
  chapters, InsertChapter, Chapter,
  lessons, InsertLesson, Lesson,
  glossaryTerms, InsertGlossaryTerm, GlossaryTerm,
  flashcards, InsertFlashcard, Flashcard,
  flashcardReviews, InsertFlashcardReview,
  quizzes, InsertQuiz, Quiz,
  quizResults, InsertQuizResult, QuizResult,
  illustrations, InsertIllustration, Illustration,
  userNotes, InsertUserNote, UserNote,
  relatedTopics, InsertRelatedTopic, RelatedTopic,
  lessonProgress, InsertLessonProgress, LessonProgress,
  studyStreaks, InsertStudyStreak, StudyStreak,
  studyActivities, InsertStudyActivity,
  userSettings, InsertUserSettings, UserSettings,
  importedDocuments, InsertImportedDocument, ImportedDocument
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// User operations
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Course operations
export async function createCourse(course: InsertCourse): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(courses).values(course);
  return result[0].insertId;
}

export async function getCourseById(id: number): Promise<Course | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
  return result[0];
}

export async function getCoursesByUserId(userId: number): Promise<Course[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(courses).where(eq(courses.userId, userId)).orderBy(desc(courses.createdAt));
}

export async function getAllCourses(): Promise<Course[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(courses).orderBy(desc(courses.createdAt));
}

export async function updateCourse(id: number, data: Partial<InsertCourse>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(courses).set(data).where(eq(courses.id, id));
}

export async function deleteCourse(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(courses).where(eq(courses.id, id));
}

// Chapter operations
export async function createChapter(chapter: InsertChapter): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(chapters).values(chapter);
  return result[0].insertId;
}

export async function getChaptersByCourseId(courseId: number): Promise<Chapter[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(chapters).where(eq(chapters.courseId, courseId)).orderBy(asc(chapters.orderIndex));
}

export async function getChapterById(id: number): Promise<Chapter | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(chapters).where(eq(chapters.id, id)).limit(1);
  return result[0];
}

export async function deleteChaptersByCourseId(courseId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(chapters).where(eq(chapters.courseId, courseId));
}

// Lesson operations
export async function createLesson(lesson: InsertLesson): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(lessons).values(lesson);
  return result[0].insertId;
}

export async function getLessonById(id: number): Promise<Lesson | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(lessons).where(eq(lessons.id, id)).limit(1);
  return result[0];
}

export async function getLessonsByChapterId(chapterId: number): Promise<Lesson[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lessons).where(eq(lessons.chapterId, chapterId)).orderBy(asc(lessons.orderIndex));
}

export async function getLessonsByCourseId(courseId: number): Promise<Lesson[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lessons).where(eq(lessons.courseId, courseId)).orderBy(asc(lessons.orderIndex));
}

export async function updateLesson(id: number, data: Partial<InsertLesson>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(lessons).set(data).where(eq(lessons.id, id));
}

export async function deleteLessonsByCourseId(courseId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(lessons).where(eq(lessons.courseId, courseId));
}

// Glossary operations
export async function createGlossaryTerm(term: InsertGlossaryTerm): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(glossaryTerms).values(term);
  return result[0].insertId;
}

export async function createGlossaryTerms(terms: InsertGlossaryTerm[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (terms.length === 0) return;
  await db.insert(glossaryTerms).values(terms);
}

export async function getGlossaryTermsByLessonId(lessonId: number): Promise<GlossaryTerm[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(glossaryTerms).where(eq(glossaryTerms.lessonId, lessonId));
}

export async function getGlossaryTermsByCourseId(courseId: number): Promise<GlossaryTerm[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(glossaryTerms).where(eq(glossaryTerms.courseId, courseId)).orderBy(asc(glossaryTerms.term));
}

export async function deleteGlossaryTermsByCourseId(courseId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(glossaryTerms).where(eq(glossaryTerms.courseId, courseId));
}

// Flashcard operations
export async function createFlashcard(flashcard: InsertFlashcard): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(flashcards).values(flashcard);
  return result[0].insertId;
}

export async function createFlashcards(cards: InsertFlashcard[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (cards.length === 0) return;
  await db.insert(flashcards).values(cards);
}

export async function getFlashcardsByUserId(userId: number): Promise<Flashcard[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(flashcards).where(eq(flashcards.userId, userId));
}

export async function getFlashcardsByLessonId(userId: number, lessonId: number): Promise<Flashcard[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(flashcards).where(and(eq(flashcards.userId, userId), eq(flashcards.lessonId, lessonId)));
}

export async function getFlashcardsByCourseId(userId: number, courseId: number): Promise<Flashcard[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(flashcards).where(and(eq(flashcards.userId, userId), eq(flashcards.courseId, courseId)));
}

export async function getDueFlashcards(userId: number): Promise<Flashcard[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(flashcards).where(and(eq(flashcards.userId, userId), lte(flashcards.nextReviewDate, new Date())));
}

export async function updateFlashcard(id: number, data: Partial<InsertFlashcard>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(flashcards).set(data).where(eq(flashcards.id, id));
}

export async function deleteFlashcard(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(flashcards).where(eq(flashcards.id, id));
}

export async function deleteFlashcardsByLessonId(userId: number, lessonId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(flashcards).where(and(eq(flashcards.userId, userId), eq(flashcards.lessonId, lessonId)));
}

// Flashcard review operations
export async function createFlashcardReview(review: InsertFlashcardReview): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(flashcardReviews).values(review);
}

// Quiz operations
export async function createQuiz(quiz: InsertQuiz): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(quizzes).values(quiz);
  return result[0].insertId;
}

export async function getQuizByLessonId(lessonId: number): Promise<Quiz | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(quizzes).where(eq(quizzes.lessonId, lessonId)).limit(1);
  return result[0];
}

export async function deleteQuizzesByCourseId(courseId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(quizzes).where(eq(quizzes.courseId, courseId));
}

// Quiz result operations
export async function createQuizResult(result: InsertQuizResult): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const res = await db.insert(quizResults).values(result);
  return res[0].insertId;
}

export async function getQuizResultsByUserId(userId: number): Promise<QuizResult[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quizResults).where(eq(quizResults.userId, userId)).orderBy(desc(quizResults.completedAt));
}

export async function getQuizResultsByLessonId(userId: number, lessonId: number): Promise<QuizResult[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quizResults).where(and(eq(quizResults.userId, userId), eq(quizResults.lessonId, lessonId))).orderBy(desc(quizResults.completedAt));
}

// Illustration operations
export async function createIllustration(illustration: InsertIllustration): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(illustrations).values(illustration);
  return result[0].insertId;
}

export async function getIllustrationsByLessonId(lessonId: number): Promise<Illustration[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(illustrations).where(eq(illustrations.lessonId, lessonId)).orderBy(asc(illustrations.orderIndex));
}

export async function updateIllustration(id: number, data: Partial<InsertIllustration>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(illustrations).set(data).where(eq(illustrations.id, id));
}

export async function deleteIllustration(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(illustrations).where(eq(illustrations.id, id));
}

export async function deleteIllustrationsByCourseId(courseId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(illustrations).where(eq(illustrations.courseId, courseId));
}

export async function updateIllustrationOrders(updates: { id: number; orderIndex: number }[]): Promise<void> {
  const db = await getDb();
  if (!db) return;
  for (const update of updates) {
    await db.update(illustrations).set({ orderIndex: update.orderIndex }).where(eq(illustrations.id, update.id));
  }
}

// User notes operations
export async function createOrUpdateUserNote(note: InsertUserNote): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(userNotes)
    .where(and(eq(userNotes.userId, note.userId), eq(userNotes.lessonId, note.lessonId)))
    .limit(1);
  if (existing.length > 0) {
    await db.update(userNotes).set({ content: note.content }).where(eq(userNotes.id, existing[0].id));
    return existing[0].id;
  }
  const result = await db.insert(userNotes).values(note);
  return result[0].insertId;
}

export async function getUserNote(userId: number, lessonId: number): Promise<UserNote | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(userNotes)
    .where(and(eq(userNotes.userId, userId), eq(userNotes.lessonId, lessonId)))
    .limit(1);
  return result[0];
}

// Related topics operations
export async function createRelatedTopic(topic: InsertRelatedTopic): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(relatedTopics).values(topic);
  return result[0].insertId;
}

export async function createRelatedTopics(topics: InsertRelatedTopic[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (topics.length === 0) return;
  await db.insert(relatedTopics).values(topics);
}

export async function getRelatedTopicsByCourseId(courseId: number): Promise<RelatedTopic[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(relatedTopics).where(eq(relatedTopics.courseId, courseId));
}

export async function deleteRelatedTopicsByCourseId(courseId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(relatedTopics).where(eq(relatedTopics.courseId, courseId));
}

// Lesson progress operations
export async function createOrUpdateLessonProgress(progress: InsertLessonProgress): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(lessonProgress)
    .where(and(eq(lessonProgress.userId, progress.userId), eq(lessonProgress.lessonId, progress.lessonId)))
    .limit(1);
  if (existing.length > 0) {
    await db.update(lessonProgress)
      .set({ isCompleted: progress.isCompleted, completedAt: progress.completedAt })
      .where(eq(lessonProgress.id, existing[0].id));
  } else {
    await db.insert(lessonProgress).values(progress);
  }
}

export async function getLessonProgressByUserId(userId: number): Promise<LessonProgress[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lessonProgress).where(eq(lessonProgress.userId, userId));
}

export async function getLessonProgressByCourseId(userId: number, courseId: number): Promise<LessonProgress[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lessonProgress).where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.courseId, courseId)));
}

// Study streak operations
export async function getOrCreateStudyStreak(userId: number): Promise<StudyStreak> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(studyStreaks).where(eq(studyStreaks.userId, userId)).limit(1);
  if (existing.length > 0) return existing[0];
  await db.insert(studyStreaks).values({ userId });
  const created = await db.select().from(studyStreaks).where(eq(studyStreaks.userId, userId)).limit(1);
  return created[0];
}

export async function updateStudyStreak(userId: number, data: Partial<InsertStudyStreak>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(studyStreaks).set(data).where(eq(studyStreaks.userId, userId));
}

// Study activity operations
export async function createStudyActivity(activity: InsertStudyActivity): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(studyActivities).values(activity);
}

export async function getStudyActivitiesByUserId(userId: number, limit = 100): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(studyActivities).where(eq(studyActivities.userId, userId)).orderBy(desc(studyActivities.activityDate)).limit(limit);
}

// User settings operations
export async function getOrCreateUserSettings(userId: number): Promise<UserSettings> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  if (existing.length > 0) return existing[0];
  await db.insert(userSettings).values({ userId });
  const created = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  return created[0];
}

export async function updateUserSettings(userId: number, data: Partial<InsertUserSettings>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(userSettings).set(data).where(eq(userSettings.userId, userId));
}

// Course completion calculation
export async function calculateCourseCompletion(userId: number, courseId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const allLessons = await db.select().from(lessons).where(eq(lessons.courseId, courseId));
  if (allLessons.length === 0) return 0;
  const completedProgress = await db.select().from(lessonProgress)
    .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.courseId, courseId), eq(lessonProgress.isCompleted, true)));
  return Math.round((completedProgress.length / allLessons.length) * 100);
}

// Get flashcard statistics
export async function getFlashcardStats(userId: number, courseId?: number): Promise<{ total: number; due: number; learning: number; mastered: number }> {
  const db = await getDb();
  if (!db) return { total: 0, due: 0, learning: 0, mastered: 0 };
  
  let query = db.select().from(flashcards).where(eq(flashcards.userId, userId));
  if (courseId) {
    query = db.select().from(flashcards).where(and(eq(flashcards.userId, userId), eq(flashcards.courseId, courseId)));
  }
  
  const cards = await query;
  const now = new Date();
  
  return {
    total: cards.length,
    due: cards.filter(c => new Date(c.nextReviewDate) <= now && c.status !== 'mastered').length,
    learning: cards.filter(c => c.status === 'learning' || c.status === 'review').length,
    mastered: cards.filter(c => c.status === 'mastered').length
  };
}


// Imported document operations
export async function createImportedDocument(doc: InsertImportedDocument): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(importedDocuments).values(doc);
  return result[0].insertId;
}

export async function getImportedDocumentById(id: number): Promise<ImportedDocument | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(importedDocuments).where(eq(importedDocuments.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getImportedDocumentsByUserId(userId: number): Promise<ImportedDocument[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(importedDocuments).where(eq(importedDocuments.userId, userId)).orderBy(desc(importedDocuments.createdAt));
}

export async function getUnlinkedImportedDocuments(userId: number): Promise<ImportedDocument[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(importedDocuments)
    .where(and(
      eq(importedDocuments.userId, userId),
      eq(importedDocuments.status, "ready"),
      sql`${importedDocuments.courseId} IS NULL`
    ))
    .orderBy(desc(importedDocuments.createdAt));
}

export async function updateImportedDocument(id: number, data: Partial<InsertImportedDocument>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(importedDocuments).set(data).where(eq(importedDocuments.id, id));
}

export async function deleteImportedDocument(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(importedDocuments).where(eq(importedDocuments.id, id));
}

export async function linkDocumentToCourse(documentId: number, courseId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(importedDocuments).set({ courseId }).where(eq(importedDocuments.id, documentId));
}
