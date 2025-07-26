-- ===============================
-- 完整資料庫重建腳本 - 按正確順序執行
-- ===============================

-- ===============================
-- 第一步：建立基礎表格結構
-- ===============================

-- 建立統一用戶資料表
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR UNIQUE,
  username VARCHAR UNIQUE,
  password_hash VARCHAR,
  display_name VARCHAR NOT NULL,
  avatar TEXT,
  auth_provider VARCHAR DEFAULT 'local',
  supabase_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Asia/Hong_Kong'),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Asia/Hong_Kong'),
  CONSTRAINT email_or_username_required CHECK (email IS NOT NULL OR username IS NOT NULL)
);

-- 建立帳戶類型表格
CREATE TABLE IF NOT EXISTS account_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR NOT NULL UNIQUE,
  type VARCHAR CHECK (type IN ('asset', 'liability', 'income', 'expense')) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Asia/Hong_Kong')
);

-- 建立帳戶表格
CREATE TABLE IF NOT EXISTS accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  account_type_id UUID NOT NULL REFERENCES account_types(id),
  currency VARCHAR(3) DEFAULT 'HKD',
  balance DECIMAL(15,2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Asia/Hong_Kong'),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Asia/Hong_Kong')
);

-- 建立交易記錄表格
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  from_account_id UUID REFERENCES accounts(id),
  to_account_id UUID REFERENCES accounts(id),
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) DEFAULT 'HKD',
  exchange_rate DECIMAL(10,4) DEFAULT 1.0,
  category VARCHAR NOT NULL,
  subcategory VARCHAR,
  description TEXT,
  transaction_date DATE NOT NULL,
  transaction_time TIME DEFAULT (NOW() AT TIME ZONE 'Asia/Hong_Kong')::TIME,
  timezone VARCHAR DEFAULT 'Asia/Hong_Kong',
  reference_number VARCHAR,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Asia/Hong_Kong'),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Asia/Hong_Kong'),
  CONSTRAINT valid_accounts CHECK (
    (from_account_id IS NOT NULL AND to_account_id IS NOT NULL) OR
    (from_account_id IS NOT NULL OR to_account_id IS NOT NULL)
  )
);

-- 建立文件表格
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  content TEXT,
  url TEXT,
  document_type VARCHAR DEFAULT 'link',
  tags TEXT[],
  is_private BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Asia/Hong_Kong'),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Asia/Hong_Kong')
);

-- 建立日記表格
CREATE TABLE IF NOT EXISTS diary_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title VARCHAR,
  content TEXT NOT NULL,
  mood INTEGER CHECK (mood >= 1 AND mood <= 5),
  weather VARCHAR,
  tags TEXT[],
  entry_date DATE NOT NULL,
  timezone VARCHAR DEFAULT 'Asia/Hong_Kong',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Asia/Hong_Kong'),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Asia/Hong_Kong'),
  UNIQUE(user_id, entry_date)
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
  color VARCHAR(7),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Asia/Hong_Kong'),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Asia/Hong_Kong')
);

-- 建立快速代碼表格
CREATE TABLE IF NOT EXISTS quick_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(4) UNIQUE NOT NULL,
  document_url TEXT NOT NULL,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Asia/Hong_Kong')
);

