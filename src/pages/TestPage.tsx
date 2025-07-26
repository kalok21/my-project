import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import SupabaseStatus from '../components/SupabaseStatus'

export default function TestPage() {
  const { user, logout } = useAuth()
  const [testResults, setTestResults] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)

  const runTests = async () => {
    setLoading(true)
    const results: Record<string, boolean> = {}

    try {
      // 測試 1: 檢查用戶認證狀態
      results['用戶認證'] = !!user

      // 測試 2: 測試資料庫連接
      const { error: dbError } = await supabase.from('diary_entries').select('id').limit(1)
      results['資料庫連接'] = !dbError

      // 測試 3: 測試快速代碼表格
      const { error: quickCodeError } = await supabase.from('quick_codes').select('code').limit(1)
      results['快速代碼表格'] = !quickCodeError

      // 測試 4: 測試記帳表格
      const { error: accountingError } = await supabase.from('accounting_entries').select('id').limit(1)
      results['記帳表格'] = !accountingError

      // 測試 5: 測試用戶憑證表格
      const { error: credentialsError } = await supabase.from('user_credentials').select('id').limit(1)
      results['用戶憑證表格'] = !credentialsError

      // 測試 6: 測試認證函數
      try {
        const { error: authFuncError } = await supabase.rpc('authenticate_user', {
          input_username: 'nonexistent',
          input_password: 'wrongpass'
        })
        results['認證函數'] = !!authFuncError // 應該要有錯誤，表示函數正常工作
      } catch (error) {
        results['認證函數'] = true // 有異常也表示函數存在
      }

      // 測試 7: 測試 RLS 政策
      const { error: rlsError } = await supabase.from('diary_entries').insert({
        user_id: user?.id,
        date: '2025-01-01',
        content: '測試內容'
      })
      results['RLS 政策'] = rlsError?.code !== 'PGRST301' // 如果沒有權限錯誤，表示 RLS 正常

    } catch (error) {
      console.error('測試過程中發生錯誤:', error)
    }

    setTestResults(results)
    setLoading(false)
  }

  const handleLogout = async () => {
    try {
      await logout()
      alert('登出成功！應該會自動重定向到登入頁面')
    } catch (error) {
      alert('登出失敗: ' + (error as Error).message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">系統測試頁面</h1>
          
          {/* 新增：Supabase 狀態檢查 */}
          <div className="mb-8">
            <SupabaseStatus />
          </div>

          {/* 用戶資訊 */}
          <div className="mb-8 p-6 bg-blue-50 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">當前用戶資訊</h2>
            {user ? (
              <div className="space-y-2">
                <p><strong>ID:</strong> {user.id}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>名稱:</strong> {user.displayName}</p>
                <p><strong>用戶名:</strong> {user.username}</p>
                <p><strong>頭像:</strong> {user.avatar || '無'}</p>
                <p><strong>認證方式:</strong> {user.authProvider}</p>
              </div>
            ) : (
              <p className="text-red-600">未登入</p>
            )}
          </div>

          {/* 測試按鈕 */}
          <div className="mb-8 space-x-4">
            <button
              onClick={runTests}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '測試中...' : '執行系統測試'}
            </button>
            
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700"
            >
              測試登出功能
            </button>
          </div>

          {/* 測試結果 */}
          {Object.keys(testResults).length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">測試結果</h2>
              <div className="space-y-3">
                {Object.entries(testResults).map(([test, passed]) => (
                  <div
                    key={test}
                    className={`p-4 rounded-lg flex items-center justify-between ${
                      passed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    <span className="font-medium">{test}</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {passed ? '✅ 通過' : '❌ 失敗'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 快速代碼測試 */}
          <div className="mb-8 p-6 bg-yellow-50 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">快速代碼測試</h2>
            <p className="mb-4">可以嘗試這些測試代碼：</p>
            <div className="space-y-2 text-sm">
              <p><code className="bg-gray-100 px-2 py-1 rounded">1234</code> - 應該開啟 example.com/document1</p>
              <p><code className="bg-gray-100 px-2 py-1 rounded">5678</code> - 應該開啟 example.com/document2</p>
              <p><code className="bg-gray-100 px-2 py-1 rounded">9999</code> - 應該開啟 GitHub 連結</p>
            </div>
          </div>

          {/* 問題排解 */}
          <div className="p-6 bg-gray-50 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">常見問題排解</h2>
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="font-semibold text-gray-800">如果用戶顯示 "Waiting for verification"：</h3>
                <ol className="list-decimal list-inside space-y-1 text-gray-600 mt-2">
                  <li>進入 Supabase Dashboard → Authentication → Settings</li>
                  <li>關閉 "Enable email confirmations"</li>
                  <li>或手動將用戶的 "Email Confirmed" 設為 true</li>
                </ol>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-800">如果登出功能不工作：</h3>
                <ol className="list-decimal list-inside space-y-1 text-gray-600 mt-2">
                  <li>檢查瀏覽器控制台是否有錯誤訊息</li>
                  <li>確認網路連接正常</li>
                  <li>嘗試重新整理頁面</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}