import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { DiaryEntry } from '../lib/supabase'

export default function DiaryEditor() {
  const { user, logout } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0])
  const [entries, setEntries] = useState<DiaryEntry[]>([])
  const [currentEntry, setCurrentEntry] = useState<DiaryEntry | null>(null)
  const [content, setContent] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCalendarView, setShowCalendarView] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date())

  useEffect(() => {
    loadEntries()
  }, [])

  useEffect(() => {
    loadEntryByDate(currentDate)
  }, [currentDate, entries])

  useEffect(() => {
    // 自動儲存功能
    const autoSaveInterval = setInterval(() => {
      if (isEditing && content.trim()) {
        handleAutoSave()
      }
    }, 30000) // 每30秒自動儲存

    return () => clearInterval(autoSaveInterval)
  }, [isEditing, content, currentDate])

  const loadEntries = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('diary_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
      
      if (error) throw error
      setEntries(data || [])
    } catch (error) {
      console.error('載入日記失敗:', error)
    }
  }

  const loadEntryByDate = (date: string) => {
    const entry = entries.find(e => e.date === date)
    setCurrentEntry(entry || null)
    setContent(entry?.content || '')
    setIsEditing(false)
  }

  const handleAutoSave = async () => {
    if (!user || !content.trim()) return
    
    try {
      if (currentEntry) {
        // 更新現有日記
        const { error } = await supabase
          .from('diary_entries')
          .update({
            content: content,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentEntry.id)

        if (error) throw error
      } else {
        // 建立新日記
        const { data, error } = await supabase
          .from('diary_entries')
          .insert([{
            user_id: user.id,
            date: currentDate,
            content: content,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()

        if (error) throw error
        
        if (data && data[0]) {
          setCurrentEntry(data[0])
          setEntries(prev => [data[0], ...prev])
        }
      }
    } catch (error) {
      console.error('自動儲存失敗:', error)
    }
  }

  const handleSave = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      if (currentEntry) {
        // 更新現有日記
        const { error } = await supabase
          .from('diary_entries')
          .update({
            content: content,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentEntry.id)

        if (error) throw error
        
        // 更新本地狀態
        setEntries(prev => prev.map(entry => 
          entry.id === currentEntry.id 
            ? { ...entry, content: content, updated_at: new Date().toISOString() }
            : entry
        ))
        setCurrentEntry(prev => prev ? { ...prev, content: content, updated_at: new Date().toISOString() } : null)
      } else {
        // 建立新日記
        const { data, error } = await supabase
          .from('diary_entries')
          .insert([{
            user_id: user.id,
            date: currentDate,
            content: content,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()

        if (error) throw error
        
        if (data && data[0]) {
          setCurrentEntry(data[0])
          setEntries(prev => [data[0], ...prev.filter(e => e.date !== currentDate)])
        }
      }

      setIsEditing(false)
      alert('日記已儲存')
    } catch (error: any) {
      alert('儲存失敗: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('確定要刪除此日記嗎？')) return
    
    try {
      const { error } = await supabase
        .from('diary_entries')
        .delete()
        .eq('id', entryId)

      if (error) throw error
      
      setEntries(prev => prev.filter(entry => entry.id !== entryId))
      if (currentEntry?.id === entryId) {
        setCurrentEntry(null)
        setContent('')
        setIsEditing(false)
      }
    } catch (error: any) {
      alert('刪除失敗: ' + error.message)
    }
  }

  const formatText = (format: string) => {
    const textarea = document.getElementById('diary-editor') as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const selectedText = content.substring(start, end)
      
      let replacement = ''
      switch (format) {
        case 'bold':
          replacement = `**${selectedText}**`
          break
        case 'italic':
          replacement = `*${selectedText}*`
          break
        case 'heading':
          replacement = `## ${selectedText}`
          break
        case 'bullet':
          replacement = `• ${selectedText}`
          break
      }
      
      const before = content.substring(0, start)
      const after = content.substring(end)
      const newContent = before + replacement + after
      
      setContent(newContent)
      
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + replacement.length, start + replacement.length)
      }, 0)
    }
  }

  const getEntriesWithContent = () => {
    return entries.filter(entry => entry.content && entry.content.trim() !== '')
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const days = []
    for (let i = 0; i < 42; i++) {
      const day = new Date(startDate)
      day.setDate(startDate.getDate() + i)
      days.push(day)
    }
    return days
  }

  const hasEntryOnDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return entries.some(entry => entry.date === dateStr && entry.content?.trim())
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
    setCurrentDate(newDate.toISOString().split('T')[0])
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedMonth)
    newDate.setMonth(selectedMonth.getMonth() + (direction === 'next' ? 1 : -1))
    setSelectedMonth(newDate)
  }

  const filteredEntries = getEntriesWithContent().filter(entry => 
    entry.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.date.includes(searchTerm)
  )

  const exportToPDF = () => {
    // TODO: 實現 PDF 匯出功能
    alert('PDF 匯出功能開發中...')
  }

  const days = getDaysInMonth(selectedMonth)

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
              <h1 className="text-2xl font-bold text-gray-900">個人日記</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user?.name}</span>
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

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* 功能按鈕區 */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex space-x-4">
              <button
                onClick={() => setShowCalendarView(!showCalendarView)}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  showCalendarView 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-700 border border-gray-300'
                }`}
              >
                {showCalendarView ? '編輯模式' : '月曆視圖'}
              </button>
              <button
                onClick={exportToPDF}
                className="bg-green-600 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700"
              >
                匯出 PDF
              </button>
            </div>
            
            <div className="text-sm text-gray-600">
              總共 {getEntriesWithContent().length} 篇日記
            </div>
          </div>

          {showCalendarView ? (
            /* 月曆視圖 */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="bg-white shadow rounded-lg">
                  <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">
                      {selectedMonth.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long' })}
                    </h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => navigateMonth('prev')}
                        className="p-2 hover:bg-gray-100 rounded-md"
                      >
                        ←
                      </button>
                      <button
                        onClick={() => navigateMonth('next')}
                        className="p-2 hover:bg-gray-100 rounded-md"
                      >
                        →
                      </button>
                    </div>
                  </div>

                  {/* 星期標題 */}
                  <div className="grid grid-cols-7 border-b border-gray-200">
                    {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
                      <div key={day} className="p-3 text-center text-sm font-medium text-gray-500">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* 日期格子 */}
                  <div className="grid grid-cols-7">
                    {days.map((day, index) => {
                      const isCurrentMonth = day.getMonth() === selectedMonth.getMonth()
                      const isToday = day.toDateString() === new Date().toDateString()
                      const hasEntry = hasEntryOnDate(day)
                      const dayStr = day.toISOString().split('T')[0]

                      return (
                        <div
                          key={index}
                          className={`min-h-20 p-2 border-b border-r border-gray-200 cursor-pointer hover:bg-gray-50 ${
                            !isCurrentMonth ? 'bg-gray-100 text-gray-400' : ''
                          } ${currentDate === dayStr ? 'bg-blue-50' : ''}`}
                          onClick={() => {
                            setCurrentDate(dayStr)
                            setShowCalendarView(false)
                          }}
                        >
                          <div className={`text-sm font-medium ${
                            isToday ? 'text-blue-600' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                          }`}>
                            {day.getDate()}
                          </div>
                          {hasEntry && (
                            <div className="mt-1">
                              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* 側邊欄 - 最近日記 */}
              <div className="space-y-6">
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <h4 className="text-lg font-medium text-gray-900">最近日記</h4>
                  </div>
                  <div className="p-4">
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {getEntriesWithContent().slice(0, 10).map((entry) => (
                        <div
                          key={entry.id}
                          className="border border-gray-200 rounded-md p-3 cursor-pointer hover:bg-gray-50"
                          onClick={() => {
                            setCurrentDate(entry.date)
                            setShowCalendarView(false)
                          }}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-900">
                              {new Date(entry.date).toLocaleDateString('zh-TW')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-3">
                            {entry.content?.substring(0, 100)}...
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* 編輯模式 */
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* 日記列表 */}
              <div className="lg:col-span-1">
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">日記列表</h3>
                    
                    {/* 搜尋框 */}
                    <input
                      type="text"
                      placeholder="搜尋日記..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto">
                    {filteredEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                          currentDate === entry.date ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                        }`}
                        onClick={() => setCurrentDate(entry.date)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {new Date(entry.date).toLocaleDateString('zh-TW', {
                                month: 'long',
                                day: 'numeric',
                                weekday: 'long'
                              })}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {entry.content?.substring(0, 50)}...
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteEntry(entry.id)
                            }}
                            className="text-red-600 hover:text-red-700 text-xs ml-2"
                          >
                            刪除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 編輯器 */}
              <div className="lg:col-span-3">
                <div className="bg-white shadow rounded-lg">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-4">
                        <h3 className="text-lg font-medium text-gray-900">
                          {new Date(currentDate).toLocaleDateString('zh-TW', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            weekday: 'long'
                          })}
                        </h3>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => navigateDate('prev')}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            ← 前一天
                          </button>
                          <button
                            onClick={() => navigateDate('next')}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            後一天 →
                          </button>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <input
                          type="date"
                          value={currentDate}
                          onChange={(e) => setCurrentDate(e.target.value)}
                          className="px-3 py-1 border border-gray-300 rounded text-sm"
                        />
                        {isEditing ? (
                          <>
                            <button
                              onClick={handleSave}
                              disabled={loading}
                              className="bg-green-600 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700 disabled:opacity-50"
                            >
                              {loading ? '儲存中...' : '儲存'}
                            </button>
                            <button
                              onClick={() => {
                                setIsEditing(false)
                                setContent(currentEntry?.content || '')
                              }}
                              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-400"
                            >
                              取消
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setIsEditing(true)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
                          >
                            {currentEntry ? '編輯' : '開始寫作'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {isEditing && (
                    /* 格式工具列 */
                    <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => formatText('bold')}
                          className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-100"
                          title="粗體"
                        >
                          <strong>B</strong>
                        </button>
                        <button
                          onClick={() => formatText('italic')}
                          className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-100"
                          title="斜體"
                        >
                          <em>I</em>
                        </button>
                        <button
                          onClick={() => formatText('heading')}
                          className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-100"
                          title="標題"
                        >
                          H
                        </button>
                        <button
                          onClick={() => formatText('bullet')}
                          className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-100"
                          title="項目符號"
                        >
                          • List
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="p-6">
                    {isEditing ? (
                      <div>
                        <textarea
                          id="diary-editor"
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          rows={25}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="今天發生了什麼事呢？寫下你的想法和感受..."
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          支援 Markdown 格式。自動儲存已啟用。
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="prose max-w-none bg-gray-50 p-4 rounded-md min-h-96">
                          {currentEntry?.content ? (
                            <pre className="whitespace-pre-wrap text-sm text-gray-900 font-sans">
                              {currentEntry.content}
                            </pre>
                          ) : (
                            <div className="text-center py-12">
                              <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                                ✏️
                              </div>
                              <p className="text-gray-500 mb-4">
                                {new Date(currentDate).toDateString() === new Date().toDateString() 
                                  ? '今天還沒有寫日記呢' 
                                  : '這一天沒有日記記錄'
                                }
                              </p>
                              <button
                                onClick={() => setIsEditing(true)}
                                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                              >
                                開始寫作
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}