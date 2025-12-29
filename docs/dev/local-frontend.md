# フロントエンド開発メモ

## 前提

- backend が起動済み（例: `http://localhost:3000`）
- `docs/spec/openapi_min.yaml` が最新

## セットアップ

```bash
cd frontend
npm install
cp .env.local.example .env.local
```

`frontend/.env.local` の `NEXT_PUBLIC_API_BASE_URL` を backend のURLに合わせる。

## DB起動と初期データ（開発用ユーザー）

```bash
docker run --name driver-advance-accounting-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=driver_advance_accounting \
  -p 5432:5432 \
  -d postgres:15
```

```bash
cd backend
npm install
npm run prisma:migrate:deploy
SEED_MODE=dev npm run db:seed
```

開発用ログイン:

- admin: `admin@example.com` / `Passw0rd!`
- company: `company@example.com` / `Passw0rd!`
- driver: `driver@example.com` / `Passw0rd!`

## /auth/login の確認（手動）

```bash
curl -s -X POST "http://localhost:3000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Passw0rd!"}'
```

JWT が `token` として返れば OK。

## db:reset（安全ガード付き）

`npm run db:reset` は「DB全消し → migrate reset → seed」までを実行します。

安全条件（満たさない場合は即終了）:

- `DATABASE_URL` の host が `localhost` か `127.0.0.1`
- DB名が `driver_advance_accounting` を含み、かつ `_test` または `_dev` を含む

実行例:

```bash
cd backend
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/driver_advance_accounting_dev" \
  npm run db:reset
```

## 型生成（OpenAPI）

```bash
cd frontend
npm run generate:openapi
```

生成物: `frontend/src/lib/types/openapi.ts`

## Backend 起動

```bash
cd backend
npm run dev
```

`backend/.env` に以下のキーが必要:

- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGIN` (開発用。例: `http://localhost:3001`)

開発時は `CORS_ORIGIN` を指定し、フロント（3001）からのアクセスを許可する。

## 起動

```bash
cd frontend
npm run dev
```

ブラウザで `http://localhost:3001`（Next.jsのログに表示されるURL）を開く。

## ログイン手順

1. `/login` でメール/パスワードを入力
2. 成功すると `/advances` へ遷移
3. ドライバーIDと金額（string）を入力して前借り作成を試す

## 招待トークンの確認（暫定）

招待メールは未実装のため、受諾に必要なトークンはDBから確認する。

```bash
docker exec -it driver-advance-accounting-postgres psql -U postgres -d driver_advance_accounting
```

```sql
SELECT token, expires_at, email
FROM driver_invitations
WHERE used_at IS NULL
ORDER BY created_at DESC
LIMIT 5;
```
