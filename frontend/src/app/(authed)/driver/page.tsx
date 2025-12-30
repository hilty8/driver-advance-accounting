"use client";

import { FormEvent, useState } from 'react';
import { getSession } from '@/lib/auth/session';
import { createAdvance, type Advance } from '@/lib/api/advances';
import type { ApiErrorPayload } from '@/lib/api/client';

const isValidAmount = (value: string) => /^\d+$/.test(value) && Number(value) > 0;
const formatYen = (value: string) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toLocaleString('ja-JP') : value;
};

export default function DriverHome() {
  const session = getSession();
  const driverId = session?.user.driverId ?? '';
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<ApiErrorPayload | null>(null);
  const [lastAdvance, setLastAdvance] = useState<Advance | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setApiError(null);
    setLastAdvance(null);

    if (!driverId) {
      setError('ドライバー情報が見つかりません。');
      return;
    }

    if (!isValidAmount(amount)) {
      setError('金額は正の整数で入力してください。');
      return;
    }

    setLoading(true);
    try {
      const advance = await createAdvance(driverId, amount);
      setLastAdvance(advance);
      setAmount('');
    } catch (err) {
      setApiError(err as ApiErrorPayload);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stack">
      <div>
        <h2>ドライバーダッシュボード</h2>
        <p className="muted">ロール別ホームの最小UI。</p>
      </div>
      <div className="card stack" style={{ background: '#fff' }}>
        <div className="row">
          <span className="chip">role: {session?.user.role ?? '-'}</span>
          <span className="chip">email: {session?.user.email ?? '-'}</span>
        </div>
      </div>

      <div className="card stack">
        <div>
          <h3>前借り申請</h3>
          <p className="muted">金額は整数で入力してください。</p>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          <div className="stack">
            <label className="label" htmlFor="amount">
              申請金額（string）
            </label>
            <input
              id="amount"
              className="input"
              type="text"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="10000"
              required
            />
          </div>
          <button className="button" type="submit" disabled={loading}>
            {loading ? '送信中...' : '申請する'}
          </button>
        </form>

        {error ? (
          <div className="error">
            <strong>入力エラー</strong>
            <div>{error}</div>
          </div>
        ) : null}

        {apiError ? (
          <div className="error">
            <strong>申請エラー</strong>
            <div>{apiError.error}</div>
          </div>
        ) : null}

        {lastAdvance ? (
          <div className="card stack" style={{ background: '#fff' }}>
            <strong>
              {formatYen(lastAdvance.requestedAmount)}円の前借り申請を送信しました。
            </strong>
            <div className="row">
              <a className="button" href="/driver">
                ホームに戻る
              </a>
              <span className="muted">承認結果は後ほどご確認ください。</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
