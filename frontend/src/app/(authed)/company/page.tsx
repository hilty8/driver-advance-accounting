"use client";

import { getSession } from '@/lib/auth/session';

export default function CompanyHome() {
  const session = getSession();

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
    </div>
  );
}
