import { z } from 'zod';
import { AdvanceServiceImpl } from '../domain/advanceServiceImpl';
import { jsonError } from './errors';

const WriteOffSchema = z.object({
  amount: z.string().regex(/^\d+$/),
  memo: z.string().optional()
});

type HandlerInput = {
  advanceId: string;
  body: unknown;
};

type HandlerResponse = {
  status: number;
  body: unknown;
};

export const createWriteOffHandler = (service: AdvanceServiceImpl) => {
  return async (input: HandlerInput): Promise<HandlerResponse> => {
    const parsed = WriteOffSchema.safeParse(input.body);
    if (!parsed.success) {
      return { status: 400, body: jsonError('invalid payload', parsed.error.flatten()) };
    }

    try {
      const amount = BigInt(parsed.data.amount);
      const updated = await service.writeOff(input.advanceId, amount, parsed.data.memo);
      return { status: 200, body: updated };
    } catch (error) {
      return { status: 400, body: jsonError((error as Error).message) };
    }
  };
};

export const createDefaultWriteOffHandler = () => {
  const service = new AdvanceServiceImpl();
  return createWriteOffHandler(service);
};
