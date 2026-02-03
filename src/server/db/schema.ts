// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import {
  index,
  pgEnum,
  pgTableCreator,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `notion_lite_${name}`);

export const blockTypeEnum = pgEnum("notion_lite_block_type", [
  "text",
  "image",
]);

export const textStyleEnum = pgEnum("notion_lite_text_style", [
  "h1",
  "h2",
  "h3",
  "p",
]);

export const pages = createTable(
  "page",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    slug: d.varchar({ length: 128 }).notNull(),
    title: d.varchar({ length: 256 }).notNull(),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [uniqueIndex("pages_slug_idx").on(t.slug)],
);

export const blocks = createTable(
  "block",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    pageId: d
      .integer()
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    type: blockTypeEnum("type").notNull(),
    position: d.integer().notNull(),
    text: d.text(),
    textStyle: textStyleEnum("textStyle"),
    imageSrc: d.text(),
    imageWidth: d.integer(),
    imageHeight: d.integer(),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("blocks_page_id_idx").on(t.pageId),
    uniqueIndex("blocks_page_position_idx").on(t.pageId, t.position),
  ],
);
