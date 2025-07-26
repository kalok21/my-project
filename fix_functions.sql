-- ===============================
-- 修復 Supabase 函數問題
-- ===============================

-- 先刪除可能存在的舊函數
DROP FUNCTION IF EXISTS authenticate_user(VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS update_user_profile(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT);
DROP FUNCTION IF EXISTS create_or_update_user_profile(VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR, UUID);

-- 重新創建統一登入驗證函數
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

-- 重新創建更新用戶資料函數
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