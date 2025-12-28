"use client";

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/api/auth';
import { getSession, setSession } from '@/lib/auth/session';
import type { ApiErrorPayload } from '@/lib/api/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiErrorPayload | null>(null);

  useEffect(() => {
    const existing = getSession();
    if (existing?.token) {
      router.replace('/advances');
    }
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await login(email, password);
      setSession({ token: response.token, user: response.user });
      router.replace('/advances');
    } catch (err) {
      setError(err as ApiErrorPayload);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="shell">
        <div className="card stack">
          <div>
            <p className="tag">Driver Advance Accounting</p>
            <h1 className="title">ログイン</h1>
            <p className="subtitle">JWT を取得して主要導線へ進みます。</p>
          </div>

          <form className="stack" onSubmit={handleSubmit}>
            <div className="stack">
              <label className="label" htmlFor="email">
                メールアドレス
              </label>
              <input
                id="email"
                className="input"
                type="email"
                autoComplete="email"
                placeholder="user@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="stack">
              <label className="label" htmlFor="password">
                パスワード
              </label>
              <input
                id="password"
                className="input"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            {error ? (
              <div className="error">
                <strong>ログイン失敗</strong>
                <div>status: {error.status}</div>
                <div>{error.error}</div>
              </div>
            ) : null}

            <button className="button" type="submit" disabled={loading}>
              {loading ? '認証中...' : 'ログイン'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
