import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Account, AccountType, AccountingEntry, NewAccountingEntry } from '../lib/supabase'

export default function AccountingApp() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([])
  const [entries, setEntries] = useState<AccountingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  // 登入狀態
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // 新增記帳項目表單
  const [entryForm, setEntryForm] = useState<Partial<NewAccountingEntry>>({
    type: 'expense',
    amount: 0,
    currency: 'HKD',
    category: '',
    payment_method: '',
    transaction_date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      setUser(session.user)
      setIsLoggedIn(true)
      loadData()
    } else {
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data, error } = await supabase.rpc('authenticate_user', {
        input_username: loginForm.username,
        input_password: loginForm.password
      })

      if (error) throw error
      if (data && data.length > 0) {
        // 模擬登入成功（因為我們使用自定義用戶系統）
        setUser({ id: data[0].user_id, username: data[0].username, name: data[0].name })
        setIsLoggedIn(true)
        loadData()
      }
    } catch (error) {
      console.error('登入失敗:', error)
      alert('登入失敗')
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      // 載入帳戶類別
      const { data: typesData } = await supabase
        .from('account_types')
        .select('*')
        .order('created_at')

      // 載入帳戶
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('*, account_types(name)')
        .order('name')

      // 載入記帳項目
      const { data: entriesData } = await supabase
        .from('accounting_entries')
        .select('*, accounts(name)')
        .order('transaction_date', { ascending: false })
        .limit(20)

      setAccountTypes(typesData || [])
      setAccounts(accountsData || [])
      setEntries(entriesData || [])
    } catch (error) {
      console.error('載入資料失敗:', error)
    }
    setLoading(false)
  }

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('accounting_entries')
        .insert({
          ...entryForm,
          user_id: user.id
        } as NewAccountingEntry)
        .select()

      if (error) throw error
      
      // 重新載入資料
      loadData()
      
      // 重置表單
      setEntryForm({
        type: 'expense',
        amount: 0,
        currency: 'HKD',
        category: '',
        payment_method: '',
        transaction_date: new Date().toISOString().split('T')[0]
      })
      
      alert('記帳項目新增成功')
    } catch (error) {
      console.error('新增失敗:', error)
      alert('新增失敗')
    }
  }

  if (loading) {
    return <div className="p-4">載入中...</div>
  }

  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">3A 個人記帳系統</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">用戶名</label>
            <input
              type="text"
              value={loginForm.username}
              onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
              className="w-full p-2 border rounded"
              placeholder="輸入用戶名 (admin, test, user1)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">密碼</label>
            <input
              type="password"
              value={loginForm.password}
              onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
              className="w-full p-2 border rounded"
              placeholder="輸入密碼"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            登入
          </button>
        </form>
        <p className="mt-4 text-sm text-gray-600">
          測試帳戶: admin/123456, test/password, user1/123456
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">3A 個人記帳系統</h1>
        <div className="flex items-center space-x-4">
          <span>歡迎, {user?.name || user?.username}</span>
          <button
            onClick={() => setIsLoggedIn(false)}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            登出
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 新增記帳項目 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">新增記帳項目</h2>
          <form onSubmit={handleAddEntry} className="space-y-4">
            <div>
              <label className="block text-sm font-medium">類型</label>
              <select
                value={entryForm.type}
                onChange={(e) => setEntryForm(prev => ({ ...prev, type: e.target.value as 'income' | 'expense' | 'transfer' }))}
                className="w-full p-2 border rounded"
              >
                <option value="expense">支出</option>
                <option value="income">收入</option>
                <option value="transfer">轉帳</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">金額</label>
              <input
                type="number"
                step="0.01"
                value={entryForm.amount}
                onChange={(e) => setEntryForm(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">分類</label>
              <input
                type="text"
                value={entryForm.category}
                onChange={(e) => setEntryForm(prev => ({ ...prev, category: e.target.value }))}
                className="w-full p-2 border rounded"
                placeholder="外食、交通、購物..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium">支付方式</label>
              <input
                type="text"
                value={entryForm.payment_method}
                onChange={(e) => setEntryForm(prev => ({ ...prev, payment_method: e.target.value }))}
                className="w-full p-2 border rounded"
                placeholder="現金、八達通、信用卡..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium">日期</label>
              <input
                type="date"
                value={entryForm.transaction_date}
                onChange={(e) => setEntryForm(prev => ({ ...prev, transaction_date: e.target.value }))}
                className="w-full p-2 border rounded"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600"
            >
              新增記帳項目
            </button>
          </form>
        </div>

        {/* 最近記帳項目 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">最近記帳項目</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {entries.length === 0 ? (
              <p className="text-gray-500">尚無記帳項目</p>
            ) : (
              entries.map((entry) => (
                <div key={entry.id} className="p-3 border rounded">
                  <div className="flex justify-between items-center">
                    <span className={`font-medium ${
                      entry.type === 'income' ? 'text-green-600' : 
                      entry.type === 'expense' ? 'text-red-600' : 'text-blue-600'
                    }`}>
                      {entry.type === 'income' ? '+' : entry.type === 'expense' ? '-' : '→'} 
                      ${entry.amount} {entry.currency}
                    </span>
                    <span className="text-sm text-gray-500">{entry.transaction_date}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {entry.category} • {entry.payment_method}
                  </div>
                  {entry.description && (
                    <div className="text-sm text-gray-500">{entry.description}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 統計資訊 */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-100 p-4 rounded-lg">
          <h3 className="font-medium text-green-800">本月收入</h3>
          <p className="text-2xl font-bold text-green-600">
            ${entries.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-red-100 p-4 rounded-lg">
          <h3 className="font-medium text-red-800">本月支出</h3>
          <p className="text-2xl font-bold text-red-600">
            ${entries.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-blue-100 p-4 rounded-lg">
          <h3 className="font-medium text-blue-800">總帳戶數</h3>
          <p className="text-2xl font-bold text-blue-600">{accounts.length}</p>
        </div>
      </div>
    </div>
  )
}