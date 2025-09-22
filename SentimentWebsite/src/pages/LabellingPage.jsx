import React, { useState } from 'react';
import { Target, ThumbsUp, ThumbsDown, Minus, CheckCircle, AlertCircle } from 'lucide-react';

const LabellingPage = ({ 
  processedData, 
  labelledData, 
  setLabelledData, 
  isLoading, 
  setIsLoading 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [manualLabels, setManualLabels] = useState({});

  const handleAutoLabelling = () => {
    setIsLoading(true);
    setTimeout(() => {
      // Simulasi auto labelling berdasarkan keyword
      const autoLabelled = processedData.map(comment => {
        const text = comment.cleanText.toLowerCase();
        let sentiment = 'Netral';
        
        // Positive keywords untuk DANANTARA
        const positiveKeywords = ['bagus', 'keren', 'mantap', 'hebat', 'canggih', 'luar biasa', 'wow', 'amazing', 'good', 'great'];
        const negativeKeywords = ['buruk', 'jelek', 'mengecewakan', 'gagal', 'payah', 'bad', 'awful', 'terrible', 'disappointing'];
        
        const positiveScore = positiveKeywords.filter(word => text.includes(word)).length;
        const negativeScore = negativeKeywords.filter(word => text.includes(word)).length;
        
        if (positiveScore > negativeScore) {
          sentiment = 'Positif';
        } else if (negativeScore > positiveScore) {
          sentiment = 'Negatif';
        }
        
        return {
          ...comment,
          sentiment,
          confidence: Math.random() > 0.3 ? 'High' : 'Medium',
          labelMethod: 'Auto'
        };
      });
      
      setLabelledData(autoLabelled);
      setIsLoading(false);
    }, 2000);
  };

  const handleManualLabel = (commentId, sentiment) => {
    setManualLabels({
      ...manualLabels,
      [commentId]: sentiment
    });
  };

  const saveManualLabels = () => {
    const updatedData = labelledData.map(comment => {
      if (manualLabels[comment.id]) {
        return {
          ...comment,
          sentiment: manualLabels[comment.id],
          confidence: 'High',
          labelMethod: 'Manual'
        };
      }
      return comment;
    });
    setLabelledData(updatedData);
    setManualLabels({});
    alert('Manual labels berhasil disimpan!');
  };

  const getSentimentStats = () => {
    if (labelledData.length === 0) return { positif: 0, negatif: 0, netral: 0 };
    
    const stats = labelledData.reduce((acc, item) => {
      acc[item.sentiment.toLowerCase()]++;
      return acc;
    }, { positif: 0, negatif: 0, netral: 0 });
    
    return stats;
  };

  const stats = getSentimentStats();

  return (
    <div className="max-w-6xl">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center space-x-3 mb-4">
          <Target className="h-8 w-8 text-orange-500" />
          <h2 className="text-xl font-semibold text-gray-800">Labelling Data - Manual Annotation</h2>
        </div>
        <p className="text-gray-600 mb-8">
          Proses pelabelan data komentar dengan sentimen (Positif, Negatif, Netral) sebagai ground truth untuk training model Naïve Bayes.
        </p>

        {processedData.length === 0 ? (
          <div className="text-center py-12">
            <Target className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Data Belum Siap</h3>
            <p className="text-gray-600">Lakukan pre-processing data terlebih dahulu.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Labelling Options */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-3">🤖 Auto Labelling</h3>
                <p className="text-sm text-blue-700 mb-4">
                  Labelling otomatis berdasarkan keyword dan lexicon-based approach sebagai starting point.
                </p>
                <ul className="text-xs text-blue-600 space-y-1 mb-4">
                  <li>• Menggunakan positive/negative keywords</li>
                  <li>• Lexicon-based sentiment analysis</li>
                  <li>• Baseline untuk manual review</li>
                </ul>
                <button
                  onClick={handleAutoLabelling}
                  disabled={isLoading || labelledData.length > 0}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {isLoading ? 'Processing...' : 'Mulai Auto Labelling'}
                </button>
              </div>

              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-3">👤 Manual Labelling</h3>
                <p className="text-sm text-green-700 mb-4">
                  Review dan koreksi hasil auto labelling untuk memastikan akurasi ground truth data.
                </p>
                <ul className="text-xs text-green-600 space-y-1 mb-4">
                  <li>• Human annotation untuk akurasi tinggi</li>
                  <li>• Review dan koreksi auto labels</li>
                  <li>• Quality assurance untuk training data</li>
                </ul>
                <button
                  onClick={() => document.getElementById('manual-section').scrollIntoView()}
                  disabled={labelledData.length === 0}
                  className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                >
                  Review Manual Labels
                </button>
              </div>
            </div>

            {/* Statistics */}
            {labelledData.length > 0 && (
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-4">📊 Distribusi Label Sentimen</h3>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-800">{labelledData.length}</p>
                    <p className="text-gray-600">Total Data</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{stats.positif}</p>
                    <p className="text-green-700">Positif</p>
                    <p className="text-xs text-green-600">
                      {labelledData.length > 0 ? ((stats.positif / labelledData.length) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{stats.negatif}</p>
                    <p className="text-red-700">Negatif</p>
                    <p className="text-xs text-red-600">
                      {labelledData.length > 0 ? ((stats.negatif / labelledData.length) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-600">{stats.netral}</p>
                    <p className="text-yellow-700">Netral</p>
                    <p className="text-xs text-yellow-600">
                      {labelledData.length > 0 ? ((stats.netral / labelledData.length) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Manual Review Section */}
            {labelledData.length > 0 && (
              <div id="manual-section" className="bg-white border rounded-lg">
                <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">Manual Review & Correction</h3>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600">
                      {Object.keys(manualLabels).length} perubahan tertunda
                    </span>
                    {Object.keys(manualLabels).length > 0 && (
                      <button
                        onClick={saveManualLabels}
                        className="px-4 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                      >
                        Simpan Perubahan
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left">Komentar</th>
                        <th className="px-4 py-2 text-left">Auto Label</th>
                        <th className="px-4 py-2 text-left">Confidence</th>
                        <th className="px-4 py-2 text-left">Manual Review</th>
                        <th className="px-4 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {labelledData.slice(0, 20).map((comment) => (
                        <tr key={comment.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 max-w-md">
                            <div className="truncate" title={comment.comment}>
                              {comment.comment}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              comment.sentiment === 'Positif' ? 'bg-green-100 text-green-800' :
                              comment.sentiment === 'Negatif' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {comment.sentiment}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              comment.confidence === 'High' ? 'bg-green-50 text-green-700' :
                              comment.confidence === 'Medium' ? 'bg-yellow-50 text-yellow-700' :
                              'bg-red-50 text-red-700'
                            }`}>
                              {comment.confidence}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex space-x-1">
                              <button
                                onClick={() => handleManualLabel(comment.id, 'Positif')}
                                className={`p-1 rounded ${
                                  manualLabels[comment.id] === 'Positif' 
                                    ? 'bg-green-500 text-white' 
                                    : 'bg-green-100 text-green-600 hover:bg-green-200'
                                }`}
                                title="Positif"
                              >
                                <ThumbsUp size={14} />
                              </button>
                              <button
                                onClick={() => handleManualLabel(comment.id, 'Netral')}
                                className={`p-1 rounded ${
                                  manualLabels[comment.id] === 'Netral' 
                                    ? 'bg-yellow-500 text-white' 
                                    : 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                                }`}
                                title="Netral"
                              >
                                <Minus size={14} />
                              </button>
                              <button
                                onClick={() => handleManualLabel(comment.id, 'Negatif')}
                                className={`p-1 rounded ${
                                  manualLabels[comment.id] === 'Negatif' 
                                    ? 'bg-red-500 text-white' 
                                    : 'bg-red-100 text-red-600 hover:bg-red-200'
                                }`}
                                title="Negatif"
                              >
                                <ThumbsDown size={14} />
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {manualLabels[comment.id] ? (
                              <AlertCircle className="text-orange-500" size={16} title="Pending changes" />
                            ) : comment.labelMethod === 'Manual' ? (
                              <CheckCircle className="text-green-500" size={16} title="Manually verified" />
                            ) : (
                              <span className="text-gray-400" title="Auto labelled">Auto</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {labelledData.length > 20 && (
                    <div className="text-center py-4 text-gray-500 border-t">
                      Menampilkan 20 dari {labelledData.length} data berlabel
                      <br />
                      <span className="text-xs">Scroll untuk melihat lebih banyak atau gunakan fitur filter</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quality Guidelines */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
              <h4 className="font-semibold text-orange-900 mb-3">📋 Panduan Labelling Quality</h4>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <h5 className="font-medium text-green-800 mb-2">✅ Positif</h5>
                  <ul className="text-xs text-green-700 space-y-1">
                    <li>• Pujian terhadap DANANTARA</li>
                    <li>• Ekspresi kesenangan/kepuasan</li>
                    <li>• Dukungan dan apresiasi</li>
                    <li>• Optimisme dan harapan positif</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium text-red-800 mb-2">❌ Negatif</h5>
                  <ul className="text-xs text-red-700 space-y-1">
                    <li>• Kritik dan keluhan</li>
                    <li>• Ekspresi kekecewaan</li>
                    <li>• Skeptisisme dan keraguan</li>
                    <li>• Penolakan atau oposisi</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium text-yellow-800 mb-2">➖ Netral</h5>
                  <ul className="text-xs text-yellow-700 space-y-1">
                    <li>• Informasi faktual</li>
                    <li>• Pertanyaan tanpa emosi</li>
                    <li>• Komentar objektif</li>
                    <li>• Tidak ada indikasi sentimen</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LabellingPage;