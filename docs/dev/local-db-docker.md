# ローカルDB（Docker/PostgreSQL）開発メモ

## 目的

- ローカル開発で使用するPostgreSQLをDockerで起動し、DBの状態を手動確認する。

## 起動（初回）

```bash
docker run --name driver-advance-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=driver_advance_accounting \
  -p 5432:5432 \
  -d postgres:16
```

## 起動/停止

```bash
docker start driver-advance-postgres
docker stop driver-advance-postgres
```

## 接続（psql）

```bash
docker exec -it driver-advance-postgres \
  psql -U postgres -d driver_advance_accounting
```

## よく使う確認コマンド（psql内）

```sql
-- テーブル一覧
\dt

-- テーブル定義
\d users
\d driver_invitations
\d password_reset_tokens
\d payrolls

-- 直近のユーザー
SELECT id, email, role, is_active, created_at
FROM users
ORDER BY created_at DESC
LIMIT 10;

-- 前借り一覧
SELECT id, driver_id, company_id, requested_amount, status, payout_date
FROM advances
ORDER BY created_at DESC
LIMIT 10;

-- 通知一覧
SELECT id, recipient_type, category, severity, title, created_at
FROM notifications
ORDER BY created_at DESC
LIMIT 10;
```

## マイグレーションの適用（Prisma）

```bash
cd backend
npx prisma migrate deploy
```

## DATABASE_URL 例

```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/driver_advance_accounting"
```

## DBの初期化（全削除）

```bash
docker stop driver-advance-postgres
docker rm driver-advance-postgres
```
