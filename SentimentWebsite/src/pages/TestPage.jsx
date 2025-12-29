import React, { useState, useEffect } from 'react';
import { 
  Send, 
  AlertCircle, 
  CheckCircle, 
  TrendingUp, 
  Loader,
  FileText,
  BarChart3,
  Zap,
  Settings,
  AlertTriangle,
  GitCompare
} from 'lucide-react';
import api from '../../api/axios';

const TestPage = () => {
  // State Management
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  
  // ✅ Model Pair Selection State
  const [modelPairs, setModelPairs] = useState([]);
  const [selectedTimestamp, setSelectedTimestamp] = useState('');
  const [loadingModels, setLoadingModels] = useState(false);
  const [pairInfo, setPairInfo] = useState(null);

  // Load available model pairs on mount
  useEffect(() => {
    loadModelPairs();
  }, []);

// Di TestPage.jsx, bagian loadModelPairs
const loadModelPairs = async () => {
  setLoadingModels(true);
  try {
    const response = await api.get('/model-pairs');  // ✅ api.get sudah otomatis kirim token
    const pairs = response.data.pairs || [];
    setModelPairs(pairs);

    // Auto-select latest pair
    if (pairs.length > 0) {
      const latestPair = pairs[0];
      console.log(pairs[0]);
      setSelectedTimestamp(latestPair.timestamp);
      setPairInfo(latestPair);
    }
  } catch (err) {
    console.error('Failed to load model pairs:', err);
    if (err.response?.status === 401) {
      setError('Please login to view your trained models');
    } else {
      setError('Failed to load trained model pairs');
    }
  } finally {
    setLoadingModels(false);
  }
};


  const handlePairChange = (e) => {
    const timestamp = e.target.value;
    setSelectedTimestamp(timestamp);
    
    const pair = modelPairs.find(p => p.timestamp === timestamp);
    setPairInfo(pair);
  };

  const handlePredict = async () => {
    if (!text.trim()) {
      setError('Masukkan teks untuk dianalisis');
      return;
    }

    if (!selectedTimestamp) {
      setError('Pilih model pair terlebih dahulu');
      return;
    }

    setIsLoading(true);
    setError('');
    setResults(null);

    try {
      // ✅ Check for negation words
      const negationWords = [
        'tidak', 'bukan', 'tak', 'jangan', 'ga', 'gak', 
        'nggak', 'enggak', 'kagak', 'tanpa', 'belum', 'tiada'
      ];
      
      const hasNegation = negationWords.some(word => 
        text.toLowerCase().includes(word)
      );

      console.log(`Has negation: ${hasNegation}`);

      // ✅ Send prediction request with timestamp (will compare both models)
      const response = await api.post('/predict-compare-models', {
        text: text.trim(),
        timestamp: selectedTimestamp,
        handlenegation: hasNegation
      });

      if (response.data.status === 'success') {
        setResults(response.data);
      } else {
        setError('Prediksi gagal');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Gagal melakukan prediksi');
      console.error('Prediction error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getSentimentColor = (sentiment) => {
    if (!sentiment) return 'bg-gray-100 text-gray-700';
    
    const sent = sentiment.toLowerCase();
    if (sent.includes('positif') || sent.includes('positive')) {
      return 'bg-green-100 text-green-700 border-green-300';
    } else if (sent.includes('negatif') || sent.includes('negative')) {
      return 'bg-red-100 text-red-700 border-red-300';
    } else if (sent.includes('netral') || sent.includes('neutral')) {
      return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    }
    return 'bg-gray-100 text-gray-700';
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

const renderModelResult = (title, data, bgColor, borderColor, icon) => {
  if (!data) return null;

  return (
    <div className={`p-6 ${bgColor} border-2 ${borderColor} rounded-lg`}>
      {/* Header */}
      <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
        {icon}
        {title}
      </h3>

      {/* Sentiment Badge */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">Predicted Sentiment:</p>
        <div className={`inline-block px-6 py-3 rounded-lg border-2 font-bold text-xl ${getSentimentColor(data.predicted_sentiment)}`}>
          {data.predicted_sentiment || 'N/A'}
        </div>
      </div>

      {/* Confidence */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">Confidence</span>
          <span className={`text-sm font-bold ${getConfidenceColor(data.confidence)}`}>
            {(data.confidence * 100).toFixed(2)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${data.confidence * 100}%` }}
          />
        </div>
      </div>

      {/* Probability Distribution */}
      {data.probabilities && (
        <div className="mt-4">
          <h4 className="font-semibold text-gray-800 mb-2 text-sm">Probability Distribution</h4>
          <div className="space-y-2">
            {Object.entries(data.probabilities).map(([label, prob]) => (
              <div key={label} className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium min-w-[70px] text-center ${getSentimentColor(label)}`}>
                  {label}
                </span>
                <div className="flex-1 bg-gray-200 rounded-full h-5">
                  <div
                    className={`h-5 rounded-full transition-all duration-500 flex items-center justify-end pr-2 ${
                      label.toLowerCase().includes('positif') ? 'bg-green-500' :
                      label.toLowerCase().includes('negatif') ? 'bg-red-500' :
                      'bg-yellow-500'
                    }`}
                    style={{ width: `${prob * 100}%` }}
                  >
                    <span className="text-white text-xs font-bold">
                      {(prob * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ✅ Model Performance - HANYA accuracy dan f1_score */}
      {data.model_info && (
        <div className="mt-4 pt-4 border-t border-gray-300">
          <h4 className="font-semibold text-gray-800 mb-2 text-sm">Model Performance</h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2 bg-white rounded border border-gray-200">
              <p className="text-gray-600 mb-1">Accuracy</p>
              <p className="font-bold text-green-700 text-lg">
                {(data.model_info.accuracy * 100).toFixed(2)}%
              </p>
            </div>
            <div className="p-2 bg-white rounded border border-gray-200">
              <p className="text-gray-600 mb-1">F1-Score</p>
              <p className="font-bold text-blue-700 text-lg">
                {(data.model_info.f1_score * 100).toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <GitCompare className="w-8 h-8 text-purple-500" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Test & Compare Models</h2>
            <p className="text-gray-600">Compare balanced vs non-balanced model predictions</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800">Error</h3>
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        )}


        {/* Model Pair Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Model Pair (Trained Together)
          </label>
          {loadingModels ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader className="w-4 h-4 animate-spin" />
              Loading model pairs...
            </div>
          ) : modelPairs.length === 0 ? (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800">No model pairs available. Please train models first.</p>
            </div>
          ) : (
            <select
              value={selectedTimestamp}
              onChange={handlePairChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">-- Select Model Pair --</option>
              {modelPairs.map((pair) => (
                <option key={pair.timestamp} value={pair.timestamp}>
                  {pair.timestamp} - Trained: {new Date(pair.trained_date).toLocaleDateString('id-ID')} 
                </option>
              ))}
            </select>
          )}
          
          {/* ✅ PERBAIKAN: Tambahkan null checks */}
          {pairInfo && pairInfo.balanced && pairInfo.nonbalanced && (
            <div className="mt-3 p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
              <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Selected Model Pair Info
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Non-Balanced Model */}
                <div className="p-3 bg-white rounded border border-purple-200">
                  <h4 className="font-semibold text-purple-700 mb-2 text-sm">
                    Non-Balanced Model
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-gray-600">Accuracy</p>
                      <p className="font-bold text-green-700">
                        {(pairInfo.nonbalanced.accuracy * 100).toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">F1-Score</p>
                      <p className="font-bold text-blue-700">
                        {(pairInfo.nonbalanced.f1score * 100).toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Balanced Model */}
                <div className="p-3 bg-white rounded border border-blue-200">
                  <h4 className="font-semibold text-blue-700 mb-2 text-sm">
                    Balanced Model
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-gray-600">Accuracy</p>
                      <p className="font-bold text-green-700">
                        {(pairInfo.balanced.accuracy * 100).toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">F1-Score</p>
                      <p className="font-bold text-blue-700">
                        {(pairInfo.balanced.f1score * 100).toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-2 text-xs text-gray-600">
                <p>Trained: {new Date(pairInfo.traineddate).toLocaleString('id-ID')}</p>
                <p>By: {pairInfo.trainedby} | K-Folds: {pairInfo.nsplits}</p>
              </div>
            </div>
          )}
        </div>


        {/* Input Text Area */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Input Text
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Masukkan teks untuk dianalisis sentimen (contoh: 'Produk ini tidak bagus')"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            rows="5"
            disabled={isLoading || !selectedTimestamp}
          />
          <p className="mt-1 text-xs text-gray-500">
            {text.length} characters
          </p>
        </div>

        {/* Predict Button */}
        <button
          onClick={handlePredict}
          disabled={isLoading || !text.trim() || !selectedTimestamp}
          className="w-full py-3 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Comparing models...
            </>
          ) : (
            <>
              <GitCompare className="w-5 h-5" />
              Compare Predictions
            </>
          )}
        </button>

        {/* Results */}
        {results && (
          <div className="mt-6 space-y-4">
 
            {/* Comparison Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Non-Balanced Result */}
              {renderModelResult(
                '📊 Non-Balanced Model',
                results.non_balanced,
                'bg-purple-50',
                'border-purple-300',
                <BarChart3 className="w-6 h-6 text-purple-600" />
              )}

              {/* Balanced Result */}
              {renderModelResult(
                '⚖️ Balanced Model',
                results.balanced,
                'bg-blue-50',
                'border-blue-300',
                <TrendingUp className="w-6 h-6 text-blue-600" />
              )}
            </div>

            {/* Comparison Summary */}
            {results.comparison && (
              <div className="p-6 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-lg">
                <h3 className="font-bold text-xl text-green-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-6 h-6" />
                  Comparison Summary
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Agreement */}
                  <div className="p-4 bg-white rounded-lg border border-green-200">
                    <p className="text-sm text-gray-600 mb-1">Prediction Agreement</p>
                    <p className={`text-2xl font-bold ${
                      results.comparison.predictions_match ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      {results.comparison.predictions_match ? '✅ Match' : '❌ Different'}
                    </p>
                    {!results.comparison.predictions_match && (
                      <p className="text-xs text-gray-600 mt-1">
                        NB: {results.non_balanced.predicted_sentiment} vs B: {results.balanced.predicted_sentiment}
                      </p>
                    )}
                  </div>

                  {/* Confidence Difference */}
                  <div className="p-4 bg-white rounded-lg border border-blue-200">
                    <p className="text-sm text-gray-600 mb-1">Confidence Difference</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {Math.abs(results.comparison.confidence_difference * 100).toFixed(2)}%
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {results.comparison.more_confident} is more confident
                    </p>
                  </div>

                  {/* Better Model */}
                  <div className="p-4 bg-white rounded-lg border border-purple-200">
                    <p className="text-sm text-gray-600 mb-1">Better Training Performance</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {results.comparison.better_model === 'balanced' ? '⚖️ Balanced' : '📊 Non-Balanced'}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Based on F1-Score
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Info Box */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Informasi</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>📊 Algorithm: <strong>Multinomial Naive Bayes</strong></li>
                <li>🔧 Preprocessing: Cleaning, Normalization, Stemming, Stopword Removal</li>
                <li>🔤 Feature Extraction: <strong>TF-IDF</strong></li>
                <li>📊 Non-Balanced: Trained on imbalanced data (original distribution)</li>
                <li>⚖️ Balanced: Trained with Tomek Links + Random Undersampling</li>
                <li>⚠️ Negation Handling: <strong>{results.negation_applied ? 'Applied (Both Models)' : 'Not Detected'}</strong></li>
                <li>📈 Metrics: Accuracy & F1-Score</li>
              </ul>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default TestPage;
