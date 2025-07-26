-- ===============================
-- 個人管理系統資料庫設置腳本 (純 SQL 版本)
-- ===============================

-- 建立日記表格
CREATE TABLE IF NOT EXISTS diary_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 建立文件表格
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立記帳表格 (修正為符合應用代碼的表名)
CREATE TABLE IF NOT EXISTS accounting_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR CHECK (type IN ('income', 'expense', 'transfer')) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'HKD',
  category VARCHAR NOT NULL,
  subcategory VARCHAR,
  payment_method VARCHAR NOT NULL,
  description TEXT,
  exchange_rate DECIMAL(10,4) DEFAULT 1.0,
  transaction_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立行事曆表格
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  is_all_day BOOLEAN DEFAULT FALSE,
  color VARCHAR(7), -- 儲存色彩代碼 #FFFFFF
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立快速代碼表格
CREATE TABLE IF NOT EXISTS quick_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(4) UNIQUE NOT NULL,
  document_url TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立用戶憑證表格 (用於用戶名+密碼登入)
CREATE TABLE IF NOT EXISTS user_credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  avatar TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_diary_entries_user_date ON diary_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_accounting_entries_user_date ON accounting_entries(user_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_date ON calendar_events(user_id, start_date);
CREATE INDEX IF NOT EXISTS idx_quick_codes_code ON quick_codes(code) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_credentials_username ON user_credentials(username) WHERE is_active = TRUE;

-- ===============================
-- 啟用 Row Level Security (RLS)
-- ===============================
ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credentials ENABLE ROW LEVEL SECURITY;

-- ===============================
-- 建立 RLS 政策
-- ===============================

-- 日記表格的 RLS 政策
CREATE POLICY "Users can view own diary entries" ON diary_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own diary entries" ON diary_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own diary entries" ON diary_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own diary entries" ON diary_entries
  FOR DELETE USING (auth.uid() = user_id);

-- 文件表格的 RLS 政策
CREATE POLICY "Users can view own documents" ON documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" ON documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents" ON documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents" ON documents
  FOR DELETE USING (auth.uid() = user_id);

-- 記帳表格的 RLS 政策
CREATE POLICY "Users can view own accounting entries" ON accounting_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own accounting entries" ON accounting_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own accounting entries" ON accounting_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own accounting entries" ON accounting_entries
  FOR DELETE USING (auth.uid() = user_id);

-- 行事曆表格的 RLS 政策
CREATE POLICY "Users can view own calendar events" ON calendar_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calendar events" ON calendar_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar events" ON calendar_events
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar events" ON calendar_events
  FOR DELETE USING (auth.uid() = user_id);

-- 快速代碼表格的 RLS 政策 (允許公開讀取，但只有擁有者可以管理)
CREATE POLICY "Anyone can view active quick codes" ON quick_codes
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Users can manage own quick codes" ON quick_codes
  FOR ALL USING (auth.uid() = user_id);

-- 用戶憑證表格的 RLS 政策 (只允許查詢用於登入驗證)
CREATE POLICY "Allow select for authentication" ON user_credentials
  FOR SELECT USING (TRUE);

-- ===============================
-- 建立登入驗證函數
-- ===============================
CREATE OR REPLACE FUNCTION authenticate_user(
  input_username VARCHAR,
  input_password VARCHAR
)
RETURNS TABLE(
  user_id UUID,
  username VARCHAR,
  name VARCHAR,
  avatar TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- 查找用戶並驗證密碼
  SELECT uc.id, uc.username, uc.password_hash, uc.name, uc.avatar, uc.is_active
  INTO user_record
  FROM user_credentials uc
  WHERE uc.username = input_username
    AND uc.is_active = TRUE;
    
  -- 檢查用戶是否存在且密碼正確
  IF user_record IS NULL THEN
    RAISE EXCEPTION '用戶名不存在或帳戶已停用';
  END IF;
  
  IF NOT crypt(input_password, user_record.password_hash) = user_record.password_hash THEN
    RAISE EXCEPTION '密碼錯誤';
  END IF;
  
  -- 返回用戶資訊
  RETURN QUERY SELECT 
    user_record.id,
    user_record.username,
    user_record.name,
    user_record.avatar;
END;
$$;

-- 建立創建用戶函數
CREATE OR REPLACE FUNCTION create_user_credential(
  input_username VARCHAR,
  input_password VARCHAR,
  input_name VARCHAR,
  input_avatar TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- 檢查用戶名是否已存在
  IF EXISTS (SELECT 1 FROM user_credentials uc WHERE uc.username = input_username) THEN
    RAISE EXCEPTION '用戶名已存在';
  END IF;
  
  -- 創建新用戶
  INSERT INTO user_credentials (username, password_hash, name, avatar)
  VALUES (
    input_username,
    crypt(input_password, gen_salt('bf')),
    input_name,
    input_avatar
  )
  RETURNING id INTO new_user_id;
  
  RETURN new_user_id;
END;
$$;

-- ===============================
-- 建立觸發器以自動更新 updated_at 欄位
-- ===============================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_diary_entries_updated_at BEFORE UPDATE ON diary_entries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounting_entries_updated_at BEFORE UPDATE ON accounting_entries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar_events 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_credentials_updated_at BEFORE UPDATE ON user_credentials 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================
-- 插入測試用戶
-- ===============================
-- 創建測試用戶 (用戶名: admin, 密碼: 123456)
SELECT create_user_credential('admin', '123456', '管理員', NULL);

-- 創建測試用戶 (用戶名: test, 密碼: password)
SELECT create_user_credential('test', 'password', '測試用戶', NULL);

-- 創建測試用戶 (用戶名: user1, 密碼: 123456)
SELECT create_user_credential('user1', '123456', '用戶一', NULL);

-- ===============================
-- 插入測試用的快速代碼
-- ===============================
INSERT INTO quick_codes (code, document_url, user_id, is_active) VALUES
  ('1234', 'https://example.com/document1', NULL, TRUE),
  ('5678', 'https://example.com/document2', NULL, TRUE),
  ('9999', 'https://github.com/your-repo/readme', NULL, TRUE)
ON CONFLICT (code) DO NOTHING;