ALTER TABLE `users` ADD COLUMN `image` text;
--> statement-breakpoint
ALTER TABLE `accounts` ADD COLUMN `access_token_expires_at` integer;
--> statement-breakpoint
ALTER TABLE `accounts` ADD COLUMN `refresh_token_expires_at` integer;
--> statement-breakpoint
ALTER TABLE `accounts` ADD COLUMN `scope` text;
