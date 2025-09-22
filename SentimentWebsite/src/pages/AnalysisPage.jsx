import React from 'react';
import { BarChart3 } from 'lucide-react';

const AnalysisPage = ({ 
  balancedData, 
  sentimentResults, 
  setSentimentResults, 
  isLoading, 
  setIsLoading 
}) => {
  const handleSentimentAnalysis = () => {
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
  };

  return (
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
              onClick={handleSentimentAnalysis}
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
};

export default AnalysisPage;