"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { getSession } from '@/lib/auth/session';
import { createAdvance, getAdvanceAvailability, type Advance } from '@/lib/api/advances';
import type { ApiErrorPayload } from '@/lib/api/client';

const isValidAmount = (value: string) => /^\d+$/.test(value) && Number(value) > 0;
const formatYen = (value: string) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toLocaleString('ja-JP') : value;
};
const formatYenLabel = (value: string) => `${formatYen(value)}円`;

const parseAmount = (value: string) => {
  try {
    return BigInt(value);
  } catch {
    return null;
  }
};

const mapAdvanceError = (error: ApiErrorPayload | null, limitAmount: string) => {
  if (!error) return null;
  const message = error.error;
  if (message.includes('requested amount exceeds advance limit')) {
    return `申請額が前借り可能額を超えています。上限は${formatYenLabel(limitAmount)}です。`;
  }
  if (message.includes('requested amount must be positive') || message.includes('amount must be positive')) {
    return '申請金額は1円以上の整数で入力してください。';
  }
  if (message.includes('invalid payload')) {
    return '入力内容に不備があります。入力を確認してください。';
  }
  return '申請に失敗しました。入力内容をご確認ください。';
};

export default function DriverHome() {
  const session = getSession();
  const driverId = session?.user.driverId ?? '';
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<ApiErrorPayload | null>(null);
  const [lastAdvance, setLastAdvance] = useState<Advance | null>(null);
  const [limitAmount, setLimitAmount] = useState('0');
  const [deductedAmount, setDeductedAmount] = useState('0');
  const [limitLoading, setLimitLoading] = useState(false);
  const [limitError, setLimitError] = useState<string | null>(null);

  const apiErrorMessage = useMemo(
    () => mapAdvanceError(apiError, limitAmount),
    [apiError, limitAmount]
  );

  useEffect(() => {
    if (!driverId) return;
    const fetchAvailability = async () => {
      setLimitLoading(true);
      setLimitError(null);
      try {
        const availability = await getAdvanceAvailability(driverId);
        setLimitAmount(availability.availableAmount);
        setDeductedAmount(availability.deductedAmount);
      } catch {
        setLimitError('前借り可能額を取得できませんでした。');
      } finally {
        setLimitLoading(false);
      }
    };
    fetchAvailability();
  }, [driverId]);

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

    const requested = parseAmount(amount);
    const limit = parseAmount(limitAmount) ?? BigInt(0);
    if (requested !== null && !limitError && requested > limit) {
      setError(`申請額が前借り可能額を超えています。上限は${formatYenLabel(limitAmount)}です。`);
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

        <div className="row">
          <span className="chip">
            前借り可能上限: {limitLoading ? '取得中...' : formatYenLabel(limitAmount)}
          </span>
          <span className="chip">
            利用中合計: {limitLoading ? '取得中...' : formatYenLabel(deductedAmount)}
          </span>
        </div>
        {limitError ? <div className="muted">{limitError}</div> : null}

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
            <div>{apiErrorMessage}</div>
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
