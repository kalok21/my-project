-- ===============================
-- 完整的個人記帳系統資料庫結構
-- ===============================

-- 建立帳戶類型表格
CREATE TABLE IF NOT EXISTS account_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR NOT NULL,
  type VARCHAR CHECK (type IN ('asset', 'liability', 'income', 'expense')) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立交易記錄表格（替代原本的 accounting_entries）
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

-- 建立文件表格（改進版）
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

-- 建立日記表格（改進版）
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

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_accounts ON transactions(from_account_id, to_account_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_diary_entries_user_date ON diary_entries(user_id, entry_date);

-- ===============================
-- 啟用 RLS
-- ===============================
ALTER TABLE account_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- ===============================
-- RLS 政策
-- ===============================

-- 帳戶類型（公開讀取）
CREATE POLICY "Anyone can view account types" ON account_types
  FOR SELECT USING (TRUE);

-- 帳戶
CREATE POLICY "Users can manage own accounts" ON accounts
  FOR ALL USING (user_id = get_current_user_id() OR user_id IN (
    SELECT id FROM user_profiles WHERE supabase_user_id = auth.uid()
  ));

-- 交易記錄
CREATE POLICY "Users can manage own transactions" ON transactions
  FOR ALL USING (user_id = get_current_user_id() OR user_id IN (
    SELECT id FROM user_profiles WHERE supabase_user_id = auth.uid()
  ));

-- ===============================
-- 插入預設帳戶類型
-- ===============================
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
ON CONFLICT DO NOTHING;

-- ===============================
-- 記帳輔助函數
-- ===============================

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