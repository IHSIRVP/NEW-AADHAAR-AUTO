import { useEffect, useState } from "react";

function App() {
  const [aadhaar, setAadhaar] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [otp, setOtp] = useState("");
  const [pdfPassword, setPdfPassword] = useState("");
  const [status, setStatus] = useState("");
  const [pdfReady, setPdfReady] = useState(false);
  const [qrData, setQrData] = useState("");
  const [qrVisible, setQrVisible] = useState(false);
  const [aadhaarInfo, setAadhaarInfo] = useState(null);
  const [captchaImageUrl, setCaptchaImageUrl] = useState(null);

  const backendBase = "http://localhost:6969";

  const post = async (path, data) => {
    try {
      const res = await fetch(`${backendBase}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (json.qr_text) {
        setQrData(json.qr_text);
        setQrVisible(true);
      }

      if (path === "/set-aadhaar" && json.captcha_ready) {
        setCaptchaImageUrl(`${backendBase}/captcha-image?${Date.now()}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAadhaarInfo = async () => {
    try {
      const res = await fetch(`${backendBase}/aadhaar-details`);
      const json = await res.json();
      if (json.status === "success") {
        setAadhaarInfo(json.details);
      }
    } catch (err) {
      console.error("❌ Fetch Aadhaar info error:", err);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(`${backendBase}/download-pdf`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "aadhaar.pdf");
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (e) {
      console.error("Download failed:", e);
    }
  };

  const submitPdfPassword = async () => {
    try {
      const res = await fetch(`${backendBase}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pdfPassword }),
      });
      const json = await res.json();
      if (json.status === "success") {
        setStatus("✅ PDF unlocked successfully.");
        fetchAadhaarInfo();
      } else {
        setStatus("❌ " + json.message);
      }
    } catch (err) {
      console.error("Unlock failed:", err);
      setStatus("❌ Failed to unlock PDF.");
    }
  };

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${backendBase}/status`);
        const json = await res.json();
        setStatus(json.status);
        setPdfReady(json.pdf_ready);
        if (json.qr_text) {
          setQrData(json.qr_text);
          setQrVisible(true);
        }
      } catch {
        setStatus("⚠️ Unable to reach backend");
      }
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white shadow-lg rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-semibold text-center mb-4">Aadhaar Automation</h2>

        {pdfReady ? (
          <div className="text-green-600 text-center">
            <p className="text-lg font-medium mb-4">✅ {status}</p>
            <button
              className="w-full bg-green-600 text-white p-2 rounded mb-2 hover:bg-green-700 transition"
              onClick={handleDownload}
            >
              📥 Download Aadhaar PDF
            </button>
            <div className="mt-4">
              <input
                className="w-full p-2 border rounded mb-2"
                type="password"
                placeholder="Enter PDF Password"
                value={pdfPassword}
                onChange={(e) => setPdfPassword(e.target.value)}
              />
              <button
                className="w-full bg-purple-600 text-white p-2 rounded hover:bg-purple-700 transition"
                onClick={submitPdfPassword}
              >
                🔓 Unlock PDF
              </button>
            </div>
          </div>
        ) : (
          <>
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
          </>
        )}

        {qrVisible && qrData && (
          <div className="mt-4 text-xs bg-gray-100 p-2 rounded">
            <strong>QR Data:</strong>
            <pre className="whitespace-pre-wrap break-words">{qrData}</pre>
          </div>
        )}

        <p className="text-center text-gray-500 text-sm mt-4">{status}</p>
      </div>
    </div>
  );
}

export default App;
