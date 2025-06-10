// src/components/AadhaarAutomation.jsx
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Cropper from "react-easy-crop";
import getCroppedImg from "./utils/cropImage"; // <-- your helper

export default function AadhaarAutomation() {
  /* ─────────────── UI state ─────────────── */
  const [aadhaar, setAadhaar] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [otp, setOtp] = useState("");
  const [passcode, setPasscode] = useState("");

  const [status, setStatus] = useState("🔄 Starting application…");
  const [pdfReady, setPdfReady] = useState(false);
  const [qrData, setQrData] = useState("");
  const [qrVisible, setQrVisible] = useState(false);

  const [captchaImageUrl, setCaptchaImageUrl] = useState(null);
  const [otpVisible, setOtpVisible] = useState(false);

  /* ── cropping state ── */
  const [crop, setCrop] = useState({ x: 0, y: -15 });
  const [zoom, setZoom] = useState(4.5);
  const [cropped, setCropped] = useState(null);

  const onCropComplete = useCallback(
    async (_area, pixels) => {
      try {
        const blob = await getCroppedImg(captchaImageUrl, pixels);
        setCropped(URL.createObjectURL(blob)); // preview (or upload)
      } catch (e) {
        console.error("Crop error:", e);
      }
    },
    [captchaImageUrl]
  );

  /* ─── backend URL from .env ─── */
  let BACKEND = import.meta.env.VITE_BACKEND_URL ?? "";
  if (!/^https?:\/\//i.test(BACKEND)) BACKEND = `https://${BACKEND}`;

  /* ─── poll /status every 100 s (dev) ─── */
  useEffect(() => {
    const poll = async () => {
      try {
        const { data } = await axios.get(`${BACKEND}/status`, {
          headers: { "ngrok-skip-browser-warning": "1" },
        });
        if (data.status) setStatus(data.status);
      } catch {
        setStatus("❌ Backend not reachable.");
      }
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, [BACKEND]);

  /* ─── helper for POST actions ─── */
  const post = async (path, payload = {}) => {
    try {
      setStatus(`📡 Sending ${path}…`);
      const { data } = await axios.post(`${BACKEND}${path}`, payload, {
        headers: { "ngrok-skip-browser-warning": "1" },
      });

      if (path === "/set-aadhaar") {
        if (data.captcha_ready) {
          // show the screenshot as base-64
          setCaptchaImageUrl(`data:image/png;base64,${data.screenshot_base64}`);
          setCropped(null); // reset any previous crop
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
        const blobUrl = URL.createObjectURL(new Blob([data]));
        setPdfReady(true);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = "aadhaar_locked.pdf";
        link.click();
        URL.revokeObjectURL(blobUrl);
        setStatus("✅ Locked PDF downloaded. Enter passcode to unlock.");
      }

      if (path === "/unlock") {
        setStatus(
          data.status === "success"
            ? "✅ PDF Unlocked and Decoded."
            : `❌ ${data.message}`
        );
      }

      if (path === "/scan") {
        if (data.status === "success") {
          setQrData(JSON.stringify(data.data, null, 2));
          setQrVisible(true);
          setStatus("✅ QR scanned and verified.");
        } else {
          setStatus(`❌ QR scan failed: ${data.message}`);
          setQrData("⚠️ No QR data found.");
          setQrVisible(true);
        }
      }
    } catch (err) {
      console.error(err);
      setStatus(`❌ Request failed: ${err.message}`);
    }
  };

  /* ─── fetch locked PDF again ─── */
  const fetchLockedPdf = async () => {
    try {
      setStatus("📥 Fetching locked PDF…");
      const res = await axios.get(`${BACKEND}/download-pdf`, {
        responseType: "blob",
        headers: { "ngrok-skip-browser-warning": "1" },
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "aadhaar_locked.pdf";
      a.click();
      URL.revokeObjectURL(url);
      setStatus("✅ Locked PDF fetched again.");
    } catch {
      setStatus("❌ PDF not available yet.");
    }
  };

  /* ─────────── JSX ─────────── */
  return (
    <div className="bg-white shadow-lg rounded-lg p-6 w-full max-w-md">
      <h2 className="text-2xl font-semibold text-center mb-4">
        Aadhaar Automation
      </h2>

      {/* Aadhaar input */}
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

      {/* CAPTCHA stage */}
      {captchaImageUrl && !cropped && (
        <div className="relative w-full h-60 bg-gray-200 mb-2">
          <Cropper
            image={captchaImageUrl}
            crop={crop}
            zoom={zoom}
            aspect={undefined} // 🟢 allows freeform cropping
            showGrid={false}
            cropShape="rect"
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
      )}

      {cropped && (
        <img src={cropped} alt="Cropped CAPTCHA" className="w-full mb-2" />
      )}

      {captchaImageUrl && (
        <>
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

      {/* OTP stage */}
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

      {/* PDF stage */}
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

          <button
            className="w-full bg-green-600 text-white p-2 rounded mb-2 hover:bg-green-700"
            onClick={fetchLockedPdf}
          >
            📥 Fetch Locked PDF
          </button>

          <button
            className="w-full bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700"
            onClick={() => post("/scan")}
          >
            🔍 Scan PDF
          </button>
        </>
      )}

      {/* status & QR */}
      <p className="text-center text-sm text-gray-700 mt-4 whitespace-pre-line">
        {status}
      </p>

      {qrVisible && (
        <pre className="mt-4 text-sm bg-gray-50 p-2 rounded border overflow-auto">
          {qrData}
        </pre>
      )}
    </div>
  );
}
