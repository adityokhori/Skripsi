// TFIDFPage.jsx
import React, { useState, useEffect } from 'react';
import { Database, BarChart3, Loader, CheckCircle, AlertCircle, Hash } from 'lucide-react';
import api from '../../api/axios';

const TFIDFPage = ({ currentUser }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  
  // ✅ State untuk file selector
  const [labeledFiles, setLabeledFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [selectedFile, setSelectedFile] = useState('');
  
  const [config, setConfig] = useState({
    input_file: '', // ✅ Will be set from selected file
    max_features: 5000
  });

  // ✅ Load labeled files saat komponen dimuat
  useEffect(() => {
    loadLabeledFiles();
  }, []);

  const loadLabeledFiles = async () => {
    setLoadingFiles(true);
    try {
      const response = await api.get('/labeled-files');
      setLabeledFiles(response.data.files || []);
      
      // Auto-select file terbaru jika ada
      if (response.data.files && response.data.files.length > 0) {
        const latest = response.data.files[0];
        console.log(response.data.files[0]);
        setSelectedFile(latest.outputfilename);
        setConfig(prev => ({ ...prev, input_file: latest.outputfilename }));
      }
    } catch (err) {
      console.error('Failed to load labeled files:', err);
    } finally {
      setLoadingFiles(false);
    }
  };

  // ✅ Handle file selection
  const handleFileChange = (filename) => {
    setSelectedFile(filename);
    setConfig(prev => ({ ...prev, input_file: filename }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!config.input_file) {
      setError('Please select a labeled file to process');
      return;
    }
    
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await api.post('/tfidf', config);
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'TF-IDF generation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Database className="w-8 h-8 text-indigo-500" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">TF-IDF Vectorization</h2>
            <p className="text-gray-600">Transform text into numerical feature vectors</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ✅ File Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Labeled File to Process
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
                value={selectedFile}
                onChange={(e) => handleFileChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              >
                <option value="">-- Select File --</option>
                {labeledFiles.map((file) => (
                  <option 
                    key={file.id} 
                    value={file.outputfilename}
                    disabled={!file.fileexists}
                  >
                    {file.outputfilename} ({file.totallabeled} rows) 
                    {!file.fileexists && ' - File not found'}
                  </option>
                ))}
              </select>
            )}
            
            {/* ✅ Show selected file info */}
            {selectedFile && (
              <div className="mt-2 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                <p className="text-sm text-indigo-800">
                  <strong>Selected:</strong> {selectedFile}
                  {labeledFiles.find(f => f.outputfilename === selectedFile) && (
                    <span className="ml-2 text-gray-600">
                      • {labeledFiles.find(f => f.outputfilename === selectedFile).totallabeled} rows
                      • Labeled by: {labeledFiles.find(f => f.outputfilename === selectedFile).labeledby}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Max Features Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Features
            </label>
            <input
              type="number"
              value={config.max_features}
              onChange={(e) => setConfig({ ...config, max_features: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              min="100"
              max="10000"
              step="100"
            />
            <p className="mt-1 text-xs text-gray-500">
              Number of unique terms to extract (higher = more detailed but slower)
            </p>
          </div>

          {/* Info Box */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">What is TF-IDF?</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li><strong>Term Frequency (TF):</strong> How often a word appears in a document</li>
              <li><strong>Inverse Document Frequency (IDF):</strong> How unique/rare a word is across all documents</li>
              <li><strong>TF-IDF Score:</strong> TF × IDF - Higher score = more important word for that document</li>
            </ul>
            <p className="mt-2 text-xs text-blue-700">
              <strong>Output Files:</strong> <code>tfidf_matrix_TIMESTAMP.pkl</code> - Sparse matrix of TF-IDF values, 
              <code>models/tfidf_vectorizer_TIMESTAMP.pkl</code> - Trained vectorizer model
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !selectedFile}
            className="w-full py-3 bg-indigo-500 text-white rounded-lg font-semibold hover:bg-indigo-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              'Generate TF-IDF Features'
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
                  <p className="text-sm font-medium text-gray-700">Output Files:</p>
                  <p className="text-xs font-mono text-gray-800 mt-1">Vectorizer: {result.vectorizer_saved}</p>
                  <p className="text-xs font-mono text-gray-800">Matrix: {result.matrix_saved}</p>
                  <div className="mt-2 text-xs text-gray-600">
                    <p><strong>Input:</strong> {result.input}</p>
                    <p><strong>Generated by:</strong> {result.generated_by}</p>
                  </div>
                </div>

                {/* Statistics */}
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {/* Matrix Shape */}
                  <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
                    <div className="flex items-center justify-center mb-1">
                      <BarChart3 className="w-5 h-5 text-indigo-500" />
                    </div>
                    <p className="text-xs text-gray-600">Matrix Shape</p>
                    <p className="text-lg font-bold text-gray-800">
                      {result.matrix_shape?.[0]} × {result.matrix_shape?.[1]}
                    </p>
                    <p className="text-xs text-gray-500">rows × columns</p>
                  </div>

                  {/* Features */}
                  <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
                    <div className="flex items-center justify-center mb-1">
                      <Hash className="w-5 h-5 text-blue-500" />
                    </div>
                    <p className="text-xs text-gray-600">Features</p>
                    <p className="text-lg font-bold text-gray-800">{result.num_features}</p>
                    <p className="text-xs text-gray-500">unique terms</p>
                  </div>

                  {/* Samples */}
                  <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
                    <div className="flex items-center justify-center mb-1">
                      <Database className="w-5 h-5 text-green-500" />
                    </div>
                    <p className="text-xs text-gray-600">Samples</p>
                    <p className="text-lg font-bold text-gray-800">{result.samples}</p>
                    <p className="text-xs text-gray-500">documents</p>
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

export default TFIDFPage;
