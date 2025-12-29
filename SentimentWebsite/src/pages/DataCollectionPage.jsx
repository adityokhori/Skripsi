// DataCollectionPage.jsx
import React, { useState } from 'react';
import { Youtube, CheckCircle, AlertCircle, Loader, Trash2, Plus } from 'lucide-react';
import api from '../../api/axios';

const DataCollectionPage = ({ maxComments, setMaxComments, setCollectedData, currentUser }) => {
  const [videoUrls, setVideoUrls] = useState(['']);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [crawledFiles, setCrawledFiles] = useState([]); // ✅ Track file yang berhasil di-crawl

  const handleAddUrl = () => {
    setVideoUrls([...videoUrls, '']);
  };

  const handleRemoveUrl = (index) => {
    const newUrls = videoUrls.filter((_, i) => i !== index);
    setVideoUrls(newUrls.length === 0 ? [''] : newUrls);
  };

  const handleUrlChange = (index, value) => {
    const newUrls = [...videoUrls];
    newUrls[index] = value;
    setVideoUrls(newUrls);
  };

  // DataCollectionPage.jsx
const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError('');
  setResult(null);

  const validUrls = videoUrls.filter((url) => url.trim() !== '');
  
  if (validUrls.length === 0) {
    setError('Please enter at least one valid YouTube URL');
    setLoading(false);
    return;
  }

  try {
    // ✅ Kirim semua URLs sekaligus ke backend
    const response = await api.post('/get-comments', {
      video_urls: validUrls,  // ✅ Array of URLs
      max_results: parseInt(maxComments) || 100
    });

    // ✅ Backend return 1 file untuk semua URLs
    setResult({
      status: 'success',
      message: response.data.message,
      count: response.data.count,
      videos: response.data.successful_videos || validUrls.length,
      file: response.data.file,  // ✅ 1 file saja
      dataset_id: response.data.dataset_id,
      crawled_by: currentUser,
    });

    setCollectedData(response.data.comments || []);

  } catch (err) {
    setError(err.response?.data?.detail || 'Failed to fetch comments');
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Youtube className="w-8 h-8 text-red-500" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Data Collection</h2>
            <p className="text-gray-600">Crawl YouTube comments for sentiment analysis</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Max Comments Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Comments per Video
            </label>
            <input
              type="number"
              value={maxComments}
              onChange={(e) => setMaxComments(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="100"
              min="1"
              max="10000"
            />
          </div>

          {/* Video URLs */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              YouTube Video URLs
            </label>
            <div className="space-y-2">
              {videoUrls.map((url, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => handleUrlChange(index, e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                  {videoUrls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveUrl(index)}
                      className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            <button
              type="button"
              onClick={handleAddUrl}
              className="mt-2 flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Another URL
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Crawling...
              </>
            ) : (
              'Start Crawling'
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
        {/* Success Result */}
        {result && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-green-800">Success!</h3>
                <p className="text-green-600">{result.message}</p>
                
                {/* ✅ Info file yang dibuat */}
                <div className="mt-3 bg-white p-3 rounded border border-gray-200">
                  <p className="text-sm font-medium text-gray-700">Dataset Created:</p>
                  <p className="text-sm font-mono text-gray-800 mt-1">{result.file}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div>
                      <span className="font-medium">Total Comments:</span> {result.count}
                    </div>
                    <div>
                      <span className="font-medium">Videos:</span> {result.videos}
                    </div>
                    <div>
                      <span className="font-medium">Dataset ID:</span> {result.dataset_id}
                    </div>
                    <div>
                      <span className="font-medium">Crawled by:</span> {result.crawled_by}
                    </div>
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

export default DataCollectionPage;
