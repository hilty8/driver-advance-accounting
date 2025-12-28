"use client";

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createAdvance, type Advance } from '@/lib/api/advances';
import { clearSession } from '@/lib/auth/session';
import type { ApiErrorPayload } from '@/lib/api/client';

export default function AdvancesPage() {
  const router = useRouter();
  const [driverId, setDriverId] = useState('');
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState<Advance | null>(null);
  const [error, setError] = useState<ApiErrorPayload | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const response = await createAdvance(driverId, amount);
      setResult(response);
    } catch (err) {
      const apiError = err as ApiErrorPayload;
      if (apiError.status === 401) {
        clearSession();
        router.replace('/login');
        return;
      }
      setError(apiError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stack">
      <div className="stack">
        <h2>前借り申請（最小導線）</h2>
        <p className="muted">
          ドライバーIDと申請金額を入力して、`POST /drivers/:id/advances` を実行します。
        </p>
      </div>

      <form className="stack" onSubmit={handleSubmit}>
        <div className="stack">
          <label className="label" htmlFor="driverId">
            ドライバーID
          </label>
          <input
            id="driverId"
            className="input"
            type="text"
            placeholder="UUID"
            value={driverId}
            onChange={(event) => setDriverId(event.target.value)}
            required
          />
        </div>
        <div className="stack">
          <label className="label" htmlFor="amount">
            申請金額（string）
          </label>
          <input
            id="amount"
            className="input"
            type="text"
            placeholder="10000"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
        </div>

        <button className="button" type="submit" disabled={loading}>
          {loading ? '送信中...' : '前借りを作成'}
        </button>
      </form>

      {error ? (
        <div className="error">
          <strong>APIエラー</strong>
          <div>status: {error.status}</div>
          <div>{error.error}</div>
          {error.details ? <pre>{JSON.stringify(error.details, null, 2)}</pre> : null}
        </div>
      ) : null}

      {result ? (
        <div className="card stack" style={{ background: '#fff' }}>
          <div className="row">
            <span className="chip">status: {result.status}</span>
            <span className="chip">requestedAmount: {result.requestedAmount}</span>
          </div>
          <div className="muted">advanceId: {result.id}</div>
          <div className="muted">driverId: {result.driverId}</div>
          <div className="muted">companyId: {result.companyId}</div>
        </div>
      ) : null}
    </div>
  );
}
