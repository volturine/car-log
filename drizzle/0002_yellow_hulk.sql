CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`repair_id` text NOT NULL,
	`amount` real NOT NULL,
	`method` text NOT NULL,
	`notes` text,
	`recorded_by` text NOT NULL,
	`paid_at` integer NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`repair_id`) REFERENCES `repairs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recorded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
