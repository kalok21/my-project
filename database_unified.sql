-- ===============================
-- 個人管理系統資料庫設置腳本 (統一認證版本)
-- ===============================

-- 建立統一用戶資料表
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR UNIQUE,
  username VARCHAR UNIQUE,
  password_hash VARCHAR,
  display_name VARCHAR NOT NULL,
  avatar TEXT,
  auth_provider VARCHAR DEFAULT 'local', -- 'local', 'google', 'supabase'
  supabase_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT email_or_username_required CHECK (email IS NOT NULL OR username IS NOT NULL)
);

-- 建立日記表格 (使用新的用戶表)
CREATE TABLE IF NOT EXISTS diary_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 建立文件表格
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立記帳表格
CREATE TABLE IF NOT EXISTS accounting_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
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
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
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
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_profiles_supabase_id ON user_profiles(supabase_user_id);
CREATE INDEX IF NOT EXISTS idx_diary_entries_user_date ON diary_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_accounting_entries_user_date ON accounting_entries(user_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_date ON calendar_events(user_id, start_date);
CREATE INDEX IF NOT EXISTS idx_quick_codes_code ON quick_codes(code) WHERE is_active = TRUE;

-- ===============================
-- 啟用 Row Level Security (RLS)
-- ===============================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_codes ENABLE ROW LEVEL SECURITY;

-- ===============================
-- 建立 RLS 政策
-- ===============================

-- 用戶資料表的 RLS 政策
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (id = get_current_user_id());

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (id = get_current_user_id());

CREATE POLICY "Allow authentication queries" ON user_profiles
  FOR SELECT USING (TRUE);

-- 日記表格的 RLS 政策
CREATE POLICY "Users can manage own diary entries" ON diary_entries
  FOR ALL USING (user_id = get_current_user_id());

-- 文件表格的 RLS 政策
CREATE POLICY "Users can manage own documents" ON documents
  FOR ALL USING (user_id = get_current_user_id());

-- 記帳表格的 RLS 政策
CREATE POLICY "Users can manage own accounting entries" ON accounting_entries
  FOR ALL USING (user_id = get_current_user_id());

-- 行事曆表格的 RLS 政策
CREATE POLICY "Users can manage own calendar events" ON calendar_events
  FOR ALL USING (user_id = get_current_user_id());

-- 快速代碼表格的 RLS 政策
CREATE POLICY "Anyone can view active quick codes" ON quick_codes
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Users can manage own quick codes" ON quick_codes
  FOR ALL USING (user_id = get_current_user_id());

-- ===============================
-- 建立輔助函數
-- ===============================

-- 獲取當前用戶 ID 的函數
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT id FROM user_profiles WHERE supabase_user_id = auth.uid()),
    current_setting('app.current_user_id', true)::UUID
  );
$$;

