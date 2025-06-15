
/**
 * Formats time in seconds to MM:SS format
 * @param time Time in seconds
 * @returns Formatted time string
 */
export const formatTime = (time: number) => {
  if (!time || isNaN(time) || time < 0) {
    return "0:00";
  }
  
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
};

/**
 * Formats duration from seconds to a readable format
 * @param seconds Duration in seconds
 * @returns Formatted duration string
 */
export const formatDuration = (seconds: number): string => {
  if (!seconds || isNaN(seconds) || seconds <= 0) {
    return "0:00";
  }
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Calculates audio duration from file
 * @param file Audio file
 * @returns Promise with duration in seconds
 */
export const getAudioDuration = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    const audio = document.createElement('audio');
    const objectUrl = URL.createObjectURL(file);
    
    audio.addEventListener('loadedmetadata', () => {
      const duration = audio.duration;
      URL.revokeObjectURL(objectUrl);
      resolve(isNaN(duration) ? 0 : Math.round(duration));
    });
    
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(objectUrl);
      resolve(0);
    });
    
    audio.src = objectUrl;
  });
};

/**
 * Triggers an audio file download
 * @param url URL of the file to download
 * @param filename Name to save the file as
 */
export const downloadAudio = (url: string, filename: string) => {
  if (!url) return;
  
  const link = document.createElement('a');
  link.href = url;
  
  // Always download as mp3
  link.download = filename || 'audio.mp3';
  
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
