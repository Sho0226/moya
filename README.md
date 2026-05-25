# moya

モヤモヤした瞬間を書き出し、AIとの対話で自分の前提・価値観を掘り下げる個人用ツール。  
シングルループ（出来事への反応）からダブルループ（前提を問い直す習慣）への転換を目指す。

## 機能

1. モヤモヤを書いてセッションを開始
2. AIと対話しながら深掘り（腑に落ちるまで何往復でも）
3. 「腑に落ちた」ボタンでセッションを締める
4. AIがセッション全体から前提・気づきを抽出してまとめる
5. 対話ログ＋まとめが記録として保存される

過去の類似セッションを参照したり、週1の定期振り返りで自分の前提パターンを把握するのに使う。

## 技術スタック

| 層 | 技術 |
|---|---|
| Frontend | Vite + React + TypeScript (CSS Modules) |
| Backend | PHP 8.3（単一ファイル: `backend/index.php`）|
| DB | Neon (PostgreSQL) |
| AI | Claude API (claude-sonnet-4-6) |

## セットアップ

### 環境変数

`backend/.env` を作成して以下を設定する。

```
DATABASE_URL=...
ANTHROPIC_API_KEY=...
```

### バックエンド起動

```bash
cd backend
php -S localhost:8080 index.php
```

### フロントエンド起動

```bash
cd frontend
npm install
npm run dev
```

## DBスキーマ

```sql
sessions (id, initial_moya, summary, created_at, closed_at)
messages (id, session_id, role, content, created_at)
```