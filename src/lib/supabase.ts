import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'your-supabase-url'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-anon-key'

// 優化的 Supabase 客戶端配置，帶型別支援
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'x-application-name': '3a-personal-accounting-system'
    }
  }
})

// 型別別名，方便使用
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// 記帳相關型別
export type Account = Tables<'accounts'>
export type AccountType = Tables<'account_types'>
export type AccountingEntry = Tables<'accounting_entries'>
export type UserCredential = Tables<'user_credentials'>

// 新增記帳項目的型別
export type NewAccountingEntry = TablesInsert<'accounting_entries'>
export type NewAccount = TablesInsert<'accounts'>
export type NewAccountType = TablesInsert<'account_types'>

// RPC 函數回傳型別
export type AuthUserResult = Database['public']['Functions']['authenticate_user']['Returns'][0]

// Supabase 實用工具函數
export class SupabaseUtils {
  // 檢查連接狀態
  static async checkConnection(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .select('count', { count: 'exact' })
        .limit(1)
      
      return !error
    } catch (error) {
      console.error('Supabase 連接檢查失敗:', error)
      return false
    }
  }

  // 獲取當前用戶 session
  static async getCurrentSession() {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      console.error('獲取 session 失敗:', error)
      return null
    }
    return session
  }

  // 獲取當前用戶資料
  static async getCurrentUser() {
    const session = await this.getCurrentSession()
    if (!session) return null

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('supabase_user_id', session.user.id)
      .single()

    if (error) {
      console.error('獲取用戶資料失敗:', error)
      return null
    }
    return data
  }

  // 實時訂閱功能
  static subscribeToTable(
    tableName: string, 
    callback: (payload: any) => void,
    filter?: string
  ) {
    const channel = supabase
      .channel(`${tableName}_changes`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: tableName,
          filter: filter
        },
        callback
      )
      .subscribe()

    return channel
  }

  // 批量操作
  static async batchInsert(tableName: string, records: any[]) {
    const { data, error } = await supabase
      .from(tableName)
      .insert(records)
      .select()

    if (error) throw error
    return data
  }

  // 安全的資料更新（帶樂觀鎖）
  static async safeUpdate(
    tableName: string, 
    id: string, 
    updates: any, 
    expectedVersion?: string
  ) {
    const query = supabase
      .from(tableName)
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (expectedVersion) {
      query.eq('updated_at', expectedVersion)
    }

    const { data, error } = await query.select()
    
    if (error) throw error
    if (data.length === 0) throw new Error('記錄已被其他用戶修改')
    
    return data[0]
  }
}