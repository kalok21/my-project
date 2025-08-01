# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

# 3A 個人記帳系統

這是一個基於 React + TypeScript + Vite + Supabase 的個人記帳應用程式。

## 功能特色

- ✅ 支出/收入/轉帳記錄管理
- ✅ 帳戶與帳戶類別管理
- ✅ 用戶認證系統
- ✅ 即時資料同步
- ✅ 響應式設計
- ✅ TypeScript 完整支援

## 部署

### Vercel 部署
1. Fork 本專案到你的 GitHub
2. 在 [Vercel](https://vercel.com) 連接 GitHub 帳戶
3. 選擇專案並設定環境變數（參考 `.env.example`）
4. 自動部署完成

### Cloudflare Pages 部署
1. 登入 [Cloudflare Pages](https://pages.cloudflare.com)
2. 連接 GitHub 並選擇專案
3. 設定建置指令：`npm run build`
4. 設定輸出目錄：`dist`
5. 配置環境變數並部署

## 環境變數設定
請在專案根目錄建立 `.env` 檔案，並填入以下內容：
```
VITE_SUPABASE_URL=你的_supabase_url
VITE_SUPABASE_ANON_KEY=你的_supabase_anon_key
```

## 本地開發
```bash
npm install
npm run dev
```

## 建置
```bash
npm run build
```

開發時會自動載入，請勿將金鑰提交至版本控制。
