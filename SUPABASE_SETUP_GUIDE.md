# 🚀 Supabase 完整設置指南

## 📋 **目錄**
1. [Supabase 項目創建](#supabase-項目創建)
2. [環境變數配置](#環境變數配置)
3. [資料庫設置](#資料庫設置)
4. [認證設置](#認證設置)
5. [RLS 安全策略](#rls-安全策略)
6. [實時功能設置](#實時功能設置)
7. [故障排除](#故障排除)

---

## 🎯 **1. Supabase 項目創建**

### 步驟 1：創建 Supabase 帳戶
1. 前往 [supabase.com](https://supabase.com)
2. 點擊 "Start your project" 註冊帳戶
3. 使用 GitHub、Google 或 Email 註冊

### 步驟 2：創建新項目
1. 登入後點擊 "New Project"
2. 選擇組織（或創建新組織）
3. 填寫項目資訊：
   - **Name**: `personal-management-system`
   - **Database Password**: 設置強密碼（記住！）
   - **Region**: 選擇最近的區域（如 `ap-southeast-1`）
4. 點擊 "Create new project"
5. 等待 2-3 分鐘完成初始化

---

## 🔧 **2. 環境變數配置**

### 步驟 1：獲取 API 金鑰
1. 在 Supabase Dashboard 中，點擊左側 "Settings" → "API"
2. 複製以下資訊：
   - **Project URL**: `https://xxxxxx.supabase.co`
   - **anon/public key**: `eyJhbGci...`

### 步驟 2：配置環境變數
在你的 `.env` 文件中設置：
```bash
VITE_SUPABASE_URL=https://你的項目ID.supabase.co
VITE_SUPABASE_ANON_KEY=你的匿名金鑰
```

⚠️ **注意**: 
- 不要提交 `.env` 到 Git
- 在 `.gitignore` 中添加 `.env`

---

## 🗄️ **3. 資料庫設置**

### 步驟 1：執行資料庫腳本
1. 在 Supabase Dashboard 中，點擊 "SQL Editor"
2. 複製並執行 `complete_database_rebuild.sql` 的內容
3. 確認所有表格創建成功

### 步驟 2：驗證表格結構
檢查以下表格是否存在：
- `user_profiles` - 用戶資料
- `accounts` - 帳戶管理
- `transactions` - 交易記錄
- `documents` - 文檔管理
- `diary_entries` - 日記條目
- `quick_codes` - 快速代碼

---

## 🔐 **4. 認證設置**

### 步驟 1：基本認證設置
1. 前往 "Authentication" → "Settings"
2. 配置以下設置：
   - **Enable email confirmations**: 關閉（開發階段）
   - **Enable phone confirmations**: 關閉
   - **Site URL**: `http://localhost:5173`（開發環境）
   - **Redirect URLs**: 添加你的域名

### 步驟 2：第三方登入（可選）
如需 Google 登入：
1. 前往 "Authentication" → "Providers"
2. 啟用 "Google" provider
3. 配置 OAuth 客戶端 ID 和密鑰

### 步驟 3：創建測試用戶
```sql
-- 在 SQL Editor 中執行
INSERT INTO user_profiles (
  email, username, password_hash, display_name, auth_provider
) VALUES 
('admin@example.com', 'admin', crypt('123456', gen_salt('bf')), '管理員', 'local'),
('test@example.com', 'test', crypt('password', gen_salt('bf')), '測試用戶', 'local');
```

---

## 🛡️ **5. RLS 安全策略**

### 什麼是 RLS？
Row Level Security (RLS) 確保用戶只能訪問自己的資料。

### 啟用 RLS
```sql
-- 為所有表格啟用 RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;
```

### 設置基本策略
```sql
-- 用戶只能訪問自己的資料
CREATE POLICY "用戶資料訪問策略" ON user_profiles
FOR ALL USING (id = auth.uid() OR supabase_user_id = auth.uid());

CREATE POLICY "帳戶訪問策略" ON accounts
FOR ALL USING (user_id = (SELECT id FROM user_profiles WHERE supabase_user_id = auth.uid()));
```

---

## ⚡ **6. 實時功能設置**

### 啟用實時訂閱
1. 前往 "Database" → "Replication"
2. 為需要實時更新的表格啟用 Publication
3. 選擇表格並啟用 "Insert", "Update", "Delete" 事件

### 在代碼中使用
```typescript
// 訂閱交易記錄變化
const subscription = SupabaseUtils.subscribeToTable(
  'transactions',
  (payload) => {
    console.log('交易記錄更新:', payload)
    // 更新 UI
  },
  `user_id=eq.${userId}`
)

// 取消訂閱
subscription.unsubscribe()
```

---

## 🔧 **7. 故障排除**

### 常見問題解決方案

#### ❌ **連接失敗**
**問題**: Supabase 狀態顯示 "連接失敗"
**解決**:
1. 檢查環境變數是否正確設置
2. 確認 Supabase 項目是否正常運行
3. 檢查網路連接和防火牆設置

#### ❌ **認證失敗**
**問題**: 無法登入或註冊
**解決**:
1. 檢查 `authenticate_user` 函數是否存在
2. 確認用戶資料是否正確插入
3. 檢查密碼加密是否正確

#### ❌ **權限錯誤**
**問題**: 無法訪問表格資料
**解決**:
1. 檢查 RLS 策略是否正確設置
2. 確認用戶認證狀態
3. 驗證 `user_id` 匹配

#### ❌ **實時功能不工作**
**問題**: 資料變化無法即時反映
**解決**:
1. 確認 Replication 已啟用
2. 檢查訂閱過濾條件
3. 驗證網路連接穩定性

### 調試工具
1. **瀏覽器開發者工具**: 檢查網路請求和控制台錯誤
2. **Supabase Dashboard**: 查看日誌和統計資料
3. **SQL Editor**: 直接測試資料庫查詢

---

## 📊 **性能優化建議**

### 1. 索引優化
```sql
-- 為常用查詢添加索引
CREATE INDEX idx_transactions_user_date ON transactions(user_id, transaction_date);
CREATE INDEX idx_documents_user_tags ON documents(user_id, tags);
```

### 2. 批量操作
```typescript
// 使用批量插入替代多次單個插入
await SupabaseUtils.batchInsert('transactions', transactionArray)
```

### 3. 資料分頁
```typescript
// 使用分頁載入大量資料
const { data } = await supabase
  .from('transactions')
  .select('*')
  .range(0, 19) // 載入前 20 筆
```

---

## 🚀 **部署到生產環境**

### 1. 更新環境變數
```bash
# 生產環境 .env.production
VITE_SUPABASE_URL=https://your-prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-prod-anon-key
```

### 2. 設置正確的 URL
在 Supabase Authentication Settings 中：
- **Site URL**: `https://yourdomain.com`
- **Redirect URLs**: 添加生產域名

### 3. 啟用 Email 確認
生產環境建議啟用：
- Email confirmations
- 適當的密碼策略
- 兩步驟驗證（如需要）

---

## ✅ **檢查清單**

部署前確認：
- [ ] 環境變數正確設置
- [ ] 資料庫表格和函數創建完成
- [ ] RLS 策略正確配置
- [ ] 認證流程測試通過
- [ ] 實時功能正常工作
- [ ] 性能優化完成
- [ ] 安全設置檢查完成

---

**需要幫助？**
- 📖 [Supabase 官方文檔](https://supabase.com/docs)
- 💬 [社群支援](https://github.com/supabase/supabase/discussions)
- 🔧 使用你項目中的測試頁面檢查狀態