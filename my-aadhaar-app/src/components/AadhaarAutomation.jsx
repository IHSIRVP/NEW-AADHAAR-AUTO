// src/components/AadhaarAutomation.jsx
import { useEffect, useState } from "react";

export default function AadhaarAutomation() {
  const [aadhaar, setAadhaar] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [otp, setOtp] = useState("");
  const [passcode, setPasscode] = useState("");
  const [status, setStatus] = useState("🔄 Starting application...");
  const [pdfReady, setPdfReady] = useState(false);
  const [qrData, setQrData] = useState("");
  const [qrVisible, setQrVisible] = useState(false);
  const [captchaImageUrl, setCaptchaImageUrl] = useState(null);
  const [otpVisible, setOtpVisible] = useState(false);

  const backendBase = "https://cc4e-114-143-58-30.ngrok-free.app"; 

  useEffect(() => {
    const pollStatus = async () => {
      try {
        const res = await fetch(`${backendBase}/status`);
        const json = await res.json();
        if (json.status) setStatus(json.status);
      } catch {
        setStatus("❌ Backend not reachable.");
      }
    };
    const intervalId = setInterval(pollStatus, 3000);
    pollStatus();
    return () => clearInterval(intervalId);
  }, []);

  const post = async (path, data) => {
    try {
      setStatus(`📡 Sending request to ${path}...`);
      const res = await fetch(`${backendBase}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorMsg = await res.text();
        setStatus(`❌ ${path} failed: ${errorMsg}`);
        return;
      }

      if (path === "/set-aadhaar") {
        const json = await res.json();
        if (json.captcha_ready) {
          setCaptchaImageUrl(`${backendBase}/captcha-image?${Date.now()}`);
          setStatus("📷 CAPTCHA loaded. Enter it below.");
        } else {
          setStatus("⚠️ Aadhaar submission failed.");
        }
      }

      if (path === "/set-captcha") {
        setStatus("📨 OTP is being sent. Enter it once received.");
        setOtpVisible(true);
      }

      if (path === "/set-otp") {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        setPdfReady(true);

        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (!isMobile) {
          setTimeout(() => {
            const link = document.createElement("a");
            link.href = url;
            link.download = "aadhaar_locked.pdf";
            link.click();
            window.URL.revokeObjectURL(url);
          }, 100);
          setStatus("✅ Locked PDF downloaded. Enter passcode to unlock.");
        } else {
          setStatus("✅ OTP accepted. You can now unlock and scan the PDF.");
        }
      }

      if (path === "/unlock") {
        const json = await res.json();
        setStatus(
          json.status === "success"
            ? "✅ PDF Unlocked and Decoded."
            : "❌ " + json.message
        );
      }

      if (path === "/scan") {
        const json = await res.json();
        if (json.status === "success") {
          setQrData(JSON.stringify(json.data, null, 2));
          setQrVisible(true);
          setStatus("✅ QR scanned and verified.");
        } else {
          setStatus("❌ QR scan failed: " + json.message);
          setQrData("⚠️ No QR data found.");
          setQrVisible(true);
        }
      }
    } catch (err) {
      console.error("Error in POST:", err);
      setStatus("❌ Request failed: " + err.message);
    }
  };

  const fetchLockedPdf = async () => {
    try {
      setStatus("📥 Fetching locked PDF from server...");
      const response = await fetch(`${backendBase}/download-pdf`);
      if (!response.ok) throw new Error("PDF not found");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      setTimeout(() => {
        const link = document.createElement("a");
        link.href = url;
        link.download = "aadhaar_locked.pdf";
        link.click();
        window.URL.revokeObjectURL(url);
      }, 100);
      setStatus("✅ Locked PDF fetched again.");
    } catch (err) {
      setStatus("❌ PDF not available yet.");
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-lg p-6 w-full max-w-md">
      <h2 className="text-2xl font-semibold text-center mb-4">
        Aadhaar Automation
      </h2>

      <input
        className="w-full p-2 border rounded mb-2"
        placeholder="Enter Aadhaar"
        value={aadhaar}
        onChange={(e) => setAadhaar(e.target.value)}
      />
      <button
        className="w-full bg-blue-600 text-white p-2 rounded mb-4 hover:bg-blue-700"
        onClick={() => post("/set-aadhaar", { aadhaar })}
      >
        Submit Aadhaar
      </button>

      {captchaImageUrl && (
        <>
          <img src={captchaImageUrl} alt="CAPTCHA" className="w-full mb-2" />
          <input
            className="w-full p-2 border rounded mb-2"
            placeholder="Enter CAPTCHA"
            value={captcha}
            onChange={(e) => setCaptcha(e.target.value)}
          />
          <button
            className="w-full bg-blue-600 text-white p-2 rounded mb-4 hover:bg-blue-700"
            onClick={() => post("/set-captcha", { captcha })}
          >
            Submit CAPTCHA
          </button>
        </>
      )}

      {otpVisible && (
        <>
          <input
            className="w-full p-2 border rounded mb-2"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          <button
            className="w-full bg-blue-600 text-white p-2 rounded mb-4 hover:bg-blue-700"
            onClick={() => post("/set-otp", { otp })}
          >
            Submit OTP
          </button>
        </>
      )}

      {pdfReady && (
        <>
          <input
            className="w-full p-2 border rounded mb-2"
            placeholder="Enter PDF Passcode"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
          />
          <button
            className="w-full bg-purple-600 text-white p-2 rounded mb-2 hover:bg-purple-700"
            onClick={() => post("/unlock", { password: passcode })}
          >
            🔓 Unlock PDF
          </button>

          {!/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) && (
            <button
              className="w-full bg-green-600 text-white p-2 rounded mb-2 hover:bg-green-700"
              onClick={fetchLockedPdf}
            >
              📥 Fetch Locked PDF
            </button>
          )}

          <button
            className="w-full bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700"
            onClick={() => post("/scan", {})}
          >
            🔍 Scan PDF
          </button>
        </>
      )}

      {status && (
        <p className="text-center text-sm text-gray-700 mt-4 whitespace-pre-line">
          {status}
        </p>
      )}

      {qrVisible && (
        <pre className="mt-4 text-sm bg-gray-50 p-2 rounded border overflow-auto">
          {qrData}
        </pre>
      )}
    </div>
  );
}
