import React from 'react';

const StarryShowcase: React.FC = () => {
  return (
    <div className="min-h-screen starry-bg relative overflow-hidden">
      {/* 動態星星背景 */}
      <div className="absolute inset-0">
        {Array.from({ length: 50 }, (_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-twinkle"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              opacity: Math.random() * 0.8 + 0.2,
            }}
          />
        ))}
      </div>

      {/* 主要內容 */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {/* 標題區域 */}
        <div className="text-center mb-16">
          <h1 className="text-6xl md:text-8xl font-bold gradient-text mb-6 animate-pulse">
            Tailwind v4
          </h1>
          <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto leading-relaxed">
            體驗全新的 CSS 設計系統，結合現代化的開發體驗與無限的創造可能
          </p>
        </div>

        {/* 功能展示卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full mb-16">
          {/* 卡片 1 - 新的 @theme 語法 */}
          <div className="glass-effect rounded-2xl p-8 hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25 group">
            <div className="text-4xl mb-4 group-hover:animate-shake">🎨</div>
            <h3 className="text-2xl font-bold text-white mb-3">@theme 語法</h3>
            <p className="text-white/70 leading-relaxed">
              使用全新的 @theme 指令直接在 CSS 中定義設計系統，告別複雜的配置文件
            </p>
          </div>

          {/* 卡片 2 - CSS 優先 */}
          <div className="glass-effect rounded-2xl p-8 hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25 group">
            <div className="text-4xl mb-4 group-hover:animate-shake">⚡</div>
            <h3 className="text-2xl font-bold text-white mb-3">CSS 優先</h3>
            <p className="text-white/70 leading-relaxed">
              回歸 CSS 本質，更直觀的開發體驗，更好的工具鏈整合
            </p>
          </div>

          {/* 卡片 3 - 更好的性能 */}
          <div className="glass-effect rounded-2xl p-8 hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-pink-500/25 group">
            <div className="text-4xl mb-4 group-hover:animate-shake">🚀</div>
            <h3 className="text-2xl font-bold text-white mb-3">更好的性能</h3>
            <p className="text-white/70 leading-relaxed">
              零配置啟動，更快的構建速度，更小的產出檔案
            </p>
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button className="px-8 py-4 glass-effect rounded-full text-white font-semibold hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/50 group">
            <span className="gradient-text">開始探索</span>
          </button>
          <button className="px-8 py-4 border-2 border-white/30 text-white font-semibold rounded-full hover:bg-white/10 hover:border-white/50 transition-all duration-300 hover:scale-105">
            查看文檔
          </button>
        </div>
      </div>

      {/* 裝飾性浮動元素 */}
      <div className="absolute top-1/4 left-10 w-20 h-20 border border-white/20 rounded-full animate-spin-slow"></div>
      <div className="absolute bottom-1/4 right-10 w-16 h-16 border border-white/20 rounded-full animate-spin-slow" style={{animationDelay: '1s'}}></div>
      
      {/* 底部漸層遮罩 */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/50 to-transparent"></div>
    </div>
  );
};

export default StarryShowcase;