ALTER TABLE `sessions` ADD `permission_allowlist_json` text;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_sessions` (
	`id` text PRIMARY KEY,
	`project_id` text NOT NULL,
	`file_path` text NOT NULL UNIQUE,
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
	`permission_allowlist_json` text,
	CONSTRAINT `sessions_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_sessions`(`id`, `project_id`, `file_path`, `message_count`, `first_user_message_json`, `custom_title`, `total_cost_usd`, `cost_breakdown_json`, `token_usage_json`, `model_name`, `pr_links_json`, `file_mtime_ms`, `last_modified_at`, `synced_at`) SELECT `id`, `project_id`, `file_path`, `message_count`, `first_user_message_json`, `custom_title`, `total_cost_usd`, `cost_breakdown_json`, `token_usage_json`, `model_name`, `pr_links_json`, `file_mtime_ms`, `last_modified_at`, `synced_at` FROM `sessions`;--> statement-breakpoint
DROP TABLE `sessions`;--> statement-breakpoint
ALTER TABLE `__new_sessions` RENAME TO `sessions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
DROP INDEX IF EXISTS `sessions_file_path_unique`;--> statement-breakpoint
CREATE INDEX `idx_sessions_project_id` ON `sessions` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_sessions_file_mtime` ON `sessions` (`file_mtime_ms`);