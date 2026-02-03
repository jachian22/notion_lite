import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { blocks } from "@/server/db/schema";

const POSITION_STEP = 1000;
const REINDEX_OFFSET = 1_000_000;

const textStyleSchema = z.enum(["h1", "h2", "h3", "p"]);

export const blockRouter = createTRPCRouter({
  addText: publicProcedure
    .input(
      z.object({
        pageId: z.number().int(),
        text: z.string(),
        textStyle: textStyleSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          maxPosition: sql<number | null>`max(${blocks.position})`,
        })
        .from(blocks)
        .where(eq(blocks.pageId, input.pageId));

      const maxPosition = rows[0]?.maxPosition ?? 0;
      const position = maxPosition + POSITION_STEP;

      const [created] = await ctx.db
        .insert(blocks)
        .values({
          pageId: input.pageId,
          type: "text",
          position,
          text: input.text,
          textStyle: input.textStyle,
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create text block.",
        });
      }

      return created;
    }),

  addImage: publicProcedure
    .input(
      z.object({
        pageId: z.number().int(),
        imageSrc: z.string(),
        width: z.number().int().positive().nullable(),
        height: z.number().int().positive().nullable(),
        insertAfterBlockId: z.number().int().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const insertAfterBlockId = input.insertAfterBlockId;

      if (!insertAfterBlockId) {
        const rows = await ctx.db
          .select({
            maxPosition: sql<number | null>`max(${blocks.position})`,
          })
          .from(blocks)
          .where(eq(blocks.pageId, input.pageId));

        const maxPosition = rows[0]?.maxPosition ?? 0;
        const position = maxPosition + POSITION_STEP;

        const [created] = await ctx.db
          .insert(blocks)
          .values({
            pageId: input.pageId,
            type: "image",
            position,
            imageSrc: input.imageSrc,
            imageWidth: input.width,
            imageHeight: input.height,
          })
          .returning();

        if (!created) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create image block.",
          });
        }

        return created;
      }

      return ctx.db.transaction(async (tx) => {
        const current = await tx.query.blocks.findFirst({
          where: (blocks, { eq }) => eq(blocks.id, insertAfterBlockId),
        });

        if (!current) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Block not found.",
          });
        }

        if (current.pageId !== input.pageId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Block does not belong to page.",
          });
        }

        const next = await tx.query.blocks.findFirst({
          where: (blocks, { and, eq, gt }) =>
            and(eq(blocks.pageId, input.pageId), gt(blocks.position, current.position)),
          orderBy: (blocks, { asc }) => [asc(blocks.position), asc(blocks.id)],
        });

        let position = current.position + POSITION_STEP;

        if (next) {
          const gap = next.position - current.position;
          if (gap > 1) {
            position = Math.floor((current.position + next.position) / 2);
          } else {
            const ordered = await tx.query.blocks.findMany({
              where: (blocks, { eq }) => eq(blocks.pageId, input.pageId),
              orderBy: (blocks, { asc }) => [asc(blocks.position), asc(blocks.id)],
            });

            await tx
              .update(blocks)
              .set({ position: sql`${blocks.position} + ${REINDEX_OFFSET}` })
              .where(eq(blocks.pageId, input.pageId));

            const positionMap = new Map<number, number>();
            for (const [index, block] of ordered.entries()) {
              const newPosition = (index + 1) * POSITION_STEP;
              positionMap.set(block.id, newPosition);
              await tx
                .update(blocks)
                .set({ position: newPosition })
                .where(eq(blocks.id, block.id));
            }

            const currentPosition = positionMap.get(current.id);
            if (currentPosition === undefined) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to reindex blocks.",
              });
            }

            position = currentPosition + Math.floor(POSITION_STEP / 2);
          }
        }

        const [created] = await tx
          .insert(blocks)
          .values({
            pageId: input.pageId,
            type: "image",
            position,
            imageSrc: input.imageSrc,
            imageWidth: input.width,
            imageHeight: input.height,
          })
          .returning();

        if (!created) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create image block.",
          });
        }

        return created;
      });
    }),

  updateText: publicProcedure
    .input(
      z.object({
        id: z.number().int(),
        text: z.string(),
        textStyle: textStyleSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.blocks.findFirst({
        where: (blocks, { eq }) => eq(blocks.id, input.id),
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Block not found." });
      }

      if (existing.type !== "text") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Block is not a text block.",
        });
      }

      const [updated] = await ctx.db
        .update(blocks)
        .set({ text: input.text, textStyle: input.textStyle })
        .where(eq(blocks.id, input.id))
        .returning();

      return updated;
    }),

  updateImage: publicProcedure
    .input(
      z.object({
        id: z.number().int(),
        imageSrc: z.string(),
        width: z.number().int().positive().nullable(),
        height: z.number().int().positive().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.blocks.findFirst({
        where: (blocks, { eq }) => eq(blocks.id, input.id),
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Block not found." });
      }

      if (existing.type !== "image") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Block is not an image block.",
        });
      }

      const [updated] = await ctx.db
        .update(blocks)
        .set({
          imageSrc: input.imageSrc,
          imageWidth: input.width,
          imageHeight: input.height,
        })
        .where(eq(blocks.id, input.id))
        .returning();

      return updated;
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(blocks).where(eq(blocks.id, input.id));
      return { success: true };
    }),

  move: publicProcedure
    .input(
      z.object({
        blockId: z.number().int(),
        direction: z.enum(["up", "down"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const current = await ctx.db.query.blocks.findFirst({
        where: (blocks, { eq }) => eq(blocks.id, input.blockId),
      });

      if (!current) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Block not found." });
      }

      const neighbor = await ctx.db.query.blocks.findFirst({
        where: (blocks, { and, eq, gt, lt }) =>
          input.direction === "up"
            ? and(eq(blocks.pageId, current.pageId), lt(blocks.position, current.position))
            : and(
                eq(blocks.pageId, current.pageId),
                gt(blocks.position, current.position),
              ),
        orderBy: (blocks, { asc, desc }) =>
          input.direction === "up"
            ? [desc(blocks.position), desc(blocks.id)]
            : [asc(blocks.position), asc(blocks.id)],
      });

      if (!neighbor) {
        return { moved: false };
      }

      await ctx.db.transaction(async (tx) => {
        await tx
          .update(blocks)
          .set({ position: -1 })
          .where(eq(blocks.id, current.id));
        await tx
          .update(blocks)
          .set({ position: current.position })
          .where(eq(blocks.id, neighbor.id));
        await tx
          .update(blocks)
          .set({ position: neighbor.position })
          .where(eq(blocks.id, current.id));
      });

      return { moved: true };
    }),
});
