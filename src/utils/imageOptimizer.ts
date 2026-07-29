/**
 * Utility to process uploaded member profile photos according to performance requirements:
 * 1. Resizes output to max 400x400 pixels while maintaining full aspect ratio.
 * 2. Compresses output to WebP format.
 * 3. Keeps file size under ~100 KB.
 * 4. Preserves transparent PNG alpha channel if available.
 * 5. Replaces image only after successful conversion.
 */

export async function processProfilePhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      reject(new Error("Invalid file type. Please upload a valid image file."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to decode image"));
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Canvas context creation failed"));
            return;
          }

          const MAX_DIM = 400;
          let width = img.width;
          let height = img.height;

          // Scale down proportionally to fit within 400x400 bounding box
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);

          // Clear canvas to preserve transparency for PNGs
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Attempt export to WebP with initial quality 0.85 (crystal clear quality)
          let quality = 0.85;
          let webpDataUrl = canvas.toDataURL("image/webp", quality);

          // Helper to estimate byte size of base64 data URL
          const getByteSize = (dataUrl: string) => {
            const base64Str = dataUrl.split(",")[1] || "";
            return Math.round((base64Str.length * 3) / 4);
          };

          // Step down quality if size exceeds ~100 KB (102,400 bytes)
          while (getByteSize(webpDataUrl) > 102400 && quality > 0.35) {
            quality -= 0.1;
            webpDataUrl = canvas.toDataURL("image/webp", quality);
          }

          // If webpDataUrl is valid, resolve. Original replaced ONLY after successful conversion
          if (webpDataUrl && webpDataUrl.startsWith("data:image/")) {
            resolve(webpDataUrl);
          } else {
            reject(new Error("WebP conversion failed"));
          }
        } catch (err) {
          reject(err);
        }
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
