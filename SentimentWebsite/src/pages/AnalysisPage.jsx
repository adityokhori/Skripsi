import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, AlertCircle, Download, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

const AnalysisPage = () => {
  const [selectedApproach, setSelectedApproach] = useState('balanced');
  const [predictions, setPredictions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const [modelComparison, setModelComparison] = useState(null);
  const [modelInfo, setModelInfo] = useState({});

  useEffect(() => {
    loadModelComparison();
    loadModelInfo();
  }, []);

  useEffect(() => {
    loadPredictions(selectedApproach);
  }, [selectedApproach]);

  const loadModelInfo = async () => {
    try {
      const responses = await Promise.all([
        fetch('http://127.0.0.1:8000/model-info?approach=imbalanced'),
        fetch('http://127.0.0.1:8000/model-info?approach=balanced')
      ]);
      
      const [imbalancedData, balancedData] = await Promise.all(
        responses.map(r => r.json())
      );
      
      setModelInfo({
        imbalanced: imbalancedData,
        balanced: balancedData
      });
    } catch (error) {
      console.error('Error loading model info:', error);
    }
  };

  const loadModelComparison = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/compare-models');
      const data = await response.json();
      setModelComparison(data);
    } catch (error) {
      console.error('Error loading model comparison:', error);
    }
  };

  const loadPredictions = async (approach) => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/predictions/${approach}`);
      const data = await response.json();
      
      if (data.error) {
        setPredictions([]);
      } else {
        setPredictions(data.predictions || []);
      }
    } catch (error) {
      console.error('Error loading predictions:', error);
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    loadModelComparison();
    loadModelInfo();
    loadPredictions(selectedApproach);
  };

  const handleExportCSV = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/export-predictions?approach=${selectedApproach}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `predictions_${selectedApproach}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Gagal export CSV');
    }
  };

  const getSentimentColor = (sentiment) => {
    switch(sentiment) {
      case 'Positif': return 'bg-green-100 text-green-800 border-green-200';
      case 'Negatif': return 'bg-red-100 text-red-800 border-red-200';
      case 'Netral': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const calculateSummary = () => {
    if (predictions.length === 0) return null;

    const sentimentDist = {
      Positif: 0,
      Negatif: 0,
      Netral: 0
    };

    let correctCount = 0;
    let totalConfidence = 0;

    predictions.forEach(pred => {
      if (pred.predicted_sentiment) {
        sentimentDist[pred.predicted_sentiment] = (sentimentDist[pred.predicted_sentiment] || 0) + 1;
      }
      if (pred.is_correct) correctCount++;
      if (pred.prediction_confidence) totalConfidence += parseFloat(pred.prediction_confidence);
    });

    const total = predictions.length;
    const accuracy = ((correctCount / total) * 100).toFixed(2);
    const avgConfidence = ((totalConfidence / total) * 100).toFixed(2);

    return {
      total,
      correctCount,
      incorrectCount: total - correctCount,
      accuracy,
      avgConfidence,
      sentimentDist,
      sentimentPercentages: {
        Positif: ((sentimentDist.Positif / total) * 100).toFixed(1),
        Negatif: ((sentimentDist.Negatif / total) * 100).toFixed(1),
        Netral: ((sentimentDist.Netral / total) * 100).toFixed(1)
      }
    };
  };

  const summary = calculateSummary();
  const currentModelInfo = modelInfo[selectedApproach];
  const modelExists = currentModelInfo?.model_exists;

  // Pagination
  const totalPages = Math.ceil(predictions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPredictions = predictions.slice(startIndex, endIndex);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <BarChart3 className="h-8 w-8 text-green-500" />
            <h2 className="text-2xl font-bold text-gray-800">Analisis Sentimen DANANTARA</h2>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
        
        <p className="text-gray-600 mb-8">
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
              <p className="text-sm text-gray-600 mb-2">Hasil dari data original</p>
              {modelInfo.imbalanced?.model_exists ? (
                <span className="text-xs text-green-600 flex items-center">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Model tersedia
                </span>
              ) : (
                <span className="text-xs text-gray-500 flex items-center">
                  <XCircle className="h-3 w-3 mr-1" />
                  Belum dilatih
                </span>
              )}
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
              <p className="text-sm text-gray-600 mb-2">Hasil dari data yang diseimbangkan</p>
              {modelInfo.balanced?.model_exists ? (
                <span className="text-xs text-green-600 flex items-center">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Model tersedia
                </span>
              ) : (
                <span className="text-xs text-gray-500 flex items-center">
                  <XCircle className="h-3 w-3 mr-1" />
                  Belum dilatih
                </span>
              )}
            </button>
          </div>
        </div>

        {!modelExists ? (
          <div className="text-center py-12 bg-yellow-50 rounded-lg border border-yellow-200">
            <AlertCircle className="mx-auto h-16 w-16 text-yellow-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Model Belum Tersedia</h3>
            <p className="text-gray-600">
              Lakukan training Naive Bayes dengan pendekatan "{selectedApproach}" terlebih dahulu di halaman Naive Bayes.
            </p>
          </div>
        ) : !summary ? (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak Ada Data Prediksi</h3>
            <p className="text-gray-600">Model sudah dilatih tapi belum ada data prediksi.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Statistics */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border-2 border-blue-200">
              <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <span>Ringkasan Analisis - Model {selectedApproach}</span>
              </h3>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm text-center border-2 border-green-200">
                  <h4 className="text-3xl font-bold text-green-600">
                    {summary.sentimentDist.Positif}
                  </h4>
                  <p className="text-green-700 font-medium">Positif</p>
                  <p className="text-xs text-green-600">
                    {summary.sentimentPercentages.Positif}%
                  </p>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow-sm text-center border-2 border-red-200">
                  <h4 className="text-3xl font-bold text-red-600">
                    {summary.sentimentDist.Negatif}
                  </h4>
                  <p className="text-red-700 font-medium">Negatif</p>
                  <p className="text-xs text-red-600">
                    {summary.sentimentPercentages.Negatif}%
                  </p>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow-sm text-center border-2 border-yellow-200">
                  <h4 className="text-3xl font-bold text-yellow-600">
                    {summary.sentimentDist.Netral}
                  </h4>
                  <p className="text-yellow-700 font-medium">Netral</p>
                  <p className="text-xs text-yellow-600">
                    {summary.sentimentPercentages.Netral}%
                  </p>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow-sm text-center border-2 border-blue-200">
                  <h4 className="text-3xl font-bold text-blue-600">
                    {summary.accuracy}%
                  </h4>
                  <p className="text-blue-700 font-medium">Accuracy</p>
                  <p className="text-xs text-blue-600">
                    {summary.correctCount}/{summary.total} correct
                  </p>
                </div>
              </div>
            </div>

            {/* Model Comparison */}
            {modelComparison && (
              <div className="bg-white border-2 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-purple-600" />
                  Perbandingan Model
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  {modelComparison.imbalanced && !modelComparison.imbalanced.error && (
                    <div className="bg-red-50 p-5 rounded-lg border-2 border-red-200">
                      <h4 className="font-bold text-red-900 mb-3 text-lg">Imbalanced Model</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between py-1">
                          <span className="text-gray-700">Accuracy:</span>
                          <span className="font-bold text-red-700">{modelComparison.imbalanced.accuracy}%</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-gray-700">Precision:</span>
                          <span className="font-bold text-red-700">{modelComparison.imbalanced.precision}%</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-gray-700">Recall:</span>
                          <span className="font-bold text-red-700">{modelComparison.imbalanced.recall}%</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-gray-700">F1-Score:</span>
                          <span className="font-bold text-red-700">{modelComparison.imbalanced.f1_score}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {modelComparison.balanced && !modelComparison.balanced.error && (
                    <div className="bg-green-50 p-5 rounded-lg border-2 border-green-200">
                      <h4 className="font-bold text-green-900 mb-3 text-lg">Balanced Model</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between py-1">
                          <span className="text-gray-700">Accuracy:</span>
                          <span className="font-bold text-green-700">{modelComparison.balanced.accuracy}%</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-gray-700">Precision:</span>
                          <span className="font-bold text-green-700">{modelComparison.balanced.precision}%</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-gray-700">Recall:</span>
                          <span className="font-bold text-green-700">{modelComparison.balanced.recall}%</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-gray-700">F1-Score:</span>
                          <span className="font-bold text-green-700">{modelComparison.balanced.f1_score}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Insights */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                <h4 className="font-semibold text-blue-900 mb-3">📊 Insights Utama</h4>
                <ul className="text-sm text-blue-800 space-y-2">
                  <li>• Total {summary.total} komentar dianalisis</li>
                  <li>• Model mencapai akurasi {summary.accuracy}%</li>
                  <li>• Confidence rata-rata: {summary.avgConfidence}%</li>
                  <li>• {summary.correctCount} prediksi benar, {summary.incorrectCount} salah</li>
                </ul>
              </div>
              
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
                <h4 className="font-semibold text-green-900 mb-3">🎯 Distribusi Sentimen</h4>
                <ul className="text-sm text-green-800 space-y-2">
                  <li>• Positif: {summary.sentimentPercentages.Positif}% ({summary.sentimentDist.Positif} komentar)</li>
                  <li>• Negatif: {summary.sentimentPercentages.Negatif}% ({summary.sentimentDist.Negatif} komentar)</li>
                  <li>• Netral: {summary.sentimentPercentages.Netral}% ({summary.sentimentDist.Netral} komentar)</li>
                </ul>
              </div>
            </div>

            {/* Detailed Results Table */}
            <div className="bg-white border-2 rounded-lg overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b-2 flex justify-between items-center">
                <h3 className="font-bold text-gray-800 text-lg">Detail Hasil Prediksi</h3>
                <span className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full border">
                  Halaman {currentPage} dari {totalPages}
                </span>
              </div>
              
              {isLoading ? (
                <div className="p-12 text-center">
                  <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading predictions...</p>
                </div>
              ) : currentPredictions.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  Tidak ada data prediksi
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 border-b-2">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold">ID</th>
                          <th className="px-4 py-3 text-left font-semibold">Komentar</th>
                          <th className="px-4 py-3 text-left font-semibold">Aktual</th>
                          <th className="px-4 py-3 text-left font-semibold">Prediksi</th>
                          <th className="px-4 py-3 text-center font-semibold">Confidence</th>
                          <th className="px-4 py-3 text-center font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentPredictions.map((pred, idx) => (
                          <tr key={pred.id || idx} className="border-b hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 font-mono text-xs">{pred.id}</td>
                            <td className="px-4 py-3 max-w-md">
                              <div className="truncate" title={pred.comment || pred.finalText}>
                                {pred.comment || pred.finalText}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getSentimentColor(pred.actual_sentiment)}`}>
                                {pred.actual_sentiment}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getSentimentColor(pred.predicted_sentiment)}`}>
                                {pred.predicted_sentiment}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center font-mono text-xs font-semibold">
                              {(parseFloat(pred.prediction_confidence) * 100).toFixed(1)}%
                            </td>
                            <td className="px-4 py-3 text-center">
                              {pred.is_correct ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600 inline" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-600 inline" />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="p-4 bg-gray-50 border-t-2 flex justify-center items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-white border-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      Previous
                    </button>
                    <span className="px-6 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-bold border-2 border-indigo-200">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 bg-white border-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Export Options */}
            <div className="flex justify-center space-x-4 pt-4">
              <button 
                onClick={handleExportCSV}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-lg transition-all transform hover:scale-105"
              >
                <Download className="h-5 w-5" />
                <span className="font-semibold">Export ke CSV</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisPage;