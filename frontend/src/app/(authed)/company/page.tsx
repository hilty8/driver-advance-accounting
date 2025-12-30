"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { getSession } from '@/lib/auth/session';
import { createDriver, inviteDriver } from '@/lib/api/drivers';
import { approveAdvance, listCompanyAdvances, rejectAdvance, type Advance } from '@/lib/api/advances';
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
  const [advanceList, setAdvanceList] = useState<Advance[]>([]);
  const [listError, setListError] = useState<ApiErrorPayload | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ type: 'approve' | 'reject'; advance: Advance } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [dialogError, setDialogError] = useState<string | null>(null);

  const formatYen = (value: string) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? `${numeric.toLocaleString('ja-JP')}円` : `${value}円`;
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'requested':
        return '申請中';
      case 'approved':
        return '承認';
      case 'rejected':
        return '否認';
      case 'payout_instructed':
        return '振込指示';
      case 'paid':
        return '支払済';
      case 'write_off':
      case 'written_off':
        return '貸倒';
      default:
        return status;
    }
  };

  const formatActionError = (err: ApiErrorPayload) => {
    if (err.status === 409) return '申請はすでに処理済みです。一覧を更新してください。';
    if (err.status === 403) return '権限がありません。';
    if (err.status === 400) return '入力内容に不備があります。';
    return '処理に失敗しました。時間をおいて再度お試しください。';
  };

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

  const fetchList = useCallback(async () => {
    if (!companyId) return;
    setListLoading(true);
    setListError(null);
    try {
      const list = await listCompanyAdvances(companyId);
      setAdvanceList(list);
    } catch (err) {
      setListError(err as ApiErrorPayload);
    } finally {
      setListLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const openApproveDialog = (advance: Advance) => {
    setDialog({ type: 'approve', advance });
    setDialogError(null);
    setActionError(null);
    setActionMessage(null);
  };

  const openRejectDialog = (advance: Advance) => {
    setDialog({ type: 'reject', advance });
    setRejectReason('');
    setDialogError(null);
    setActionError(null);
    setActionMessage(null);
  };

  const handleApprove = async () => {
    if (!dialog || dialog.type !== 'approve') return;
    setActioningId(dialog.advance.id);
    setDialogError(null);
    try {
      await approveAdvance(dialog.advance.id, new Date().toISOString());
      setActionMessage('承認しました。');
      await fetchList();
      setDialog(null);
    } catch (err) {
      setActionError(formatActionError(err as ApiErrorPayload));
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async () => {
    if (!dialog || dialog.type !== 'reject') return;
    const reason = rejectReason.trim();
    if (!reason) {
      setDialogError('否認理由を入力してください。');
      return;
    }
    if (reason.length > 500) {
      setDialogError('否認理由は500文字以内で入力してください。');
      return;
    }
    setActioningId(dialog.advance.id);
    setDialogError(null);
    try {
      await rejectAdvance(dialog.advance.id, reason);
      setActionMessage('否認しました。');
      await fetchList();
      setDialog(null);
    } catch (err) {
      setActionError(formatActionError(err as ApiErrorPayload));
    } finally {
      setActioningId(null);
    }
  };

  const isRejectDisabled =
    rejectReason.trim().length === 0 || rejectReason.trim().length > 500;
  const rejectReasonCount = rejectReason.trim().length;

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

      <div className="card stack">
        <div>
          <h3>前借り申請一覧</h3>
          <p className="muted">最新の申請から表示します。</p>
        </div>

        {listLoading ? <p className="muted">読み込み中...</p> : null}
        {listError ? (
          <div className="error">
            <strong>一覧取得に失敗しました。</strong>
            <div>{listError.error}</div>
          </div>
        ) : null}
        {actionError ? (
          <div className="error">
            <strong>操作に失敗しました。</strong>
            <div>{actionError}</div>
          </div>
        ) : null}
        {actionMessage ? (
          <div className="card" style={{ background: '#fff' }}>
            <strong>{actionMessage}</strong>
          </div>
        ) : null}

        {!listLoading && !listError && advanceList.length === 0 ? (
          <p className="muted">現在表示できる申請はありません。</p>
        ) : null}

        {!listLoading && !listError && advanceList.length > 0 ? (
          <div className="card" style={{ background: '#fff' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px' }}>ドライバー</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>金額</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>ステータス</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {advanceList.map((advance) => {
                  const isRequested = advance.status === 'requested';
                  return (
                    <tr key={advance.id}>
                      <td style={{ padding: '8px', borderTop: '1px solid #eee' }}>
                        {advance.driverName ?? advance.driverEmail ?? advance.driverId}
                      </td>
                      <td
                        style={{
                          padding: '8px',
                          borderTop: '1px solid #eee',
                          textAlign: 'right'
                        }}
                      >
                        {formatYen(advance.requestedAmount)}
                      </td>
                      <td style={{ padding: '8px', borderTop: '1px solid #eee' }}>
                        {statusLabel(advance.status)}
                      </td>
                      <td style={{ padding: '8px', borderTop: '1px solid #eee' }}>
                        <div className="row">
                          <button
                            className="button success"
                            type="button"
                            disabled={!isRequested || actioningId === advance.id}
                            onClick={() => openApproveDialog(advance)}
                            title={isRequested ? '' : 'requested の申請のみ操作できます'}
                          >
                            承認
                          </button>
                          <button
                            className="button danger"
                            type="button"
                            disabled={!isRequested || actioningId === advance.id}
                            onClick={() => openRejectDialog(advance)}
                            title={isRequested ? '' : 'requested の申請のみ操作できます'}
                          >
                            否認
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {dialog ? (
        <div className="modal">
          <div className="modal-card">
            {dialog.type === 'approve' ? (
              <div className="stack">
                <h4>前借り申請を承認しますか？</h4>
                <p className="muted">承認するとステータスが「承認」に更新されます。</p>
                {dialogError ? <div className="error">{dialogError}</div> : null}
                <div className="row">
                  <button
                    className="button success"
                    type="button"
                    onClick={handleApprove}
                    disabled={actioningId === dialog.advance.id}
                  >
                    承認する
                  </button>
                  <button
                    className="button ghost"
                    type="button"
                    onClick={() => setDialog(null)}
                    disabled={actioningId === dialog.advance.id}
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            ) : (
              <div className="stack">
                <h4>前借り申請を否認しますか？</h4>
                <p className="muted">否認理由の入力が必須です（最大500文字）。</p>
                <textarea
                  className="input"
                  rows={4}
                  value={rejectReason}
                  onChange={(event) => {
                    setRejectReason(event.target.value);
                    setDialogError(null);
                  }}
                  placeholder="否認理由を入力してください"
                />
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="muted">理由を入力してください。</span>
                  <span
                    className={rejectReasonCount > 500 ? 'error' : 'muted'}
                    style={{ padding: 0, border: 'none', background: 'transparent' }}
                  >
                    {rejectReasonCount}/500
                  </span>
                </div>
                <div className="muted">
                  入力した否認理由は、今後アプリ内でドライバーに表示される予定です。
                </div>
                {dialogError ? <div className="error">{dialogError}</div> : null}
                <div className="row">
                  <button
                    className="button danger"
                    type="button"
                    onClick={handleReject}
                    disabled={isRejectDisabled || actioningId === dialog.advance.id}
                    title={isRejectDisabled ? '否認理由を入力してください（最大500文字）' : ''}
                  >
                    否認する
                  </button>
                  <button
                    className="button ghost"
                    type="button"
                    onClick={() => setDialog(null)}
                    disabled={actioningId === dialog.advance.id}
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
