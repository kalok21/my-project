import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import StarryShowcase from '../components/StarryShowcase'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const [currentBalance, setCurrentBalance] = useState(0)
  const [recentDiaries, setRecentDiaries] = useState<any[]>([])
  const [weather, setWeather] = useState<any>(null)
  const [todos, setTodos] = useState<any[]>([])
  const [showStarryDemo, setShowStarryDemo] = useState(false)

  useEffect(() => {
    // 載入帳戶餘額
    loadAccountBalance()
    // 載入最近日記
    loadRecentDiaries()
    // 載入天氣資訊
    loadWeather()
    // 載入待辦事項
    loadTodos()
  }, [])

  const loadAccountBalance = async () => {
    // TODO: 從記帳系統拉取資料
    setCurrentBalance(25000) // 暫時模擬數據
  }

  const loadRecentDiaries = async () => {
    // TODO: 從日記系統拉取最近5篇
    setRecentDiaries([
      { date: '2025-01-25', title: '今日思考', content: '今天學習了很多新東西...' },
      { date: '2025-01-24', title: '工作心得', content: '專案進度順利...' }
    ])
  }

  const loadWeather = async () => {
    // TODO: 整合天氣 API
    setWeather({
      temperature: '23°C',
      condition: '多雲',
      location: '香港'
    })
  }

  const loadTodos = async () => {
    // TODO: 從行事曆系統拉取今日待辦
    setTodos([
      { id: 1, title: '完成專案報告', completed: false },
      { id: 2, title: '購買生活用品', completed: true }
    ])
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('登出失敗:', error)
    }
  }

  // 如果要展示 Tailwind v4 功能，顯示星空頁面
  if (showStarryDemo) {
    return (
      <div className="relative">
        <button 
          onClick={() => setShowStarryDemo(false)}
          className="fixed top-4 right-4 z-50 glass-effect px-4 py-2 rounded-full text-white hover:bg-white/20 transition-all duration-300"
        >
          回到控制台
        </button>
        <StarryShowcase />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 scrollbar-custom">
      {/* 頂部導航 - 使用 Tailwind v4 增強效果 */}
      <header className="bg-white shadow-lg backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold gradient-text">個人管理系統</h1>
              <span className="ml-4 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Tailwind v4</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowStarryDemo(true)}
                className="glass-effect px-4 py-2 rounded-full text-blue-600 hover:bg-blue-50 transition-all duration-300 hover:scale-105 text-sm font-medium"
              >
                🌟 Tailwind v4 展示
              </button>
              <div className="flex items-center space-x-2">
                <img
                  className="h-8 w-8 rounded-full ring-2 ring-blue-200 transition-all duration-300 hover:ring-blue-400"
                  src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || '')}&background=3b82f6&color=fff`}
                  alt={user?.displayName}
                />
                <Link to="/profile" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">
                  {user?.displayName}
                </Link>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg"
              >
                登出
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* 歡迎區塊 - 增強視覺效果 */}
          <div className="glass-effect rounded-2xl mb-6 overflow-hidden border border-white/20">
            <div className="px-6 py-8 bg-gradient-to-r from-blue-50 to-purple-50">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                歡迎回來，{user?.name}！ 
                <span className="animate-twinkle">✨</span>
              </h2>
              <p className="text-gray-600 text-lg">
                今天是 {new Date().toLocaleDateString('zh-TW', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  weekday: 'long'
                })}
              </p>
            </div>
          </div>

          {/* 資訊卡片區 - 使用 Tailwind v4 增強效果 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* 帳戶餘額 */}
            <div className="glass-effect rounded-xl overflow-hidden hover:scale-105 transition-all duration-300 hover:shadow-xl group">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-green-600 rounded-xl flex items-center justify-center group-hover:animate-shake">
                      <span className="text-white font-bold text-xl">$</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">帳戶餘額</dt>
                      <dd className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">
                        ${currentBalance.toLocaleString()}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* 天氣資訊 */}
            <div className="glass-effect rounded-xl overflow-hidden hover:scale-105 transition-all duration-300 hover:shadow-xl group">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-blue-600 rounded-xl flex items-center justify-center group-hover:animate-shake">
                      <span className="text-white font-bold text-xl">☁</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {weather?.location} 天氣
                      </dt>
                      <dd className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                        {weather?.temperature} {weather?.condition}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* 待辦事項 */}
            <div className="glass-effect rounded-xl overflow-hidden hover:scale-105 transition-all duration-300 hover:shadow-xl group">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-orange-600 rounded-xl flex items-center justify-center group-hover:animate-shake">
                      <span className="text-white font-bold text-xl">✓</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">今日待辦</dt>
                      <dd className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-700 bg-clip-text text-transparent">
                        {todos.filter(todo => !todo.completed).length} 項未完成
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* 日記數量 */}
            <div className="glass-effect rounded-xl overflow-hidden hover:scale-105 transition-all duration-300 hover:shadow-xl group">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-purple-600 rounded-xl flex items-center justify-center group-hover:animate-shake">
                      <span className="text-white font-bold text-xl">📝</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">本月日記</dt>
                      <dd className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent">
                        {recentDiaries.length} 篇
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 功能按鈕區 - 現代化設計 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Link
              to="/accounting"
              className="glass-effect p-6 rounded-2xl hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:shadow-xl border-l-4 border-green-500 group"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:animate-shake">
                    <span className="text-2xl">💰</span>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">個人記帳</h3>
                  <p className="text-sm text-gray-500">管理收支與資產</p>
                </div>
              </div>
            </Link>

            <Link
              to="/calendar"
              className="glass-effect p-6 rounded-2xl hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:shadow-xl border-l-4 border-blue-500 group"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:animate-shake">
                    <span className="text-2xl">📅</span>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">行事曆</h3>
                  <p className="text-sm text-gray-500">安排與提醒</p>
                </div>
              </div>
            </Link>

            <Link
              to="/documents"
              className="glass-effect p-6 rounded-2xl hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:shadow-xl border-l-4 border-orange-500 group"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center group-hover:animate-shake">
                    <span className="text-2xl">🔗</span>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">文件連結</h3>
                  <p className="text-sm text-gray-500">管理重要連結</p>
                </div>
              </div>
            </Link>

            <Link
              to="/diary"
              className="glass-effect p-6 rounded-2xl hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:shadow-xl border-l-4 border-purple-500 group"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:animate-shake">
                    <span className="text-2xl">📖</span>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">個人日記</h3>
                  <p className="text-sm text-gray-500">記錄生活點滴</p>
                </div>
              </div>
            </Link>
          </div>

          {/* 最近活動區 - 現代化卡片設計 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 最近日記 */}
            <div className="glass-effect rounded-2xl overflow-hidden">
              <div className="px-6 py-8">
                <h3 className="text-xl leading-6 font-bold text-gray-900 mb-6 flex items-center">
                  <span className="animate-twinkle mr-2">📖</span>
                  最近日記
                </h3>
                <div className="space-y-4">
                  {recentDiaries.length > 0 ? (
                    recentDiaries.map((diary, index) => (
                      <div key={index} className="border-l-4 border-purple-200 pl-4 py-2 hover:border-purple-400 transition-all duration-300">
                        <div className="flex justify-between items-center">
                          <h4 className="text-sm font-semibold text-gray-900">{diary.title}</h4>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{diary.date}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-2 truncate">{diary.content}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">尚無日記記錄</p>
                  )}
                </div>
                <div className="mt-6">
                  <Link
                    to="/diary"
                    className="text-sm text-purple-600 hover:text-purple-500 font-semibold hover:scale-105 transition-all duration-300 inline-block"
                  >
                    查看所有日記 →
                  </Link>
                </div>
              </div>
            </div>

            {/* 今日待辦 */}
            <div className="glass-effect rounded-2xl overflow-hidden">
              <div className="px-6 py-8">
                <h3 className="text-xl leading-6 font-bold text-gray-900 mb-6 flex items-center">
                  <span className="animate-twinkle mr-2">✅</span>
                  今日待辦
                </h3>
                <div className="space-y-4">
                  {todos.length > 0 ? (
                    todos.map((todo) => (
                      <div key={todo.id} className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-all duration-300">
                        <input
                          type="checkbox"
                          checked={todo.completed}
                          readOnly
                          className="h-4 w-4 text-blue-600 rounded border-gray-300"
                        />
                        <span className={`ml-3 text-sm ${
                          todo.completed ? 'line-through text-gray-500' : 'text-gray-900 font-medium'
                        }`}>
                          {todo.title}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">今日無待辦事項</p>
                  )}
                </div>
                <div className="mt-6">
                  <Link
                    to="/calendar"
                    className="text-sm text-blue-600 hover:text-blue-500 font-semibold hover:scale-105 transition-all duration-300 inline-block"
                  >
                    管理行事曆 →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}