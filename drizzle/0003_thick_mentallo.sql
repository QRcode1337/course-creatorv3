CREATE TABLE `guest_signup_tracking` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientIp` varchar(45) NOT NULL,
	`previewCount` int NOT NULL DEFAULT 0,
	`lastPreviewAt` timestamp,
	`signedUpUserId` int,
	`signedUpAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `guest_signup_tracking_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `preview_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`clientIp` varchar(45),
	`userTier` enum('guest','authenticated','premium') NOT NULL,
	`topic` varchar(255) NOT NULL,
	`success` boolean NOT NULL DEFAULT true,
	`errorCode` varchar(64),
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `preview_events_id` PRIMARY KEY(`id`)
);
