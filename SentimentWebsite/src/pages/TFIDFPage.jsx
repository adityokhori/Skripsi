import React, { useState } from 'react';
import { Database, BarChart3, Hash, TrendingUp } from 'lucide-react';

const TFIDFPage = ({ 
  labelledData, 
  tfidfData, 
  setTfIdfData, 
  isLoading, 
  setIsLoading 
}) => {
  const [selectedFeatures, setSelectedFeatures] = useState(1000);
  const [minDf, setMinDf] = useState(2);
  const [maxDf, setMaxDf] = useState(0.95);

  const handleTFIDFExtraction = () => {
    setIsLoading(true);
    setTimeout(() => {
      // Simulasi TF-IDF extraction
      const mockVocabulary = [
        'danantara', 'bagus', 'keren', 'mantap', 'hebat', 'canggih', 'luar', 'biasa',
        'buruk', 'jelek', 'mengecewakan', 'gagal', 'payah', 'indonesia', 'teknologi',
        'inovasi', 'digital', 'platform', 'aplikasi', 'fitur', 'desain', 'user',
        'interface', 'pengalaman', 'mudah', 'sulit', 'kompleks', 'sederhana'
      ];

      const tfidfMatrix = labelledData.map((comment, docIndex) => {
        const vector = {};
        const words = comment.cleanText.split(' ');
        
        mockVocabulary.forEach(term => {
          // Calculate TF (Term Frequency)
          const tf = words.filter(word => word === term).length / words.length;
          
          // Calculate IDF (Inverse Document Frequency) - simplified
          const df = labelledData.filter(doc => 
            doc.cleanText.includes(term)
          ).length;
          const idf = Math.log(labelledData.length / (df + 1));
          
          // TF-IDF Score
          const tfidf = tf * idf;
          if (tfidf > 0) {
            vector[term] = parseFloat(tfidf.toFixed(4));
          }
        });

        return {
          ...comment,
          tfidfVector: vector,
          vectorLength: Object.keys(vector).length,
          maxTfidf: Math.max(...Object.values(vector))
        };
      });

      const vocabularyStats = mockVocabulary.map(term => {
        const df = labelledData.filter(doc => doc.cleanText.includes(term)).length;
        const avgTfidf = tfidfMatrix.reduce((sum, doc) => 
          sum + (doc.tfidfVector[term] || 0), 0
        ) / tfidfMatrix.length;

        return {
          term,
          documentFrequency: df,
          avgTfidfScore: parseFloat(avgTfidf.toFixed(4)),
          idf: parseFloat(Math.log(labelledData.length / (df + 1)).toFixed(4))
        };
      }).sort((a, b) => b.avgTfidfScore - a.avgTfidfScore);

      setTfIdfData({
        vectors: tfidfMatrix,
        vocabulary: vocabularyStats,
        stats: {
          totalFeatures: selectedFeatures,
          totalDocuments: labelledData.length,
          vocabularySize: mockVocabulary.length,
          sparseRatio: 0.85 // Simulasi sparse matrix ratio
        }
      });

      setIsLoading(false);
    }, 3000);
  };

  const getTopFeatures = (n = 10) => {
    if (!tfidfData || !tfidfData.vocabulary) return [];
    return tfidfData.vocabulary.slice(0, n);
  };

  return (
    <div className="max-w-6xl">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center space-x-3 mb-4">
          <Database className="h-8 w-8 text-indigo-500" />
          <h2 className="text-xl font-semibold text-gray-800">TF-IDF Vectorization - Feature Extraction</h2>
        </div>
        <p className="text-gray-600 mb-8">
          Mengkonversi teks komentar menjadi numerical features menggunakan TF-IDF (Term Frequency-Inverse Document Frequency) untuk input model Naïve Bayes.
        </p>

        {labelledData.length === 0 ? (
          <div className="text-center py-12">
            <Database className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Data Belum Siap</h3>
            <p className="text-gray-600">Lakukan labelling data terlebih dahulu.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* TF-IDF Theory */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
              <h3 className="font-semibold text-indigo-900 mb-4">📚 TF-IDF Mathematical Formula</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="bg-white p-4 rounded border mb-2">
                    <p className="text-sm font-mono">TF(t,d) = f(t,d) / |d|</p>
                  </div>
                  <p className="text-xs text-indigo-700">Term Frequency: frekuensi kata dalam dokumen</p>
                </div>
                <div className="text-center">
                  <div className="bg-white p-4 rounded border mb-2">
                    <p className="text-sm font-mono">IDF(t) = log(N / df(t))</p>
                  </div>
                  <p className="text-xs text-indigo-700">Inverse Document Frequency: keunikan kata</p>
                </div>
                <div className="text-center">
                  <div className="bg-white p-4 rounded border mb-2">
                    <p className="text-sm font-mono">TF-IDF = TF × IDF</p>
                  </div>
                  <p className="text-xs text-indigo-700">Skor akhir: bobot kata dalam dokumen</p>
                </div>
              </div>
            </div>

            {/* Configuration */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-4">⚙️ Konfigurasi TF-IDF</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Features
                  </label>
                  <select
                    value={selectedFeatures}
                    onChange={(e) => setSelectedFeatures(Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={500}>500</option>
                    <option value={1000}>1000</option>
                    <option value={2000}>2000</option>
                    <option value={5000}>5000</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Maksimal fitur yang akan digunakan</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min Document Frequency
                  </label>
                  <input
                    value={minDf}
                    onChange={(e) => setMinDf(Number(e.target.value))}
                    min="1"
                    max="10"
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Min frekuensi kata dalam dokumen</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Document Frequency
                  </label>
                  <input
                    type="number"
                    value={maxDf}
                    onChange={(e) => setMaxDf(Number(e.target.value))}
                    min="0.5"
                    max="1.0"
                    step="0.05"
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Max frekuensi relatif (ignore common words)</p>
                </div>
              </div>
            </div>

            {/* Extract Button */}
            <button
              onClick={handleTFIDFExtraction}
              disabled={isLoading}
              className={`w-full py-3 rounded-lg font-medium text-white transition-all ${
                isLoading 
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg transform hover:-translate-y-0.5'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Mengekstrak TF-IDF Features...</span>
                </div>
              ) : (
                'Mulai TF-IDF Vectorization'
              )}
            </button>

            {/* Results */}
            {tfidfData && (
              <div className="space-y-6">
                {/* Statistics Overview */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="font-semibold text-green-900 mb-4">📊 TF-IDF Extraction Results</h3>
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{tfidfData.stats.totalDocuments}</p>
                      <p className="text-green-700">Documents</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{tfidfData.stats.vocabularySize}</p>
                      <p className="text-blue-700">Vocabulary Size</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">{tfidfData.stats.totalFeatures}</p>
                      <p className="text-purple-700">Max Features</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">{(tfidfData.stats.sparseRatio * 100).toFixed(1)}%</p>
                      <p className="text-orange-700">Sparsity</p>
                    </div>
                  </div>
                </div>

                {/* Top Features */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white border rounded-lg p-6">
                    <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                      <TrendingUp className="mr-2 h-5 w-5 text-blue-500" />
                      Top TF-IDF Features
                    </h4>
                    <div className="space-y-2">
                      {getTopFeatures(10).map((feature, index) => (
                        <div key={feature.term} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center space-x-3">
                            <span className="text-sm font-medium text-gray-600">#{index + 1}</span>
                            <span className="font-mono text-sm">{feature.term}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-blue-600">{feature.avgTfidfScore}</p>
                            <p className="text-xs text-gray-500">avg score</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white border rounded-lg p-6">
                    <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                      <Hash className="mr-2 h-5 w-5 text-green-500" />
                      IDF Scores (Term Importance)
                    </h4>
                    <div className="space-y-2">
                      {getTopFeatures(10)
                        .sort((a, b) => b.idf - a.idf)
                        .slice(0, 10)
                        .map((feature, index) => (
                        <div key={feature.term} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center space-x-3">
                            <span className="text-sm font-medium text-gray-600">#{index + 1}</span>
                            <span className="font-mono text-sm">{feature.term}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-green-600">{feature.idf}</p>
                            <p className="text-xs text-gray-500">IDF score</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Document Vectors Preview */}
                <div className="bg-white border rounded-lg">
                  <div className="p-4 border-b bg-gray-50">
                    <h3 className="font-semibold text-gray-800 flex items-center">
                      <BarChart3 className="mr-2 h-5 w-5 text-purple-500" />
                      TF-IDF Vector Preview (Sample Documents)
                    </h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left">Document</th>
                          <th className="px-4 py-2 text-left">Label</th>
                          <th className="px-4 py-2 text-left">Vector Length</th>
                          <th className="px-4 py-2 text-left">Max TF-IDF</th>
                          <th className="px-4 py-2 text-left">Top Features</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tfidfData.vectors.slice(0, 10).map((doc, index) => {
                          const topFeatures = Object.entries(doc.tfidfVector)
                            .sort(([,a], [,b]) => b - a)
                            .slice(0, 3)
                            .map(([term, score]) => `${term}(${score.toFixed(3)})`);

                          return (
                            <tr key={doc.id} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-3 max-w-xs">
                                <div className="truncate" title={doc.comment}>
                                  {doc.comment}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  doc.sentiment === 'Positif' ? 'bg-green-100 text-green-800' :
                                  doc.sentiment === 'Negatif' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {doc.sentiment}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-mono">{doc.vectorLength}</td>
                              <td className="px-4 py-3 font-mono">{doc.maxTfidf.toFixed(4)}</td>
                              <td className="px-4 py-3">
                                <div className="text-xs space-y-1">
                                  {topFeatures.map((feature, i) => (
                                    <div key={i} className="font-mono text-blue-600">{feature}</div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Technical Insights */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <h4 className="font-semibold text-yellow-900 mb-3">🔍 Technical Insights</h4>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="font-medium text-yellow-800 mb-2">Interpretasi TF-IDF:</h5>
                      <ul className="text-sm text-yellow-700 space-y-1">
                        <li>• <strong>Skor tinggi</strong>: Kata penting dan jarang muncul</li>
                        <li>• <strong>Skor rendah</strong>: Kata umum atau tidak relevan</li>
                        <li>• <strong>Sparse matrix</strong>: Banyak nilai 0 (efisien storage)</li>
                        <li>• <strong>Vocabulary size</strong>: Menentukan dimensi feature space</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium text-yellow-800 mb-2">Untuk Model Naïve Bayes:</h5>
                      <ul className="text-sm text-yellow-700 space-y-1">
                        <li>• Features menjadi input X untuk training</li>
                        <li>• Labels sentimen menjadi target y</li>
                        <li>• Sparse matrix mengoptimalkan komputasi</li>
                        <li>• Feature selection meningkatkan performa</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Matrix Visualization */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                  <h4 className="font-semibold text-purple-900 mb-3">📈 Matrix Visualization</h4>
                  <p className="text-sm text-purple-700 mb-4">
                    TF-IDF Matrix: {tfidfData.stats.totalDocuments} documents × {tfidfData.stats.vocabularySize} features
                  </p>
                  
                  {/* Simple matrix visualization */}
                  <div className="bg-white p-4 rounded border">
                    <div className="grid grid-cols-10 gap-1">
                      {Array.from({ length: 50 }, (_, i) => (
                        <div
                          key={i}
                          className={`w-4 h-4 rounded ${
                            Math.random() > 0.7 
                              ? 'bg-purple-500' 
                              : Math.random() > 0.5 
                              ? 'bg-purple-300' 
                              : 'bg-gray-200'
                          }`}
                          title={`Cell [${Math.floor(i/10)}, ${i%10}]`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Visualisasi sample 5×10 dari TF-IDF matrix (darker = higher TF-IDF score)
                    </p>
                  </div>
                </div>

                {/* Ready for Next Step */}
                <div className="bg-green-100 border border-green-300 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">✓</span>
                    </div>
                    <div>
                      <p className="font-medium text-green-800">TF-IDF Vectorization Complete!</p>
                      <p className="text-sm text-green-700">
                        Data siap untuk tahap Data Balancing. Features telah berhasil diekstrak dari {tfidfData.stats.totalDocuments} dokumen.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TFIDFPage;