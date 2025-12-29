"use client";

import { ReactNode, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { clearSession, getSession, type StoredSession } from '@/lib/auth/session';
import { isRoleAllowedForPath, resolveHomePath } from '@/lib/auth/routing';

type AuthedLayoutProps = {
  children: ReactNode;
};

export default function AuthedLayout({ children }: AuthedLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<StoredSession | null>(null);

  useEffect(() => {
    const existing = getSession();
    if (!existing?.token) {
      router.replace('/login');
      return;
    }
    setSession(existing);
  }, [router]);

  const tokenPreview = useMemo(() => {
    if (!session?.token) return '';
    return `${session.token.slice(0, 8)}...${session.token.slice(-6)}`;
  }, [session]);

  const handleLogout = () => {
    clearSession();
    router.replace('/login');
  };

  if (!session) {
    return (
      <div className="page">
        <div className="shell">
          <div className="card">
            <p className="muted">認証情報を確認しています...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isRoleAllowedForPath(session.user.role, pathname)) {
    return (
      <div className="page">
        <div className="shell">
          <div className="card stack">
            <div>
              <p className="tag">Access Denied</p>
              <h1 className="title">アクセス権限がありません</h1>
              <p className="subtitle">このページにはアクセスできません。</p>
            </div>
            <div className="row">
              <button
                className="button"
                type="button"
                onClick={() => router.replace(resolveHomePath(session.user.role))}
              >
                ホームへ戻る
              </button>
              <button className="button ghost" type="button" onClick={handleLogout}>
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="shell stack">
        <div className="card">
          <div className="header">
            <div>
              <p className="tag">Authed Workspace</p>
              <h1 className="title">Advance Console</h1>
              <p className="subtitle">API契約に沿って最短導線を確認。</p>
            </div>
            <div className="stack">
              <div className="row">
                <span className="chip">role: {session.user.role}</span>
                <span className="chip">email: {session.user.email}</span>
              </div>
              <div className="row">
                <span className="chip">token: {tokenPreview}</span>
                <button className="button ghost" type="button" onClick={handleLogout}>
                  ログアウト
                </button>
              </div>
            </div>
          </div>
          <div className="divider" />
          <div style={{ marginTop: '24px' }}>{children}</div>
        </div>
      </div>
    </div>
  );
}
