import React, { useState } from 'react';
import { Search, FileText, BarChart3, MessageSquare, Database, BookOpen, Menu } from 'lucide-react';

// Component untuk Crawling Data Twitter
function CrawlingData() {
  const [hashtag, setHashtag] = useState('');
  const [jumlahTweet, setJumlahTweet] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!hashtag || !jumlahTweet) return;
    
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      alert(`Berhasil mengambil ${jumlahTweet} tweet dengan hashtag ${hashtag}`);
    }, 2000);
  };

  return (
    <div className="max-w-4xl">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Crawl Data</h2>
        <p className="text-gray-600 mb-8">
          Silahkan masukkan hashtag dan jumlah maksimum tweet yang akan diambil dari API twitter.
        </p>

        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Hashtag / Kata Kunci
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500" size={20} />
                <input
                  type="text"
                  value={hashtag}
                  onChange={(e) => setHashtag(e.target.value)}
                  placeholder="Contoh: #COVID-19"
                  className="w-full pl-12 pr-4 py-3 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Jumlah Tweet
              </label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500" size={20} />
                <input
                  type="number"
                  value={jumlahTweet}
                  onChange={(e) => setJumlahTweet(e.target.value)}
                  placeholder="Contoh: 100"
                  min="1"
                  max="10000"
                  className="w-full pl-12 pr-4 py-3 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <button
              onClick={handleSubmit}
              disabled={isLoading || !hashtag || !jumlahTweet}
              className={`px-8 py-3 rounded-lg font-medium text-white transition-all ${
                isLoading || !hashtag || !jumlahTweet
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg transform hover:-translate-y-0.5'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Mengambil Data...</span>
                </div>
              ) : (
                'Ambil Data'
              )}
            </button>
          </div>
        </div>

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">i</span>
            </div>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Tips untuk crawling data:</p>
              <ul className="space-y-1 text-blue-700">
                <li>• Gunakan hashtag yang spesifik untuk hasil yang lebih relevan</li>
                <li>• Jumlah tweet yang terlalu besar dapat memakan waktu lama</li>
                <li>• Pastikan koneksi internet stabil selama proses crawling</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}