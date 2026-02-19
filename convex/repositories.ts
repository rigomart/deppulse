import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const upsert = internalMutation({
  args: {
    owner: v.string(),
    name: v.string(),
    fullName: v.string(),
    defaultBranch: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("repositories")
      .withIndex("by_fullName", (q) => q.eq("fullName", args.fullName))
      .unique();

    if (existing) {
      if (args.defaultBranch && args.defaultBranch !== existing.defaultBranch) {
        await ctx.db.patch(existing._id, {
          defaultBranch: args.defaultBranch,
        });
      }
      return existing._id;
    }

    return ctx.db.insert("repositories", {
      owner: args.owner,
      name: args.name,
      fullName: args.fullName,
      defaultBranch: args.defaultBranch,
    });
  },
});
