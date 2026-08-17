CREATE TABLE `deleted_routes` (
	`route_id` text PRIMARY KEY NOT NULL,
	`deleted_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `map_junctions` (
	`id` text PRIMARY KEY NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`routes_json` text NOT NULL,
	`landmark` integer NOT NULL,
	`locked` integer NOT NULL,
	`custom` integer NOT NULL,
	`updated_at` integer NOT NULL
);
