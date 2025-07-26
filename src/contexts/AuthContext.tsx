import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'

interface User {
  id: string
  email?: string
  username?: string
  displayName: string
  avatar?: string
  authProvider: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (identifier: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  loginWithQuickCode: (code: string) => Promise<string | null>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 檢查本地儲存的用戶資訊
    const savedUser = localStorage.getItem('currentUser')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (error) {
        console.error('解析用戶資訊失敗:', error)
        localStorage.removeItem('currentUser')
      }
    }

    // 檢查 Supabase 現有 session (用於 Google 登入)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user && !savedUser) {
        // 處理 Google 登入的用戶，自動創建或更新用戶資料
        try {
          const { data: userId } = await supabase.rpc('create_or_update_user_profile', {
            input_email: session.user.email,
            input_username: null,
            input_password: null,
            input_display_name: session.user.user_metadata.name || session.user.email,
            input_avatar: session.user.user_metadata.avatar_url,
            input_auth_provider: 'google',
            input_supabase_user_id: session.user.id
          })

          const supabaseUser = {
            id: userId,
            email: session.user.email!,
            displayName: session.user.user_metadata.name || session.user.email!,
            avatar: session.user.user_metadata.avatar_url,
            authProvider: 'google'
          }
          setUser(supabaseUser)
          localStorage.setItem('currentUser', JSON.stringify(supabaseUser))
        } catch (error) {
          console.error('創建 Google 用戶資料失敗:', error)
        }
      }
      setLoading(false)
    })

    // 監聽 Supabase 認證狀態變化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          // Google 登出
          const currentUser = localStorage.getItem('currentUser')
          if (currentUser) {
            const user = JSON.parse(currentUser)
            if (user.authProvider === 'google') {
              setUser(null)
              localStorage.removeItem('currentUser')
            }
          }
        } else if (session?.user) {
          // Google 登入成功
          try {
            const { data: userId } = await supabase.rpc('create_or_update_user_profile', {
              input_email: session.user.email,
              input_username: null,
              input_password: null,
              input_display_name: session.user.user_metadata.name || session.user.email,
              input_avatar: session.user.user_metadata.avatar_url,
              input_auth_provider: 'google',
              input_supabase_user_id: session.user.id
            })

            const supabaseUser = {
              id: userId,
              email: session.user.email!,
              displayName: session.user.user_metadata.name || session.user.email!,
              avatar: session.user.user_metadata.avatar_url,
              authProvider: 'google'
            }
            setUser(supabaseUser)
            localStorage.setItem('currentUser', JSON.stringify(supabaseUser))
          } catch (error) {
            console.error('處理 Google 用戶失敗:', error)
          }
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const login = async (identifier: string, password: string) => {
    try {
      // 使用統一的認證函數
      const { data, error } = await supabase.rpc('authenticate_user', {
        input_identifier: identifier,
        input_password: password
      })

      if (error) {
        throw new Error(error.message || '登入失敗')
      }

      if (!data || data.length === 0) {
        throw new Error('帳號或密碼錯誤')
      }

      const userData = data[0]
      const userInfo: User = {
        id: userData.user_id,
        email: userData.email,
        username: userData.username,
        displayName: userData.display_name,
        avatar: userData.avatar,
        authProvider: userData.auth_provider
      }

      setUser(userInfo)
      localStorage.setItem('currentUser', JSON.stringify(userInfo))
    } catch (error) {
      console.error('登入失敗:', error)
      throw error
    }
  }

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`
      }
    })
    if (error) throw error
  }

  const loginWithQuickCode = async (code: string): Promise<string | null> => {
    // 查詢快速代碼對應的文件連結
    const { data, error } = await supabase
      .from('quick_codes')
      .select('document_url')
      .eq('code', code)
      .single()
    
    if (error || !data) return null
    return data.document_url
  }

  const logout = async () => {
    try {
      // 清除本地用戶資訊
      setUser(null)
      localStorage.removeItem('currentUser')
      
      // 如果是 Google 用戶，也要登出 Supabase
      const { error } = await supabase.auth.signOut()
      // 忽略 Supabase 登出錯誤
    } catch (error) {
      console.error('登出過程中發生錯誤:', error)
      // 即使發生錯誤也要清除本地狀態
      setUser(null)
      localStorage.removeItem('currentUser')
    }
  }

  const value = {
    user,
    loading,
    login,
    loginWithGoogle,
    loginWithQuickCode,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}