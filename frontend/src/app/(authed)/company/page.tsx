"use client";

import { FormEvent, useMemo, useState } from 'react';
import { getSession } from '@/lib/auth/session';
import { createDriver, inviteDriver } from '@/lib/api/drivers';
import type { ApiErrorPayload } from '@/lib/api/client';

export default function CompanyHome() {
  const session = getSession();
  const companyId = session?.user.companyId ?? '';
  const [driverEmail, setDriverEmail] = useState('');
  const [driverName, setDriverName] = useState('');
  const [expiresInHours, setExpiresInHours] = useState('72');
  const [result, setResult] = useState<{ email: string; expiresAt: string } | null>(null);
  const [error, setError] = useState<ApiErrorPayload | null>(null);
  const [loading, setLoading] = useState(false);

  const expiresAtLabel = useMemo(() => {
    if (!result?.expiresAt) return '';
    const date = new Date(result.expiresAt);
    if (Number.isNaN(date.getTime())) return result.expiresAt;
    return date.toLocaleString('ja-JP');
  }, [result]);

  const handleInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const name = driverName.trim() || driverEmail.split('@')[0] || 'Driver';
      const created = await createDriver({ companyId, name, email: driverEmail.trim() });
      const invite = await inviteDriver(created.id, Number(expiresInHours));
      setResult({ email: created.email ?? driverEmail.trim(), expiresAt: invite.expiresAt });
      setDriverEmail('');
      setDriverName('');
    } catch (err) {
      setError(err as ApiErrorPayload);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stack">
      <div>
        <h2>事業者ダッシュボード</h2>
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
          <h3>ドライバーを招待する</h3>
          <p className="muted">※現在はメール送信は未実装です。受諾は招待トークンで行います。</p>
        </div>

        <form className="stack" onSubmit={handleInvite}>
          <div className="stack">
            <label className="label" htmlFor="driverEmail">
              ドライバーのメールアドレス
            </label>
            <input
              id="driverEmail"
              className="input"
              type="email"
              value={driverEmail}
              onChange={(event) => setDriverEmail(event.target.value)}
              placeholder="driver@example.com"
              required
            />
          </div>
          <div className="stack">
            <label className="label" htmlFor="driverName">
              ドライバー名（任意）
            </label>
            <input
              id="driverName"
              className="input"
              type="text"
              value={driverName}
              onChange={(event) => setDriverName(event.target.value)}
              placeholder="Driver Name"
            />
          </div>
          <div className="stack">
            <label className="label" htmlFor="expiresInHours">
              有効期限（時間）
            </label>
            <input
              id="expiresInHours"
              className="input"
              type="number"
              min={1}
              value={expiresInHours}
              onChange={(event) => setExpiresInHours(event.target.value)}
            />
          </div>
          <button className="button" type="submit" disabled={loading || !companyId}>
            {loading ? '送信中...' : '招待を作成'}
          </button>
        </form>

        {error ? (
          <div className="error">
            <strong>招待作成に失敗しました。</strong>
            <div>{error.error}</div>
          </div>
        ) : null}

        {result ? (
          <div className="card stack" style={{ background: '#fff' }}>
            <strong>招待を作成しました。</strong>
            <div className="row">
              <span className="chip">招待先: {result.email}</span>
              <span className="chip">有効期限: {expiresAtLabel || '-'}</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
