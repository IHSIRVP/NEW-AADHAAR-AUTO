// src/components/PdfEsignFlow.jsx
import { useState } from "react";

export default function PdfEsignFlow() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [status, setStatus] = useState("Waiting for PDF upload...");
  const [esignResult, setEsignResult] = useState(null);

  const uploadPdfToBackend = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("http://localhost:6969/upload-pdf", {
      method: "POST",
      body: formData,
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || "Upload failed");
    return json.document_id;
  };

  const initEsign = async (document_id) => {
    const body = {
      pdf_pre_uploaded: true,
      pdf_document_id: document_id,
      callback_url: "https://example.com?state=test",
      config: {
        accept_selfie: true,
        allow_selfie_upload: true,
        accept_virtual_sign: true,
        track_location: true,
        auth_mode: "1",
        reason: "Contract",
        positions: {
          "1": [{ x: 10, y: 20 }]
        }
      },
      prefill_options: {
        full_name: "Munna Bhaiya",
        mobile_number: "9876543210",
        user_email: "ihsir.v@gmail.com"
      }
    };

    const res = await fetch("https://kyc-api.surepass.io/api/v1/esign/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message || "eSign init failed");
    return result;
  };

  const handleUploadAndEsign = async () => {
    try {
      if (!selectedFile) {
        alert("Please select a PDF file first.");
        return;
      }

      setStatus("📤 Uploading PDF...");
      const document_id = await uploadPdfToBackend(selectedFile);

      setStatus("✅ Uploaded. Initiating eSign...");
      const result = await initEsign(document_id);

      setStatus("🎉 eSign initiated successfully.");
      setEsignResult(result);
    } catch (err) {
      console.error("❌ Error during upload or init:", err);
      setStatus(`❌ ${err.message}`);
    }
  };

  return (
    <div className="bg-white p-6 rounded shadow-md border w-full">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Upload PDF & Start eSign</h2>

      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => setSelectedFile(e.target.files[0])}
        className="mb-4 w-full"
      />

      <button
        onClick={handleUploadAndEsign}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition"
      >
        🚀 Upload & Initialize eSign
      </button>

      <p className="mt-4 text-sm text-gray-700 whitespace-pre-line">{status}</p>

      {esignResult && (
        <pre className="mt-4 text-xs bg-gray-50 p-2 rounded border overflow-auto whitespace-pre-wrap">
          {JSON.stringify(esignResult, null, 2)}
        </pre>
      )}
    </div>
  );
}
