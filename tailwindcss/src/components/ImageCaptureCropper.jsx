// AadhaarCameraCapture.jsx
import { useEffect, useRef, useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import getCroppedImg from "./utils/cropImage";   // ← your helper
import axios from "axios";

export default function AadhaarCameraCapture() {
  /* ─────────── state ─────────── */
  const [status,  setStatus]  = useState("📷 Initializing camera…");
  const [imageSrc, setImageSrc] = useState(null);
  const [crop,    setCrop]    = useState({ x: 0, y: 0 });
  const [zoom,    setZoom]    = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [latestData, setLatestData] = useState(null);
  const videoRef = useRef(null);

  /* ─────────── backend URL from .env ─────────── */
  let BACKEND = import.meta.env.VITE_BACKEND_URL ?? "";
  if (!/^https?:\/\//i.test(BACKEND)) BACKEND = `https://${BACKEND}`;

  /* ─────────── camera init ─────────── */
  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: 1920, height: 1080 },
        });
        if (videoRef.current) videoRef.current.srcObject = stream;
        setStatus("✅ Camera initialized.");
      } catch (err) {
        console.error(err);
        setStatus(`❌ Failed to access camera: ${err.message}`);
      }
    };
    initCamera();
  }, []);

  /* ─────────── capture frame ─────────── */
  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    const settings = video.srcObject.getVideoTracks()[0].getSettings();
    const canvas   = document.createElement("canvas");
    canvas.width   = settings.width  || video.videoWidth;
    canvas.height  = settings.height || video.videoHeight;

    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    setImageSrc(canvas.toDataURL("image/jpeg"));
  };

  /* ─────────── crop callback ─────────── */
  const onCropComplete = useCallback((_, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  /* ─────────── get latest Aadhaar JSON ─────────── */
  const fetchLatestData = async () => {
    setStatus("📡 Fetching latest Aadhaar verification…");
    try {
      const { data } = await axios.get(`https://4d9f-2405-201-15-20ef-c15f-2b15-a9a3-d9f7.ngrok-free.app/aadhaar-latest`, {
        headers: { "ngrok-skip-browser-warning": "1" },
      });

      if (data.status === "success") {
        setLatestData(data.data);
        setStatus("✅ Latest Aadhaar data fetched.");
      } else {
        setStatus(`❌ ${data.message || "Unable to fetch data."}`);
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ Failed to fetch latest Aadhaar data.");
    }
  };

  /* ─────────── optional: send cropped image to backend ─────────── */
  const uploadCroppedImage = async () => {
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
      const form = new FormData();
      form.append("file", blob, "aadhaar.jpg");

      setStatus("📤 Uploading cropped image…");
      const { data } = await axios.post(`${BACKEND}/analyze-image`, form, {
        headers: {
          "ngrok-skip-browser-warning": "1",
          "Content-Type": "multipart/form-data",
        },
      });

      if (data.status === "success") {
        setLatestData(data.data);
        setStatus("✅ Image processed successfully.");
      } else {
        setStatus(`❌ ${data.message}`);
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ Upload failed.");
    }
  };

  /* ─────────── UI ─────────── */
  return (
    <div className="bg-white p-6 rounded shadow-md max-w-md w-full">
      <h2 className="text-xl font-semibold text-center mb-4">
        Aadhaar Photo Capture
      </h2>

      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full rounded border mb-4"
      />

      <button
        onClick={capturePhoto}
        className="w-full bg-blue-600 text-white py-2 rounded mb-4"
      >
        📸 Capture Aadhaar Photo
      </button>

      {imageSrc && (
        <>
          <div className="relative w-full h-72 bg-gray-200">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>

          <div className="mt-4 space-y-2">
            <button
              onClick={uploadCroppedImage}      // ← or fetchLatestData
              className="w-full bg-green-600 text-white py-2 rounded"
            >
              📤 Upload Cropped Image
            </button>

            <button
              onClick={fetchLatestData}
              className="w-full bg-purple-600 text-white py-2 rounded"
            >
              📄 Show Latest Aadhaar JSON
            </button>

            <button
              onClick={() => setImageSrc(null)}
              className="w-full bg-gray-400 text-white py-2 rounded"
            >
              🔄 Retake
            </button>
          </div>
        </>
      )}

      {status && (
        <p className="text-center text-sm text-gray-700 whitespace-pre-line mt-4">
          {status}
        </p>
      )}

      {latestData && (
        <pre className="mt-4 text-xs bg-gray-50 p-2 rounded border overflow-auto whitespace-pre-wrap">
          {JSON.stringify(latestData, null, 2)}
        </pre>
      )}
    </div>
  );
}
