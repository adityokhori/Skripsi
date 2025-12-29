import React, { useState, useEffect } from 'react';
import { Play, Loader2, BarChart3, Database, Settings, Zap, CheckCircle, AlertCircle, TrendingUp, Activity } from 'lucide-react';

/*
  CrossValidationPage.jsx - UPDATED VERSION
  
  Disesuaikan dengan backend baru yang menggunakan:
  - 10-Fold Cross Validation dengan balancing per fold
  - Input: Get_Labelling.csv, tfidf_matrix.pkl, tfidf_vectorizer.pkl
  - Balancing menggunakan imbalanced-learn (Tomek Links + Random Undersampling)
  
  Backend Endpoints:
  - GET  /dataset-info              => Info dataset dari Get_Labelling.csv
  - GET  /check-requirements        => Cek requirements (imbalanced-learn, dll)
  - GET  /balancing-info           => Info tentang balancing
  - POST /train-naive-bayes        => Training dengan K-Fold CV
      Body: { k_folds: 10, alpha: 1.0, random_state: 42, use_balancing: true }
  - GET  /model-info               => Info model yang sudah dilatih
*/

const CrossValidationPage2 = () => {
  // State untuk konfigurasi training
  const [k, setK] = useState(10);
  const [alpha, setAlpha] = useState(1.0);
  const [useBalancing, setUseBalancing] = useState(true);
  const [randomState, setRandomState] = useState(42);
  
  // State untuk status dan data
  const [isLoading, setIsLoading] = useState(false);
  const [datasetInfo, setDatasetInfo] = useState(null);
  const [requirements, setRequirements] = useState(null);
  const [balancingInfo, setBalancingInfo] = useState(null);
  const [trainingResult, setTrainingResult] = useState(null);
  const [error, setError] = useState('');
  const [showFoldDetails, setShowFoldDetails] = useState(false);
  const [showPerClassMetrics, setShowPerClassMetrics] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      // Fetch dataset info
      const datasetRes = await fetch('http://127.0.0.1:8000/dataset-info');
      const datasetData = await datasetRes.json();
      if (datasetData.status === 'success') {
        setDatasetInfo(datasetData.data);
      }

      // Fetch requirements
      const reqRes = await fetch('http://127.0.0.1:8000/check-requirements');
      const reqData = await reqRes.json();
      if (reqData.status === 'success') {
        setRequirements(reqData.data);
      }

      // Fetch balancing info
      const balRes = await fetch('http://127.0.0.1:8000/balancing-info');
      const balData = await balRes.json();
      if (balData.status === 'success') {
        setBalancingInfo(balData.data);
      }
    } catch (err) {
      console.error('Error fetching initial data:', err);
    }
  };

  const runTraining = async () => {
    if (!k || k < 2 || k > 20) {
      setError('K harus berupa angka antara 2-20');
      return;
    }

    if (!alpha || alpha <= 0) {
      setError('Alpha harus berupa angka positif');
      return;
    }

    // Cek requirements
    if (!requirements?.naive_bayes?.all_ready) {
      setError('Requirements tidak terpenuhi. Pastikan Get_Labelling.csv dan TF-IDF sudah tersedia.');
      return;
    }

    if (useBalancing && !requirements?.balancing?.imblearn_available) {
      setError('Balancing memerlukan imbalanced-learn. Install dengan: pip install imbalanced-learn');
      return;
    }

    setIsLoading(true);
    setError('');
    setTrainingResult(null);

    try {
      const requestBody = {
        k_folds: Number(k),
        alpha: Number(alpha),
        random_state: Number(randomState),
        use_balancing: useBalancing
      };

      console.log('Sending training request:', requestBody);

      const res = await fetch('http://127.0.0.1:8000/train-naive-bayes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();
      
      if (data.status === 'success') {
        setTrainingResult(data);
        console.log('Training completed successfully:', data);
      } else {
        setError(data.error || 'Terjadi kesalahan saat training');
      }
    } catch (err) {
      console.error('Training error:', err);
      setError('Gagal melakukan training. Periksa koneksi ke backend.');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadReport = () => {
    if (!trainingResult) return;
    const payload = JSON.stringify(trainingResult, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const approach = useBalancing ? 'balanced' : 'imbalanced';
    a.download = `cv_report_${approach}_${k}fold.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isSystemReady = requirements?.naive_bayes?.all_ready && 
                        (!useBalancing || requirements?.balancing?.imblearn_available);

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="w-8 h-8 text-indigo-600" />
          <div>
            <h2 className="text-3xl font-bold">Cross Validation & Model Training</h2>
            <p className="text-sm text-gray-600 mt-1">
              K-Fold Cross Validation dengan balancing per fold menggunakan Multinomial Naive Bayes
            </p>
          </div>
        </div>

        {/* System Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className={`p-4 rounded-lg border-2 ${datasetInfo ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              {datasetInfo ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-gray-400" />}
              <span className="font-semibold text-sm">Dataset</span>
            </div>
            {datasetInfo ? (
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Total:</span>
                  <strong>{datasetInfo.total}</strong>
                </div>
                <div className="flex justify-between text-green-700">
                  <span>Positif:</span>
                  <strong>{datasetInfo.distribution?.Positif || 0}</strong>
                </div>
                <div className="flex justify-between text-red-700">
                  <span>Negatif:</span>
                  <strong>{datasetInfo.distribution?.Negatif || 0}</strong>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Netral:</span>
                  <strong>{datasetInfo.distribution?.Netral || 0}</strong>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500">Dataset tidak tersedia</p>
            )}
          </div>

          <div className={`p-4 rounded-lg border-2 ${requirements?.naive_bayes?.tfidf_matrix_exists ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              {requirements?.naive_bayes?.tfidf_matrix_exists ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-gray-400" />}
              <span className="font-semibold text-sm">TF-IDF</span>
            </div>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span>Matrix:</span>
                <strong>{requirements?.naive_bayes?.tfidf_matrix_exists ? '✓' : '✗'}</strong>
              </div>
              <div className="flex justify-between">
                <span>Vectorizer:</span>
                <strong>{requirements?.naive_bayes?.tfidf_vectorizer_exists ? '✓' : '✗'}</strong>
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-lg border-2 ${requirements?.balancing?.imblearn_available ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              {requirements?.balancing?.imblearn_available ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-yellow-600" />}
              <span className="font-semibold text-sm">Balancing</span>
            </div>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span>imbalanced-learn:</span>
                <strong>{requirements?.balancing?.imblearn_available ? '✓ Installed' : '✗ Missing'}</strong>
              </div>
              {!requirements?.balancing?.imblearn_available && (
                <p className="text-xs text-yellow-700 mt-2">
                  pip install imbalanced-learn
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Preview Balancing */}
        {balancingInfo?.balanced_preview && useBalancing && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-sm">Preview Balancing Effect</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="text-gray-600 mb-1">Original:</div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <strong>{balancingInfo.original.total}</strong>
                  </div>
                  {Object.entries(balancingInfo.original.distribution || {}).map(([key, val]) => (
                    <div key={key} className="flex justify-between">
                      <span>{key}:</span>
                      <strong>{val}</strong>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-gray-600 mb-1">After Balancing:</div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <strong>{balancingInfo.balanced_preview.total}</strong>
                  </div>
                  {Object.entries(balancingInfo.balanced_preview.distribution || {}).map(([key, val]) => (
                    <div key={key} className="flex justify-between">
                      <span>{key}:</span>
                      <strong>{val}</strong>
                    </div>
                  ))}
                  <div className="flex justify-between text-red-600">
                    <span>Removed:</span>
                    <strong>{balancingInfo.balanced_preview.removed_count}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Configuration Panel */}
      <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-600" />
          Training Configuration
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* K-Fold */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">K-Fold</label>
            <input
              type="number"
              min={2}
              max={20}
              value={k}
              onChange={(e) => setK(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500">Jumlah fold (2-20), default: 10</p>
          </div>

          {/* Alpha */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Alpha (Laplace Smoothing)</label>
            <input
              type="number"
              min={0.01}
              step={0.1}
              value={alpha}
              onChange={(e) => setAlpha(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500">Default: 1.0</p>
          </div>

          {/* Random State */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Random State</label>
            <input
              type="number"
              value={randomState}
              onChange={(e) => setRandomState(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500">Seed untuk reprodusibilitas</p>
          </div>

          {/* Balancing Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Balancing</label>
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={() => setUseBalancing(false)}
                disabled={isLoading}
                className={`flex-1 px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                  !useBalancing 
                    ? 'bg-gray-100 border-gray-400 text-gray-800' 
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                Off
              </button>
              <button
                onClick={() => setUseBalancing(true)}
                disabled={isLoading || !requirements?.balancing?.imblearn_available}
                className={`flex-1 px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                  useBalancing 
                    ? 'bg-green-100 border-green-400 text-green-800' 
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                } ${!requirements?.balancing?.imblearn_available ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                On
              </button>
            </div>
            <p className="text-xs text-gray-500">
              {useBalancing ? 'Tomek Links + Random Undersampling per fold' : 'Tanpa balancing'}
            </p>
          </div>
        </div>

        {/* Warning jika requirements tidak terpenuhi */}
        {!isSystemReady && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <div className="font-semibold">System tidak siap</div>
                <div className="mt-1">
                  {!requirements?.naive_bayes?.get_labelling_exists && '• Get_Labelling.csv tidak ditemukan'}
                  {!requirements?.naive_bayes?.tfidf_matrix_exists && '• TF-IDF matrix belum dibuat'}
                  {useBalancing && !requirements?.balancing?.imblearn_available && '• imbalanced-learn belum terinstall'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Run Button */}
        <div className="mt-6">
          <button
            onClick={runTraining}
            disabled={isLoading || !isSystemReady}
            className={`w-full py-4 rounded-lg font-semibold text-white text-lg transition-all ${
              isLoading || !isSystemReady
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-lg hover:shadow-xl'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Training dalam progress... Mohon tunggu</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <Play className="w-5 h-5" />
                <span>Mulai Training dengan {k}-Fold Cross Validation</span>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="text-sm text-red-800">{error}</div>
          </div>
        </div>
      )}

      {/* Training Results */}
      {trainingResult && (
        <div className="space-y-6">
          {/* Overall Performance */}
          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-indigo-600" />
                <h3 className="text-xl font-bold">Cross Validation Results</h3>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={downloadReport}
                  className="px-4 py-2 border-2 border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Download JSON
                </button>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border-2 border-blue-200">
                <div className="text-xs font-semibold text-blue-700 mb-1">Mean Accuracy</div>
                <div className="text-2xl font-bold text-blue-900">{trainingResult.cv_performance.mean_accuracy}%</div>
                <div className="text-xs text-blue-600 mt-1">± {trainingResult.cv_performance.std_accuracy}%</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border-2 border-green-200">
                <div className="text-xs font-semibold text-green-700 mb-1">Mean Precision</div>
                <div className="text-2xl font-bold text-green-900">{trainingResult.cv_performance.mean_precision}%</div>
                <div className="text-xs text-green-600 mt-1">± {trainingResult.cv_performance.std_precision}%</div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border-2 border-purple-200">
                <div className="text-xs font-semibold text-purple-700 mb-1">Mean Recall</div>
                <div className="text-2xl font-bold text-purple-900">{trainingResult.cv_performance.mean_recall}%</div>
                <div className="text-xs text-purple-600 mt-1">± {trainingResult.cv_performance.std_recall}%</div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border-2 border-orange-200">
                <div className="text-xs font-semibold text-orange-700 mb-1">Mean F1-Score</div>
                <div className="text-2xl font-bold text-orange-900">{trainingResult.cv_performance.mean_f1}%</div>
                <div className="text-xs text-orange-600 mt-1">± {trainingResult.cv_performance.std_f1}%</div>
              </div>
            </div>

            {/* Training Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="text-xs text-gray-600">Approach</div>
                <div className="font-semibold capitalize">{trainingResult.approach}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">K-Folds</div>
                <div className="font-semibold">{trainingResult.k_folds}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Total Samples</div>
                <div className="font-semibold">{trainingResult.data_info.total_samples}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Model File</div>
                <div className="font-semibold text-xs truncate">{trainingResult.model_filename}</div>
              </div>
            </div>
          </div>

          {/* Per-Class Metrics */}
          {trainingResult.per_class_metrics && (
            <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Per-Class Performance</h3>
                <button
                  onClick={() => setShowPerClassMetrics(!showPerClassMetrics)}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  {showPerClassMetrics ? 'Hide' : 'Show'}
                </button>
              </div>

              {showPerClassMetrics && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border-2 border-gray-300 px-4 py-3 text-left font-semibold">Class</th>
                        <th className="border-2 border-gray-300 px-4 py-3 text-right font-semibold">Precision</th>
                        <th className="border-2 border-gray-300 px-4 py-3 text-right font-semibold">Recall</th>
                        <th className="border-2 border-gray-300 px-4 py-3 text-right font-semibold">F1-Score</th>
                        <th className="border-2 border-gray-300 px-4 py-3 text-right font-semibold">Support</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(trainingResult.per_class_metrics).map(([className, metrics]) => (
                        <tr key={className} className="hover:bg-gray-50">
                          <td className="border-2 border-gray-300 px-4 py-3 font-medium">{className}</td>
                          <td className="border-2 border-gray-300 px-4 py-3 text-right">{metrics.precision}%</td>
                          <td className="border-2 border-gray-300 px-4 py-3 text-right">{metrics.recall}%</td>
                          <td className="border-2 border-gray-300 px-4 py-3 text-right">{metrics.f1_score}%</td>
                          <td className="border-2 border-gray-300 px-4 py-3 text-right">{metrics.support}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Fold Details */}
          {trainingResult.fold_details && (
            <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Fold-by-Fold Details</h3>
                <button
                  onClick={() => setShowFoldDetails(!showFoldDetails)}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  {showFoldDetails ? 'Hide Details' : 'Show Details'}
                </button>
              </div>

              {showFoldDetails && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border-2 border-gray-300 px-3 py-2 text-left font-semibold">Fold</th>
                        <th className="border-2 border-gray-300 px-3 py-2 text-right font-semibold">Train Size</th>
                        {trainingResult.use_balancing && (
                          <th className="border-2 border-gray-300 px-3 py-2 text-right font-semibold">After Balance</th>
                        )}
                        <th className="border-2 border-gray-300 px-3 py-2 text-right font-semibold">Test Size</th>
                        <th className="border-2 border-gray-300 px-3 py-2 text-right font-semibold">Accuracy</th>
                        <th className="border-2 border-gray-300 px-3 py-2 text-right font-semibold">Precision</th>
                        <th className="border-2 border-gray-300 px-3 py-2 text-right font-semibold">Recall</th>
                        <th className="border-2 border-gray-300 px-3 py-2 text-right font-semibold">F1</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trainingResult.fold_details.map((fold) => (
                        <tr key={fold.fold} className="hover:bg-gray-50">
                          <td className="border-2 border-gray-300 px-3 py-2 font-medium">Fold {fold.fold}</td>
                          <td className="border-2 border-gray-300 px-3 py-2 text-right">{fold.train_size}</td>
                          {trainingResult.use_balancing && (
                            <td className="border-2 border-gray-300 px-3 py-2 text-right text-blue-600 font-medium">
                              {fold.train_size_after_balancing}
                            </td>
                          )}
                          <td className="border-2 border-gray-300 px-3 py-2 text-right">{fold.test_size}</td>
                          <td className="border-2 border-gray-300 px-3 py-2 text-right font-medium">{fold.accuracy}%</td>
                          <td className="border-2 border-gray-300 px-3 py-2 text-right">{fold.precision}%</td>
                          <td className="border-2 border-gray-300 px-3 py-2 text-right">{fold.recall}%</td>
                          <td className="border-2 border-gray-300 px-3 py-2 text-right">{fold.f1_score}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Fold Performance Chart (Simple Bar Visualization) */}
              {showFoldDetails && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold mb-3">Accuracy per Fold</h4>
                  <div className="space-y-2">
                    {trainingResult.fold_details.map((fold) => (
                      <div key={fold.fold} className="flex items-center gap-3">
                        <div className="w-16 text-xs text-gray-600">Fold {fold.fold}</div>
                        <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-indigo-500 to-blue-500 h-full rounded-full flex items-center justify-end pr-2"
                            style={{ width: `${fold.accuracy}%` }}
                          >
                            <span className="text-xs font-semibold text-white">{fold.accuracy}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Confusion Matrix */}
          {trainingResult.confusion_matrix && trainingResult.class_names && (
            <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
              <h3 className="text-lg font-bold mb-4">Overall Confusion Matrix</h3>
              <div className="overflow-x-auto">
                <table className="mx-auto text-sm border-collapse">
                  <thead>
                    <tr>
                      <th className="border-2 border-gray-300 px-4 py-2 bg-gray-100"></th>
                      {trainingResult.class_names.map((className) => (
                        <th key={className} className="border-2 border-gray-300 px-4 py-2 bg-gray-100 font-semibold text-center">
                          Pred: {className}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trainingResult.confusion_matrix.map((row, i) => (
                      <tr key={i}>
                        <td className="border-2 border-gray-300 px-4 py-2 bg-gray-100 font-semibold text-right">
                          True: {trainingResult.class_names[i]}
                        </td>
                        {row.map((val, j) => (
                          <td
                            key={j}
                            className={`border-2 border-gray-300 px-4 py-2 text-center font-medium ${
                              i === j ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                            }`}
                          >
                            {val}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Results Yet */}
      {!trainingResult && !isLoading && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <Activity className="w-8 h-8 text-yellow-600 flex-shrink-0" />
            <div>
              <div className="font-semibold text-lg text-yellow-900 mb-2">Belum Ada Hasil Training</div>
              <div className="text-sm text-yellow-800">
                Konfigurasi parameter training di atas dan klik tombol "Mulai Training" untuk memulai proses K-Fold Cross Validation.
              </div>
              <div className="mt-4 text-sm text-yellow-800">
                <div className="font-semibold mb-2">Proses yang akan dilakukan:</div>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Data dibagi menjadi {k} fold secara stratified</li>
                  <li>Setiap fold dijadikan test set secara bergantian</li>
                  {useBalancing && <li>Balancing (Tomek Links + RUS) diterapkan pada training fold</li>}
                  <li>Model Multinomial Naive Bayes dilatih dan dievaluasi</li>
                  <li>Metrics dikumpulkan dan dirata-ratakan</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrossValidationPage2;