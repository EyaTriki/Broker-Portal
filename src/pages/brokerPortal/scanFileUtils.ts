export const SCAN_ACCEPTED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
];
export const SCAN_ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf'];
export const SCAN_MAX_FILE_SIZE = 10 * 1024 * 1024;

export function validateCardFile(file: File): string | null {
  const name = file.name.toLowerCase();
  const typeAllowed =
    SCAN_ACCEPTED_MIME_TYPES.includes(file.type) ||
    SCAN_ACCEPTED_EXTENSIONS.some((extension) => name.endsWith(extension));

  if (!typeAllowed) return 'Unsupported file. Use a JPG, JPEG, PNG or PDF.';
  if (file.size > SCAN_MAX_FILE_SIZE) return 'File is too large. The maximum size is 10 MB.';
  return null;
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
