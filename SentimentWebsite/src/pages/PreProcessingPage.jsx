// PreProcessingPage.jsx
import React, { useState, useEffect } from 'react';
import { FileText, Loader, CheckCircle, AlertCircle, Settings, List } from 'lucide-react';
import api from '../../api/axios';

const PreProcessingPage = ({ currentUser }) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  
  // ✅ State untuk dataset selector
  const [datasets, setDatasets] = useState([]);
  const [loadingDatasets, setLoadingDatasets] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState('');
  
  const [config, setConfig] = useState({
    input_file: '',
    num_cores: 8,        // ✅ Default value tetap
    batch_size: 100,     // ✅ Default value tetap
    skip_translation: false
  });

  // ✅ Load datasets saat komponen dimuat
  useEffect(() => {
    loadDatasets();
  }, []);

  const loadDatasets = async () => {
    setLoadingDatasets(true);
    try {
      const response = await api.get('/datasets');
      setDatasets(response.data.datasets || []);
      
      // Auto-select dataset terbaru jika ada
      if (response.data.datasets && response.data.datasets.length > 0) {
        const latest = response.data.datasets[0];
        console.log(response.data.datasets[0]);
        setSelectedDataset(latest.filename);
        setConfig(prev => ({
          ...prev,
          input_file: latest.filename
        }));
      }
    } catch (err) {
      console.error('Failed to load datasets:', err);
    } finally {
      setLoadingDatasets(false);
    }
  };

  // ✅ Handle dataset selection
  const handleDatasetChange = (filename) => {
    setSelectedDataset(filename);
    setConfig(prev => ({
      ...prev,
      input_file: filename
    }));
  };

  // Progress polling
  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(async () => {
        try {
          const response = await api.get('/progress');
          setProgress(response.data.progress || 0);
        } catch (err) {
          console.error('Error fetching progress:', err);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!config.input_file) {
      setError('Please select a dataset to preprocess');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setProgress(0);

    try {
      const response = await api.post('/preprocess', config);
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Preprocessing failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="w-8 h-8 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-800">Data Preprocessing</h1>
        </div>
        <p className="text-gray-600">
          Clean and normalize text data for analysis
        </p>
      </div>

      {/* Main Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ✅ Dataset Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Dataset to Preprocess
            </label>
            {loadingDatasets ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader className="w-4 h-4 animate-spin" />
                Loading datasets...
              </div>
            ) : datasets.length === 0 ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800">No datasets available. Please crawl data first.</p>
              </div>
            ) : (
              <select
                value={selectedDataset}
                onChange={(e) => handleDatasetChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">-- Select Dataset --</option>
                {datasets.map((dataset) => (
                  <option 
                    key={dataset.id} 
                    value={dataset.filename}
                    disabled={!dataset.file_exists}
                  >
                    {dataset.filename} ({dataset.totalrows} rows) 
                    {!dataset.file_exists && ' - File not found'}
                  </option>
                ))}
              </select>
            )}
            
            {/* ✅ Show selected dataset info */}
            {selectedDataset && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Selected:</strong> {selectedDataset}
                  {datasets.find(d => d.filename === selectedDataset) && (
                    <span className="ml-2 text-gray-600">
                      • {datasets.find(d => d.filename === selectedDataset).total_rows} rows
                      • {datasets.find(d => d.filename === selectedDataset).file_size_mb} MB
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* ✅ INFO: num_cores dan batch_size sudah dihapus dari tampilan */}
          {/* Nilai default otomatis: num_cores = 8, batch_size = 100 */}

          {/* Skip Translation Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="skip_translation"
              checked={config.skip_translation}
              onChange={(e) => setConfig({ ...config, skip_translation: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="skip_translation" className="text-sm text-gray-700">
              Skip Translation (faster processing)
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !selectedDataset}
            className="w-full py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Processing... {progress}%
              </>
            ) : (
              'Start Preprocessing'
            )}
          </button>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Success Result */}
      {result && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-green-800 font-semibold">{result.message}</p>
              <p className="text-sm text-gray-600 mt-2">
                <strong>Output File:</strong> {result.output}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreProcessingPage;
