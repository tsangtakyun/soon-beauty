/**
 * Compress an image file to reduce upload size before sending to OCR.
 * Returns base64 (without data URI prefix) + media type.
 */
export async function compressImage(
  file: File,
  options: { maxDimension?: number; quality?: number } = {}
): Promise<{ base64: string; mediaType: 'image/jpeg' }> {
  const { maxDimension = 1600, quality = 0.82 } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      if (typeof e.target?.result !== 'string') {
        reject(new Error('FileReader failed'));
        return;
      }
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));

    img.onload = () => {
      // Calculate new dimensions preserving aspect ratio
      let { width, height } = img;
      if (width > height && width > maxDimension) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else if (height > maxDimension) {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
      resolve({ base64, mediaType: 'image/jpeg' });
    };
    img.onerror = () => reject(new Error('Failed to load image'));

    reader.readAsDataURL(file);
  });
}
