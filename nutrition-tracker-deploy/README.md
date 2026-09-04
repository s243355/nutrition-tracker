# 90天減脂追蹤 App

這是由 `nutrition-tracker.jsx` 整理成的 Vite + React 專案，可部署到 Vercel。

## 本機測試

```bash
npm install
npm run dev
```

## Anthropic API Key

不要把 API Key 寫進前端。請設定環境變數：

`ANTHROPIC_API_KEY`

Vercel：Project → Settings → Environment Variables → Add。

## 部署

1. 將整個資料夾上傳到 GitHub。
2. 在 Vercel Import Git Repository。
3. Framework 選 Vite（通常會自動偵測）。
4. 在 Environment Variables 加入 `ANTHROPIC_API_KEY`。
5. Deploy。
