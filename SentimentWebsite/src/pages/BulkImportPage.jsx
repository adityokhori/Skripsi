// BulkImportPage.jsx
import React, { useState } from 'react';
import { 
  Upload, 
  Database, 
  AlertCircle, 
  CheckCircle, 
  Loader,
  FileText,
  Zap, 
  Search,
  RefreshCw
} from 'lucide-react';
import api from '../../api/axios';

const BulkImportPage = ({ currentUser }) => {
  const [method, setMethod] = useState('file_path'); // 'file_path' or 'upload'
  
  // File Path Method
  const [filePath, setFilePath] = useState('');
  const [description, setDescription] = useState('');
  
  // Upload Method
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedFilePath, setUploadedFilePath] = useState('');
  
  // State
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [availableFiles, setAvailableFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Load available files
  const loadAvailableFiles = async () => {
    setLoadingFiles(true);
    try {
      const response = await api.get('/list-csv-files');
      setAvailableFiles(response.data.files || []);
    } catch (err) {
      console.error('Failed to load files:', err);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleFileSelect = (file) => {
    setFilePath(file.relative_path);
    setShowFileBrowser(false);
  };

  // Filter files
  const filteredFiles = availableFiles.filter(file => 
    file.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.path.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ... existing code ...

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* ... existing header ... */}

        {/* Method 1: File Path with Browser */}
        {method === 'file_path' && (
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                File Path (CSV)
              </label>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  placeholder="Example: GetProcessed_new2.csv"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                
                {/* ✅ Browse Button */}
                <button
                  onClick={() => {
                    setShowFileBrowser(!showFileBrowser);
                    if (!showFileBrowser && availableFiles.length === 0) {
                      loadAvailableFiles();
                    }
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  Browse
                </button>
              </div>
              
              <p className="mt-1 text-xs text-gray-500">
                💡 Click "Browse" to see available files or enter path manually
              </p>
            </div>

            {/* ✅ File Browser Panel */}
            {showFileBrowser && (
              <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-blue-900">Available CSV Files</h3>
                  <button
                    onClick={loadAvailableFiles}
                    disabled={loadingFiles}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingFiles ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>

                {/* Search */}
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search files..."
                  className="w-full px-3 py-2 border border-blue-300 rounded mb-3 text-sm"
                />

                {/* File List */}
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {loadingFiles ? (
                    <div className="text-center py-4">
                      <Loader className="w-5 h-5 animate-spin mx-auto text-blue-500" />
                      <p className="text-sm text-gray-600 mt-2">Loading files...</p>
                    </div>
                  ) : filteredFiles.length === 0 ? (
                    <p className="text-sm text-gray-600 text-center py-4">
                      No files found
                    </p>
                  ) : (
                    filteredFiles.map((file, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleFileSelect(file)}
                        className="w-full text-left p-3 bg-white rounded border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-800 text-sm">
                              {file.filename}
                              {file.is_processed && (
                                <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                  Processed
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">{file.relative_path}</p>
                            <div className="flex gap-3 mt-1 text-xs text-gray-500">
                              <span>{file.size_mb} MB</span>
                              <span>~{file.estimated_rows?.toLocaleString()} rows</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Description field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Example: Dataset asli 12,232 rows hasil preprocessing"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* ... rest of the component ... */}
      </div>
    </div>
  );
};

export default BulkImportPage;