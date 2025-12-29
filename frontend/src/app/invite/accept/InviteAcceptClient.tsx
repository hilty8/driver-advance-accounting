"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { acceptDriverInvite } from '@/lib/api/driverInvites';
import type { ApiErrorPayload } from '@/lib/api/client';

export default function InviteAcceptClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [tokenFromQuery, setTokenFromQuery] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiErrorPayload | null>(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
      setTokenFromQuery(true);
    }
  }, [searchParams]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await acceptDriverInvite(token, password);
      setAccepted(true);
    } catch (err) {
      setError(err as ApiErrorPayload);
    } finally {
      setLoading(false);
    }
  };

  const errorMessage = useMemo(() => {
    if (!error) return '';
    if (error.status === 409) return 'この招待は既に使用されています。';
    if (error.status === 400) return '招待トークンが無効または期限切れです。';
    if (error.status === 404) return 'ドライバー情報が見つかりません。';
    return '受諾に失敗しました。';
  }, [error]);

  return (
    <div className="page">
      <div className="shell">
        <div className="card stack">
          <div>
            <p className="tag">Driver Invite</p>
            <h1 className="title">招待受諾</h1>
            <p className="subtitle">メールの招待トークンを入力して受諾します。</p>
          </div>

          {accepted ? (
            <div className="stack">
              <div className="card" style={{ background: '#fff' }}>
                <strong>受諾が完了しました。</strong>
                <p className="muted">ログイン画面からログインしてください。</p>
              </div>
              <button className="button" type="button" onClick={() => router.replace('/login')}>
                ログインへ
              </button>
            </div>
          ) : (
            <form className="stack" onSubmit={handleSubmit}>
              {tokenFromQuery ? (
                <div className="card" style={{ background: '#fff' }}>
                  <strong>招待トークンを自動取得しました。</strong>
                  <p className="muted">このままパスワードを設定してください。</p>
                </div>
              ) : (
                <div className="stack">
                  <label className="label" htmlFor="token">
                    招待トークン
                  </label>
                  <input
                    id="token"
                    className="input"
                    type="text"
                    value={token}
                    onChange={(event) => setToken(event.target.value)}
                    placeholder="token"
                    required
                  />
                </div>
              )}
              <div className="stack">
                <label className="label" htmlFor="password">
                  パスワード
                </label>
                <input
                  id="password"
                  className="input"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              {error ? (
                <div className="error">
                  <strong>受諾に失敗しました。</strong>
                  <div>{errorMessage}</div>
                </div>
              ) : null}

              <button className="button" type="submit" disabled={loading}>
                {loading ? '送信中...' : '受諾する'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
