# 用語集

- O = Owner（運営会社、権利元）
- C = Client（事業主）
- D = Driver（ドライバー）
- 確定報酬額: C が D に支払うことを確定した報酬
- 前借り元本: D が前借りした金額の元本
- 前借り手数料: D が前借り時に負担する手数料（原則 5%）
- C 向け請求率: O が C に請求する段階制のパーセンテージ（前借り手数料とは別概念）
- 前借り残高: 回収未済の前借り元本
- 前借り可能額: 前借り上限率と未振込報酬から算出される上限額
- 月間利用額: ある月に発生した前借り元本の合計
- 回収率: 回収済み前借り元本累計 ÷ 立替済み前借り元本累計（簡易）

## 型名対応（domain/types.ts）

| 型名 | 日本語名 |
| --- | --- |
| Company | 事業者（会社） |
| Driver | ドライバー |
| Earning | 確定報酬 |
| Advance | 前借り |
| Payroll | 給与支給 |
| LedgerEntry | 台帳エントリ |
| DriverBalanceMaterialized | ドライバー残高キャッシュ |
| MetricsMonthly | 月次集計 |

## ステータス/種別（domain/types.ts）

| 型名 | 値 | 日本語名 |
| --- | --- | --- |
| EarningStatus | confirmed | 確定 |
| EarningStatus | paid | 支払済み |
| AdvanceStatus | requested | 申請中 |
| AdvanceStatus | rejected | 却下 |
| AdvanceStatus | approved | 承認済み |
| AdvanceStatus | payout_instructed | 振込指示済み |
| AdvanceStatus | paid | 振込済み |
| AdvanceStatus | settling | 回収中 |
| AdvanceStatus | settled | 完済 |
| AdvanceStatus | written_off | 貸倒 |
| PayrollStatus | planned | 予定 |
| PayrollStatus | processed | 処理済み |
| LedgerSourceType | advance | 前借り |
| LedgerSourceType | payroll | 給与 |
| LedgerSourceType | manual_adjustment | 手動調整 |
| LedgerSourceType | write_off | 貸倒 |
| LedgerEntryType | advance_principal | 前借り元本 |
| LedgerEntryType | fee | 手数料 |
| LedgerEntryType | collection | 回収 |
| LedgerEntryType | write_off | 貸倒 |
