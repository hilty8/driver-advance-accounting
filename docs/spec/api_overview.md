# API 概要（参考）

- `POST /drivers/{id}/advances` 前借り申請
- `POST /advances/{id}/approve` 承認
- `POST /advances/{id}/reject` 却下
- `POST /advances/{id}/payout-instruct` 振込指示登録
- `POST /advances/{id}/mark-paid` 振込完了
- `POST /payrolls/import` 給与 CSV
- `POST /earnings/import` 報酬 CSV
- `POST /admin/batch/daily` 日次バッチ
- `GET /drivers/{id}/dashboard` D ダッシュボード
- `GET /companies/{id}/dashboard` C ダッシュボード
