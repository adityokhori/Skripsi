import React, { useState } from "react";
import { Youtube, MessageSquare, Plus } from "lucide-react";

const DataCollectionPage = ({
  maxComments,
  setMaxComments,
  isLoading,
  setIsLoading,
  collectedData,
  setCollectedData,
}) => {
  const [videoUrls, setVideoUrls] = useState([""]); 
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const handleAddLink = () => setVideoUrls([...videoUrls, ""]);

  const handleChangeLink = (index, value) => {
    const newUrls = [...videoUrls];
    newUrls[index] = value;
    setVideoUrls(newUrls);
  };

  const handleDataCollection = async () => {
    if (videoUrls.length === 0 || !maxComments) return;
    setIsLoading(true);
    let allComments = [];

    try {
      for (let url of videoUrls) {
        if (!url) continue;
        const response = await fetch("http://127.0.0.1:8000/get-comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            video_url: url,
            max_comments: parseInt(maxComments),
          }),
        });

        const data = await response.json();
        if (data.error) {
          alert(`Gagal mengambil komentar dari ${url}: ${data.error}`);
        } else {
          allComments = [...allComments, ...data.comments];
        }
      }
      setCollectedData(allComments);
      setCurrentPage(1);
      alert(`Berhasil mengumpulkan total ${allComments.length} komentar dari ${videoUrls.length} video`);
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan koneksi ke backend");
    }

    setIsLoading(false);
  };

  // pagination logic
  const totalPages = Math.ceil(collectedData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentData = collectedData.slice(startIndex, startIndex + rowsPerPage);

  return (
    <div className="max-w-4xl">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center space-x-3 mb-4">
          <Youtube className="h-8 w-8 text-red-500" />
          <h2 className="text-xl font-semibold text-gray-800">
            Pengumpulan Data Komentar YouTube
          </h2>
        </div>
        <p className="text-gray-600 mb-8">
          Mengumpulkan komentar dari satu atau lebih video YouTube terkait peluncuran DANANTARA untuk analisis sentimen.
        </p>

        {/* input dynamic untuk banyak link */}
        {videoUrls.map((url, idx) => (
          <div key={idx} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL Video YouTube #{idx + 1}
            </label>
            <div className="relative">
              <Youtube className="absolute left-3 top-1/2 transform -translate-y-1/2 text-red-500" size={20} />
              <input
                type="text"
                value={url}
                onChange={(e) => handleChangeLink(idx, e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full pl-12 pr-4 py-3 border-2 border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
              />
            </div>
          </div>
        ))}

        <button
          onClick={handleAddLink}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg mb-6 hover:bg-green-700"
        >
          <Plus size={18} />
          <span>Tambah Link</span>
        </button>

        {/* input maksimal komentar */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Maksimal Komentar per Video
          </label>
          <div className="relative">
            <MessageSquare className="absolute left-3 top-1/2 transform -translate-y-1/2 text-red-500" size={20} />
            <input
              type="number"
              value={maxComments}
              onChange={(e) => setMaxComments(e.target.value)}
              placeholder="Contoh: 500"
              min="1"
              max="50000"
              className="w-full pl-12 pr-4 py-3 border-2 border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex justify-center pt-4">
          <button
            onClick={handleDataCollection}
            disabled={isLoading || !maxComments}
            className={`px-8 py-3 rounded-lg font-medium text-white transition-all ${
              isLoading || !maxComments
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700 hover:shadow-lg transform hover:-translate-y-0.5"
            }`}
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Mengumpulkan Data...</span>
              </div>
            ) : (
              "Mulai Pengumpulan Data"
            )}
          </button>
        </div>
      </div>

      {/* tampilkan data */}
      {collectedData.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Data Komentar Terkumpul
          </h3>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-green-800">
              ✅ Berhasil mengumpulkan {collectedData.length} komentar
            </p>
          </div>

          {/* pilih jumlah baris */}
          <div className="mb-4 flex items-center gap-2">
            <label className="text-sm text-gray-700">Tampilkan:</label>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border rounded p-1 text-sm"
            >
              <option value={5}>5 baris</option>
              <option value={10}>10 baris</option>
            </select>
          </div>

          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">ID</th>
                  <th className="px-4 py-2 text-left">Komentar</th>
                  <th className="px-4 py-2 text-left">Author</th>
                  <th className="px-4 py-2 text-left">Likes</th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((comment) => (
                  <tr key={comment.id} className="border-b">
                    <td className="px-4 py-2">{comment.id}</td>
                    <td className="px-4 py-2 max-w-md truncate">{comment.comment}</td>
                    <td className="px-4 py-2">{comment.author}</td>
                    <td className="px-4 py-2">{comment.likes}</td>
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
  );
};

export default DataCollectionPage;
