import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

interface Account {
  id: string
  name: string
  account_type_name: string
  account_type_type: string
  currency: string
  balance: number
}

interface Transaction {
  id: string
  amount: number
  currency: string
  category: string
  subcategory?: string
  description?: string
  transaction_date: string
  transaction_time: string
  from_account_name?: string
  to_account_name?: string
}

interface AccountType {
  id: string
  name: string
  type: string
}

export default function AccountingApp() {
  const { user, logout } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'accounts'>('overview')
  
  // 新增交易表單
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [transactionForm, setTransactionForm] = useState({
    fromAccountId: '',
    toAccountId: '',
    amount: '',
    currency: 'HKD',
    category: '',
    subcategory: '',
    description: '',
    transactionDate: new Date().toISOString().split('T')[0], // 今天日期
    transactionTime: new Date().toLocaleTimeString('en-HK', { 
      hour12: false, 
      timeZone: 'Asia/Hong_Kong' 
    }).slice(0, 5) // HH:MM 格式
  })
  
  // 新增帳戶表單
  const [showAccountForm, setShowAccountForm] = useState(false)
  const [accountForm, setAccountForm] = useState({
    name: '',
    accountTypeName: '',
    currency: 'HKD',
    initialBalance: '0'
  })

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    setLoading(true)
    setError('')
    
    try {
      await Promise.all([
        loadAccounts(),
        loadTransactions(),
        loadAccountTypes()
      ])
    } catch (error: any) {
      setError(error.message || '載入資料失敗')
    } finally {
      setLoading(false)
    }
  }

  const loadAccounts = async () => {
    const { data, error } = await supabase
      .from('accounts')
      .select(`
        id,
        name,
        currency,
        balance,
        account_types!inner(name, type)
      `)
      .eq('user_id', user?.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error

    const formattedAccounts = data?.map(acc => ({
      id: acc.id,
      name: acc.name,
      currency: acc.currency,
      balance: acc.balance,
      account_type_name: acc.account_types.name,
      account_type_type: acc.account_types.type
    })) || []

    setAccounts(formattedAccounts)
  }

  const loadTransactions = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        id,
        amount,
        currency,
        category,
        subcategory,
        description,
        transaction_date,
        transaction_time,
        from_account:accounts!transactions_from_account_id_fkey(name),
        to_account:accounts!transactions_to_account_id_fkey(name)
      `)
      .eq('user_id', user?.id)
      .order('transaction_date', { ascending: false })
      .order('transaction_time', { ascending: false })
      .limit(50)

    if (error) throw error

    const formattedTransactions = data?.map(txn => ({
      id: txn.id,
      amount: txn.amount,
      currency: txn.currency,
      category: txn.category,
      subcategory: txn.subcategory,
      description: txn.description,
      transaction_date: txn.transaction_date,
      transaction_time: txn.transaction_time,
      from_account_name: txn.from_account?.name,
      to_account_name: txn.to_account?.name
    })) || []

    setTransactions(formattedTransactions)
  }

  const loadAccountTypes = async () => {
    const { data, error } = await supabase
      .from('account_types')
      .select('id, name, type')
      .order('type', { ascending: true })

    if (error) throw error
    setAccountTypes(data || [])
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.rpc('create_account', {
        p_user_id: user?.id,
        p_name: accountForm.name,
        p_account_type_name: accountForm.accountTypeName,
        p_currency: accountForm.currency,
        p_initial_balance: parseFloat(accountForm.initialBalance)
      })

      if (error) throw error

      setAccountForm({
        name: '',
        accountTypeName: '',
        currency: 'HKD',
        initialBalance: '0'
      })
      setShowAccountForm(false)
      await loadAccounts()
    } catch (error: any) {
      setError(error.message || '創建帳戶失敗')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // 轉換時間為香港時區
      const hkDateTime = new Date(`${transactionForm.transactionDate}T${transactionForm.transactionTime}:00+08:00`)
      
      const { error } = await supabase.rpc('record_transaction', {
        p_user_id: user?.id,
        p_from_account_id: transactionForm.fromAccountId || null,
        p_to_account_id: transactionForm.toAccountId || null,
        p_amount: parseFloat(transactionForm.amount),
        p_currency: transactionForm.currency,
        p_category: transactionForm.category,
        p_subcategory: transactionForm.subcategory || null,
        p_description: transactionForm.description || null,
        p_transaction_date: transactionForm.transactionDate,
        p_timezone: 'Asia/Hong_Kong'
      })

      if (error) throw error

      setTransactionForm({
        fromAccountId: '',
        toAccountId: '',
        amount: '',
        currency: 'HKD',
        category: '',
        subcategory: '',
        description: '',
        transactionDate: new Date().toISOString().split('T')[0],
        transactionTime: new Date().toLocaleTimeString('en-HK', { 
          hour12: false, 
          timeZone: 'Asia/Hong_Kong' 
        }).slice(0, 5)
      })
      setShowTransactionForm(false)
      await Promise.all([loadAccounts(), loadTransactions()])
    } catch (error: any) {
      setError(error.message || '記錄交易失敗')
    } finally {
      setLoading(false)
    }
  }

  const getTotalBalance = () => {
    return accounts
      .filter(acc => acc.account_type_type === 'asset')
      .reduce((total, acc) => total + acc.balance, 0)
  }

  const getTotalIncome = () => {
    return transactions
      .filter(txn => {
        const toAccount = accounts.find(acc => acc.name === txn.to_account_name)
        return toAccount?.account_type_type === 'asset'
      })
      .reduce((total, txn) => total + txn.amount, 0)
  }

  const getTotalExpense = () => {
    return transactions
      .filter(txn => {
        const fromAccount = accounts.find(acc => acc.name === txn.from_account_name)
        return fromAccount?.account_type_type === 'asset'
      })
      .reduce((total, txn) => total + txn.amount, 0)
  }

  if (loading && accounts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    )
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
              <h1 className="text-2xl font-bold text-gray-900">個人記帳</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user?.displayName}</span>
              <button onClick={logout} className="text-red-600 hover:text-red-700 text-sm">
                登出
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* 錯誤訊息 */}
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

        {/* 標籤切換 */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8" aria-label="Tabs">
            {[
              { key: 'overview', label: '總覽', icon: '📊' },
              { key: 'transactions', label: '交易記錄', icon: '💳' },
              { key: 'accounts', label: '帳戶管理', icon: '🏦' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* 總覽頁面 */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 統計卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 font-semibold">💰</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">總資產</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        HK${getTotalBalance().toLocaleString('zh-HK', { minimumFractionDigits: 2 })}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">📈</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">本月收入</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        HK${getTotalIncome().toLocaleString('zh-HK', { minimumFractionDigits: 2 })}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-red-600 font-semibold">📉</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">本月支出</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        HK${getTotalExpense().toLocaleString('zh-HK', { minimumFractionDigits: 2 })}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* 快速操作 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">快速操作</h3>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => setShowTransactionForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  + 新增交易
                </button>
                <button
                  onClick={() => setShowAccountForm(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                >
                  + 新增帳戶
                </button>
              </div>
            </div>

            {/* 最近交易 */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">最近交易</h3>
              </div>
              <div className="px-6 py-4">
                {transactions.slice(0, 5).length > 0 ? (
                  <div className="space-y-4">
                    {transactions.slice(0, 5).map(transaction => (
                      <div key={transaction.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{transaction.category}</p>
                          <p className="text-xs text-gray-500">
                            {transaction.transaction_date} {transaction.transaction_time}
                            {transaction.description && ` • ${transaction.description}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {transaction.currency} ${transaction.amount.toLocaleString('zh-HK', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-gray-500">
                            {transaction.from_account_name && `從 ${transaction.from_account_name}`}
                            {transaction.to_account_name && ` 到 ${transaction.to_account_name}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">尚無交易記錄</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 交易記錄頁面 */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            {/* 交易搜尋與篩選 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">交易記錄</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    類別
                  </label>
                  <input
                    type="text"
                    value={''}
                    onChange={() => {}}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="搜尋類別"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    日期範圍
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={''}
                      onChange={() => {}}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="date"
                      value={''}
                      onChange={() => {}}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                  搜尋
                </button>
              </div>
            </div>

            {/* 交易記錄列表 */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">交易記錄</h3>
              </div>
              <div className="px-6 py-4">
                {transactions.length > 0 ? (
                  <div className="space-y-4">
                    {transactions.map(transaction => (
                      <div key={transaction.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{transaction.category}</p>
                          <p className="text-xs text-gray-500">
                            {transaction.transaction_date} {transaction.transaction_time}
                            {transaction.description && ` • ${transaction.description}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {transaction.currency} ${transaction.amount.toLocaleString('zh-HK', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-gray-500">
                            {transaction.from_account_name && `從 ${transaction.from_account_name}`}
                            {transaction.to_account_name && ` 到 ${transaction.to_account_name}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">尚無交易記錄</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 帳戶管理頁面 */}
        {activeTab === 'accounts' && (
          <div className="space-y-6">
            {/* 帳戶搜尋與篩選 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">帳戶管理</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    帳戶名稱
                  </label>
                  <input
                    type="text"
                    value={''}
                    onChange={() => {}}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="搜尋帳戶名稱"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    貨幣
                  </label>
                  <select
                    value={''}
                    onChange={() => {}}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">所有貨幣</option>
                    <option value="HKD">HKD</option>
                    <option value="USD">USD</option>
                    <option value="CNY">CNY</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                  搜尋
                </button>
              </div>
            </div>

            {/* 帳戶列表 */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">帳戶列表</h3>
              </div>
              <div className="px-6 py-4">
                {accounts.length > 0 ? (
                  <div className="space-y-4">
                    {accounts.map(account => (
                      <div key={account.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{account.name}</p>
                          <p className="text-xs text-gray-500">
                            {account.account_type_name} • {account.currency} ${account.balance.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <Link to={`/accounts/${account.id}`} className="text-blue-600 hover:text-blue-700 text-sm">
                            查看明細
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">尚無帳戶資料</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 新增交易表單模態框 */}
      {showTransactionForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">新增交易</h3>
              <form onSubmit={handleCreateTransaction} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">從帳戶</label>
                    <select
                      value={transactionForm.fromAccountId}
                      onChange={(e) => setTransactionForm(prev => ({ ...prev, fromAccountId: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">選擇帳戶</option>
                      {accounts.map(account => (
                        <option key={account.id} value={account.id}>
                          {account.name} ({account.currency} ${account.balance.toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">到帳戶</label>
                    <select
                      value={transactionForm.toAccountId}
                      onChange={(e) => setTransactionForm(prev => ({ ...prev, toAccountId: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">選擇帳戶</option>
                      {accounts.map(account => (
                        <option key={account.id} value={account.id}>
                          {account.name} ({account.currency} ${account.balance.toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">金額 *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={transactionForm.amount}
                      onChange={(e) => setTransactionForm(prev => ({ ...prev, amount: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">貨幣</label>
                    <select
                      value={transactionForm.currency}
                      onChange={(e) => setTransactionForm(prev => ({ ...prev, currency: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="HKD">HKD</option>
                      <option value="USD">USD</option>
                      <option value="CNY">CNY</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">類別 *</label>
                  <input
                    type="text"
                    required
                    value={transactionForm.category}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, category: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="例如：餐飲、交通、薪資"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">子類別</label>
                  <input
                    type="text"
                    value={transactionForm.subcategory}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, subcategory: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="例如：早餐、地鐵"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">描述</label>
                  <input
                    type="text"
                    value={transactionForm.description}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, description: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="交易描述"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">日期</label>
                    <input
                      type="date"
                      value={transactionForm.transactionDate}
                      onChange={(e) => setTransactionForm(prev => ({ ...prev, transactionDate: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">時間 (HKT)</label>
                    <input
                      type="time"
                      value={transactionForm.transactionTime}
                      onChange={(e) => setTransactionForm(prev => ({ ...prev, transactionTime: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {loading ? '處理中...' : '新增交易'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTransactionForm(false)}
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

      {/* 新增帳戶表單模態框 */}
      {showAccountForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">新增帳戶</h3>
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">帳戶名稱 *</label>
                  <input
                    type="text"
                    required
                    value={accountForm.name}
                    onChange={(e) => setAccountForm(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="例如：招商銀行、現金"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">帳戶類型 *</label>
                  <select
                    required
                    value={accountForm.accountTypeName}
                    onChange={(e) => setAccountForm(prev => ({ ...prev, accountTypeName: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">選擇帳戶類型</option>
                    {accountTypes.map(type => (
                      <option key={type.id} value={type.name}>
                        {type.name} ({type.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">貨幣</label>
                    <select
                      value={accountForm.currency}
                      onChange={(e) => setAccountForm(prev => ({ ...prev, currency: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="HKD">HKD</option>
                      <option value="USD">USD</option>
                      <option value="CNY">CNY</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">初始餘額</label>
                    <input
                      type="number"
                      step="0.01"
                      value={accountForm.initialBalance}
                      onChange={(e) => setAccountForm(prev => ({ ...prev, initialBalance: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {loading ? '處理中...' : '新增帳戶'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAccountForm(false)}
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