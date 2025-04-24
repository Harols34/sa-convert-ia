
/**
 * Formats time in seconds to MM:SS format
 * @param time Time in seconds
 * @returns Formatted time string
 */
export const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
};

/**
 * Triggers an audio file download
 * @param url URL of the file to download
 * @param filename Name to save the file as
 * @param format Optional format specification ('mp3' is default)
 */
export const downloadAudio = (url: string, filename: string, format: 'mp3' | 'txt' = 'mp3') => {
  if (!url) return;
  
  const link = document.createElement('a');
  link.href = url;
  
  if (format === 'txt') {
    // For text format, we download with .txt extension
    link.download = `${filename.replace(/\.[^/.]+$/, '')}.txt`;
  } else {
    // Default mp3 download
    link.download = filename || 'audio.mp3';
  }
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object if it was created with createObjectURL
  if (url.startsWith('blob:')) {
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  }
};

/**
 * Generates the filename with the appropriate extension
 * @param baseFilename Base filename without extension
 * @param format Format of the file
 * @returns Filename with appropriate extension
 */
export const getFilenameWithFormat = (baseFilename: string, format: string): string => {
  // Remove any existing extension
  const baseName = baseFilename.replace(/\.[^/.]+$/, '');
  return `${baseName}.${format}`;
};
