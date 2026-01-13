CREATE TABLE `chapters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`courseId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`orderIndex` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chapters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `courses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`topic` varchar(255) NOT NULL,
	`approach` enum('balanced','rigorous','easy') NOT NULL DEFAULT 'balanced',
	`courseLength` enum('short','medium','comprehensive') NOT NULL DEFAULT 'medium',
	`lessonsPerChapter` enum('few','moderate','many') NOT NULL DEFAULT 'moderate',
	`contentDepth` enum('introductory','intermediate','advanced') NOT NULL DEFAULT 'intermediate',
	`completionPercentage` float NOT NULL DEFAULT 0,
	`isPublished` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `courses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `flashcard_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`flashcardId` int NOT NULL,
	`userId` int NOT NULL,
	`quality` int NOT NULL,
	`reviewedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `flashcard_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `flashcards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`glossaryTermId` int NOT NULL,
	`lessonId` int NOT NULL,
	`courseId` int NOT NULL,
	`front` text NOT NULL,
	`back` text NOT NULL,
	`easeFactor` float NOT NULL DEFAULT 2.5,
	`interval` int NOT NULL DEFAULT 0,
	`repetitions` int NOT NULL DEFAULT 0,
	`nextReviewDate` timestamp NOT NULL DEFAULT (now()),
	`status` enum('new','learning','review','mastered') NOT NULL DEFAULT 'new',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `flashcards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `glossary_terms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lessonId` int NOT NULL,
	`courseId` int NOT NULL,
	`term` varchar(255) NOT NULL,
	`definition` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `glossary_terms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `illustrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lessonId` int NOT NULL,
	`courseId` int NOT NULL,
	`imageUrl` text NOT NULL,
	`fileKey` varchar(512),
	`mediaType` enum('illustration','infographic','data_visualization','diagram') NOT NULL DEFAULT 'illustration',
	`visualStyle` enum('minimalist','detailed','colorful','technical','modern') NOT NULL DEFAULT 'modern',
	`prompt` text,
	`caption` text,
	`orderIndex` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `illustrations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lesson_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`lessonId` int NOT NULL,
	`courseId` int NOT NULL,
	`isCompleted` boolean NOT NULL DEFAULT false,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lesson_progress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lessons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chapterId` int NOT NULL,
	`courseId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text,
	`orderIndex` int NOT NULL,
	`isCompleted` boolean NOT NULL DEFAULT false,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lessons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quiz_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quizId` int NOT NULL,
	`userId` int NOT NULL,
	`lessonId` int NOT NULL,
	`score` float NOT NULL,
	`totalQuestions` int NOT NULL,
	`answers` json NOT NULL,
	`feedback` json,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quiz_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quizzes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lessonId` int NOT NULL,
	`courseId` int NOT NULL,
	`questions` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quizzes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `related_topics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`courseId` int NOT NULL,
	`relatedCourseId` int,
	`topicName` varchar(255) NOT NULL,
	`relationship` enum('parent','child','sibling') NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `related_topics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `study_activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`activityType` enum('lesson_completed','flashcard_review','quiz_completed') NOT NULL,
	`courseId` int,
	`lessonId` int,
	`flashcardCount` int,
	`quizScore` float,
	`activityDate` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `study_activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `study_streaks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`currentStreak` int NOT NULL DEFAULT 0,
	`longestStreak` int NOT NULL DEFAULT 0,
	`lastStudyDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `study_streaks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`lessonId` int NOT NULL,
	`courseId` int NOT NULL,
	`content` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`preferredProvider` enum('manus','anthropic','openai','openrouter','grok') NOT NULL DEFAULT 'manus',
	`anthropicApiKey` text,
	`anthropicModel` varchar(64),
	`openaiApiKey` text,
	`openaiModel` varchar(64),
	`openrouterApiKey` text,
	`openrouterModel` varchar(128),
	`grokApiKey` text,
	`grokModel` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_settings_id` PRIMARY KEY(`id`)
);
