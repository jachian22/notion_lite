import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { pages } from "@/server/db/schema";

const HOME_SLUG = "home";

export const pageRouter = createTRPCRouter({
  getHome: publicProcedure.query(async ({ ctx }) => {
    let page = await ctx.db.query.pages.findFirst({
      where: (pages, { eq }) => eq(pages.slug, HOME_SLUG),
    });

    if (!page) {
      await ctx.db
        .insert(pages)
        .values({ slug: HOME_SLUG, title: "Untitled" })
        .onConflictDoNothing({ target: pages.slug });

      page = await ctx.db.query.pages.findFirst({
        where: (pages, { eq }) => eq(pages.slug, HOME_SLUG),
      });
    }

    if (!page) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create home page.",
      });
    }

    const pageBlocks = await ctx.db.query.blocks.findMany({
      where: (blocks, { eq }) => eq(blocks.pageId, page.id),
      orderBy: (blocks, { asc }) => [asc(blocks.position), asc(blocks.id)],
    });

    return { page, blocks: pageBlocks };
  }),

  updateTitle: publicProcedure
    .input(
      z.object({
        pageId: z.number().int(),
        title: z.string().trim().min(1).max(256),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(pages)
        .set({ title: input.title })
        .where(eq(pages.id, input.pageId))
        .returning();

      if (!updated) {
        const [fallback] = await ctx.db
          .update(pages)
          .set({ title: input.title })
          .where(eq(pages.slug, HOME_SLUG))
          .returning();

        if (!fallback) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Page not found." });
        }

        return fallback;
      }

      return updated;
    }),
});
