# Driver Advance Accounting Frontend

バックエンドの OpenAPI 契約に沿って最短導線（ログイン → 前借り作成）を動かすためのフロントです。

## セットアップ

```bash
cd frontend
npm install
cp .env.local.example .env.local
```

`frontend/.env.local` の `NEXT_PUBLIC_API_BASE_URL` を backend のURLに合わせる。

## OpenAPI型生成

```bash
cd frontend
npm run generate:openapi
```

生成物: `frontend/src/lib/types/openapi.ts`

## 起動

```bash
cd frontend
npm run dev
```

ブラウザで `http://localhost:3001`（Next.jsのログに表示されるURL）を開く。

## ログイン → 前借り作成

1. `/login` でメール/パスワードを入力
2. 成功すると `/advances` へ遷移
3. ドライバーIDと金額（string）を入力して前借り作成を試す

開発用ログイン（seed後）:

- admin: `admin@example.com` / `Passw0rd!`
- company: `company@example.com` / `Passw0rd!`
- driver: `driver@example.com` / `Passw0rd!`

注意: これは開発専用アカウントです。
