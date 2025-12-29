// LabellingPage.jsx
import React, { useState, useEffect } from 'react';
import { Target, Loader, CheckCircle, AlertCircle, PieChart } from 'lucide-react';
import api from '../../api/axios';

const LabellingPage = ({ currentUser }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  
  // ✅ State untuk file selector
  const [preprocessedFiles, setPreprocessedFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [selectedFile, setSelectedFile] = useState('');
  
  const [config, setConfig] = useState({
    input_file: '' // ✅ Will be set from selected file
  });

  // ✅ Load preprocessed files saat komponen dimuat
  useEffect(() => {
    loadPreprocessedFiles();
  }, []);

  const loadPreprocessedFiles = async () => {
    setLoadingFiles(true);
    try {
      const response = await api.get('/preprocessed-files');
      setPreprocessedFiles(response.data.files || []);
      
      // Auto-select file terbaru jika ada
      if (response.data.files && response.data.files.length > 0) {
        const latest = response.data.files[0];
        console.log(response.data.files[0]);
        setSelectedFile(latest.output_filename);
        setConfig({ input_file: latest.output_filename });
      }
    } catch (err) {
      console.error('Failed to load preprocessed files:', err);
    } finally {
      setLoadingFiles(false);
    }
  };

  // ✅ Handle file selection
  const handleFileChange = (filename) => {
    setSelectedFile(filename);
    setConfig({ input_file: filename });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!config.input_file) {
      setError('Please select a preprocessed file to label');
      return;
    }
    
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await api.post('/auto-label', config);
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Labelling failed');
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Target className="w-8 h-8 text-purple-500" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Auto Labelling</h2>
            <p className="text-gray-600">Automatic sentiment labeling using lexicon-based approach</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ✅ File Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Preprocessed File to Label
            </label>
            {loadingFiles ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader className="w-4 h-4 animate-spin" />
                Loading files...
              </div>
            ) : preprocessedFiles.length === 0 ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800">No preprocessed files available. Please run preprocessing first.</p>
              </div>
            ) : (
              <select
                value={selectedFile}
                onChange={(e) => handleFileChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              >
                <option value="">-- Select File --</option>
                {preprocessedFiles.map((file) => (
                  <option 
                    key={file.id} 
                    value={file.outputfilename}
                    disabled={!file.fileexists}
                  >
                    {file.outputfilename} ({file.totalprocessed} rows) 
                    {!file.fileexists && ' - File not found'}
                  </option>
                ))}
              </select>
            )}
            
            {/* ✅ Show selected file info */}
            {selectedFile && (
              <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm text-purple-800">
                  <strong>Selected:</strong> {selectedFile}
                  {preprocessedFiles.find(f => f.outputfilename === selectedFile) && (
                    <span className="ml-2 text-gray-600">
                      • {preprocessedFiles.find(f => f.outputfilename === selectedFile).totalprocessed} rows
                      • Processed by: {preprocessedFiles.find(f => f.outputfilename === selectedFile).processedby}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Uses Indonesian sentiment lexicon dictionary</li>
              <li>• Calculates sentiment score for each comment</li>
              <li>• Classifies as: <strong>Positive</strong> (score &gt; 0), <strong>Negative</strong> (score &lt; 0), or <strong>Neutral</strong> (score = 0)</li>
              <li>• Results saved to CSV file for TF-IDF processing</li>
            </ul>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !selectedFile}
            className="w-full py-3 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              'Start Auto Labelling'
            )}
          </button>
        </form>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800">Error</h3>
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Success Result */}
        {result && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-green-800">Success!</h3>
                <p className="text-green-600">{result.message}</p>
                
                {/* File Info */}
                <div className="mt-3 bg-white p-3 rounded border border-gray-200">
                  <p className="text-sm font-medium text-gray-700">Output File:</p>
                  <p className="text-sm font-mono text-gray-800 mt-1">{result.file}</p>
                  <div className="mt-2 text-xs text-gray-600">
                    <p><strong>Input:</strong> {result.input}</p>
                    <p><strong>Labeled by:</strong> {result.labeled_by}</p>
                  </div>
                </div>

                {/* Statistics */}
                <div className="mt-4 grid grid-cols-4 gap-3">
                  {/* Total */}
                  <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
                    <div className="flex items-center justify-center mb-1">
                      <PieChart className="w-5 h-5 text-gray-500" />
                    </div>
                    <p className="text-xs text-gray-600">Total</p>
                    <p className="text-xl font-bold text-gray-800">{result.statistics.total}</p>
                  </div>

                  {/* Positive */}
                  <div className="bg-green-50 p-3 rounded-lg border border-green-200 text-center">
                    <p className="text-xs text-green-700">Positive</p>
                    <p className="text-xl font-bold text-green-800">{result.statistics.positive}</p>
                    <p className="text-xs text-green-600">
                      {((result.statistics.positive / result.statistics.total) * 100).toFixed(1)}%
                    </p>
                  </div>

                  {/* Negative */}
                  <div className="bg-red-50 p-3 rounded-lg border border-red-200 text-center">
                    <p className="text-xs text-red-700">Negative</p>
                    <p className="text-xl font-bold text-red-800">{result.statistics.negative}</p>
                    <p className="text-xs text-red-600">
                      {((result.statistics.negative / result.statistics.total) * 100).toFixed(1)}%
                    </p>
                  </div>

                  {/* Neutral */}
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-center">
                    <p className="text-xs text-gray-700">Neutral</p>
                    <p className="text-xl font-bold text-gray-800">{result.statistics.neutral}</p>
                    <p className="text-xs text-gray-600">
                      {((result.statistics.neutral / result.statistics.total) * 100).toFixed(1)}%
                    </p>
                  </div>
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
