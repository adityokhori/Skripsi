import React, { useState, useEffect } from "react";
import { FileText } from 'lucide-react';

const PreProcessingPage = ({ collectedData }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: "idle" });
  const [processedData, setProcessedData] = useState([]);

  // pagination & sorting
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  useEffect(() => {
    let interval;
    if (isLoading) {
      interval = setInterval(async () => {
        const res = await fetch("http://127.0.0.1:8000/progress");
        const data = await res.json();
        setProgress(data);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);
  
  const handlePreProcessing = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/preprocess", { method: "POST" });
      const data = await response.json();
      setProcessedData(data.data);
      setCurrentPage(1); // reset halaman
      alert(`Selesai! Hasil disimpan di ${data.file}`);
    } catch (err) {
      console.error(err);
      alert("Error saat preprocessing");
    }
    setIsLoading(false);
  };

  // sorting handler
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedData = React.useMemo(() => {
    let sortableData = [...processedData];
    if (sortConfig.key) {
      sortableData.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === "asc" ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sortableData;
  }, [processedData, sortConfig]);

  // pagination
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentData = sortedData.slice(startIndex, startIndex + rowsPerPage);

  return (
    <div className="max-w-4xl">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Pre Processing Data</h2>
        <p className="text-gray-600 mb-8">
          Tahap pembersihan dan normalisasi data komentar YouTube sebelum dianalisis dengan Naïve Bayes.
        </p>
          <div className="space-y-6">
            {/* pipeline steps */}
            <div className="grid md:grid-cols-5 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900">Case Folding</h4>
                <p className="text-sm text-blue-700">Konversi ke huruf kecil</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900">Cleaning</h4>
                <p className="text-sm text-green-700">Hapus URL, mention, emoji</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-medium text-purple-900">Tokenizing</h4>
                <p className="text-sm text-purple-700">Pemecahan kata</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <h4 className="font-medium text-orange-900">Stopword Removal</h4>
                <p className="text-sm text-orange-700">Hapus kata tidak penting</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <h4 className="font-medium text-orange-900">Stemming</h4>
                <p className="text-sm text-orange-700">Mengubah berbagai bentuk kata menjadi satu bentuk dasar</p>
              </div>
            </div>

            {/* button */}
            <button
              onClick={handlePreProcessing}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isLoading ? 'Memproses Data...' : 'Mulai Pre Processing'}
            </button>

            {/* progress bar */}
            {isLoading && (
              <div className="mt-4">
                <p>Progress: {progress.current} / {progress.total}</p>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-green-600 h-4 rounded-full"
                    style={{ width: `${progress.total ? (progress.current / progress.total) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* hasil preprocess */}
            {processedData.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Hasil Pre Processing</h3>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="text-green-800">✅ {processedData.length} komentar berhasil diproses</p>
                </div>

                {/* pilih jumlah baris */}
                <div className="mb-4 flex items-center gap-2">
                  <label className="text-sm text-gray-700">Tampilkan:</label>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1); // reset ke halaman pertama
                    }}
                    className="border rounded p-1 text-sm"
                  >
                    <option value={5}>5 baris</option>
                    <option value={10}>10 baris</option>
                  </select>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm border">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left cursor-pointer" onClick={() => handleSort("comment")}>
                          Original
                        </th>
                        <th className="px-4 py-2 text-left cursor-pointer" onClick={() => handleSort("finalText")}>
                          Final Text
                        </th>
                        <th className="px-4 py-2 text-left cursor-pointer" onClick={() => handleSort("tokens")}>
                          Tokens
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentData.map((comment, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="px-4 py-2 max-w-xs truncate">{comment.comment}</td>
                          <td className="px-4 py-2 max-w-xs truncate">{comment.finalText}</td>
                          <td className="px-4 py-2">{comment.tokens.length} tokens</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* pagination controls */}
                <div className="flex justify-end items-center gap-2 mt-3">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm">
                    Halaman {currentPage} dari {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
      </div>
    </div>
  );
};

export default PreProcessingPage;
