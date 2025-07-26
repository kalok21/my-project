-- ===============================
-- 檢查現有資料庫狀態並完整重建
-- ===============================

-- 檢查現有表格
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';

-- 檢查現有函數
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public';

-- 如果需要，可以先清理現有結構
-- DROP TABLE IF EXISTS transactions CASCADE;
-- DROP TABLE IF EXISTS accounts CASCADE;
-- DROP TABLE IF EXISTS account_types CASCADE;
-- DROP TABLE IF EXISTS diary_entries CASCADE;
-- DROP TABLE IF EXISTS documents CASCADE;
-- DROP TABLE IF EXISTS quick_codes CASCADE;
-- DROP TABLE IF EXISTS user_profiles CASCADE;

-- 清理函數
DROP FUNCTION IF EXISTS authenticate_user(VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS update_user_profile(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT);
DROP FUNCTION IF EXISTS create_or_update_user_profile(VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR, UUID);
DROP FUNCTION IF EXISTS create_account(UUID, VARCHAR, VARCHAR, VARCHAR, DECIMAL);
DROP FUNCTION IF EXISTS record_transaction(UUID, UUID, UUID, DECIMAL, VARCHAR, VARCHAR, VARCHAR, TEXT, DATE, VARCHAR);
DROP FUNCTION IF EXISTS get_account_balance(UUID);
DROP FUNCTION IF EXISTS get_current_user_id();
DROP FUNCTION IF EXISTS set_current_user_id(UUID);
DROP FUNCTION IF EXISTS update_updated_at_column();