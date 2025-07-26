import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface CalendarEvent {
  id: string
  title: string
  date: string
  time?: string
  description?: string
  type: 'event' | 'todo'
  completed?: boolean
}

export default function Calendar() {
  const { user, logout } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'calendar' | 'google'>('calendar')
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
    description: '',
    type: 'event' as 'event' | 'todo'
  })

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    // TODO: 從資料庫載入事件
    const mockEvents: CalendarEvent[] = [
      {
        id: '1',
        title: '會議',
        date: '2025-01-26',
        time: '14:00',
        description: '項目進度會議',
        type: 'event'
      },
      {
        id: '2',
        title: '購買生活用品',
        date: '2025-01-26',
        type: 'todo',
        completed: false
      },
      {
        id: '3',
        title: '健身',
        date: '2025-01-27',
        time: '18:00',
        type: 'event'
      }
    ]
    setEvents(mockEvents)
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
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

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return events.filter(event => event.date === dateStr)
  }

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const event: CalendarEvent = {
      id: Date.now().toString(),
      title: newEvent.title,
      date: newEvent.date,
      time: newEvent.time || undefined,
      description: newEvent.description || undefined,
      type: newEvent.type,
      completed: newEvent.type === 'todo' ? false : undefined
    }

    setEvents([...events, event])
    setNewEvent({
      title: '',
      date: new Date().toISOString().split('T')[0],
      time: '',
      description: '',
      type: 'event'
    })
    setShowAddModal(false)
    
    // TODO: 儲存到資料庫
  }

  const toggleTodo = (eventId: string) => {
    setEvents(events.map(event => 
      event.id === eventId && event.type === 'todo'
        ? { ...event, completed: !event.completed }
        : event
    ))
  }

  const deleteEvent = (eventId: string) => {
    if (confirm('確定要刪除此事件嗎？')) {
      setEvents(events.filter(event => event.id !== eventId))
    }
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1))
    setCurrentDate(newDate)
  }

  const days = getDaysInMonth(currentDate)
  const selectedDateEvents = getEventsForDate(selectedDate)

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
              <h1 className="text-2xl font-bold text-gray-900">行事曆</h1>
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
          {/* 標籤切換 */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('calendar')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'calendar'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  自建行事曆
                </button>
                <button
                  onClick={() => setActiveTab('google')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'google'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Google Calendar
                </button>
              </nav>
            </div>
          </div>

          {activeTab === 'calendar' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 月曆視圖 */}
              <div className="lg:col-span-2">
                <div className="bg-white shadow rounded-lg">
                  {/* 月曆標題 */}
                  <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">
                      {currentDate.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long' })}
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
                      const isCurrentMonth = day.getMonth() === currentDate.getMonth()
                      const isToday = day.toDateString() === new Date().toDateString()
                      const isSelected = day.toDateString() === selectedDate.toDateString()
                      const dayEvents = getEventsForDate(day)

                      return (
                        <div
                          key={index}
                          className={`min-h-20 p-2 border-b border-r border-gray-200 cursor-pointer hover:bg-gray-50 ${
                            !isCurrentMonth ? 'bg-gray-100 text-gray-400' : ''
                          } ${isSelected ? 'bg-blue-50' : ''}`}
                          onClick={() => setSelectedDate(day)}
                        >
                          <div className={`text-sm font-medium ${
                            isToday ? 'text-blue-600' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                          }`}>
                            {day.getDate()}
                          </div>
                          <div className="mt-1 space-y-1">
                            {dayEvents.slice(0, 2).map((event) => (
                              <div
                                key={event.id}
                                className={`text-xs p-1 rounded truncate ${
                                  event.type === 'event' 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : event.completed 
                                      ? 'bg-green-100 text-green-800 line-through' 
                                      : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {event.time && `${event.time} `}{event.title}
                              </div>
                            ))}
                            {dayEvents.length > 2 && (
                              <div className="text-xs text-gray-500">
                                +{dayEvents.length - 2} 更多
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* 側邊欄 */}
              <div className="space-y-6">
                {/* 新增按鈕 */}
                <button
                  onClick={() => setShowAddModal(true)}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  + 新增事件
                </button>

                {/* 選定日期的事件 */}
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <h4 className="text-lg font-medium text-gray-900">
                      {selectedDate.toLocaleDateString('zh-TW', { 
                        month: 'long', 
                        day: 'numeric',
                        weekday: 'long' 
                      })}
                    </h4>
                  </div>
                  <div className="p-4">
                    {selectedDateEvents.length > 0 ? (
                      <div className="space-y-3">
                        {selectedDateEvents.map((event) => (
                          <div key={event.id} className="border border-gray-200 rounded-md p-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  {event.type === 'todo' && (
                                    <input
                                      type="checkbox"
                                      checked={event.completed || false}
                                      onChange={() => toggleTodo(event.id)}
                                      className="h-4 w-4 text-blue-600 rounded border-gray-300"
                                    />
                                  )}
                                  <h5 className={`font-medium ${
                                    event.completed ? 'line-through text-gray-500' : 'text-gray-900'
                                  }`}>
                                    {event.title}
                                  </h5>
                                </div>
                                {event.time && (
                                  <p className="text-sm text-gray-600 mt-1">{event.time}</p>
                                )}
                                {event.description && (
                                  <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                                )}
                              </div>
                              <button
                                onClick={() => deleteEvent(event.id)}
                                className="text-red-600 hover:text-red-700 text-sm"
                              >
                                刪除
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">此日期無事件</p>
                    )}
                  </div>
                </div>

                {/* 本週待辦 */}
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <h4 className="text-lg font-medium text-gray-900">本週待辦</h4>
                  </div>
                  <div className="p-4">
                    <div className="space-y-2">
                      {events.filter(event => event.type === 'todo' && !event.completed).map((todo) => (
                        <div key={todo.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={false}
                            onChange={() => toggleTodo(todo.id)}
                            className="h-4 w-4 text-blue-600 rounded border-gray-300"
                          />
                          <span className="text-sm text-gray-900">{todo.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Google Calendar 嵌入 */
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Google Calendar</h3>
              </div>
              <div className="p-6">
                <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <p className="text-gray-500 mb-4">
                    此處將嵌入您的 Google Calendar
                  </p>
                  <p className="text-sm text-gray-400">
                    需要設定 Google Calendar API 才能顯示
                  </p>
                  <div className="mt-4">
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                      連接 Google Calendar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 新增事件模態框 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">新增事件</h3>
              <form onSubmit={handleAddEvent} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    類型
                  </label>
                  <div className="flex rounded-lg bg-gray-100 p-1">
                    <button
                      type="button"
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        newEvent.type === 'event'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                      onClick={() => setNewEvent({...newEvent, type: 'event'})}
                    >
                      事件
                    </button>
                    <button
                      type="button"
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        newEvent.type === 'todo'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                      onClick={() => setNewEvent({...newEvent, type: 'todo'})}
                    >
                      待辦
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    標題 *
                  </label>
                  <input
                    type="text"
                    required
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="輸入事件標題"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    日期 *
                  </label>
                  <input
                    type="date"
                    required
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {newEvent.type === 'event' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      時間
                    </label>
                    <input
                      type="time"
                      value={newEvent.time}
                      onChange={(e) => setNewEvent({...newEvent, time: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    描述
                  </label>
                  <textarea
                    rows={3}
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="輸入描述（可選）"
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    儲存
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    取消
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}