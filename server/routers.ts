import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import * as ai from "./ai";

// Course router
const courseRouter = router({
  // Create a new course with AI generation
  create: protectedProcedure
    .input(z.object({
      topic: z.string().min(1),
      approach: z.enum(["balanced", "rigorous", "easy"]).default("balanced"),
      courseLength: z.enum(["short", "medium", "comprehensive"]).default("medium"),
      lessonsPerChapter: z.enum(["few", "moderate", "many"]).default("moderate"),
      contentDepth: z.enum(["introductory", "intermediate", "advanced"]).default("intermediate"),
    }))
    .mutation(async ({ ctx, input }) => {
      console.log(`[course.create] Starting course creation for topic: "${input.topic}" by user ${ctx.user.id}`);
      
      // Generate course structure using AI
      let courseStructure;
      try {
        courseStructure = await ai.generateCourseStructure(
          input.topic,
          input.approach,
          input.courseLength,
          input.lessonsPerChapter,
          input.contentDepth
        );
        console.log(`[course.create] AI generated course: "${courseStructure.title}" with ${courseStructure.chapters.length} chapters`);
      } catch (error) {
        console.error(`[course.create] AI generation failed:`, error);
        throw new Error(`Failed to generate course structure: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Create course in database
      const courseId = await db.createCourse({
        userId: ctx.user.id,
        title: courseStructure.title,
        description: courseStructure.description,
        topic: input.topic,
        approach: input.approach,
        courseLength: input.courseLength,
        lessonsPerChapter: input.lessonsPerChapter,
        contentDepth: input.contentDepth,
      });

      const lessonImageQueue: Array<{ lessonId: number; courseId: number; title: string; content: string }> = [];

      // Create chapters and lessons
      for (let chapterIndex = 0; chapterIndex < courseStructure.chapters.length; chapterIndex++) {
        const chapter = courseStructure.chapters[chapterIndex];
        const chapterId = await db.createChapter({
          courseId,
          title: chapter.title,
          description: chapter.description,
          orderIndex: chapterIndex,
        });

        // Create lessons for this chapter
        for (let lessonIndex = 0; lessonIndex < chapter.lessons.length; lessonIndex++) {
          const lesson = chapter.lessons[lessonIndex];
          const lessonId = await db.createLesson({
            chapterId,
            courseId,
            title: lesson.title,
            content: lesson.content,
            orderIndex: lessonIndex,
          });

          // Create glossary terms for this lesson
          if (lesson.keyTerms && lesson.keyTerms.length > 0) {
            await db.createGlossaryTerms(
              lesson.keyTerms.map(term => ({
                lessonId,
                courseId,
                term: term.term,
                definition: term.definition,
              }))
            );
          }

          // Queue lesson for background image generation
          lessonImageQueue.push({ lessonId, courseId, title: lesson.title, content: lesson.content });
        }
      }

      // Create related topics
      if (courseStructure.relatedTopics && courseStructure.relatedTopics.length > 0) {
        await db.createRelatedTopics(
          courseStructure.relatedTopics.map(topic => ({
            courseId,
            topicName: topic.name,
            relationship: topic.relationship,
            description: topic.description,
          }))
        );
      }

      // Fire-and-forget: generate illustrations in the background
      // This runs after the response is sent so the user doesn't wait
      if (lessonImageQueue.length > 0) {
        console.log(`[course.create] Starting background image generation for ${lessonImageQueue.length} lessons`);
        (async () => {
          for (const item of lessonImageQueue) {
            try {
              const mediaResult = await ai.generateLessonMedia(
                item.title,
                item.content,
                "illustration",
                "modern"
              );
              if (mediaResult.url) {
                await db.createIllustration({
                  lessonId: item.lessonId,
                  courseId: item.courseId,
                  imageUrl: mediaResult.url,
                  mediaType: "illustration",
                  visualStyle: "modern",
                  caption: `Illustration for ${item.title}`,
                  orderIndex: 0,
                });
                console.log(`[course.create] Generated illustration for: ${item.title}`);
              }
            } catch (error) {
              console.error(`[course.create] Failed to generate illustration for ${item.title}:`, error);
            }
          }
          console.log(`[course.create] Background image generation complete for course ${courseId}`);
        })().catch(err => console.error('[course.create] Background image generation error:', err));
      }

      console.log(`[course.create] Course created successfully: ${courseId} - "${courseStructure.title}"`);
      return { courseId, title: courseStructure.title };
    }),

  // Get all courses for the current user
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.getCoursesByUserId(ctx.user.id);
  }),

  // Generate a preview course (no auth required, no DB save)
  preview: publicProcedure
    .input(z.object({
      topic: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      // Generate a short preview course structure using AI
      const courseStructure = await ai.generateCourseStructure(
        input.topic,
        "easy",
        "short",
        "few",
        "introductory"
      );
      return courseStructure;
    }),

  // Get all public courses
  listAll: publicProcedure.query(async () => {
    return db.getAllCourses();
  }),

  // Get a single course with chapters and lessons
  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const course = await db.getCourseById(input.id);
      if (!course) return null;

      const chapters = await db.getChaptersByCourseId(input.id);
      const chaptersWithLessons = await Promise.all(
        chapters.map(async (chapter) => {
          const lessons = await db.getLessonsByChapterId(chapter.id);
          return { ...chapter, lessons };
        })
      );

      const relatedTopics = await db.getRelatedTopicsByCourseId(input.id);
      const glossaryTerms = await db.getGlossaryTermsByCourseId(input.id);

      return { ...course, chapters: chaptersWithLessons, relatedTopics, glossaryTerms };
    }),

  // Delete a course
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const course = await db.getCourseById(input.id);
      if (!course || course.userId !== ctx.user.id) {
        throw new Error("Course not found or unauthorized");
      }

      // Delete all related data
      await db.deleteRelatedTopicsByCourseId(input.id);
      await db.deleteGlossaryTermsByCourseId(input.id);
      await db.deleteIllustrationsByCourseId(input.id);
      await db.deleteQuizzesByCourseId(input.id);
      await db.deleteLessonsByCourseId(input.id);
      await db.deleteChaptersByCourseId(input.id);
      await db.deleteCourse(input.id);

      return { success: true };
    }),

  // Get course progress for current user
  getProgress: protectedProcedure
    .input(z.object({ courseId: z.number() }))
    .query(async ({ ctx, input }) => {
      const progress = await db.getLessonProgressByCourseId(ctx.user.id, input.courseId);
      const completion = await db.calculateCourseCompletion(ctx.user.id, input.courseId);
      const flashcardStats = await db.getFlashcardStats(ctx.user.id, input.courseId);
      return { progress, completion, flashcardStats };
    }),

  // Export course as PDF
  exportPdf: protectedProcedure
    .input(z.object({ courseId: z.number() }))
    .mutation(async ({ input }) => {
      try {
        console.log(`[exportPdf] Starting for course ${input.courseId}`);
        const course = await db.getCourseById(input.courseId);
        if (!course) throw new Error("Course not found");

        // Get all chapters
        const chapters = await db.getChaptersByCourseId(input.courseId);

        // Get all lessons with illustrations for each chapter
        const chaptersWithLessons = await Promise.all(
          chapters.map(async (chapter) => {
            const lessons = await db.getLessonsByChapterId(chapter.id);
            const lessonsWithIllustrations = await Promise.all(
              lessons.map(async (lesson) => {
                const illustrations = await db.getIllustrationsByLessonId(lesson.id);
                return {
                  title: lesson.title,
                  content: lesson.content || "",
                  illustrations: illustrations.map((ill) => ({
                    url: ill.imageUrl,
                    caption: ill.prompt || undefined,
                  })),
                };
              })
            );
            return {
              title: chapter.title,
              description: chapter.description || "",
              lessons: lessonsWithIllustrations,
            };
          })
        );

        // Get all glossary terms for the course
        const glossaryTerms = await db.getGlossaryTermsByCourseId(input.courseId);

        // Generate PDF
        console.log(`[exportPdf] Generating PDF...`);
        const { generateCoursePdf } = await import("./pdfGenerator");
        const pdfBuffer = await generateCoursePdf({
          title: course.title,
          description: course.description || "",
          topic: course.topic,
          approach: course.approach,
          chapters: chaptersWithLessons,
          glossaryTerms: glossaryTerms.map((term) => ({
            term: term.term,
            definition: term.definition || "",
          })),
          createdAt: course.createdAt,
        });

        // Return base64 encoded PDF
        console.log(`[exportPdf] PDF generated, size: ${pdfBuffer.length} bytes`);
        return {
          pdf: pdfBuffer.toString("base64"),
          filename: `${course.title.replace(/[^a-zA-Z0-9]/g, "_")}_Course.pdf`,
        };
      } catch (error) {
        console.error(`[exportPdf] Error:`, error);
        throw new Error(`Failed to export course PDF: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),
});

// Lesson router
const lessonRouter = router({
  // Get a single lesson
  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const lesson = await db.getLessonById(input.id);
      if (!lesson) return null;

      const glossaryTerms = await db.getGlossaryTermsByLessonId(input.id);
      const illustrations = await db.getIllustrationsByLessonId(input.id);

      return { ...lesson, glossaryTerms, illustrations };
    }),

  // Mark lesson as complete
  markComplete: protectedProcedure
    .input(z.object({ lessonId: z.number(), courseId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.createOrUpdateLessonProgress({
        userId: ctx.user.id,
        lessonId: input.lessonId,
        courseId: input.courseId,
        isCompleted: true,
        completedAt: new Date(),
      });

      // Log activity
      await db.createStudyActivity({
        userId: ctx.user.id,
        activityType: "lesson_completed",
        courseId: input.courseId,
        lessonId: input.lessonId,
      });

      // Update streak
      const streak = await db.getOrCreateStudyStreak(ctx.user.id);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastStudy = streak.lastStudyDate ? new Date(streak.lastStudyDate) : null;
      
      if (lastStudy) {
        lastStudy.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((today.getTime() - lastStudy.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          // Consecutive day
          await db.updateStudyStreak(ctx.user.id, {
            currentStreak: streak.currentStreak + 1,
            longestStreak: Math.max(streak.longestStreak, streak.currentStreak + 1),
            lastStudyDate: new Date(),
          });
        } else if (diffDays > 1) {
          // Streak broken
          await db.updateStudyStreak(ctx.user.id, {
            currentStreak: 1,
            lastStudyDate: new Date(),
          });
        }
      } else {
        await db.updateStudyStreak(ctx.user.id, {
          currentStreak: 1,
          lastStudyDate: new Date(),
        });
      }

      return { success: true };
    }),

  // Regenerate lesson content
  regenerate: protectedProcedure
    .input(z.object({ lessonId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const lesson = await db.getLessonById(input.lessonId);
      if (!lesson) throw new Error("Lesson not found");

      const course = await db.getCourseById(lesson.courseId);
      if (!course || course.userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }

      const chapters = await db.getChaptersByCourseId(course.id);
      const chapter = chapters.find(c => c.id === lesson.chapterId);

      const newContent = await ai.regenerateLesson(
        course.topic,
        chapter?.title || "",
        lesson.title,
        course.approach as "balanced" | "rigorous" | "easy",
        course.contentDepth as "introductory" | "intermediate" | "advanced"
      );

      await db.updateLesson(input.lessonId, { content: newContent.content });

      // Update glossary terms
      // First delete existing terms for this lesson, then add new ones
      const existingTerms = await db.getGlossaryTermsByLessonId(input.lessonId);
      // We'll just add new terms - in a real app you'd want to handle this more carefully
      if (newContent.keyTerms && newContent.keyTerms.length > 0) {
        await db.createGlossaryTerms(
          newContent.keyTerms.map(term => ({
            lessonId: input.lessonId,
            courseId: course.id,
            term: term.term,
            definition: term.definition,
          }))
        );
      }

      return { success: true, content: newContent.content };
    }),

  // Export lesson as PDF
  exportPdf: protectedProcedure
    .input(z.object({ lessonId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const lesson = await db.getLessonById(input.lessonId);
      if (!lesson) throw new Error("Lesson not found");

      const chapter = await db.getChapterById(lesson.chapterId);
      if (!chapter) throw new Error("Chapter not found");

      const course = await db.getCourseById(chapter.courseId);
      if (!course) throw new Error("Course not found");

      // Get illustrations
      const illustrations = await db.getIllustrationsByLessonId(input.lessonId);

      // Get glossary terms
      const glossaryTerms = await db.getGlossaryTermsByLessonId(input.lessonId);

      // Get user notes
      const userNote = await db.getUserNote(ctx.user.id, input.lessonId);

        // Generate PDF
        console.log(`[lesson.exportPdf] Generating PDF...`);
        const { generateLessonPdf } = await import("./pdfGenerator");
        const pdfBuffer = await generateLessonPdf({
        courseTitle: course.title,
        chapterTitle: chapter.title,
        lessonTitle: lesson.title,
        lessonContent: lesson.content || "",
        illustrations: illustrations.map(ill => ({
          url: ill.imageUrl,
          caption: ill.prompt || undefined,
        })),
        glossaryTerms: glossaryTerms.map(term => ({
          term: term.term,
          definition: term.definition || "",
        })),
        userNotes: userNote?.content || undefined,
      });

      // Return base64 encoded PDF
      return {
        pdf: pdfBuffer.toString("base64"),
        filename: `${lesson.title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`,
      };
    }),
});

// Glossary router
const glossaryRouter = router({
  // Get glossary terms for a course
  getByCourse: publicProcedure
    .input(z.object({ courseId: z.number() }))
    .query(async ({ input }) => {
      return db.getGlossaryTermsByCourseId(input.courseId);
    }),

  // Get glossary terms for a lesson
  getByLesson: publicProcedure
    .input(z.object({ lessonId: z.number() }))
    .query(async ({ input }) => {
      return db.getGlossaryTermsByLessonId(input.lessonId);
    }),
});

// Flashcard router
const flashcardRouter = router({
  // Generate flashcards from glossary terms for a lesson
  generate: protectedProcedure
    .input(z.object({ lessonId: z.number(), courseId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const glossaryTerms = await db.getGlossaryTermsByLessonId(input.lessonId);
      
      // Check if flashcards already exist
      const existingCards = await db.getFlashcardsByLessonId(ctx.user.id, input.lessonId);
      if (existingCards.length > 0) {
        return { success: true, count: existingCards.length, message: "Flashcards already exist" };
      }

      const flashcards = glossaryTerms.map(term => ({
        userId: ctx.user.id,
        glossaryTermId: term.id,
        lessonId: input.lessonId,
        courseId: input.courseId,
        front: term.term,
        back: term.definition || "",
        nextReviewDate: new Date(),
      }));

      await db.createFlashcards(flashcards);
      return { success: true, count: flashcards.length };
    }),

  // Get all flashcards for user
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.getFlashcardsByUserId(ctx.user.id);
  }),

  // Get due flashcards
  getDue: protectedProcedure.query(async ({ ctx }) => {
    return db.getDueFlashcards(ctx.user.id);
  }),

  // Get flashcards by course
  getByCourse: protectedProcedure
    .input(z.object({ courseId: z.number() }))
    .query(async ({ ctx, input }) => {
      return db.getFlashcardsByCourseId(ctx.user.id, input.courseId);
    }),

  // Get flashcard statistics
  getStats: protectedProcedure
    .input(z.object({ courseId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      return db.getFlashcardStats(ctx.user.id, input.courseId);
    }),

  // Review a flashcard (SM-2 algorithm)
  review: protectedProcedure
    .input(z.object({
      flashcardId: z.number(),
      quality: z.number().min(0).max(5), // 0-5 rating
    }))
    .mutation(async ({ ctx, input }) => {
      const flashcards = await db.getFlashcardsByUserId(ctx.user.id);
      const card = flashcards.find(c => c.id === input.flashcardId);
      
      if (!card) throw new Error("Flashcard not found");

      // SM-2 Algorithm implementation
      let { easeFactor, interval, repetitions } = card;
      const { quality } = input;

      if (quality < 3) {
        // Failed review - reset
        repetitions = 0;
        interval = 0;
      } else {
        // Successful review
        if (repetitions === 0) {
          interval = 1;
        } else if (repetitions === 1) {
          interval = 6;
        } else {
          interval = Math.round(interval * easeFactor);
        }
        repetitions += 1;
      }

      // Update ease factor
      easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

      // Calculate next review date
      const nextReviewDate = new Date();
      nextReviewDate.setDate(nextReviewDate.getDate() + interval);

      // Determine status
      let status: "new" | "learning" | "review" | "mastered" = "learning";
      if (repetitions === 0) status = "new";
      else if (repetitions >= 5 && easeFactor >= 2.5) status = "mastered";
      else if (interval >= 21) status = "review";

      await db.updateFlashcard(input.flashcardId, {
        easeFactor,
        interval,
        repetitions,
        nextReviewDate,
        status,
      });

      // Log review
      await db.createFlashcardReview({
        flashcardId: input.flashcardId,
        userId: ctx.user.id,
        quality,
      });

      // Log activity
      await db.createStudyActivity({
        userId: ctx.user.id,
        activityType: "flashcard_review",
        courseId: card.courseId,
        flashcardCount: 1,
      });

      return { success: true, nextReviewDate, status };
    }),

  // Delete flashcard
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteFlashcard(input.id);
      return { success: true };
    }),
});

// Quiz router
const quizRouter = router({
  // Generate quiz for a lesson
  generate: protectedProcedure
    .input(z.object({ lessonId: z.number(), courseId: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const lesson = await db.getLessonById(input.lessonId);
        if (!lesson) throw new Error("Lesson not found");

        // Check if quiz already exists
        const existingQuiz = await db.getQuizByLessonId(input.lessonId);
        if (existingQuiz) {
          return { success: true, quizId: existingQuiz.id, message: "Quiz already exists" };
        }

        const glossaryTerms = await db.getGlossaryTermsByLessonId(input.lessonId);
        const quiz = await ai.generateQuiz(
          lesson.title,
          lesson.content || "",
          glossaryTerms.map(t => ({ term: t.term, definition: t.definition || "" }))
        );

        const quizId = await db.createQuiz({
          lessonId: input.lessonId,
          courseId: input.courseId,
          questions: quiz.questions,
        });

        return { success: true, quizId };
      } catch (error) {
        console.error("Error generating quiz:", error);
        throw new Error(`Failed to generate quiz: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),


  // Get quiz for a lesson
  get: publicProcedure
    .input(z.object({ lessonId: z.number() }))
    .query(async ({ input }) => {
      const quiz = await db.getQuizByLessonId(input.lessonId);
      return quiz ?? null;
    }),

  // Submit quiz answers
  submit: protectedProcedure
    .input(z.object({
      quizId: z.number(),
      lessonId: z.number(),
      answers: z.array(z.object({
        questionIndex: z.number(),
        answer: z.string(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const quiz = await db.getQuizByLessonId(input.lessonId);
      if (!quiz) throw new Error("Quiz not found");

      const questions = quiz.questions as ai.QuizQuestion[];
      let totalScore = 0;
      const feedback: { questionIndex: number; score: number; feedback: string }[] = [];

      for (const answer of input.answers) {
        const question = questions[answer.questionIndex];
        if (!question) continue;

        if (question.type === "multiple_choice") {
          // Check if answer matches correct answer
          const isCorrect = answer.answer === question.correctAnswer;
          const score = isCorrect ? 100 : 0;
          totalScore += score;
          feedback.push({
            questionIndex: answer.questionIndex,
            score,
            feedback: isCorrect ? "Correct!" : `Incorrect. The correct answer is: ${question.correctAnswer}. ${question.explanation}`,
          });
        } else {
          // Short answer - use AI evaluation
          const evaluation = await ai.evaluateShortAnswer(
            question.question,
            question.correctAnswer,
            answer.answer
          );
          totalScore += evaluation.score;
          feedback.push({
            questionIndex: answer.questionIndex,
            score: evaluation.score,
            feedback: evaluation.feedback,
          });
        }
      }

      const averageScore = totalScore / input.answers.length;

      // Save quiz result
      await db.createQuizResult({
        quizId: input.quizId,
        userId: ctx.user.id,
        lessonId: input.lessonId,
        score: averageScore,
        totalQuestions: questions.length,
        answers: input.answers,
        feedback,
      });

      // Log activity
      await db.createStudyActivity({
        userId: ctx.user.id,
        activityType: "quiz_completed",
        lessonId: input.lessonId,
        quizScore: averageScore,
      });

      return { score: averageScore, feedback };
    }),

  // Get quiz results for a lesson
  getResults: protectedProcedure
    .input(z.object({ lessonId: z.number() }))
    .query(async ({ ctx, input }) => {
      return db.getQuizResultsByLessonId(ctx.user.id, input.lessonId);
    }),
});

// Illustration router
const illustrationRouter = router({
  // Generate illustration for a lesson
  generate: protectedProcedure
    .input(z.object({
      lessonId: z.number(),
      courseId: z.number(),
      mediaType: z.enum(["illustration", "infographic", "data_visualization", "diagram"]),
      visualStyle: z.enum(["minimalist", "detailed", "colorful", "technical", "modern"]),
      customPrompt: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const lesson = await db.getLessonById(input.lessonId);
      if (!lesson) throw new Error("Lesson not found");

      const course = await db.getCourseById(input.courseId);
      if (!course || course.userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }

      const result = await ai.generateLessonMedia(
        lesson.title,
        lesson.content || "",
        input.mediaType,
        input.visualStyle,
        input.customPrompt
      );

      // Get current max order index
      const existingIllustrations = await db.getIllustrationsByLessonId(input.lessonId);
      const maxOrder = existingIllustrations.length > 0 
        ? Math.max(...existingIllustrations.map(i => i.orderIndex))
        : -1;

      const illustrationId = await db.createIllustration({
        lessonId: input.lessonId,
        courseId: input.courseId,
        imageUrl: result.url,
        mediaType: input.mediaType,
        visualStyle: input.visualStyle,
        prompt: input.customPrompt,
        orderIndex: maxOrder + 1,
      });

      return { success: true, illustrationId, imageUrl: result.url };
    }),

  // Get illustrations for a lesson
  getByLesson: publicProcedure
    .input(z.object({ lessonId: z.number() }))
    .query(async ({ input }) => {
      return db.getIllustrationsByLessonId(input.lessonId);
    }),

  // Update illustration order
  updateOrder: protectedProcedure
    .input(z.object({
      updates: z.array(z.object({
        id: z.number(),
        orderIndex: z.number(),
      })),
    }))
    .mutation(async ({ input }) => {
      await db.updateIllustrationOrders(input.updates);
      return { success: true };
    }),

  // Delete illustration
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteIllustration(input.id);
      return { success: true };
    }),

  // Generate illustrations for all lessons in a course
  generateAll: protectedProcedure
    .input(z.object({
      courseId: z.number(),
      mediaType: z.enum(["illustration", "infographic", "data_visualization", "diagram"]).default("illustration"),
      visualStyle: z.enum(["minimalist", "detailed", "colorful", "technical", "modern"]).default("modern"),
      skipExisting: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const course = await db.getCourseById(input.courseId);
      if (!course || course.userId !== ctx.user.id) {
        throw new Error("Course not found or unauthorized");
      }

      // Get all chapters and lessons
      const chapters = await db.getChaptersByCourseId(input.courseId);
      const allLessons: { id: number; title: string; content: string | null }[] = [];
      
      for (const chapter of chapters) {
        const lessons = await db.getLessonsByChapterId(chapter.id);
        allLessons.push(...lessons);
      }

      let generated = 0;
      let skipped = 0;
      let failed = 0;
      const results: { lessonId: number; lessonTitle: string; success: boolean; imageUrl?: string; error?: string }[] = [];

      for (const lesson of allLessons) {
        // Check if lesson already has illustrations
        if (input.skipExisting) {
          const existingIllustrations = await db.getIllustrationsByLessonId(lesson.id);
          if (existingIllustrations.length > 0) {
            skipped++;
            results.push({ lessonId: lesson.id, lessonTitle: lesson.title, success: true, imageUrl: existingIllustrations[0].imageUrl });
            continue;
          }
        }

        try {
          const result = await ai.generateLessonMedia(
            lesson.title,
            lesson.content || "",
            input.mediaType,
            input.visualStyle
          );

          // Get current max order index
          const existingIllustrations = await db.getIllustrationsByLessonId(lesson.id);
          const maxOrder = existingIllustrations.length > 0 
            ? Math.max(...existingIllustrations.map(i => i.orderIndex))
            : -1;

          await db.createIllustration({
            lessonId: lesson.id,
            courseId: input.courseId,
            imageUrl: result.url,
            mediaType: input.mediaType,
            visualStyle: input.visualStyle,
            orderIndex: maxOrder + 1,
          });

          generated++;
          results.push({ lessonId: lesson.id, lessonTitle: lesson.title, success: true, imageUrl: result.url });
        } catch (error) {
          failed++;
          results.push({ 
            lessonId: lesson.id, 
            lessonTitle: lesson.title, 
            success: false, 
            error: error instanceof Error ? error.message : "Unknown error" 
          });
        }
      }

      return {
        success: true,
        total: allLessons.length,
        generated,
        skipped,
        failed,
        results,
      };
    }),
});

// Notes router
const notesRouter = router({
  // Get note for a lesson
  get: protectedProcedure
    .input(z.object({ lessonId: z.number() }))
    .query(async ({ ctx, input }) => {
      const note = await db.getUserNote(ctx.user.id, input.lessonId);
      return note ?? null;
    }),

  // Save note for a lesson
  save: protectedProcedure
    .input(z.object({
      lessonId: z.number(),
      courseId: z.number(),
      content: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.createOrUpdateUserNote({
        userId: ctx.user.id,
        lessonId: input.lessonId,
        courseId: input.courseId,
        content: input.content,
      });
      return { success: true };
    }),
});

// Progress router
const progressRouter = router({
  // Get study streak
  getStreak: protectedProcedure.query(async ({ ctx }) => {
    return db.getOrCreateStudyStreak(ctx.user.id);
  }),

  // Get study activities (for calendar)
  getActivities: protectedProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      return db.getStudyActivitiesByUserId(ctx.user.id, input.limit || 100);
    }),

  // Get overall progress
  getOverall: protectedProcedure.query(async ({ ctx }) => {
    const courses = await db.getCoursesByUserId(ctx.user.id);
    const flashcardStats = await db.getFlashcardStats(ctx.user.id);
    const streak = await db.getOrCreateStudyStreak(ctx.user.id);
    const activities = await db.getStudyActivitiesByUserId(ctx.user.id, 30);

    const courseProgress = await Promise.all(
      courses.map(async (course) => ({
        courseId: course.id,
        title: course.title,
        completion: await db.calculateCourseCompletion(ctx.user.id, course.id),
      }))
    );

    return {
      courses: courseProgress,
      flashcardStats,
      streak,
      recentActivities: activities,
    };
  }),
});

// Settings router
const settingsRouter = router({
  // Get user settings
  get: protectedProcedure.query(async ({ ctx }) => {
    return db.getOrCreateUserSettings(ctx.user.id);
  }),

  // Update user settings
  update: protectedProcedure
    .input(z.object({
      preferredProvider: z.enum(["manus", "anthropic", "openai", "openrouter", "grok"]).optional(),
      anthropicApiKey: z.string().optional(),
      anthropicModel: z.string().optional(),
      openaiApiKey: z.string().optional(),
      openaiModel: z.string().optional(),
      openrouterApiKey: z.string().optional(),
      openrouterModel: z.string().optional(),
      grokApiKey: z.string().optional(),
      grokModel: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.updateUserSettings(ctx.user.id, input);
      return { success: true };
    }),
});

// Document import router
const documentRouter = router({
  // Upload a document
  upload: protectedProcedure
    .input(z.object({
      fileName: z.string(),
      fileType: z.enum(["pdf", "docx", "txt", "md"]),
      fileUrl: z.string(),
      fileKey: z.string(),
      fileSize: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const documentId = await db.createImportedDocument({
        userId: ctx.user.id,
        fileName: input.fileName,
        fileType: input.fileType,
        fileUrl: input.fileUrl,
        fileKey: input.fileKey,
        fileSize: input.fileSize,
        status: "processing",
      });

      // Process document asynchronously
      processDocumentAsync(documentId, input.fileUrl, input.fileType);

      return { success: true, documentId };
    }),

  // Get user's documents
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.getImportedDocumentsByUserId(ctx.user.id);
  }),

  // Get unlinked documents (ready for course generation)
  getUnlinked: protectedProcedure.query(async ({ ctx }) => {
    return db.getUnlinkedImportedDocuments(ctx.user.id);
  }),

  // Get document by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const doc = await db.getImportedDocumentById(input.id);
      if (!doc || doc.userId !== ctx.user.id) {
        throw new Error("Document not found");
      }
      return doc;
    }),

  // Analyze document content
  analyze: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const doc = await db.getImportedDocumentById(input.documentId);
      if (!doc || doc.userId !== ctx.user.id) {
        throw new Error("Document not found");
      }
      if (!doc.extractedContent) {
        throw new Error("Document not yet processed");
      }

      const analysis = await ai.analyzeDocumentContent(doc.extractedContent);
      return analysis;
    }),

  // Generate course from document
  generateCourse: protectedProcedure
    .input(z.object({
      documentIds: z.array(z.number()).min(1),
      approach: z.enum(["balanced", "rigorous", "easy"]).default("balanced"),
      courseLength: z.enum(["short", "medium", "comprehensive"]).default("medium"),
      lessonsPerChapter: z.enum(["few", "moderate", "many"]).default("moderate"),
      contentDepth: z.enum(["introductory", "intermediate", "advanced"]).default("intermediate"),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get all documents and combine content
      let combinedContent = "";
      const documents = [];
      
      for (const docId of input.documentIds) {
        const doc = await db.getImportedDocumentById(docId);
        if (!doc || doc.userId !== ctx.user.id) {
          throw new Error(`Document ${docId} not found`);
        }
        if (doc.status !== "ready" || !doc.extractedContent) {
          throw new Error(`Document ${doc.fileName} is not ready for processing`);
        }
        documents.push(doc);
        combinedContent += `\n\n--- Content from: ${doc.fileName} ---\n\n${doc.extractedContent}`;
      }

      // Generate course from combined content
      const courseStructure = await ai.generateCourseFromDocument(
        combinedContent,
        input.approach,
        input.courseLength,
        input.lessonsPerChapter,
        input.contentDepth
      );

      // Create course in database
      const courseId = await db.createCourse({
        userId: ctx.user.id,
        title: courseStructure.title,
        description: courseStructure.description,
        topic: courseStructure.title, // Use generated title as topic
        approach: input.approach,
        courseLength: input.courseLength,
        lessonsPerChapter: input.lessonsPerChapter,
        contentDepth: input.contentDepth,
      });

      // Create chapters and lessons
      for (let chapterIndex = 0; chapterIndex < courseStructure.chapters.length; chapterIndex++) {
        const chapter = courseStructure.chapters[chapterIndex];
        const chapterId = await db.createChapter({
          courseId,
          title: chapter.title,
          description: chapter.description,
          orderIndex: chapterIndex,
        });

        for (let lessonIndex = 0; lessonIndex < chapter.lessons.length; lessonIndex++) {
          const lesson = chapter.lessons[lessonIndex];
          const lessonId = await db.createLesson({
            chapterId,
            courseId,
            title: lesson.title,
            content: lesson.content,
            orderIndex: lessonIndex,
          });

          if (lesson.keyTerms && lesson.keyTerms.length > 0) {
            await db.createGlossaryTerms(
              lesson.keyTerms.map(term => ({
                lessonId,
                courseId,
                term: term.term,
                definition: term.definition,
              }))
            );
          }
        }
      }

      // Create related topics
      if (courseStructure.relatedTopics && courseStructure.relatedTopics.length > 0) {
        await db.createRelatedTopics(
          courseStructure.relatedTopics.map(topic => ({
            courseId,
            topicName: topic.name,
            relationship: topic.relationship,
            description: topic.description,
          }))
        );
      }

      // Link documents to course
      for (const doc of documents) {
        await db.linkDocumentToCourse(doc.id, courseId);
      }

      return { success: true, courseId };
    }),

  // Delete a document
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const doc = await db.getImportedDocumentById(input.id);
      if (!doc || doc.userId !== ctx.user.id) {
        throw new Error("Document not found");
      }
      await db.deleteImportedDocument(input.id);
      return { success: true };
    }),
});

// Helper function to process document asynchronously
async function processDocumentAsync(
  documentId: number,
  fileUrl: string,
  fileType: "pdf" | "docx" | "txt" | "md"
) {
  try {
    const { processDocument } = await import("./documentProcessor");
    const result = await processDocument(fileUrl, fileType);
    
    await db.updateImportedDocument(documentId, {
      extractedContent: result.content,
      status: "ready",
    });
  } catch (error) {
    console.error("Document processing error:", error);
    await db.updateImportedDocument(documentId, {
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// Related topics router
const relatedTopicsRouter = router({
  // Get related topics for a course
  get: publicProcedure
    .input(z.object({ courseId: z.number() }))
    .query(async ({ input }) => {
      return db.getRelatedTopicsByCourseId(input.courseId);
    }),

  // Generate more related topics
  generate: protectedProcedure
    .input(z.object({ courseId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const course = await db.getCourseById(input.courseId);
      if (!course || course.userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }

      const existingTopics = await db.getRelatedTopicsByCourseId(input.courseId);
      const newTopics = await ai.analyzeRelatedTopics(
        course.topic,
        existingTopics.map(t => t.topicName)
      );

      if (newTopics.length > 0) {
        await db.createRelatedTopics(
          newTopics.map(topic => ({
            courseId: input.courseId,
            topicName: topic.name,
            relationship: topic.relationship,
            description: topic.description,
          }))
        );
      }

      return { success: true, count: newTopics.length };
    }),
});

// AI Chat router for lesson explanations
const aiChatRouter = router({
  // Chat about a lesson
  chat: protectedProcedure
    .input(z.object({
      lessonId: z.number(),
      messages: z.array(z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const lesson = await db.getLessonById(input.lessonId);
      if (!lesson) throw new Error("Lesson not found");

      const response = await ai.chatAboutLesson(
        lesson.title,
        lesson.content || "",
        input.messages
      );

      return { response };
    }),

  // Chat about a course (overview level)
  chatCourse: protectedProcedure
    .input(z.object({
      courseId: z.number(),
      messages: z.array(z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const course = await db.getCourseById(input.courseId);
      if (!course) throw new Error("Course not found");

      // Fetch chapters and lessons for the course
      const courseChapters = await db.getChaptersByCourseId(input.courseId);
      const chaptersWithLessons = await Promise.all(
        courseChapters.map(async (ch) => {
          const chapterLessons = await db.getLessonsByChapterId(ch.id);
          return {
            title: ch.title,
            lessons: chapterLessons.map((l) => l.title),
          };
        })
      );

      const response = await ai.chatAboutCourse(
        course.title,
        course.description || "",
        chaptersWithLessons,
        input.messages
      );

      return { response };
    }),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  course: courseRouter,
  lesson: lessonRouter,
  glossary: glossaryRouter,
  flashcard: flashcardRouter,
  quiz: quizRouter,
  illustration: illustrationRouter,
  notes: notesRouter,
  progress: progressRouter,
  settings: settingsRouter,
  relatedTopics: relatedTopicsRouter,
  document: documentRouter,
  aiChat: aiChatRouter,
});

export type AppRouter = typeof appRouter;
