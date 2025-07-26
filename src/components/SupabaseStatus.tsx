import { useState, useEffect } from 'react'
import { supabase, SupabaseUtils } from '../lib/supabase'

export default function SupabaseStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [userSession, setUserSession] = useState<any>(null)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    checkSupabaseStatus()
  }, [])

  const checkSupabaseStatus = async () => {
    try {
      // 檢查連接
      const connected = await SupabaseUtils.checkConnection()
      setIsConnected(connected)

      // 檢查用戶 session
      const session = await SupabaseUtils.getCurrentSession()
      setUserSession(session)

      setError('')
    } catch (err: any) {
      setError(err.message)
      setIsConnected(false)
    }
  }

  const testAuth = async () => {
    try {
      const { data, error } = await supabase.auth.signInAnonymously()
      if (error) throw error
      console.log('匿名登入測試成功:', data)
    } catch (err: any) {
      console.error('認證測試失敗:', err.message)
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Supabase 狀態檢查</h3>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span>連接狀態:</span>
          <span className={`px-2 py-1 rounded text-sm ${
            isConnected === null ? 'bg-gray-100 text-gray-600' :
            isConnected ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
          }`}>
            {isConnected === null ? '檢查中...' : isConnected ? '已連接' : '連接失敗'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span>用戶 Session:</span>
          <span className={`px-2 py-1 rounded text-sm ${
            userSession ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
          }`}>
            {userSession ? '已登入' : '未登入'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span>Supabase URL:</span>
          <span className="text-xs text-gray-500 truncate max-w-xs">
            {import.meta.env.VITE_SUPABASE_URL || '未設置'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span>匿名金鑰:</span>
          <span className="text-xs text-gray-500">
            {import.meta.env.VITE_SUPABASE_ANON_KEY ? '已設置' : '未設置'}
          </span>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <div className="mt-4 flex space-x-2">
        <button
          onClick={checkSupabaseStatus}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          重新檢查
        </button>
        <button
          onClick={testAuth}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          測試認證
        </button>
      </div>
    </div>
  )
}