import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, AlertCircle, Download, RefreshCw } from 'lucide-react';

const AnalysisPage = () => {
  const [selectedApproach, setSelectedApproach] = useState('balanced');
  const [analysisSummary, setAnalysisSummary] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [modelComparison, setModelComparison] = useState(null);

  // Load analysis summary on mount
  useEffect(() => {
    loadAnalysisSummary();
    loadModelComparison();
  }, []);

  // Load predictions when approach changes
  useEffect(() => {
    loadPredictions(selectedApproach, currentPage);
  }, [selectedApproach, currentPage]);

  const loadAnalysisSummary = async () => {
    try {
      const response = await fetch('http://localhost:8000/analysis-summary');
      const data = await response.json();
      setAnalysisSummary(data);
    } catch (error) {
      console.error('Error loading analysis summary:', error);
    }
  };

  const loadModelComparison = async () => {
    try {
      const response = await fetch('http://localhost:8000/compare-models');
      const data = await response.json();
      setModelComparison(data);
    } catch (error) {
      console.error('Error loading model comparison:', error);
    }
  };

  const loadPredictions = async (approach, page) => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/predictions?approach=${approach}&page=${page}&page_size=20`);
      const data = await response.json();
      
      if (data.error) {
        setPredictions([]);
        setTotalPages(1);
      } else {
        setPredictions(data.data);
        setTotalPages(data.total_pages);
      }
    } catch (error) {
      console.error('Error loading predictions:', error);
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    loadAnalysisSummary();
    loadModelComparison();
    loadPredictions(selectedApproach, currentPage);
  };

  const getSentimentColor = (sentiment) => {
    switch(sentiment) {
      case 'Positif': return 'bg-green-100 text-green-800';
      case 'Negatif': return 'bg-red-100 text-red-800';
      case 'Netral': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCurrentSummary = () => {
    if (!analysisSummary) return null;
    return analysisSummary[selectedApproach];
  };

  const currentSummary = getCurrentSummary();

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <BarChart3 className="h-8 w-8 text-green-500" />
            <h2 className="text-2xl font-semibold text-gray-800">Analisis Sentimen DANANTARA</h2>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
        <p className="text-gray-600 mb-6">
          Hasil analisis sentimen komentar YouTube terkait peluncuran DANANTARA menggunakan Multinomial Naive Bayes.
        </p>

        {/* Approach Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pilih Model:
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => {
                setSelectedApproach('imbalanced');
                setCurrentPage(1);
              }}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedApproach === 'imbalanced'
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <h4 className="font-semibold mb-1">Imbalanced Model</h4>
              <p className="text-sm text-gray-600">Hasil dari data original</p>
            </button>
            
            <button
              onClick={() => {
                setSelectedApproach('balanced');
                setCurrentPage(1);
              }}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedApproach === 'balanced'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <h4 className="font-semibold mb-1">Balanced Model</h4>
              <p className="text-sm text-gray-600">Hasil dari data yang diseimbangkan</p>
            </button>
          </div>
        </div>

        {!currentSummary?.exists ? (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Model Belum Tersedia</h3>
            <p className="text-gray-600">
              {currentSummary?.message || 'Lakukan training Naive Bayes terlebih dahulu di halaman Naive Bayes.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Statistics */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Ringkasan Analisis Sentimen - Model {selectedApproach}</span>
              </h3>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                  <h4 className="text-3xl font-bold text-green-600">
                    {currentSummary.sentiment_distribution?.Positif || 0}
                  </h4>
                  <p className="text-green-700 font-medium">Positif</p>
                  <p className="text-xs text-green-600">
                    {currentSummary.sentiment_percentages?.Positif || 0}%
                  </p>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                  <h4 className="text-3xl font-bold text-red-600">
                    {currentSummary.sentiment_distribution?.Negatif || 0}
                  </h4>
                  <p className="text-red-700 font-medium">Negatif</p>
                  <p className="text-xs text-red-600">
                    {currentSummary.sentiment_percentages?.Negatif || 0}%
                  </p>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                  <h4 className="text-3xl font-bold text-yellow-600">
                    {currentSummary.sentiment_distribution?.Netral || 0}
                  </h4>
                  <p className="text-yellow-700 font-medium">Netral</p>
                  <p className="text-xs text-yellow-600">
                    {currentSummary.sentiment_percentages?.Netral || 0}%
                  </p>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                  <h4 className="text-3xl font-bold text-blue-600">
                    {currentSummary.accuracy}%
                  </h4>
                  <p className="text-blue-700 font-medium">Accuracy</p>
                  <p className="text-xs text-blue-600">
                    {currentSummary.correct_predictions}/{currentSummary.total_predictions} correct
                  </p>
                </div>
              </div>
            </div>

            {/* Model Comparison */}
            {modelComparison && (
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Perbandingan Model</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Imbalanced Model */}
                  {modelComparison.imbalanced && !modelComparison.imbalanced.error && (
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <h4 className="font-semibold text-red-900 mb-3">Imbalanced Model</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Accuracy:</span>
                          <span className="font-semibold">{modelComparison.imbalanced.accuracy}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Precision:</span>
                          <span className="font-semibold">{modelComparison.imbalanced.precision}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Recall:</span>
                          <span className="font-semibold">{modelComparison.imbalanced.recall}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>F1-Score:</span>
                          <span className="font-semibold">{modelComparison.imbalanced.f1_score}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Balanced Model */}
                  {modelComparison.balanced && !modelComparison.balanced.error && (
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h4 className="font-semibold text-green-900 mb-3">Balanced Model</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Accuracy:</span>
                          <span className="font-semibold">{modelComparison.balanced.accuracy}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Precision:</span>
                          <span className="font-semibold">{modelComparison.balanced.precision}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Recall:</span>
                          <span className="font-semibold">{modelComparison.balanced.recall}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>F1-Score:</span>
                          <span className="font-semibold">{modelComparison.balanced.f1_score}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Insights */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="font-semibold text-blue-900 mb-3">📊 Insights Utama</h4>
                <ul className="text-sm text-blue-800 space-y-2">
                  <li>• Total {currentSummary.total_predictions} komentar dianalisis</li>
                  <li>• Model mencapai akurasi {currentSummary.accuracy}%</li>
                  <li>• Confidence rata-rata: {currentSummary.avg_confidence}%</li>
                  <li>• {currentSummary.correct_predictions} prediksi benar, {currentSummary.incorrect_predictions} salah</li>
                </ul>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h4 className="font-semibold text-green-900 mb-3">🎯 Distribusi Sentimen</h4>
                <ul className="text-sm text-green-800 space-y-2">
                  {Object.entries(currentSummary.sentiment_percentages || {}).map(([sentiment, percentage]) => (
                    <li key={sentiment}>
                      • {sentiment}: {percentage}% ({currentSummary.sentiment_distribution[sentiment]} komentar)
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Detailed Results Table */}
            <div className="bg-white border rounded-lg">
              <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                <h3 className="font-semibold text-gray-800">Detail Hasil Prediksi</h3>
                <span className="text-sm text-gray-600">
                  Halaman {currentPage} dari {totalPages}
                </span>
              </div>
              
              {isLoading ? (
                <div className="p-12 text-center">
                  <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading predictions...</p>
                </div>
              ) : predictions.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  Tidak ada data prediksi
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left">ID</th>
                          <th className="px-4 py-3 text-left">Komentar</th>
                          <th className="px-4 py-3 text-left">Aktual</th>
                          <th className="px-4 py-3 text-left">Prediksi</th>
                          <th className="px-4 py-3 text-center">Confidence</th>
                          <th className="px-4 py-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {predictions.map((pred) => (
                          <tr key={pred.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3 font-mono text-xs">{pred.id}</td>
                            <td className="px-4 py-3 max-w-md">
                              <div className="truncate" title={pred.comment}>
                                {pred.comment || pred.finalText}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getSentimentColor(pred.actual_sentiment)}`}>
                                {pred.actual_sentiment}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getSentimentColor(pred.predicted_sentiment)}`}>
                                {pred.predicted_sentiment}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center font-mono text-xs">
                              {pred.confidence}%
                            </td>
                            <td className="px-4 py-3 text-center">
                              {pred.is_correct ? (
                                <span className="text-green-600 font-semibold">✓</span>
                              ) : (
                                <span className="text-red-600 font-semibold">✗</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="p-4 border-t flex justify-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded font-medium">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Export Options */}
            <div className="flex justify-center space-x-4 pt-4">
              <button className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Download className="h-4 w-4" />
                <span>Export ke CSV</span>
              </button>
              <button className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                <BarChart3 className="h-4 w-4" />
                <span>Generate Report</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisPage;