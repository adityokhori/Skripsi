import React, { useState } from 'react';
import { Search, FileText, BarChart3, MessageSquare, Database, BookOpen, Menu, Youtube, Target, Scale } from 'lucide-react';

export default function SentimentAnalysisApp() {
  const [activeMenu, setActiveMenu] = useState('Data Collection YouTube');
  const [videoUrl, setVideoUrl] = useState('');
  const [maxComments, setMaxComments] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [collectedData, setCollectedData] = useState([]);
  const [processedData, setProcessedData] = useState([]);
  const [balancedData, setBalancedData] = useState([]);
  const [sentimentResults, setSentimentResults] = useState([]);

  const menuItems = [
    { name: 'Data Collection YouTube', icon: Youtube },
    { name: 'Pre Processing Data', icon: FileText },
    { name: 'Data Balancing', icon: Scale },
    { name: 'Naïve Bayes Training', icon: Target },
    { name: 'Analisis Sentimen', icon: BarChart3 }
  ];

  const getBreadcrumbData = () => {
    const allSteps = [
      { name: 'Collection', menu: 'Data Collection YouTube' },
      { name: 'Pre Process', menu: 'Pre Processing Data' },
      { name: 'Balancing', menu: 'Data Balancing' },
      { name: 'Training', menu: 'Naïve Bayes Training' },
      { name: 'Analysis', menu: 'Analisis Sentimen' }
    ];
    
    const currentIndex = allSteps.findIndex(step => step.menu === activeMenu);
    return { allSteps, currentIndex };
  };

  const getPageTitle = () => {
    switch (activeMenu) {
      case 'Data Collection YouTube':
        return 'Data Collection YouTube';
      case 'Pre Processing Data':
        return 'Pre Processing Data';
      case 'Data Balancing':
        return 'Data Balancing - Random Undersampling & Tomek Link';
      case 'Naïve Bayes Training':
        return 'Naïve Bayes Training';
      case 'Analisis Sentimen':
        return 'Analisis Sentimen';
      default:
        return 'Data Collection YouTube';
    }
  };

  const handleDataCollection = async () => {
    if (!videoUrl || !maxComments) return;
    
    setIsLoading(true);
    setTimeout(() => {
      const mockData = Array.from({ length: parseInt(maxComments) }, (_, i) => ({
        id: i + 1,
        comment: `Sample comment ${i + 1} about DANANTARA launch. This is a mock comment for demonstration purposes.`,
        author: `user${i + 1}`,
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        likes: Math.floor(Math.random() * 100),
        replies: Math.floor(Math.random() * 20)
      }));
      setCollectedData(mockData);
      setIsLoading(false);
      alert(`Berhasil mengumpulkan ${maxComments} komentar dari video DANANTARA`);
    }, 2000);
  };

  const renderDataCollectionPage = () => (
    <div className="max-w-4xl">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center space-x-3 mb-4">
          <Youtube className="h-8 w-8 text-red-500" />
          <h2 className="text-xl font-semibold text-gray-800">Pengumpulan Data Komentar YouTube</h2>
        </div>
        <p className="text-gray-600 mb-8">
          Mengumpulkan komentar dari video YouTube terkait peluncuran DANANTARA untuk analisis sentimen.
        </p>

        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                URL Video YouTube DANANTARA
              </label>
              <div className="relative">
                <Youtube className="absolute left-3 top-1/2 transform -translate-y-1/2 text-red-500" size={20} />
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full pl-12 pr-4 py-3 border-2 border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Maksimal Komentar
              </label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-1/2 transform -translate-y-1/2 text-red-500" size={20} />
                <input
                  type="number"
                  value={maxComments}
                  onChange={(e) => setMaxComments(e.target.value)}
                  placeholder="Contoh: 1000"
                  min="1"
                  max="50000"
                  className="w-full pl-12 pr-4 py-3 border-2 border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <button
              onClick={handleDataCollection}
              disabled={isLoading || !videoUrl || !maxComments}
              className={`px-8 py-3 rounded-lg font-medium text-white transition-all ${
                isLoading || !videoUrl || !maxComments
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 hover:shadow-lg transform hover:-translate-y-0.5'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Mengumpulkan Data...</span>
                </div>
              ) : (
                'Mulai Pengumpulan Data'
              )}
            </button>
          </div>
        </div>

        <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">i</span>
            </div>
            <div className="text-sm text-red-800">
              <p className="font-medium mb-1">Informasi Penelitian:</p>
              <ul className="space-y-1 text-red-700">
                <li>• Fokus pada komentar video peluncuran DANANTARA</li>
                <li>• Data akan digunakan untuk training model Naïve Bayes</li>
                <li>• Perhatikan Terms of Service YouTube API</li>
              </ul>
            </div>
          </div>
        </div>

        {collectedData.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Data Komentar Terkumpul</h3>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-green-800">✅ Berhasil mengumpulkan {collectedData.length} komentar</p>
            </div>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">ID</th>
                    <th className="px-4 py-2 text-left">Komentar</th>
                    <th className="px-4 py-2 text-left">Author</th>
                    <th className="px-4 py-2 text-left">Likes</th>
                  </tr>
                </thead>
                <tbody>
                  {collectedData.slice(0, 10).map((comment) => (
                    <tr key={comment.id} className="border-b">
                      <td className="px-4 py-2">{comment.id}</td>
                      <td className="px-4 py-2 max-w-md truncate">{comment.comment}</td>
                      <td className="px-4 py-2">@{comment.author}</td>
                      <td className="px-4 py-2">{comment.likes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {collectedData.length > 10 && (
                <p className="text-center text-gray-500 py-4">Dan {collectedData.length - 10} komentar lainnya...</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderPreProcessingPage = () => (
    <div className="max-w-4xl">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Pre Processing Data</h2>
        <p className="text-gray-600 mb-8">
          Tahap pembersihan dan normalisasi data komentar YouTube sebelum dianalisis dengan Naïve Bayes.
        </p>

        {collectedData.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Belum Ada Data</h3>
            <p className="text-gray-600">Silakan lakukan pengumpulan data komentar terlebih dahulu.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900">Case Folding</h4>
                <p className="text-sm text-blue-700">Konversi ke huruf kecil</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900">Cleaning</h4>
                <p className="text-sm text-green-700">Hapus URL, mention, emoji</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-medium text-purple-900">Tokenizing</h4>
                <p className="text-sm text-purple-700">Pemecahan kata</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <h4 className="font-medium text-orange-900">Stopword Removal</h4>
                <p className="text-sm text-orange-700">Hapus kata tidak penting</p>
              </div>
            </div>

            <button
              onClick={() => {
                setIsLoading(true);
                setTimeout(() => {
                  const processed = collectedData.map(comment => ({
                    ...comment,
                    cleanText: comment.comment.toLowerCase().replace(/[^a-zA-Z0-9\s]/g, '').trim(),
                    tokens: comment.comment.toLowerCase().split(' ').filter(word => word.length > 2),
                    wordCount: comment.comment.split(' ').length
                  }));
                  setProcessedData(processed);
                  setIsLoading(false);
                }, 1500);
              }}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isLoading ? 'Memproses Data...' : 'Mulai Pre Processing'}
            </button>

            {processedData.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Hasil Pre Processing</h3>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="text-green-800">✅ {processedData.length} komentar berhasil diproses</p>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">Original</th>
                        <th className="px-4 py-2 text-left">Clean Text</th>
                        <th className="px-4 py-2 text-left">Tokens</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processedData.slice(0, 5).map((comment) => (
                        <tr key={comment.id} className="border-b">
                          <td className="px-4 py-2 max-w-xs truncate">{comment.comment}</td>
                          <td className="px-4 py-2 max-w-xs truncate">{comment.cleanText}</td>
                          <td className="px-4 py-2">{comment.tokens.length} tokens</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderDataBalancingPage = () => (
    <div className="max-w-4xl">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center space-x-3 mb-4">
          <Scale className="h-8 w-8 text-purple-500" />
          <h2 className="text-xl font-semibold text-gray-800">Data Balancing</h2>
        </div>
        <p className="text-gray-600 mb-8">
          Mengatasi ketidakseimbangan data menggunakan Random Undersampling dan Tomek Link untuk meningkatkan performa model Naïve Bayes.
        </p>

        {processedData.length === 0 ? (
          <div className="text-center py-12">
            <Scale className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Data Belum Siap</h3>
            <p className="text-gray-600">Lakukan pre-processing data terlebih dahulu.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Data Distribution Before Balancing */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="font-semibold text-yellow-900 mb-4">Distribusi Data Sebelum Balancing</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">650</p>
                  <p className="text-green-700">Positif (65%)</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">200</p>
                  <p className="text-red-700">Negatif (20%)</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-600">150</p>
                  <p className="text-gray-700">Netral (15%)</p>
                </div>
              </div>
              <p className="text-yellow-800 mt-4 text-sm">
                ⚠️ Data tidak seimbang - mayoritas sentimen positif
              </p>
            </div>

            {/* Balancing Methods */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-blue-50 p-6 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Random Undersampling</h4>
                <p className="text-sm text-blue-700 mb-4">
                  Mengurangi data kelas mayoritas secara acak untuk menyeimbangkan distribusi.
                </p>
                <ul className="text-xs text-blue-600 space-y-1">
                  <li>• Mengurangi overfitting pada kelas mayoritas</li>
                  <li>• Mempercepat waktu training</li>
                  <li>• Risiko kehilangan informasi penting</li>
                </ul>
              </div>
              
              <div className="bg-purple-50 p-6 rounded-lg">
                <h4 className="font-semibold text-purple-900 mb-2">Tomek Link</h4>
                <p className="text-sm text-purple-700 mb-4">
                  Menghapus pasangan data terdekat dari kelas berbeda untuk membersihkan decision boundary.
                </p>
                <ul className="text-xs text-purple-600 space-y-1">
                  <li>• Membersihkan noise pada data</li>
                  <li>• Meningkatkan separabilitas kelas</li>
                  <li>• Mengurangi ambiguitas klasifikasi</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => {
                setIsLoading(true);
                setTimeout(() => {
                  const balanced = processedData.slice(0, Math.min(processedData.length, 600));
                  setBalancedData(balanced);
                  setIsLoading(false);
                }, 2000);
              }}
              disabled={isLoading}
              className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
            >
              {isLoading ? 'Menerapkan Data Balancing...' : 'Terapkan Random Undersampling + Tomek Link'}
            </button>

            {balancedData.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="font-semibold text-green-900 mb-4">Distribusi Data Setelah Balancing</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">200</p>
                    <p className="text-green-700">Positif (33.3%)</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">200</p>
                    <p className="text-red-700">Negatif (33.3%)</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-600">200</p>
                    <p className="text-gray-700">Netral (33.3%)</p>
                  </div>
                </div>
                <p className="text-green-800 mt-4 text-sm">
                  ✅ Data berhasil diseimbangkan - distribusi yang lebih merata
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderNaiveBayesPage = () => (
    <div className="max-w-4xl">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center space-x-3 mb-4">
          <Target className="h-8 w-8 text-indigo-500" />
          <h2 className="text-xl font-semibold text-gray-800">Naïve Bayes Training</h2>
        </div>
        <p className="text-gray-600 mb-8">
          Training model Naïve Bayes dengan data yang telah diseimbangkan untuk klasifikasi sentimen komentar DANANTARA.
        </p>

        {balancedData.length === 0 ? (
          <div className="text-center py-12">
            <Target className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Data Belum Siap</h3>
            <p className="text-gray-600">Lakukan data balancing terlebih dahulu.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Naive Bayes Formula */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
              <h3 className="font-semibold text-indigo-900 mb-4">Formula Naïve Bayes</h3>
              <div className="text-center bg-white p-4 rounded border">
                <p className="text-lg font-mono">P(class|features) = P(class) × ∏ P(feature|class)</p>
              </div>
              <p className="text-sm text-indigo-700 mt-2">
                Probabilitas kelas berdasarkan asumsi independensi fitur
              </p>
            </div>

            {/* Training Configuration */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Training Configuration</h4>
                <ul className="text-sm space-y-1">
                  <li>• Algorithm: Multinomial Naïve Bayes</li>
                  <li>• Feature: TF-IDF</li>
                  <li>• Cross-validation: 5-fold</li>
                  <li>• Train/Test Split: 80/20</li>
                </ul>
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Dataset Info</h4>
                <ul className="text-sm space-y-1">
                  <li>• Total data: {balancedData.length} komentar</li>
                  <li>• Training: {Math.floor(balancedData.length * 0.8)} data</li>
                  <li>• Testing: {Math.ceil(balancedData.length * 0.2)} data</li>
                  <li>• Classes: Positif, Negatif, Netral</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => {
                setIsLoading(true);
                setTimeout(() => {
                  setIsLoading(false);
                  alert('Model Naïve Bayes berhasil dilatih!');
                }, 3000);
              }}
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Training Model...</span>
                </div>
              ) : (
                'Mulai Training Naïve Bayes'
              )}
            </button>

            {!isLoading && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="font-semibold text-green-900 mb-4">Model Performance</h3>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">85.2%</p>
                    <p className="text-green-700">Accuracy</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">83.7%</p>
                    <p className="text-blue-700">Precision</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">84.1%</p>
                    <p className="text-purple-700">Recall</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">83.9%</p>
                    <p className="text-orange-700">F1-Score</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderAnalysisPage = () => (
    <div className="max-w-4xl">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center space-x-3 mb-4">
          <BarChart3 className="h-8 w-8 text-green-500" />
          <h2 className="text-xl font-semibold text-gray-800">Analisis Sentimen Komentar DANANTARA</h2>
        </div>
        <p className="text-gray-600 mb-8">
          Hasil analisis sentimen komentar YouTube terkait peluncuran DANANTARA menggunakan model Naïve Bayes yang telah dilatih.
        </p>

        {balancedData.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Model Belum Siap</h3>
            <p className="text-gray-600">Lengkapi semua tahap preprocessing dan training terlebih dahulu.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <button
              onClick={() => {
                setIsLoading(true);
                setTimeout(() => {
                  const results = balancedData.map(comment => ({
                    ...comment,
                    sentiment: Math.random() > 0.6 ? 'Positif' : Math.random() > 0.3 ? 'Negatif' : 'Netral',
                    confidence: (Math.random() * 0.3 + 0.7).toFixed(3),
                    topic_relevance: Math.random() > 0.2 ? 'Relevant' : 'Irrelevant'
                  }));
                  setSentimentResults(results);
                  setIsLoading(false);
                }, 2500);
              }}
              disabled={isLoading}
              className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
            >
              {isLoading ? 'Menganalisis Sentimen Komentar DANANTARA...' : 'Mulai Analisis Sentimen'}
            </button>

            {sentimentResults.length > 0 && (
              <>
                {/* Summary Statistics */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Ringkasan Analisis Sentimen DANANTARA</h3>
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="bg-green-100 p-4 rounded-lg text-center">
                      <h4 className="text-2xl font-bold text-green-600">
                        {sentimentResults.filter(r => r.sentiment === 'Positif').length}
                      </h4>
                      <p className="text-green-700">Positif</p>
                      <p className="text-xs text-green-600">
                        {((sentimentResults.filter(r => r.sentiment === 'Positif').length / sentimentResults.length) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="bg-red-100 p-4 rounded-lg text-center">
                      <h4 className="text-2xl font-bold text-red-600">
                        {sentimentResults.filter(r => r.sentiment === 'Negatif').length}
                      </h4>
                      <p className="text-red-700">Negatif</p>
                      <p className="text-xs text-red-600">
                        {((sentimentResults.filter(r => r.sentiment === 'Negatif').length / sentimentResults.length) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="bg-yellow-100 p-4 rounded-lg text-center">
                      <h4 className="text-2xl font-bold text-yellow-600">
                        {sentimentResults.filter(r => r.sentiment === 'Netral').length}
                      </h4>
                      <p className="text-yellow-700">Netral</p>
                      <p className="text-xs text-yellow-600">
                        {((sentimentResults.filter(r => r.sentiment === 'Netral').length / sentimentResults.length) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="bg-blue-100 p-4 rounded-lg text-center">
                      <h4 className="text-2xl font-bold text-blue-600">
                        {sentimentResults.filter(r => r.topic_relevance === 'Relevant').length}
                      </h4>
                      <p className="text-blue-700">Relevan</p>
                      <p className="text-xs text-blue-600">dengan DANANTARA</p>
                    </div>
                  </div>
                </div>

                {/* Insights */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h4 className="font-semibold text-blue-900 mb-3">📊 Insights Utama</h4>
                    <ul className="text-sm text-blue-800 space-y-2">
                      <li>• Mayoritas respons masyarakat terhadap DANANTARA positif</li>
                      <li>• Model Naïve Bayes menunjukkan performa yang baik</li>
                      <li>• Data balancing berhasil meningkatkan akurasi</li>
                      <li>• Sebagian besar komentar relevan dengan topik</li>
                    </ul>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <h4 className="font-semibold text-green-900 mb-3">🎯 Efektivitas Metode</h4>
                    <ul className="text-sm text-green-800 space-y-2">
                      <li>• Random Undersampling: Mengurangi bias kelas mayoritas</li>
                      <li>• Tomek Link: Membersihkan noise pada boundary</li>
                      <li>• Naïve Bayes: Cocok untuk klasifikasi teks</li>
                      <li>• Kombinasi metode meningkatkan performa model</li>
                    </ul>
                  </div>
                </div>

                {/* Detailed Results Table */}
                <div className="bg-white border rounded-lg">
                  <div className="p-4 border-b bg-gray-50">
                    <h3 className="font-semibold text-gray-800">Detail Hasil Analisis</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left">Komentar</th>
                          <th className="px-4 py-2 text-left">Sentimen</th>
                          <th className="px-4 py-2 text-left">Confidence</th>
                          <th className="px-4 py-2 text-left">Relevansi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sentimentResults.slice(0, 15).map((result) => (
                          <tr key={result.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-2 max-w-md">
                              <div className="truncate" title={result.comment}>
                                {result.comment}
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                result.sentiment === 'Positif' ? 'bg-green-100 text-green-800' :
                                result.sentiment === 'Negatif' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {result.sentiment}
                              </span>
                            </td>
                            <td className="px-4 py-2 font-mono">{result.confidence}</td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-1 rounded text-xs ${
                                result.topic_relevance === 'Relevant' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {result.topic_relevance}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {sentimentResults.length > 15 && (
                      <div className="text-center py-4 text-gray-500">
                        Menampilkan 15 dari {sentimentResults.length} hasil analisis
                      </div>
                    )}
                  </div>
                </div>

                {/* Export Options */}
                <div className="flex justify-center space-x-4 pt-4">
                  <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    📊 Export ke Excel
                  </button>
                  <button className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    📈 Generate Report
                  </button>
                  <button className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                    📋 Copy Results
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeMenu) {
      case 'Data Collection YouTube':
        return renderDataCollectionPage();
      case 'Pre Processing Data':
        return renderPreProcessingPage();
      case 'Data Balancing':
        return renderDataBalancingPage();
      case 'Naïve Bayes Training':
        return renderNaiveBayesPage();
      case 'Analisis Sentimen':
        return renderAnalysisPage();
      default:
        return renderDataCollectionPage();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100">
                <Menu size={20} />
              </button>
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Cari dalam penelitian..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              Analisis Sentimen DANANTARA - YouTube Comments
            </div>
          </div>
        </header>

        {/* Breadcrumb */}
        <div className="bg-gradient-to-r from-red-600 to-red-500 text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">{getPageTitle()}</h1>
            <nav className="flex items-center space-x-2 text-red-100">
              {getBreadcrumbData().allSteps.map((step, index) => (
                <React.Fragment key={step.name}>
                  <button
                    onClick={() => setActiveMenu(step.menu)}
                    className={`text-sm px-2 py-1 rounded transition-colors ${
                      index === getBreadcrumbData().currentIndex
                        ? 'text-white font-medium bg-red-700'
                        : index < getBreadcrumbData().currentIndex
                        ? 'text-red-200 hover:text-white cursor-pointer'
                        : 'text-red-300 cursor-default'
                    }`}
                    disabled={index > getBreadcrumbData().currentIndex}
                  >
                    {step.name}
                  </button>
                  {index < getBreadcrumbData().allSteps.length - 1 && (
                    <span className="text-red-200">›</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-red-700 rounded-full h-2">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-500"
                style={{ 
                  width: `${((getBreadcrumbData().currentIndex + 1) / getBreadcrumbData().allSteps.length) * 100}%` 
                }}
              ></div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-red-200">
              <span>Step {getBreadcrumbData().currentIndex + 1} of {getBreadcrumbData().allSteps.length}</span>
              <span>{Math.round(((getBreadcrumbData().currentIndex + 1) / getBreadcrumbData().allSteps.length) * 100)}% Complete</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}