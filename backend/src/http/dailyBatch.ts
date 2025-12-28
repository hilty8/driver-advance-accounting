import { z } from 'zod';
import { runDailyBatch } from '../batch/runDailyBatch';
import { jsonError } from './errors';

const DailyBatchSchema = z.object({
  targetDate: z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'invalid targetDate'
  })
});

type HandlerInput = {
  body: unknown;
};

type HandlerResponse = {
  status: number;
  body: unknown;
};

type BatchService = {
  runDailyBatch(targetDate: Date): Promise<void>;
};

export const createDailyBatchHandler = (service: BatchService) => {
  return async (input: HandlerInput): Promise<HandlerResponse> => {
    const parsed = DailyBatchSchema.safeParse(input.body);
    if (!parsed.success) {
      return {
        status: 400,
        body: jsonError('invalid payload', parsed.error.flatten())
      };
    }

    try {
      const targetDate = new Date(parsed.data.targetDate);
      await service.runDailyBatch(targetDate);
      return { status: 200, body: { status: 'ok' } };
    } catch (error) {
      return { status: 500, body: jsonError((error as Error).message) };
    }
  };
};

export const createDefaultDailyBatchHandler = () => {
  return createDailyBatchHandler({ runDailyBatch });
};
