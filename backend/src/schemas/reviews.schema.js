const { z } = require('zod');

const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  body: z.string().min(1).max(2000)
});

const moderateReviewSchema = z.object({
  approved: z.boolean()
});

module.exports = { createReviewSchema, moderateReviewSchema };
