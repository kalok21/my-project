import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

interface ProfileData {
  email: string
  username: string
  displayName: string
  avatar: string
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export default function UserProfilePage() {
  const { user, logout } = useAuth()
  const [profileData, setProfileData] = useState<ProfileData>({
    email: user?.email || '',
    username: user?.username || '',
    displayName: user?.displayName || '',
    avatar: user?.avatar || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile')

  useEffect(() => {
    if (user) {
      setProfileData(prev => ({
        ...prev,
        email: user.email || '',
        username: user.username || '',
        displayName: user.displayName || '',
        avatar: user.avatar || ''
      }))
    }
  }, [user])

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setError('')
    setMessage('')

    try {
      // 修復：按照正確順序傳遞所有參數
      const { error } = await supabase.rpc('update_user_profile', {
        target_user_id: user.id,
        new_email: profileData.email || null,
        new_username: profileData.username || null,
        new_password: null, // 在個人資料更新時不修改密碼
        new_display_name: profileData.displayName || null,
        new_avatar: profileData.avatar || null
      })

      if (error) throw error

      // 更新本地用戶資訊
      const updatedUser = {
        ...user,
        email: profileData.email,
        username: profileData.username,
        displayName: profileData.displayName,
        avatar: profileData.avatar
      }
      localStorage.setItem('currentUser', JSON.stringify(updatedUser))
      
      setMessage('個人資料更新成功！')
    } catch (error: any) {
      setError(error.message || '更新失敗')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (profileData.newPassword !== profileData.confirmPassword) {
      setError('新密碼與確認密碼不相符')
      return
    }

    if (profileData.newPassword.length < 6) {
      setError('密碼長度至少 6 個字符')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      // 如果是本地帳戶，需要先驗證當前密碼
      if (user.authProvider === 'local' && profileData.currentPassword) {
        const { error: verifyError } = await supabase.rpc('authenticate_user', {
          input_identifier: user.email || user.username,
          input_password: profileData.currentPassword
        })
        if (verifyError) throw new Error('當前密碼錯誤')
      }

      // 修復：按照正確順序傳遞所有參數，只更新密碼
      const { error } = await supabase.rpc('update_user_profile', {
        target_user_id: user.id,
        new_email: null,
        new_username: null,
        new_password: profileData.newPassword,
        new_display_name: null,
        new_avatar: null
      })

      if (error) throw error

      setMessage('密碼更新成功！')
      setProfileData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }))
    } catch (error: any) {
      setError(error.message || '密碼更新失敗')
    } finally {
      setLoading(false)
    }
  }

  const generateAvatar = () => {
    const name = profileData.displayName || profileData.username || profileData.email
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3b82f6&color=fff&size=128`
  }

  if (!user) {
    return <div>請先登入</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 頂部導航 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link to="/" className="text-gray-500 hover:text-gray-700">
                ← 返回首頁
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">用戶設定</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user.displayName}</span>
              <button
                onClick={logout}
                className="text-red-600 hover:text-red-700 text-sm"
              >
                登出
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* 訊息顯示 */}
        {message && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm text-green-800">{message}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        <div className="bg-white shadow rounded-lg">
          {/* 標籤切換 */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'profile'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                個人資料
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'security'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                帳戶安全
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'profile' ? (
              <form onSubmit={handleProfileUpdate} className="space-y-6">
                <div className="flex items-center space-x-6">
                  <div className="flex-shrink-0">
                    <img
                      className="h-20 w-20 rounded-full object-cover"
                      src={profileData.avatar || generateAvatar()}
                      alt="頭像"
                    />
                  </div>
                  <div className="flex-1">
                    <label htmlFor="avatar" className="block text-sm font-medium text-gray-700">
                      頭像 URL
                    </label>
                    <input
                      type="url"
                      id="avatar"
                      value={profileData.avatar}
                      onChange={(e) => setProfileData(prev => ({ ...prev, avatar: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://example.com/avatar.jpg"
                    />
                    <p className="mt-1 text-xs text-gray-500">留空將使用自動生成的頭像</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
                      顯示名稱 *
                    </label>
                    <input
                      type="text"
                      id="displayName"
                      required
                      value={profileData.displayName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, displayName: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                      用戶名
                    </label>
                    <input
                      type="text"
                      id="username"
                      value={profileData.username}
                      onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      disabled={user.authProvider === 'google'}
                    />
                    {user.authProvider === 'google' && (
                      <p className="mt-1 text-xs text-gray-500">Google 用戶無法修改用戶名</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    電子郵件
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    disabled={user.authProvider === 'google'}
                  />
                  {user.authProvider === 'google' && (
                    <p className="mt-1 text-xs text-gray-500">Google 用戶無法修改電子郵件</p>
                  )}
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full md:w-auto bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {loading ? '更新中...' : '更新個人資料'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handlePasswordUpdate} className="space-y-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex">
                    <svg className="w-5 h-5 text-yellow-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <h3 className="text-sm font-medium text-yellow-800">密碼安全提醒</h3>
                      <p className="mt-1 text-sm text-yellow-700">
                        {user.authProvider === 'google' 
                          ? 'Google 用戶可以設定密碼作為備用登入方式'
                          : '建議使用包含大小寫字母、數字和特殊字符的強密碼'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {user.authProvider === 'local' && (
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                      當前密碼 *
                    </label>
                    <input
                      type="password"
                      id="currentPassword"
                      required
                      value={profileData.currentPassword}
                      onChange={(e) => setProfileData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                    新密碼 *
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    required
                    minLength={6}
                    value={profileData.newPassword}
                    onChange={(e) => setProfileData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    確認新密碼 *
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    required
                    minLength={6}
                    value={profileData.confirmPassword}
                    onChange={(e) => setProfileData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full md:w-auto bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {loading ? '更新中...' : '更新密碼'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* 帳戶資訊卡片 */}
        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">帳戶資訊</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">帳戶類型：</span>
              <span className="ml-2 font-medium">
                {user.authProvider === 'google' ? 'Google 帳戶' : '本地帳戶'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">用戶 ID：</span>
              <span className="ml-2 font-mono text-xs">{user.id}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}