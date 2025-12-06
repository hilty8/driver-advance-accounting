# 経理代行システム V2 仕様書（改訂案）

## 1. 目的と改訂方針

- V1 ドラフトの業務要件を踏まえ、実装に必要なデータモデル・ロジック・状態遷移・バッチ設計を具体化する。
- 不足していた整合性要件（丸め/上限/非負制約）、多月にまたがる回収処理、ステータス定義、CSV インポート形式を明示する。
- V2 では **PostgreSQL + TypeScript/Node.js + Prisma 風 ORM** を想定した用語で記述するが、概念を守れば技術選定は任意。

## 2. 全体像

- 3 者: Driver(D) / Client Company(C) / Operator(O)。
- 前借りのライフサイクル: 申請 → 承認 → 振込指示 → 振込済 → 天引き回収 → 残高精算/貸倒。
- 日次バッチが支払日到来分を自動処理し、集計キャッシュを更新。
- すべての金額は **整数円** で扱い、手数料計算は「端数切り上げ」とする。

## 3. ドメインルール

### 3.1 金額と丸め

- 通貨: JPY のみ。
- 手数料 `fee = ceil(principal * fee_rate)` （円未満は切り上げ）。
- 回収額は `min(gross_salary, advance_balance)` とし、常に advance_balance を 0 未満にしない。

### 3.2 上限と制約

- 前借り申請額 `requested_amount` は `0 < requested_amount <= advance_limit` をバリデーション。
- 前借り上限率 `limit_rate` は C ごとに 0.0 < rate <= 1.0 で設定可能。デフォルト 0.8。
- 1 ドライバー 1 会社の「未精算残高」は常に非負。負値が出た場合は異常としてログ + アラート。

### 3.3 ステータス定義

#### advances
- `requested`: D が申請、C 未対応。
- `rejected`: C が却下。
- `approved`: C が承認し金額確定、まだ振込指示前。
- `payout_instructed`: 振込指示済み（手動/外部 API）。
- `paid`: 振込が完了し、残高計上済み。
- `settling`: 回収中。
- `settled`: 元本を完済。
- `written_off`: 貸倒計上。

#### payrolls
- `planned`: C が登録、未処理。
- `processed`: 日次バッチで回収処理済み。

### 3.4 非機能・その他

- タイムゾーン: `Asia/Tokyo` 固定で計算。バッチ target_date も同タイムゾーンで解釈。
- 監査性: 金額の増減はすべて `ledger_entries` で履歴化し、集計カラムは冪等バッチで再計算可能にする。

## 4. データモデル（DDL イメージ）

```sql
companies (
  id uuid pk,
  name text not null,
  limit_rate numeric(5,4) not null default 0.8000,
  fee_rate numeric(5,4) not null default 0.0500,
  is_active boolean not null default true,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

drivers (
  id uuid pk,
  company_id uuid fk -> companies.id,
  name text not null,
  email text unique,
  bank_account jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

earnings (
  id uuid pk,
  driver_id uuid fk,
  company_id uuid fk,
  work_month date not null,     -- 月初日を格納（例: 2025-10-01）
  payout_month date not null,   -- 振込予定月の月初日
  amount bigint not null,
  status text not null check (status in ('confirmed','paid')),
  created_at timestamptz not null,
  updated_at timestamptz not null
);

advances (
  id uuid pk,
  driver_id uuid fk,
  company_id uuid fk,
  requested_amount bigint not null,
  requested_at timestamptz not null,
  approved_amount bigint,
  fee_amount bigint,
  payout_amount bigint,
  payout_date date, -- 実振込日（手動登録）
  status text not null check (status in ('requested','rejected','approved','payout_instructed','paid','settling','settled','written_off')),
  memo text,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

payrolls (
  id uuid pk,
  driver_id uuid fk,
  company_id uuid fk,
  payout_date date not null,
  gross_salary_amount bigint not null,
  advance_collection_amount bigint not null default 0,
  net_salary_amount bigint,
  status text not null check (status in ('planned','processed')),
  created_at timestamptz not null,
  updated_at timestamptz not null
);

ledger_entries (
  id uuid pk,
  driver_id uuid fk,
  company_id uuid fk,
  source_type text not null, -- advance|payroll|manual_adjustment|write_off
  source_id uuid not null,
  entry_type text not null check (entry_type in ('advance_principal','fee','collection','write_off')),
  amount bigint not null, -- 正値で記録、符号は entry_type で解釈
  occurred_on date not null,
  created_at timestamptz not null
);

metrics_monthly (
  id uuid pk,
  company_id uuid null,
  year_month date not null, -- 月初日
  total_advance_principal bigint not null default 0,
  total_fee_revenue bigint not null default 0,
  total_collected_principal bigint not null default 0,
  total_written_off_principal bigint not null default 0,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique(company_id, year_month)
);

driver_balances_materialized (
  driver_id uuid pk,
  company_id uuid,
  advance_balance bigint not null,
  unpaid_confirmed_earnings bigint not null,
  advance_limit bigint not null,
  as_of_date date not null,
  refreshed_at timestamptz not null
);
```

補足:
- `ledger_entries` を真実のソースとし、`driver_balances_materialized` は冪等に再計算できるキャッシュ。
- `earnings.payout_month` は「未振込確定報酬」を算出するために使用。

## 5. ロジック詳細

