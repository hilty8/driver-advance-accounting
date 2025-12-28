import { createDailyBatchHandler } from '../../src/http/dailyBatch';

class FakeBatchService {
  public calls: Date[] = [];

  async runDailyBatch(targetDate: Date): Promise<void> {
    this.calls.push(targetDate);
  }
}

describe('[F06][SF02] daily batch handler', () => {
  test('returns 400 for invalid payload', async () => {
    const service = new FakeBatchService();
    const handler = createDailyBatchHandler(service);

    const res = await handler({ body: { targetDate: 'not-a-date' } });

    const body = res.body as { error?: string };
    expect(res.status).toBe(400);
    expect(body.error).toContain('invalid');
  });

  test('executes batch for valid payload', async () => {
    const service = new FakeBatchService();
    const handler = createDailyBatchHandler(service);

    const res = await handler({ body: { targetDate: '2025-10-31' } });

    expect(res.status).toBe(200);
    expect(service.calls).toHaveLength(1);
    expect(service.calls[0].toISOString().startsWith('2025-10-31')).toBe(true);
  });
});
