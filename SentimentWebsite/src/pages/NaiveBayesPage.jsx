import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, BarChart2, AlertCircle, CheckCircle2 } from 'lucide-react';

const NaiveBayesPage = ({ 
  balancedData, 
  isLoading, 
  setIsLoading,
  onTrainingComplete
}) => {
  const [selectedApproach, setSelectedApproach] = useState('both');
  const [trainingResults, setTrainingResults] = useState({
    imbalanced: null,
    balanced: null
  });
  const [modelInfo, setModelInfo] = useState({
    imbalanced: null,
    balanced: null
  });

  // Check existing models on mount
  useEffect(() => {
    checkExistingModels();
  }, []);

  const checkExistingModels = async () => {
    for (const approach of ['imbalanced', 'balanced']) {
      try {
        const response = await fetch(`http://localhost:8000/model-info?approach=${approach}`);
        const data = await response.json();
        if (data.model_exists) {
          setModelInfo(prev => ({
            ...prev,
            [approach]: data
          }));
        }
      } catch (error) {
        console.log(`No existing ${approach} model`);
      }
    }
  };

  const handleTraining = async (approach) => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`http://localhost:8000/train-naive-bayes?approach=${approach}&alpha=1.0&cv_folds=5`, {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (result.error) {
        alert(`Error: ${result.error}`);
      } else if (result.status === 'success') {
        setTrainingResults(prev => ({
          ...prev,
          [approach]: result
        }));
        
        // Update model info
        setModelInfo(prev => ({
          ...prev,
          [approach]: {
            model_exists: true,
            ...result
          }
        }));
        
        // Notify parent component
        if (onTrainingComplete) {
          onTrainingComplete(approach, result);
        }
        
        alert(`Model ${approach} berhasil dilatih!\nAccuracy: ${result.performance.test_accuracy}%`);
      }
    } catch (error) {
      alert(`Gagal training model: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrainBoth = async () => {
    await handleTraining('imbalanced');
    await handleTraining('balanced');
  };

  const renderModelStatus = (approach) => {
    const info = modelInfo[approach];
    const result = trainingResults[approach];
    
    if (!info?.model_exists && !result) {
      return (
        <div className="flex items-center space-x-2 text-gray-500">
          <AlertCircle className="h-5 w-5" />
          <span>Belum dilatih</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center space-x-2 text-green-600">
        <CheckCircle2 className="h-5 w-5" />
        <span>Model tersedia</span>
      </div>
    );
  };

  const renderPerformanceMetrics = (result) => {
    if (!result) return null;
    
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
          <p className="text-2xl font-bold text-green-700">{result.performance.test_accuracy}%</p>
          <p className="text-sm text-green-600">Accuracy</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
          <p className="text-2xl font-bold text-blue-700">{result.performance.precision}%</p>
          <p className="text-sm text-blue-600">Precision</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
          <p className="text-2xl font-bold text-purple-700">{result.performance.recall}%</p>
          <p className="text-sm text-purple-600">Recall</p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
          <p className="text-2xl font-bold text-orange-700">{result.performance.f1_score}%</p>
          <p className="text-sm text-orange-600">F1-Score</p>
        </div>
      </div>
    );
  };

  const renderPerClassMetrics = (result) => {
    if (!result || !result.per_class_metrics) return null;
    
    return (
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold mb-3 text-gray-800">Per-Class Performance</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Class</th>
                <th className="px-4 py-2 text-center">Precision</th>
                <th className="px-4 py-2 text-center">Recall</th>
                <th className="px-4 py-2 text-center">F1-Score</th>
                <th className="px-4 py-2 text-center">Support</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(result.per_class_metrics).map(([cls, metrics]) => (
                <tr key={cls} className="border-b">
                  <td className="px-4 py-2 font-medium">{cls}</td>
                  <td className="px-4 py-2 text-center">{metrics.precision}%</td>
                  <td className="px-4 py-2 text-center">{metrics.recall}%</td>
                  <td className="px-4 py-2 text-center">{metrics.f1_score}%</td>
                  <td className="px-4 py-2 text-center">{metrics.support}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center space-x-3 mb-4">
          <Target className="h-8 w-8 text-indigo-500" />
          <h2 className="text-2xl font-semibold text-gray-800">Naive Bayes Classification</h2>
        </div>
        <p className="text-gray-600 mb-8">
          Training model Multinomial Naive Bayes dengan 2 pendekatan: Imbalanced (data original) dan Balanced (data yang sudah diseimbangkan).
        </p>

        {/* Formula */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-indigo-900 mb-4">Multinomial Naive Bayes Formula</h3>
          <div className="text-center bg-white p-4 rounded border">
            <p className="text-lg font-mono">P(class|document) = P(class) × ∏ P(word|class)</p>
          </div>
          <p className="text-sm text-indigo-700 mt-2">
            Probabilitas kelas berdasarkan asumsi independensi kondisional antar fitur
          </p>
        </div>

        {/* Approach Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pilih Pendekatan Training:
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setSelectedApproach('imbalanced')}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedApproach === 'imbalanced'
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <h4 className="font-semibold mb-1">Imbalanced</h4>
              <p className="text-sm text-gray-600">Data original tanpa balancing</p>
              {renderModelStatus('imbalanced')}
            </button>
            
            <button
              onClick={() => setSelectedApproach('balanced')}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedApproach === 'balanced'
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <h4 className="font-semibold mb-1">Balanced</h4>
              <p className="text-sm text-gray-600">Data yang sudah diseimbangkan</p>
              {renderModelStatus('balanced')}
            </button>
            
            <button
              onClick={() => setSelectedApproach('both')}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedApproach === 'both'
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <h4 className="font-semibold mb-1">Both</h4>
              <p className="text-sm text-gray-600">Latih kedua pendekatan</p>
            </button>
          </div>
        </div>

        {/* Training Button */}
        <button
          onClick={() => {
            if (selectedApproach === 'both') {
              handleTrainBoth();
            } else {
              handleTraining(selectedApproach);
            }
          }}
          disabled={isLoading}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors mb-6"
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Training Model...</span>
            </div>
          ) : (
            `Mulai Training ${selectedApproach === 'both' ? 'Kedua Model' : `Model ${selectedApproach}`}`
          )}
        </button>

        {/* Results for Imbalanced */}
        {trainingResults.imbalanced && (
          <div className="mb-6 border rounded-lg p-6 bg-gray-50">
            <div className="flex items-center space-x-2 mb-4">
              <BarChart2 className="h-6 w-6 text-red-500" />
              <h3 className="text-lg font-semibold">Imbalanced Model Results</h3>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="bg-white p-4 rounded border">
                <h4 className="font-medium mb-2 text-sm text-gray-600">Training Info</h4>
                <ul className="text-sm space-y-1">
                  <li>• Train samples: {trainingResults.imbalanced.training_info.train_samples}</li>
                  <li>• Test samples: {trainingResults.imbalanced.training_info.test_samples}</li>
                  <li>• Cross-validation: {trainingResults.imbalanced.training_info.cv_folds}-fold</li>
                  <li>• CV Accuracy: {trainingResults.imbalanced.performance.cv_mean}% (±{trainingResults.imbalanced.performance.cv_std}%)</li>
                </ul>
              </div>
              <div className="bg-white p-4 rounded border">
                <h4 className="font-medium mb-2 text-sm text-gray-600">Class Distribution</h4>
                <ul className="text-sm space-y-1">
                  {Object.entries(trainingResults.imbalanced.training_info.train_distribution).map(([cls, count]) => (
                    <li key={cls}>• {cls}: {count} samples</li>
                  ))}
                </ul>
              </div>
            </div>

            {renderPerformanceMetrics(trainingResults.imbalanced)}
            {renderPerClassMetrics(trainingResults.imbalanced)}
          </div>
        )}

        {/* Results for Balanced */}
        {trainingResults.balanced && (
          <div className="mb-6 border rounded-lg p-6 bg-gray-50">
            <div className="flex items-center space-x-2 mb-4">
              <TrendingUp className="h-6 w-6 text-green-500" />
              <h3 className="text-lg font-semibold">Balanced Model Results</h3>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="bg-white p-4 rounded border">
                <h4 className="font-medium mb-2 text-sm text-gray-600">Training Info</h4>
                <ul className="text-sm space-y-1">
                  <li>• Train samples: {trainingResults.balanced.training_info.train_samples}</li>
                  <li>• Test samples: {trainingResults.balanced.training_info.test_samples}</li>
                  <li>• Cross-validation: {trainingResults.balanced.training_info.cv_folds}-fold</li>
                  <li>• CV Accuracy: {trainingResults.balanced.performance.cv_mean}% (±{trainingResults.balanced.performance.cv_std}%)</li>
                </ul>
              </div>
              <div className="bg-white p-4 rounded border">
                <h4 className="font-medium mb-2 text-sm text-gray-600">Class Distribution</h4>
                <ul className="text-sm space-y-1">
                  {Object.entries(trainingResults.balanced.training_info.train_distribution).map(([cls, count]) => (
                    <li key={cls}>• {cls}: {count} samples</li>
                  ))}
                </ul>
              </div>
            </div>

            {renderPerformanceMetrics(trainingResults.balanced)}
            {renderPerClassMetrics(trainingResults.balanced)}
          </div>
        )}

        {/* Comparison */}
        {trainingResults.imbalanced && trainingResults.balanced && (
          <div className="border rounded-lg p-6 bg-gradient-to-r from-indigo-50 to-purple-50">
            <h3 className="text-lg font-semibold mb-4">Model Comparison</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <h4 className="font-semibold text-red-600 mb-3">Imbalanced Model</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Accuracy:</span>
                    <span className="font-semibold">{trainingResults.imbalanced.performance.test_accuracy}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Precision:</span>
                    <span className="font-semibold">{trainingResults.imbalanced.performance.precision}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Recall:</span>
                    <span className="font-semibold">{trainingResults.imbalanced.performance.recall}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>F1-Score:</span>
                    <span className="font-semibold">{trainingResults.imbalanced.performance.f1_score}%</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <h4 className="font-semibold text-green-600 mb-3">Balanced Model</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Accuracy:</span>
                    <span className="font-semibold">{trainingResults.balanced.performance.test_accuracy}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Precision:</span>
                    <span className="font-semibold">{trainingResults.balanced.performance.precision}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Recall:</span>
                    <span className="font-semibold">{trainingResults.balanced.performance.recall}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>F1-Score:</span>
                    <span className="font-semibold">{trainingResults.balanced.performance.f1_score}%</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 bg-white p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Improvement Analysis</h4>
              <p className="text-sm text-gray-600">
                {trainingResults.balanced.performance.test_accuracy > trainingResults.imbalanced.performance.test_accuracy
                  ? `Balanced model shows ${(trainingResults.balanced.performance.test_accuracy - trainingResults.imbalanced.performance.test_accuracy).toFixed(2)}% improvement in accuracy.`
                  : `Imbalanced model performs ${(trainingResults.imbalanced.performance.test_accuracy - trainingResults.balanced.performance.test_accuracy).toFixed(2)}% better in accuracy.`
                }
              </p>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">💡 Information</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Imbalanced:</strong> Menggunakan data original dengan distribusi kelas tidak seimbang</li>
            <li>• <strong>Balanced:</strong> Menggunakan data yang sudah diseimbangkan dengan Random Undersampling + Tomek Link</li>
            <li>• <strong>Cross-validation:</strong> Validasi model menggunakan 5-fold untuk menghindari overfitting</li>
            <li>• <strong>Alpha:</strong> Parameter Laplace smoothing (default=1.0) untuk menangani zero probability</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default NaiveBayesPage;