import { useEffect, useState } from "react";

function App() {
  const [aadhaar, setAadhaar] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState("");
  const [pdfReady, setPdfReady] = useState(false);
  const [qrData, setQrData] = useState("");
  const [qrVisible, setQrVisible] = useState(false);
  const [captchaImageUrl, setCaptchaImageUrl] = useState(null);

  const backendBase = "http://localhost:6969";

  const post = async (path, data) => {
    try {
      const res = await fetch(`${backendBase}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (path === "/set-aadhaar") {
        const json = await res.json();
        if (json.captcha_ready) {
          setCaptchaImageUrl(`${backendBase}/captcha-image?${Date.now()}`);
        }
      }

      if (path === "/set-otp") {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "aadhaar_locked.pdf");
        document.body.appendChild(link);
        link.click();
        link.remove();
        setPdfReady(true);
      }
    } catch (err) {
      console.error("Error in POST:", err);
    }
  };

  const fetchLockedPdf = async () => {
    try {
      const response = await fetch(`${backendBase}/download-pdf`);
      if (!response.ok) throw new Error("PDF not found");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "aadhaar_locked.pdf");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Failed to fetch locked PDF:", err);
      alert("❌ PDF not available yet");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white shadow-lg rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-semibold text-center mb-4">Aadhaar Automation</h2>

        <input
          className="w-full p-2 border rounded mb-2"
          placeholder="Enter Aadhaar"
          value={aadhaar}
          onChange={(e) => setAadhaar(e.target.value)}
        />
        <button
          className="w-full bg-blue-600 text-white p-2 rounded mb-4 hover:bg-blue-700 transition"
          onClick={() => post("/set-aadhaar", { aadhaar })}
        >
          Submit Aadhaar
        </button>

        {captchaImageUrl && (
          <div className="mb-4">
            <strong>CAPTCHA:</strong>
            <img
              src={captchaImageUrl}
              alt="CAPTCHA"
              className="w-full border rounded mt-2"
            />
          </div>
        )}

        <input
          className="w-full p-2 border rounded mb-2"
          placeholder="Enter CAPTCHA"
          value={captcha}
          onChange={(e) => setCaptcha(e.target.value)}
        />
        <button
          className="w-full bg-blue-600 text-white p-2 rounded mb-4 hover:bg-blue-700 transition"
          onClick={() => post("/set-captcha", { captcha })}
        >
          Submit CAPTCHA
        </button>

        <input
          className="w-full p-2 border rounded mb-2"
          placeholder="Enter OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
        />
        <button
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition"
          onClick={() => post("/set-otp", { otp })}
        >
          Submit OTP
        </button>

        {pdfReady && (
          <button
            className="w-full bg-green-600 text-white p-2 rounded mt-4 hover:bg-green-700 transition"
            onClick={fetchLockedPdf}
          >
            📥 Fetch Locked PDF
          </button>
        )}
      </div>
    </div>
  );
}

export default App;