### 5.1 前借り可能額計算

```
unpaid_confirmed_earnings = sum(earnings.amount where status='confirmed' and payout_month >= current_month_start)
advance_limit = max(0, floor(unpaid_confirmed_earnings * limit_rate) - advance_balance)
```
- `advance_balance` は ledger から算出: `sum(advance_principal) - sum(collection) - sum(write_off)`。
- `floor` により上限額は保守的に算出（貸し過ぎ防止）。

### 5.2 承認時

- 入力: requested_amount R。
- principal P = R。
- fee F = ceil(P * fee_rate)。
- payout_amount A = P - F。
- 更新:
  - advances: approved_amount=P, fee_amount=F, payout_amount=A, status=`approved`。
  - ledger: add `advance_principal` +P, `fee` +F（いずれも occurred_on=承認日）。
  - metrics_monthly (company, month_of approval): total_advance_principal += P, total_fee_revenue += F。

### 5.3 振込指示/完了

- 指示登録時に status=`payout_instructed`、振込予定日を保持。
- 振込完了登録で status=`paid`、`payout_date` セット。ledger の前借り計上は承認時に済んでいるため、ここでは追加計上なし。

### 5.4 給与支給日の回収

- 対象: payrolls where status=`planned` and payout_date <= target_date。
- 回収額 C = min(gross_salary_amount, advance_balance_of_driver_at(target_date))。
- net_salary = gross_salary_amount - C。
- 更新:
  - payrolls.advance_collection_amount=C, payrolls.net_salary_amount=net_salary, status=`processed`。
  - ledger: add `collection` +C (occurred_on=payout_date)。
  - advances の残高が 0 になったものは status=`settled`。負残チェックで異常はログ。
  - metrics_monthly: total_collected_principal += C（company & global）。

### 5.5 貸倒

- 入力: driver, company, amount W (0 < W <= current advance_balance)。
- 更新:
  - ledger: `write_off` +W。
  - 影響を受ける advances は status `written_off` に変更（部分貸倒は memo に記録）。
  - metrics_monthly.total_written_off_principal += W。

### 5.6 日次バッチ `run_daily_batch(target_date)`

順序（冪等実装）:
1) 支払日到来 payroll の処理（5.4）。
2) driver_balances_materialized を target_date 時点で再計算し upsert。
3) 今月/翌月/翌々月の振込予定額を計算し、D 向け表示用キャッシュに保存。
4) metrics_monthly を全 C + 全体で再集計/upsert。
5) advances の負残/矛盾チェック → 異常ログ。

### 5.7 冪等性とロック

- `run_daily_batch` は同日・同 target_date で複数回呼ばれても結果が変わらないようにする（集計は再計算上書き）。
- payroll 更新は `for update` ロック + `status='planned'` 条件で二重処理防止。

## 6. CSV インポート/エクスポート仕様

### 6.1 報酬登録 CSV (C → earnings)

- ヘッダ: `driver_external_id,work_month,payout_month,amount`
- work_month/payout_month: `YYYY-MM` 形式。
- 金額: 整数円。
- バリデーション失敗行はスキップし、エラー CSV を返す。

### 6.2 給与支給 CSV (C → payrolls)

- ヘッダ: `driver_external_id,payout_date,gross_salary_amount`
- payout_date: `YYYY-MM-DD`。
- 金額: 整数円。

### 6.3 エクスポート

- D ごとの前借り残高一覧: driver_id, driver_name, advance_balance, unpaid_confirmed_earnings, advance_limit。
- 月間サマリ: company_id, year_month, total_advance_principal, total_fee_revenue, total_collected_principal, total_written_off_principal, collection_rate。

## 7. API / サービス層（概要）

- `POST /drivers/{id}/advances`: 前借り申請（バリデーション: advance_limit）。
- `POST /advances/{id}/approve`: 承認 + 手数料計算 + ledger 反映。
- `POST /advances/{id}/reject`: 却下。
- `POST /advances/{id}/payout-instruct`: 振込指示登録。
- `POST /advances/{id}/mark-paid`: 振込完了。
- `POST /payrolls/import`: 給与支給 CSV 登録。
- `POST /earnings/import`: 報酬 CSV 登録。
- `POST /admin/batch/daily`: `target_date` を指定して手動実行（検証用）。
- `GET /drivers/{id}/dashboard`: 残高・前借り可能額・振込予定額（キャッシュ表示）。
- `GET /companies/{id}/dashboard`: 月間利用額、手数料、回収率、残高ランキング。

## 8. テスト指針

- 単体: 上限計算(境界), 手数料丸め(切り上げ), 回収ロジック(給与<,=,>残高), 貸倒ロジック, ledger からの残高再計算。
- バッチ: `run_daily_batch` を target_date を変えて複数回実行し冪等性確認。
- シナリオ: 複数月にまたがる前借り→回収→貸倒を ledger と表示キャッシュで検証。

## 9. 既存 V1 との差分（要約）

- ステータスを詳細化し、振込指示と振込完了を分離。
- 金額丸めを「手数料切り上げ・円整数」で明示。
- ledger で全金額履歴を一元管理し、集計/キャッシュは再計算可能とした。
- advance_limit 計算を保守的に floor へ変更（貸し過ぎ防止）。
- バッチ冪等性とロック方針を追記。
- CSV フォーマットとバリデーション方針を具体化。

