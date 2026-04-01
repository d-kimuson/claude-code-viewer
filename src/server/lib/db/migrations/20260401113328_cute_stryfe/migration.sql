CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`path` text,
	`session_count` integer DEFAULT 0 NOT NULL,
	`dir_mtime_ms` integer NOT NULL,
	`synced_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`file_path` text NOT NULL,
	`message_count` integer DEFAULT 0 NOT NULL,
	`first_user_message_json` text,
	`custom_title` text,
	`total_cost_usd` real DEFAULT 0 NOT NULL,
	`cost_breakdown_json` text,
	`token_usage_json` text,
	`model_name` text,
	`pr_links_json` text,
	`file_mtime_ms` integer NOT NULL,
	`last_modified_at` text NOT NULL,
	`synced_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_file_path_unique` ON `sessions` (`file_path`);--> statement-breakpoint
CREATE INDEX `idx_sessions_project_id` ON `sessions` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_sessions_file_mtime` ON `sessions` (`file_mtime_ms`);--> statement-breakpoint
CREATE TABLE `sync_state` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
