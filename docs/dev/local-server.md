# ローカルサーバ起動メモ

## 前提

- DB は Docker の PostgreSQL を利用（`docs/dev/local-db-docker.md`）
- `backend` で依存関係をインストール済み

```bash
cd backend
npm install
```

## 環境変数（最低限）

```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/driver_advance_accounting"
```

## 追加の環境変数（任意）

```bash
# 認証
export JWT_SECRET="dev-secret"

# Stripe を使う場合
export STRIPE_SECRET_KEY="sk_test_..."
export STRIPE_WEBHOOK_SECRET="whsec_..."

# SMTP を使う場合
export SMTP_HOST="..."
export SMTP_PORT="587"
export SMTP_USER="..."
export SMTP_PASS="..."
export SMTP_SECURE="false"
export SMTP_FROM="no-reply@example.com"
export APP_BASE_URL="http://localhost:3000"
```

## 起動（ts-node）

```bash
cd backend
npx prisma generate
npx ts-node -e "import { startServer } from './src/http/server'; startServer(3000);"
```

## ビルドして起動（Node）

```bash
cd backend
npm run build
node -e "require('./dist/http/server').startServer(3000);"
```

## ts-node と build 起動の違い

- ts-node: TypeScript をそのまま実行する（手軽だが遅め）
- build: TypeScript を JavaScript に変換してから実行する（速く安定）

## 動作確認（例）

```bash
curl -s http://localhost:3000/healthz || true
curl -s -X POST http://localhost:3000/notifications/list -H 'Content-Type: application/json' -d '{}'
```

※ `/healthz` は未実装のため、実際の疎通は既存APIで行う。
