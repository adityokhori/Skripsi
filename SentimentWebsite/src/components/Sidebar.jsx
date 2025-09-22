import React from 'react';
import { Search, FileText, BarChart3, Target, Scale, BookOpen, Youtube } from 'lucide-react';

const Sidebar = ({ activeMenu, setActiveMenu }) => {
  const menuItems = [
    { name: 'Data Collection YouTube', icon: Youtube },
    { name: 'Pre Processing Data', icon: FileText },
    { name: 'Labelling Data', icon: Target },
    { name: 'TF-IDF Vectorization', icon: FileText },
    { name: 'Data Balancing', icon: Scale },
    { name: 'Naïve Bayes Training', icon: BarChart3 },
    { name: 'Analisis Sentimen', icon: Search }
  ];

  return (
    <div className="w-64 bg-gray-800 text-white flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center">
            <Youtube className="text-white" size={16} />
          </div>
          <div>
            <span className="text-lg font-semibold">DANANTARA</span>
            <p className="text-xs text-gray-400">Sentiment Analysis</p>
          </div>
        </div>
      </div>

      {/* Menu Section */}
      <div className="flex-1 py-6">
        <div className="px-6">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">
            Research Pipeline
          </h3>
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => setActiveMenu(item.name)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeMenu === item.name
                      ? 'bg-red-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-sm">{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Research Info */}
        <div className="px-6 mt-8">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">
            Research Info
          </h3>
          <div className="text-xs text-gray-400 space-y-2">
            <p>📚 Skripsi Research</p>
            <p>🎯 Naïve Bayes Algorithm</p>
            <p>⚖️ Data Balancing</p>
            <p>📊 Sentiment Analysis</p>
          </div>
          <button className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left text-gray-300 hover:bg-gray-700 hover:text-white transition-colors mt-4">
            <BookOpen size={20} />
            <span className="text-sm">Dokumentasi</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;