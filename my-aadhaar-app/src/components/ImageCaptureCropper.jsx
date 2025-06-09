// AadhaarCameraCapture.jsx
import { useEffect, useRef, useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import getCroppedImg from "./utils/cropImage";

export default function AadhaarCameraCapture() {
  const [status, setStatus] = useState("📷 Initializing camera...");
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [latestData, setLatestData] = useState(null);
  const videoRef = useRef(null);

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    const settings = video.srcObject.getVideoTracks()[0].getSettings();
    canvas.width = settings.width || video.videoWidth;
    canvas.height = settings.height || video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setImageSrc(canvas.toDataURL("image/jpeg"));
  };

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const fetchLatestData = async () => {
    setStatus("📡 Fetching latest Aadhaar verification...");
    try {
      const res = await fetch("http://172.20.10.4:6969/aadhaar-latest");
      const json = await res.json();
      if (json.status === "success") {
        setLatestData(json.data);
        setStatus("✅ Latest Aadhaar data fetched.");
      } else {
        setStatus(`❌ ${json.message}`);
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ Failed to fetch latest Aadhaar data.");
    }
  };

  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: 1920, height: 1080 },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setStatus("✅ Camera initialized.");
      } catch (err) {
        console.error(err);
        setStatus("❌ Failed to access camera.");
      }
    };
    initCamera();
  }, []);

  return (
    <div className="bg-white p-6 rounded shadow-md max-w-md w-full">
      <h2 className="text-xl font-semibold text-center mb-4">Aadhaar Photo Capture</h2>
      <video ref={videoRef} autoPlay muted playsInline className="w-full rounded border mb-4" />
      <button onClick={capturePhoto} className="w-full bg-blue-600 text-white py-2 rounded mb-4">📸 Capture Aadhaar Photo</button>

      {imageSrc && (
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
      )}

      {imageSrc && (
        <div className="mt-4 space-y-2">
          <button onClick={fetchLatestData} className="w-full bg-purple-600 text-white py-2 rounded">📄 Show Latest Aadhaar JSON</button>
          <button onClick={() => setImageSrc(null)} className="w-full bg-gray-400 text-white py-2 rounded">🔄 Retake</button>
        </div>
      )}

      {status && <p className="text-center text-sm text-gray-700 whitespace-pre-line mt-4">{status}</p>}

      {latestData && (
        <pre className="mt-4 text-xs bg-gray-50 p-2 rounded border overflow-auto whitespace-pre-wrap">
          {JSON.stringify(latestData, null, 2)}
        </pre>
      )}
    </div>
  );
}