-- ===============================
-- 第二步：建立索引
-- ===============================
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_profiles_supabase_id ON user_profiles(supabase_user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_from_account ON transactions(from_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_to_account ON transactions(to_account_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_diary_entries_user_date ON diary_entries(user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_date ON calendar_events(user_id, start_date);
CREATE INDEX IF NOT EXISTS idx_quick_codes_code ON quick_codes(code) WHERE is_active = TRUE;

-- ===============================
-- 第三步：啟用 RLS
-- ===============================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_codes ENABLE ROW LEVEL SECURITY;

-- ===============================
-- 第四步：建立輔助函數
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

-- 設置當前用戶 ID
CREATE OR REPLACE FUNCTION set_current_user_id(user_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT set_config('app.current_user_id', user_id::TEXT, true);
$$;

-- 更新時間戳函數
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW() AT TIME ZONE 'Asia/Hong_Kong';
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ===============================
-- 第五步：建立 RLS 政策
-- ===============================

-- 用戶資料表的 RLS 政策
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (
    id = get_current_user_id() OR 
    supabase_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (
    id = get_current_user_id() OR 
    supabase_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Allow authentication queries" ON user_profiles;
CREATE POLICY "Allow authentication queries" ON user_profiles
  FOR SELECT USING (TRUE);

-- 帳戶類型（公開讀取）
DROP POLICY IF EXISTS "Anyone can view account types" ON account_types;
CREATE POLICY "Anyone can view account types" ON account_types
  FOR SELECT USING (TRUE);

-- 帳戶
DROP POLICY IF EXISTS "Users can manage own accounts" ON accounts;
CREATE POLICY "Users can manage own accounts" ON accounts
  FOR ALL USING (
    user_id = get_current_user_id() OR 
    user_id IN (SELECT id FROM user_profiles WHERE supabase_user_id = auth.uid())
  );

-- 交易記錄
DROP POLICY IF EXISTS "Users can manage own transactions" ON transactions;
CREATE POLICY "Users can manage own transactions" ON transactions
  FOR ALL USING (
    user_id = get_current_user_id() OR 
    user_id IN (SELECT id FROM user_profiles WHERE supabase_user_id = auth.uid())
  );

-- 文件
DROP POLICY IF EXISTS "Users can manage own documents" ON documents;
CREATE POLICY "Users can manage own documents" ON documents
  FOR ALL USING (
    user_id = get_current_user_id() OR 
    user_id IN (SELECT id FROM user_profiles WHERE supabase_user_id = auth.uid())
  );

-- 日記
DROP POLICY IF EXISTS "Users can manage own diary entries" ON diary_entries;
CREATE POLICY "Users can manage own diary entries" ON diary_entries
  FOR ALL USING (
    user_id = get_current_user_id() OR 
    user_id IN (SELECT id FROM user_profiles WHERE supabase_user_id = auth.uid())
  );

-- 行事曆
DROP POLICY IF EXISTS "Users can manage own calendar events" ON calendar_events;
CREATE POLICY "Users can manage own calendar events" ON calendar_events
  FOR ALL USING (
    user_id = get_current_user_id() OR 
    user_id IN (SELECT id FROM user_profiles WHERE supabase_user_id = auth.uid())
  );

-- 快速代碼
DROP POLICY IF EXISTS "Anyone can view active quick codes" ON quick_codes;
CREATE POLICY "Anyone can view active quick codes" ON quick_codes
  FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Users can manage own quick codes" ON quick_codes;
CREATE POLICY "Users can manage own quick codes" ON quick_codes
  FOR ALL USING (
    user_id = get_current_user_id() OR 
    user_id IN (SELECT id FROM user_profiles WHERE supabase_user_id = auth.uid())
  );

-- ===============================
-- 第六步：建立觸發器
-- ===============================
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_accounts_updated_at ON accounts;
CREATE TRIGGER update_accounts_updated_at 
  BEFORE UPDATE ON accounts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at 
  BEFORE UPDATE ON transactions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at 
  BEFORE UPDATE ON documents 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_diary_entries_updated_at ON diary_entries;
CREATE TRIGGER update_diary_entries_updated_at 
  BEFORE UPDATE ON diary_entries 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER update_calendar_events_updated_at 
  BEFORE UPDATE ON calendar_events 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================
-- 第七步：建立業務函數
-- ===============================

-- 統一登入驗證函數
CREATE OR REPLACE FUNCTION authenticate_user(
  input_identifier VARCHAR,
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
  -- 查找用戶
  SELECT up.id, up.email, up.username, up.password_hash, up.display_name, up.avatar, up.auth_provider, up.is_active
  INTO user_record
  FROM user_profiles up
  WHERE (up.email = input_identifier OR up.username = input_identifier)
    AND up.is_active = TRUE
    AND up.password_hash IS NOT NULL;
    
  IF user_record IS NULL THEN
    RAISE EXCEPTION '用戶不存在或帳戶已停用';
  END IF;
  
  -- 驗證密碼
  IF NOT crypt(input_password, user_record.password_hash) = user_record.password_hash THEN
    RAISE EXCEPTION '密碼錯誤';
  END IF;
  
  -- 設置當前用戶 ID
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

-- 修正參數順序的更新用戶資料函數
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
  current_user_id UUID;
BEGIN
  -- 獲取當前用戶 ID
  current_user_id := get_current_user_id();
  IF current_user_id IS NULL THEN
    SELECT id INTO current_user_id FROM user_profiles WHERE supabase_user_id = auth.uid();
  END IF;
  
  -- 檢查權限
  IF target_user_id != current_user_id THEN
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
    updated_at = NOW() AT TIME ZONE 'Asia/Hong_Kong'
  WHERE id = target_user_id;
  
  RETURN FOUND;
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
  
  -- 檢查是否已存在
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
      updated_at = NOW() AT TIME ZONE 'Asia/Hong_Kong'
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

-- 創建帳戶函數
CREATE OR REPLACE FUNCTION create_account(
  p_user_id UUID,
  p_name VARCHAR,
  p_account_type_name VARCHAR,
  p_currency VARCHAR DEFAULT 'HKD',
  p_initial_balance DECIMAL DEFAULT 0.00
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  account_type_id UUID;
  new_account_id UUID;
BEGIN
  -- 獲取帳戶類型 ID
  SELECT id INTO account_type_id 
  FROM account_types 
  WHERE name = p_account_type_name;
  
  IF account_type_id IS NULL THEN
    RAISE EXCEPTION '找不到帳戶類型: %', p_account_type_name;
  END IF;
  
  -- 創建帳戶
  INSERT INTO accounts (user_id, name, account_type_id, currency, balance)
  VALUES (p_user_id, p_name, account_type_id, p_currency, p_initial_balance)
  RETURNING id INTO new_account_id;
  
  RETURN new_account_id;
END;
$$;

-- 記錄交易函數
CREATE OR REPLACE FUNCTION record_transaction(
  p_user_id UUID,
  p_from_account_id UUID,
  p_to_account_id UUID,
  p_amount DECIMAL,
  p_currency VARCHAR DEFAULT 'HKD',
  p_category VARCHAR,
  p_subcategory VARCHAR DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_transaction_date DATE DEFAULT NULL,
  p_timezone VARCHAR DEFAULT 'Asia/Hong_Kong'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  transaction_id UUID;
  hk_now TIMESTAMP WITH TIME ZONE;
BEGIN
  -- 獲取香港時間
  hk_now := NOW() AT TIME ZONE p_timezone;
  
  -- 插入交易記錄
  INSERT INTO transactions (
    user_id, from_account_id, to_account_id, amount, currency,
    category, subcategory, description, 
    transaction_date, transaction_time, timezone,
    created_at, updated_at
  ) VALUES (
    p_user_id, p_from_account_id, p_to_account_id, p_amount, p_currency,
    p_category, p_subcategory, p_description,
    COALESCE(p_transaction_date, hk_now::DATE), 
    hk_now::TIME, p_timezone,
    hk_now, hk_now
  ) RETURNING id INTO transaction_id;
  
  -- 更新帳戶餘額
  IF p_from_account_id IS NOT NULL THEN
    UPDATE accounts SET 
      balance = balance - p_amount,
      updated_at = hk_now
    WHERE id = p_from_account_id;
  END IF;
  
  IF p_to_account_id IS NOT NULL THEN
    UPDATE accounts SET 
      balance = balance + p_amount,
      updated_at = hk_now
    WHERE id = p_to_account_id;
  END IF;
  
  RETURN transaction_id;
END;
$$;

-- 獲取帳戶餘額函數
CREATE OR REPLACE FUNCTION get_account_balance(p_account_id UUID)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_balance DECIMAL;
BEGIN
  SELECT balance INTO current_balance
  FROM accounts
  WHERE id = p_account_id;
  
  RETURN COALESCE(current_balance, 0);
END;
$$;

-- ===============================
-- 第八步：插入預設資料
-- ===============================

-- 插入預設帳戶類型
INSERT INTO account_types (name, type, description) VALUES
  ('現金', 'asset', '現金資產'),
  ('銀行帳戶', 'asset', '銀行存款'),
  ('信用卡', 'liability', '信用卡負債'),
  ('薪資收入', 'income', '工作薪資'),
  ('投資收入', 'income', '投資獲利'),
  ('餐飲支出', 'expense', '飲食費用'),
  ('交通支出', 'expense', '交通費用'),
  ('娛樂支出', 'expense', '娛樂費用'),
  ('生活支出', 'expense', '日常生活費用'),
  ('投資支出', 'expense', '投資成本')
ON CONFLICT (name) DO NOTHING;

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

-- 插入測試用的快速代碼
INSERT INTO quick_codes (code, document_url, user_id, is_active) VALUES
  ('1234', 'https://example.com/document1', NULL, TRUE),
  ('5678', 'https://example.com/document2', NULL, TRUE),
  ('9999', 'https://github.com/your-repo/readme', NULL, TRUE)
ON CONFLICT (code) DO NOTHING;