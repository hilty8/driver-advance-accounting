# 画面設計（IA / UX）

## 目的
- 画面単位の構成・導線・URL・表示項目・操作・状態を定義する。
- docs/test-catalog.md（能力/テスト台帳）と役割分担し、相互参照できる状態を作る。

## 粒度
- 画面の目的、導線、主要な表示項目、操作、状態、API参照を記載する。
- UIの見た目（色/余白/CSS/コンポーネント詳細）は扱わない。

## ルーティング方針
- ホーム画面は維持する。
- 使用頻度の高い情報はホームに残す。
- 一覧は命名に従いURLを付与する。
  - /company/advances
  - /company/drivers
  - /company/worklogs
- ナビゲーションはサイドナビ固定（モバイル最適化は後回し）。

## 集計API方針（未実装）
- ホームの集計値は一覧APIの全件取得で数えるのではなく、集計用APIを用意する方針とする。
- 集計APIは未処理件数（requested + approved）を返す。
- 将来拡張で内訳（requested/approved別）を返せる余地を残す。
- APIは未実装のため参照はTBDとする（例: /companies/{id}/advances/summary など）。

## test-catalog.md との役割分担
- docs/test-catalog.md: 能力（Feature/SF）とテスト観点の台帳。
- docs/screens: 画面・導線・URL・表示項目・操作・状態の仕様。
- 相互参照ルール:
  - docs/screens は該当する Feature/SF を明記する（例: F03-SF01）。
  - test-catalog.md から docs/screens へのリンクは必要最小限にする。

## 更新ルール
- 画面構成や導線が変わる場合は docs/screens を更新する。
- 変更理由が能力起点なら test-catalog.md にも反映する。
