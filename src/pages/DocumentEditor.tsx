import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { Document } from '../lib/supabase'

export default function DocumentEditor() {
  const { user, logout } = useAuth()
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: [] as string[],
    newTag: ''
  })

  useEffect(() => {
    loadDocuments()
  }, [])

  useEffect(() => {
    // 自動儲存功能
    const autoSaveInterval = setInterval(() => {
      if (isEditing && selectedDocument && formData.title.trim()) {
        handleAutoSave()
      }
    }, 30000) // 每30秒自動儲存

    return () => clearInterval(autoSaveInterval)
  }, [isEditing, selectedDocument, formData])

  const loadDocuments = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
      
      if (error) throw error
      setDocuments(data || [])
    } catch (error) {
      console.error('載入文件失敗:', error)
    }
  }

  const handleAutoSave = async () => {
    if (!selectedDocument || !user) return
    
    try {
      const { error } = await supabase
        .from('documents')
        .update({
          title: formData.title,
          content: formData.content,
          tags: formData.tags,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedDocument.id)

      if (error) throw error
      
      // 更新本地狀態
      setDocuments(docs => docs.map(doc => 
        doc.id === selectedDocument.id 
          ? { ...doc, title: formData.title, content: formData.content, tags: formData.tags, updated_at: new Date().toISOString() }
          : doc
      ))
      
      setSelectedDocument(prev => prev ? {
        ...prev, 
        title: formData.title, 
        content: formData.content, 
        tags: formData.tags,
        updated_at: new Date().toISOString()
      } : null)
    } catch (error) {
      console.error('自動儲存失敗:', error)
    }
  }

  const handleSave = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      if (selectedDocument) {
        // 更新現有文件
        const { error } = await supabase
          .from('documents')
          .update({
            title: formData.title,
            content: formData.content,
            tags: formData.tags,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedDocument.id)

        if (error) throw error
      } else {
        // 建立新文件
        const { data, error } = await supabase
          .from('documents')
          .insert([{
            user_id: user.id,
            title: formData.title,
            content: formData.content,
            tags: formData.tags,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()

        if (error) throw error
        if (data && data[0]) {
          setSelectedDocument(data[0])
        }
      }

      await loadDocuments()
      setIsEditing(false)
      alert('文件已儲存')
    } catch (error: any) {
      alert('儲存失敗: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleNewDocument = () => {
    setSelectedDocument(null)
    setFormData({
      title: '新文件',
      content: '',
      tags: [],
      newTag: ''
    })
    setIsEditing(true)
  }

  const handleSelectDocument = (doc: Document) => {
    setSelectedDocument(doc)
    setFormData({
      title: doc.title,
      content: doc.content || '',
      tags: doc.tags || [],
      newTag: ''
    })
    setIsEditing(false)
  }

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('確定要刪除此文件嗎？')) return
    
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', docId)

      if (error) throw error
      
      setDocuments(docs => docs.filter(doc => doc.id !== docId))
      if (selectedDocument?.id === docId) {
        setSelectedDocument(null)
        setFormData({ title: '', content: '', tags: [], newTag: '' })
        setIsEditing(false)
      }
    } catch (error: any) {
      alert('刪除失敗: ' + error.message)
    }
  }

  const handleAddTag = () => {
    if (formData.newTag.trim() && !formData.tags.includes(formData.newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, formData.newTag.trim()],
        newTag: ''
      })
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    })
  }

  const insertAtCursor = (text: string) => {
    const textarea = document.getElementById('content-editor') as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const before = formData.content.substring(0, start)
      const after = formData.content.substring(end)
      const newContent = before + text + after
      
      setFormData({ ...formData, content: newContent })
      
      // 設定游標位置
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + text.length, start + text.length)
      }, 0)
    }
  }

  const formatText = (format: string) => {
    const textarea = document.getElementById('content-editor') as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const selectedText = formData.content.substring(start, end)
      
      let replacement = ''
      switch (format) {
        case 'bold':
          replacement = `**${selectedText}**`
          break
        case 'italic':
          replacement = `*${selectedText}*`
          break
        case 'link':
          const url = prompt('請輸入連結網址:')
          if (url) {
            replacement = selectedText ? `[${selectedText}](${url})` : `[連結文字](${url})`
          } else {
            return
          }
          break
        case 'heading':
          replacement = `# ${selectedText}`
          break
        case 'list':
          replacement = `- ${selectedText}`
          break
      }
      
      const before = formData.content.substring(0, start)
      const after = formData.content.substring(end)
      const newContent = before + replacement + after
      
      setFormData({ ...formData, content: newContent })
      
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + replacement.length, start + replacement.length)
      }, 0)
    }
  }

  const filteredDocuments = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  )

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
              <h1 className="text-2xl font-bold text-gray-900">文件連結編輯器</h1>
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
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* 文件列表 */}
            <div className="lg:col-span-1">
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-3 border-b border-gray-200">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-medium text-gray-900">文件列表</h3>
                    <button
                      onClick={handleNewDocument}
                      className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700"
                    >
                      + 新建
                    </button>
                  </div>
                  
                  {/* 搜尋框 */}
                  <input
                    type="text"
                    placeholder="搜尋文件..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                  {filteredDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                        selectedDocument?.id === doc.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                      onClick={() => handleSelectDocument(doc)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {doc.title}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(doc.updated_at).toLocaleDateString('zh-TW')}
                          </p>
                          {doc.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {doc.tags.slice(0, 2).map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-block bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                              {doc.tags.length > 2 && (
                                <span className="text-xs text-gray-500">
                                  +{doc.tags.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteDocument(doc.id)
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
              {selectedDocument || isEditing ? (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        {isEditing ? (
                          <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                            className="text-lg font-medium text-gray-900 bg-transparent border-none outline-none w-full"
                            placeholder="輸入文件標題..."
                          />
                        ) : (
                          <h3 className="text-lg font-medium text-gray-900">{selectedDocument?.title}</h3>
                        )}
                      </div>
                      <div className="flex space-x-2">
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
                                if (selectedDocument) {
                                  setFormData({
                                    title: selectedDocument.title,
                                    content: selectedDocument.content || '',
                                    tags: selectedDocument.tags || [],
                                    newTag: ''
                                  })
                                }
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
                            編輯
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
                          onClick={() => formatText('link')}
                          className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-100"
                          title="連結"
                        >
                          🔗
                        </button>
                        <button
                          onClick={() => formatText('list')}
                          className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-100"
                          title="清單"
                        >
                          • List
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="p-6">
                    {/* 標籤管理 */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        標籤
                      </label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {formData.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full"
                          >
                            {tag}
                            {isEditing && (
                              <button
                                onClick={() => handleRemoveTag(tag)}
                                className="ml-2 text-blue-600 hover:text-blue-800"
                              >
                                ×
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                      {isEditing && (
                        <div className="flex">
                          <input
                            type="text"
                            value={formData.newTag}
                            onChange={(e) => setFormData({...formData, newTag: e.target.value})}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                            placeholder="新增標籤..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                          <button
                            onClick={handleAddTag}
                            className="bg-blue-600 text-white px-4 py-2 rounded-r-md text-sm hover:bg-blue-700"
                          >
                            加入
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 內容編輯區 */}
                    {isEditing ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          內容
                        </label>
                        <textarea
                          id="content-editor"
                          value={formData.content}
                          onChange={(e) => setFormData({...formData, content: e.target.value})}
                          rows={20}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="輸入文件內容，支援 Markdown 格式..."
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          支援 Markdown 格式。自動儲存已啟用。
                        </p>
                      </div>
                    ) : (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">內容預覽</h4>
                        <div className="prose max-w-none bg-gray-50 p-4 rounded-md min-h-96">
                          {selectedDocument?.content ? (
                            <pre className="whitespace-pre-wrap text-sm text-gray-900">
                              {selectedDocument.content}
                            </pre>
                          ) : (
                            <p className="text-gray-500">此文件暫無內容</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* 空狀態 */
                <div className="bg-white shadow rounded-lg">
                  <div className="p-12 text-center">
                    <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                      📝
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      選擇文件開始編輯
                    </h3>
                    <p className="text-gray-500 mb-4">
                      從左側選擇一個文件，或建立新文件開始編輯。
                    </p>
                    <button
                      onClick={handleNewDocument}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    >
                      建立新文件
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}