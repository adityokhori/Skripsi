// NaiveBayesPageTrain.jsx
import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Loader, 
  BarChart3, 
  Database, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp, 
  Download, 
  Eye, 
  EyeOff,
  ArrowUpCircle,
  ArrowDownCircle,
  Clock,
  Target,
  Zap
} from 'lucide-react';
import api from '../../api/axios';

const NaiveBayesPageTrain = ({ currentUser }) => {
  // ✅ State untuk file selectors
  const [labeledFiles, setLabeledFiles] = useState([]);
  const [tfidfFiles, setTfidfFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  
  // Training Configuration
  const [config, setConfig] = useState({
    labeled_file: '',
    tfidf_matrix_file: '',
    approach: 'both',
    output_prefix: 'final',
    n_splits: 10,
    random_state: 42
  });
  
  // State Management
  const [loading, setLoading] = useState(false);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [error, setError] = useState('');
  const [requirements, setRequirements] = useState(null);
  const [showFoldDetails, setShowFoldDetails] = useState(false);
  const [showConfusionMatrix, setShowConfusionMatrix] = useState(false);
  const [selectedApproach, setSelectedApproach] = useState('balancing');
  const [trainingProgress, setTrainingProgress] = useState(0);

  // ✅ Load files on mount
  useEffect(() => {
    loadAvailableFiles();
  }, []);

  const loadAvailableFiles = async () => {
    setLoadingFiles(true);
    try {
      // Load labeled files
      const labeledResponse = await api.get('/labeled-files');
      setLabeledFiles(labeledResponse.data.files || []);
      
      // Load TF-IDF files
      const tfidfResponse = await api.get('/tfidf-files');
      setTfidfFiles(tfidfResponse.data.files || []);
      
      // Auto-select latest files that match
      if (labeledResponse.data.files && labeledResponse.data.files.length > 0) {
        const latestLabeled = labeledResponse.data.files[0];
        console.log(labeledResponse.data.files[0]);
        setConfig(prev => ({ ...prev, labeled_file: latestLabeled.outputfilename }));
        
        // Try to find matching TF-IDF file
        if (tfidfResponse.data.files && tfidfResponse.data.files.length > 0) {
          console.log(tfidfResponse.data.files[0]);
          // Extract timestamp from labeled file
          const timestamp = latestLabeled.outputfilename.replace('GetLabelling_', '').replace('.csv', '');
          
          // Find matching TF-IDF file
          const matchingTfidf = tfidfResponse.data.files.find(f => 
            f.matrix_path.includes(timestamp)
          );
          
          if (matchingTfidf) {
            setConfig(prev => ({ ...prev, tfidf_matrix_file: matchingTfidf.matrix_path }));
          } else {
            // Fallback to latest
            setConfig(prev => ({ ...prev, tfidf_matrix_file: tfidfResponse.data.files[0].matrix_path }));
          }
        }
      }
      
      // Load requirements
      const reqResponse = await api.get('/check-requirements');
      setRequirements(reqResponse.data);
      
    } catch (err) {
      console.error('Failed to load files:', err);
      setError('Failed to load available files');
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleTrain = async (e) => {
    e.preventDefault();
    
    if (!config.labeled_file || !config.tfidf_matrix_file) {
      setError('Please select both labeled file and TF-IDF matrix');
      return;
    }
    
    setLoading(true);
    setError('');
    setComparisonResult(null);
    setTrainingProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setTrainingProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 10;
      });
    }, 1000);

    try {
      const response = await api.post('/train-both-approaches', config);
      setTrainingProgress(100);
      
      setTimeout(() => {
        setComparisonResult(response.data);
        clearInterval(progressInterval);
      }, 500);
      
    } catch (err) {
      setError(err.response?.data?.detail || 'Training failed');
      clearInterval(progressInterval);
    } finally {
      setTimeout(() => {
        setLoading(false);
        setTrainingProgress(0);
      }, 1000);
    }
  };

  const downloadReport = () => {
    if (!comparisonResult) return;
    
    const reportData = JSON.stringify(comparisonResult, null, 2);
    const blob = new Blob([reportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `training_report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isSystemReady = requirements?.all_ready || false;

  // Render Comparison View
  const renderComparison = () => {
    if (!comparisonResult) return null;

    const { non_balancing, balancing, comparison, class_names } = comparisonResult;

    return (
      <div className="mt-6 space-y-6">
        {/* Success Banner */}
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-green-800">Training Completed Successfully!</h3>
            <p className="text-green-600 text-sm mt-1">
              Both models trained in {comparisonResult.total_training_time}s by {comparisonResult.trained_by}
            </p>
          </div>
          <button
            onClick={downloadReport}
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            Download Report
          </button>
        </div>

        {/* Winner Banner */}
        <div className={`p-4 rounded-lg border-2 ${
          comparison.winner === 'balancing' 
            ? 'bg-blue-50 border-blue-300' 
            : 'bg-purple-50 border-purple-300'
        }`}>
          <div className="flex items-center gap-3">
            <TrendingUp className={`w-6 h-6 ${
              comparison.winner === 'balancing' ? 'text-blue-500' : 'text-purple-500'
            }`} />
            <div>
              <h3 className="font-bold text-lg">
                Winner: {comparison.winner === 'balancing' ? 'Balancing' : 'Non-Balancing'} Approach
              </h3>
              <p className="text-sm text-gray-600">
                F1-Score improvement: {comparison.f1_diff > 0 ? '+' : ''}{comparison.f1_diff.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>

        {/* Metrics Comparison Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Performance Comparison
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Metric</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Non-Balancing</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Balancing</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Difference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-700">Accuracy</td>
                  <td className="px-4 py-3 text-center">{(non_balancing.accuracy * 100).toFixed(2)}%</td>
                  <td className="px-4 py-3 text-center">{(balancing.accuracy * 100).toFixed(2)}%</td>
                  <td className={`px-4 py-3 text-center font-semibold ${
                    comparison.accuracy_diff > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {comparison.accuracy_diff > 0 ? <ArrowUpCircle className="w-4 h-4 inline mr-1" /> : <ArrowDownCircle className="w-4 h-4 inline mr-1" />}
                    {comparison.accuracy_diff > 0 ? '+' : ''}{comparison.accuracy_diff.toFixed(2)}%
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-700">Precision</td>
                  <td className="px-4 py-3 text-center">{(non_balancing.precision * 100).toFixed(2)}%</td>
                  <td className="px-4 py-3 text-center">{(balancing.precision * 100).toFixed(2)}%</td>
                  <td className={`px-4 py-3 text-center font-semibold ${
                    comparison.precision_diff > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {comparison.precision_diff > 0 ? <ArrowUpCircle className="w-4 h-4 inline mr-1" /> : <ArrowDownCircle className="w-4 h-4 inline mr-1" />}
                    {comparison.precision_diff > 0 ? '+' : ''}{comparison.precision_diff.toFixed(2)}%
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-700">Recall</td>
                  <td className="px-4 py-3 text-center">{(non_balancing.recall * 100).toFixed(2)}%</td>
                  <td className="px-4 py-3 text-center">{(balancing.recall * 100).toFixed(2)}%</td>
                  <td className={`px-4 py-3 text-center font-semibold ${
                    comparison.recall_diff > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {comparison.recall_diff > 0 ? <ArrowUpCircle className="w-4 h-4 inline mr-1" /> : <ArrowDownCircle className="w-4 h-4 inline mr-1" />}
                    {comparison.recall_diff > 0 ? '+' : ''}{comparison.recall_diff.toFixed(2)}%
                  </td>
                </tr>
                <tr className="bg-yellow-50">
                  <td className="px-4 py-3 font-bold text-gray-800">F1-Score</td>
                  <td className="px-4 py-3 text-center font-semibold">{(non_balancing.f1_score * 100).toFixed(2)}%</td>
                  <td className="px-4 py-3 text-center font-semibold">{(balancing.f1_score * 100).toFixed(2)}%</td>
                  <td className={`px-4 py-3 text-center font-bold ${
                    comparison.f1_diff > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {comparison.f1_diff > 0 ? <ArrowUpCircle className="w-4 h-4 inline mr-1" /> : <ArrowDownCircle className="w-4 h-4 inline mr-1" />}
                    {comparison.f1_diff > 0 ? '+' : ''}{comparison.f1_diff.toFixed(2)}%
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-700">Training Time</td>
                  <td className="px-4 py-3 text-center">{non_balancing.training_time.toFixed(2)}s</td>
                  <td className="px-4 py-3 text-center">{balancing.training_time.toFixed(2)}s</td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    {(balancing.training_time - non_balancing.training_time).toFixed(2)}s
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Fold Details */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => setShowFoldDetails(!showFoldDetails)}
            className="w-full px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between hover:bg-gray-100 transition-colors"
          >
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Cross-Validation Fold Details
            </h3>
            {showFoldDetails ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
          
          {showFoldDetails && (
            <div className="p-4">
              {/* Approach Selector */}
              <div className="mb-4 flex gap-2">
                <button
                  onClick={() => setSelectedApproach('non_balancing')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedApproach === 'non_balancing'
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Non-Balancing
                </button>
                <button
                  onClick={() => setSelectedApproach('balancing')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedApproach === 'balancing'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Balancing
                </button>
              </div>

              {/* Fold Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Fold</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Train Size</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Test Size</th>
                      {selectedApproach === 'balancing' && (
                        <>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Tomek Removed</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">RUS Removed</th>
                        </>
                      )}
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {comparisonResult[selectedApproach].fold_details.map((fold, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium">Fold {fold.fold || idx + 1}</td>
                        <td className="px-3 py-2 text-center">{fold.train_size || fold.balanced_train_size || '-'}</td>
                        <td className="px-3 py-2 text-center">{fold.test_size || '-'}</td>
                        {selectedApproach === 'balancing' && (
                          <>
                            <td className="px-3 py-2 text-center text-red-600">{fold.tomek_removed || 0}</td>
                            <td className="px-3 py-2 text-center text-orange-600">{fold.rus_removed || 0}</td>
                          </>
                        )}
                        <td className="px-3 py-2 text-center font-semibold">
                          {(fold.accuracy * 100).toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-yellow-50 font-bold">
                      <td className="px-3 py-2" colSpan={selectedApproach === 'balancing' ? 5 : 3}>
                        Avg Accuracy
                      </td>
                      <td className="px-3 py-2 text-center">
                        {(comparisonResult[selectedApproach].accuracy * 100).toFixed(2)}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Confusion Matrix */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => setShowConfusionMatrix(!showConfusionMatrix)}
            className="w-full px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between hover:bg-gray-100 transition-colors"
          >
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Confusion Matrix
            </h3>
            {showConfusionMatrix ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
          
          {showConfusionMatrix && (
            <div className="p-4">
              {/* Approach Selector */}
              <div className="mb-4 flex gap-2">
                <button
                  onClick={() => setSelectedApproach('non_balancing')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedApproach === 'non_balancing'
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Non-Balancing
                </button>
                <button
                  onClick={() => setSelectedApproach('balancing')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedApproach === 'balancing'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Balancing
                </button>
              </div>

              {/* Matrix */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border border-gray-300 px-3 py-2 bg-gray-100"></th>
                      {class_names?.map((name, i) => (
                        <th key={i} className="border border-gray-300 px-3 py-2 bg-blue-100 text-sm font-medium">
                          Pred: {name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonResult[selectedApproach].confusion_matrix?.map((row, i) => (
                      <tr key={i}>
                        <td className="border border-gray-300 px-3 py-2 bg-blue-100 font-medium text-sm">
                          True: {class_names?.[i]}
                        </td>
                        {row.map((val, j) => (
                          <td 
                            key={j} 
                            className={`border border-gray-300 px-3 py-2 text-center font-semibold ${
                              i === j ? 'bg-green-100 text-green-800' : 'bg-red-50 text-red-600'
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

              <p className="mt-3 text-xs text-gray-600">
                <strong>Green diagonal:</strong> Correct predictions. 
                <strong className="ml-2">Red off-diagonal:</strong> Misclassifications.
              </p>
            </div>
          )}
        </div>

        {/* Dataset Info */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <Database className="w-5 h-5" />
            Dataset Information
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Total Samples</p>
              <p className="font-semibold text-lg">{comparisonResult.data_info?.total_samples || 0}</p>
            </div>
            <div>
              <p className="text-gray-600">Train Samples</p>
              <p className="font-semibold text-lg">{comparisonResult.data_info?.train_samples || 0}</p>
            </div>
            <div>
              <p className="text-gray-600">Test Samples</p>
              <p className="font-semibold text-lg">{comparisonResult.data_info?.test_samples || 0}</p>
            </div>
            <div>
              <p className="text-gray-600">K-Folds</p>
              <p className="font-semibold text-lg">{comparisonResult.config?.n_splits || 0}</p>
            </div>
          </div>
          
          <div className="mt-3 p-3 bg-white rounded border border-gray-200">
            <p className="text-xs font-medium text-gray-700 mb-1">Files Used:</p>
            <p className="text-xs text-gray-600 font-mono">{comparisonResult.data_info?.labeled_file}</p>
            <p className="text-xs text-gray-600 font-mono">{comparisonResult.data_info?.tfidf_matrix_file}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Play className="w-8 h-8 text-indigo-500" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Naive Bayes Training</h2>
            <p className="text-gray-600">Automatic comparison between balancing and non-balancing approaches</p>
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

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Dataset Status */}
          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <Database className="w-6 h-6 text-blue-500" />
              <span className="text-2xl font-bold text-blue-700">
                {labeledFiles.length}
              </span>
            </div>
            <p className="text-sm text-blue-800 font-medium">samples available</p>
          </div>

          {/* System Status */}
          <div className={`p-4 rounded-lg border ${
            isSystemReady 
              ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200' 
              : 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <Zap className={`w-6 h-6 ${isSystemReady ? 'text-green-500' : 'text-yellow-500'}`} />
              <span className={`text-sm font-semibold px-2 py-1 rounded ${
                isSystemReady ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'
              }`}>
                {isSystemReady ? 'Ready' : 'Check Dependencies'}
              </span>
            </div>
            <p className={`text-sm font-medium ${
              isSystemReady ? 'text-green-800' : 'text-yellow-800'
            }`}>
              {requirements?.message || 'Checking...'}
            </p>
          </div>

          {/* Best Accuracy */}
          <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-6 h-6 text-purple-500" />
              <span className="text-2xl font-bold text-purple-700">
                {comparisonResult ? `${(Math.max(
                  comparisonResult["balancing"].accuracy,
                  comparisonResult["non_balancing"].accuracy
                ) * 100).toFixed(2)}%` : 'N/A'}
              </span>
            </div>
            <p className="text-sm text-purple-800 font-medium">best accuracy</p>
          </div>
        </div>

        {/* Training Form */}
        <form onSubmit={handleTrain} className="space-y-4 mb-6">
          {/* Labeled File Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Labeled Dataset
            </label>
            {loadingFiles ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader className="w-4 h-4 animate-spin" />
                Loading files...
              </div>
            ) : labeledFiles.length === 0 ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800">No labeled files available. Please run auto-labeling first.</p>
              </div>
            ) : (
              <select
                value={config.labeled_file}
                onChange={(e) => setConfig({ ...config, labeled_file: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              >
                <option value="">-- Select Labeled File --</option>
                {labeledFiles.map((file) => (
                  <option 
                    key={file.id} 
                    value={file.outputfilename}
                    disabled={!file.fileexists}
                  >
                    {file.outputfilename} ({file.totallabeled} rows) - by {file.labeledby}
                    {!file.fileexists && ' ⚠️ File not found'}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* TF-IDF File Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select TF-IDF Matrix
            </label>
            {loadingFiles ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader className="w-4 h-4 animate-spin" />
                Loading files...
              </div>
            ) : tfidfFiles.length === 0 ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800">No TF-IDF files available. Please generate TF-IDF first.</p>
              </div>
            ) : (
              <select
                value={config.tfidf_matrix_file}
                onChange={(e) => setConfig({ ...config, tfidf_matrix_file: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              >
                <option value="">-- Select TF-IDF Matrix --</option>
                {tfidfFiles.map((file) => (
                  <option 
                    key={file.id} 
                    value={file.matrix_path}
                    disabled={!file.files_exist.matrix}
                  >
                    {file.matrix_path} ({file.matrix_shape.rows} × {file.matrix_shape.cols}) - by {file.created_by}
                    {!file.files_exist.matrix && ' ⚠️ File not found'}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* N-Splits */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Folds (K-Fold Cross-Validation)
            </label>
            <input
              type="number"
              value={config.n_splits}
              onChange={(e) => setConfig({ ...config, n_splits: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              min="2"
              max="20"
            />
            <p className="mt-1 text-xs text-gray-500">
              Dataset split into {config.n_splits} parts, train on {config.n_splits - 1}, test on 1, repeat {config.n_splits} times
            </p>
          </div>

          {/* Info Box */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              What will happen?
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Non-Balancing:</strong> Train on original imbalanced data</li>
              <li>• <strong>Balancing:</strong> Apply Tomek Links + Random Undersampling per fold</li>
              <li>• <strong>Algorithm:</strong> Probabilistic classifier based on Bayes' theorem</li>
              <li>• <strong>Evaluation:</strong> {config.n_splits}-Fold Cross-Validation</li>
              <li>• <strong>Result:</strong> Final scores are averaged across all folds</li>
            </ul>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !isSystemReady || !config.labeled_file || !config.tfidf_matrix_file}
            className="w-full py-3 bg-indigo-500 text-white rounded-lg font-semibold hover:bg-indigo-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Training both balancing and non-balancing approaches...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Start Training (Both Approaches)
              </>
            )}
          </button>

          {/* Progress Bar */}
          {loading && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-indigo-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${trainingProgress}%` }}
                ></div>
              </div>
              <p className="text-center text-sm text-gray-600 mt-2">
                {trainingProgress < 30 && 'Initializing training...'}
                {trainingProgress >= 30 && trainingProgress < 60 && 'Training non-balancing model...'}
                {trainingProgress >= 60 && trainingProgress < 90 && 'Training balancing model...'}
                {trainingProgress >= 90 && 'Finalizing results...'}
              </p>
            </div>
          )}
        </form>

        {/* Results */}
        {renderComparison()}
      </div>
    </div>
  );
};

export default NaiveBayesPageTrain;
