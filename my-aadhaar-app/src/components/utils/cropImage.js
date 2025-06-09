// utils/cropImage.js
export default function getCroppedImg(imageSrc, crop) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous"; // Allows loading images from different origins
  
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = crop.width;
        canvas.height = crop.height;
        const ctx = canvas.getContext("2d");
  
        ctx.drawImage(
          image,
          crop.x,
          crop.y,
          crop.width,
          crop.height,
          0,
          0,
          crop.width,
          crop.height
        );
  
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Canvas is empty"));
              return;
            }
            const croppedImageUrl = URL.createObjectURL(blob);
            resolve(croppedImageUrl);
          },
          "image/jpeg",
          1.0 // Maximum quality
        );
      };
  
      image.onerror = (err) => {
        reject(err);
      };
  
      image.src = imageSrc;
    });
  }
  