-- 設置當前用戶 ID (用於本地登入)
CREATE OR REPLACE FUNCTION set_current_user_id(user_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT set_config('app.current_user_id', user_id::TEXT, true);
$$;

-- 統一登入驗證函數
CREATE OR REPLACE FUNCTION authenticate_user(
  input_identifier VARCHAR, -- 可以是 email 或 username
  input_password VARCHAR
)
RETURNS TABLE(
  user_id UUID,
  email VARCHAR,
  username VARCHAR,
  display_name VARCHAR,
  avatar TEXT,
  auth_provider VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- 查找用戶 (支援 email 或 username)
  SELECT up.id, up.email, up.username, up.password_hash, up.display_name, up.avatar, up.auth_provider, up.is_active
  INTO user_record
  FROM user_profiles up
  WHERE (up.email = input_identifier OR up.username = input_identifier)
    AND up.is_active = TRUE
    AND up.password_hash IS NOT NULL;
    
  -- 檢查用戶是否存在
  IF user_record IS NULL THEN
    RAISE EXCEPTION '用戶不存在或帳戶已停用';
  END IF;
  
  -- 驗證密碼
  IF NOT crypt(input_password, user_record.password_hash) = user_record.password_hash THEN
    RAISE EXCEPTION '密碼錯誤';
  END IF;
  
  -- 設置當前用戶 ID (用於 RLS)
  PERFORM set_current_user_id(user_record.id);
  
  -- 返回用戶資訊
  RETURN QUERY SELECT 
    user_record.id,
    user_record.email,
    user_record.username,
    user_record.display_name,
    user_record.avatar,
    user_record.auth_provider;
END;
$$;

-- 創建或更新用戶資料函數
CREATE OR REPLACE FUNCTION create_or_update_user_profile(
  input_email VARCHAR DEFAULT NULL,
  input_username VARCHAR DEFAULT NULL,
  input_password VARCHAR DEFAULT NULL,
  input_display_name VARCHAR DEFAULT NULL,
  input_avatar TEXT DEFAULT NULL,
  input_auth_provider VARCHAR DEFAULT 'local',
  input_supabase_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
  password_hash_value VARCHAR;
BEGIN
  -- 處理密碼加密
  IF input_password IS NOT NULL THEN
    password_hash_value := crypt(input_password, gen_salt('bf'));
  END IF;
  
  -- 檢查是否已存在 (透過 email, username 或 supabase_user_id)
  SELECT id INTO user_id
  FROM user_profiles
  WHERE (input_email IS NOT NULL AND email = input_email)
     OR (input_username IS NOT NULL AND username = input_username)
     OR (input_supabase_user_id IS NOT NULL AND supabase_user_id = input_supabase_user_id);
  
  IF user_id IS NOT NULL THEN
    -- 更新現有用戶
    UPDATE user_profiles SET
      email = COALESCE(input_email, email),
      username = COALESCE(input_username, username),
      password_hash = COALESCE(password_hash_value, password_hash),
      display_name = COALESCE(input_display_name, display_name),
      avatar = COALESCE(input_avatar, avatar),
      auth_provider = COALESCE(input_auth_provider, auth_provider),
      supabase_user_id = COALESCE(input_supabase_user_id, supabase_user_id),
      updated_at = NOW()
    WHERE id = user_id;
  ELSE
    -- 創建新用戶
    INSERT INTO user_profiles (
      email, username, password_hash, display_name, avatar, 
      auth_provider, supabase_user_id
    ) VALUES (
      input_email, input_username, password_hash_value, 
      COALESCE(input_display_name, COALESCE(input_username, input_email)), 
      input_avatar, input_auth_provider, input_supabase_user_id
    ) RETURNING id INTO user_id;
  END IF;
  
  RETURN user_id;
END;
$$;

-- 更新用戶資料函數
CREATE OR REPLACE FUNCTION update_user_profile(
  target_user_id UUID,
  new_email VARCHAR DEFAULT NULL,
  new_username VARCHAR DEFAULT NULL,
  new_password VARCHAR DEFAULT NULL,
  new_display_name VARCHAR DEFAULT NULL,
  new_avatar TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  password_hash_value VARCHAR;
BEGIN
  -- 檢查用戶是否有權限更新此資料
  IF target_user_id != get_current_user_id() THEN
    RAISE EXCEPTION '無權限更新此用戶資料';
  END IF;
  
  -- 處理密碼加密
  IF new_password IS NOT NULL THEN
    password_hash_value := crypt(new_password, gen_salt('bf'));
  END IF;
  
  -- 更新用戶資料
  UPDATE user_profiles SET
    email = COALESCE(new_email, email),
    username = COALESCE(new_username, username),
    password_hash = COALESCE(password_hash_value, password_hash),
    display_name = COALESCE(new_display_name, display_name),
    avatar = COALESCE(new_avatar, avatar),
    updated_at = NOW()
  WHERE id = target_user_id;
  
  RETURN FOUND;
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

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_diary_entries_updated_at BEFORE UPDATE ON diary_entries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounting_entries_updated_at BEFORE UPDATE ON accounting_entries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar_events 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================
-- 插入測試用戶
-- ===============================
-- 創建測試用戶
SELECT create_or_update_user_profile(
  'admin@example.com', 'admin', '123456', '系統管理員', NULL, 'local', NULL
);

SELECT create_or_update_user_profile(
  'test@example.com', 'test', 'password', '測試用戶', NULL, 'local', NULL
);

SELECT create_or_update_user_profile(
  'user1@example.com', 'user1', '123456', '用戶一', NULL, 'local', NULL
);

-- ===============================
-- 插入測試用的快速代碼
-- ===============================
INSERT INTO quick_codes (code, document_url, user_id, is_active) VALUES
  ('1234', 'https://example.com/document1', NULL, TRUE),
  ('5678', 'https://example.com/document2', NULL, TRUE),
  ('9999', 'https://github.com/your-repo/readme', NULL, TRUE)
ON CONFLICT (code) DO NOTHING;