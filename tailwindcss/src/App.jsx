// src/App.jsx
import { useState } from "react";
import AadhaarAutomation from "./components/AadhaarAutomation";
import ImageCaptureCropper from "./components/ImageCaptureCropper";
import PdfEsignFlow from "./components/ PdfEsignFlow"; // ✅ Fixed import path

function App() {
  const [showKYC, setShowKYC] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [showEsign, setShowEsign] = useState(false);

  const handleShowKYC = () => {
    setShowKYC(true);
    setShowPhoto(false);
    setShowEsign(false);
  };

  const handleShowPhoto = () => {
    setShowKYC(false);
    setShowPhoto(true);
    setShowEsign(false);
  };

  const handleShowEsign = () => {
    setShowKYC(false);
    setShowPhoto(false);
    setShowEsign(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-10 flex flex-col items-center">
      <div className="max-w-5xl w-full space-y-10">
        <h1 className="text-4xl font-bold text-center text-gray-800">Aadhaar KYC Portal</h1>

        <div className="flex flex-wrap justify-center gap-6">
          <button
            className="px-6 py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
            onClick={handleShowKYC}
          >
            🚀 Start Aadhaar KYC
          </button>

          <button
            className="px-6 py-3 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-700 transition"
            onClick={handleShowPhoto}
          >
            📸 Capture & Crop Photo
          </button>

          <button
            className="px-6 py-3 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 transition"
            onClick={handleShowEsign}
          >
            📝 Upload PDF & Start eSign
          </button>
        </div>

        <div className="space-y-10">r
          
          {showKYC && <AadhaarAutomation />}
          {showPhoto && <ImageCaptureCropper />}
          {showEsign && <PdfEsignFlow />}
        </div>
      </div>
    </div>
  );
}

export default App;
