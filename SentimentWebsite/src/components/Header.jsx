import React from 'react';
import { Search, Menu } from 'lucide-react';

const Header = () => {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100">
            <Menu size={20} />
          </button>
          <div className="flex-1 max-w-md">
            {/* <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Cari dalam penelitian..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div> */}
          </div>
        </div>
        <div className="text-sm text-gray-600">
          Analisis Sentimen DANANTARA - YouTube Comments
        </div>
      </div>
    </header>
  );
};

export default Header;