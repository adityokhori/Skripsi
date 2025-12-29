import { useState } from 'react';
import React from 'react';
import { Search, FileText, BarChart3, Target, Scale, BookOpen, Youtube, Scissors, ChevronRight, TestTube2 } from 'lucide-react';

const Sidebar = ({ activeMenu, setActiveMenu }) => {
  const menuItems = [
    { name: 'Data Collection YouTube', icon: Youtube, color: 'text-red-500' },
    { name: 'Pre Processing Data', icon: FileText, color: 'text-blue-500' },
    { name: 'Labelling Data', icon: Target, color: 'text-green-500' },
    { name: 'TF-IDF Vectorization', icon: FileText, color: 'text-purple-500' },
    { name: 'Training', icon: FileText, color: 'text-yellow-500' },
    { name: 'Uji Test', icon: TestTube2, color: 'text-indigo-500' },
  ];

  return (
    <aside className="w-72 bg-gradient-to-b from-gray-900 to-gray-800 text-white shadow-2xl flex flex-col">
      <div className="p-6 border-b border-gray-700">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
          Sentiment Analysis
        </h2>
        <div className="space-y-1 text-xs text-gray-400">
          <p className="flex items-center gap-2">
            <BookOpen size={14} />
            Skripsi Research
          </p>
          <p className="flex items-center gap-2">
            <BarChart3 size={14} />
            Naïve Bayes Algorithm
          </p>
          <p className="flex items-center gap-2">
            <Scale size={14} />
            Data Balancing
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeMenu === item.name;
          
          return (
            <button
              key={item.name}
              onClick={() => setActiveMenu(item.name)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                ${isActive 
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg transform scale-105' 
                  : 'hover:bg-gray-700 hover:translate-x-1'
                }
              `}
            >
              <Icon 
                size={20} 
                className={isActive ? 'text-white' : item.color} 
              />
              <span className={`flex-1 text-left text-sm font-medium ${isActive ? 'text-white' : 'text-gray-300'}`}>
                {item.name}
              </span>
              {isActive && (
                <ChevronRight size={18} className="text-white" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-700 text-xs text-gray-400 text-center">
        <p>© 2025 Sentiment Analysis</p>
        <p className="mt-1">Version 1.0.0</p>
      </div>
    </aside>
  );
};

export default Sidebar;
