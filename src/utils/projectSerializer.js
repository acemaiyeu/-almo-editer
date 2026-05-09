/**
 * Project Serializer - Save/Load Redux state with Base64 media encoding
 * Handles conversion of blob URLs to Base64 for persistence
 */

/**
 * Convert a blob URL to Base64 data URL
 */
const blobUrlToBase64 = async (blobUrl) => {
  try {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error('Failed to convert blob to base64:', err);
    return null;
  }
};

/**
 * Convert Base64 data URL back to Blob URL
 */
const base64ToBlobUrl = async (base64Data) => {
  try {
    const response = await fetch(base64Data);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (err) {
    console.error('Failed to convert base64 to blob URL:', err);
    return null;
  }
};

/**
 * Extract all unique blob URLs from tracks
 */
const extractBlobUrls = (tracks) => {
  const urls = new Set();
  tracks.forEach(track => {
    track.items.forEach(item => {
      if (item.url && item.url.startsWith('blob:')) {
        urls.add(item.url);
      }
    });
  });
  return Array.from(urls);
};

/**
 * Replace URLs in tracks using a mapping
 */
const replaceUrlsInTracks = (tracks, urlMap) => {
  return tracks.map(track => ({
    ...track,
    items: track.items.map(item => ({
      ...item,
      url: urlMap[item.url] || item.url
    }))
  }));
};

/**
 * Serialize entire Redux state to a JSON-ready object with Base64 media
 */
export const serializeProject = async (state) => {
  const { timeline, textEffect, public: publicState } = state;

  // Collect all blob URLs from timeline tracks
  const blobUrls = extractBlobUrls(timeline.tracks);

  // Convert each blob URL to Base64
  const urlToBase64Map = {};
  for (const url of blobUrls) {
    const base64 = await blobUrlToBase64(url);
    if (base64) {
      urlToBase64Map[url] = base64;
    }
  }

  // Also handle audioUrl in textEffect if it's a blob
  let textEffectAudioBase64 = null;
  if (textEffect.audioUrl && textEffect.audioUrl.startsWith('blob:')) {
    textEffectAudioBase64 = await blobUrlToBase64(textEffect.audioUrl);
  }

  // Replace blob URLs with Base64 in tracks
  const serializedTracks = replaceUrlsInTracks(timeline.tracks, urlToBase64Map);

  const projectData = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    timeline: {
      ...timeline,
      tracks: serializedTracks
    },
    textEffect: {
      ...textEffect,
      audioUrl: textEffectAudioBase64 || textEffect.audioUrl
    },
    public: publicState
  };

  return JSON.stringify(projectData, null, 2);
};

/**
 * Deserialize project JSON and restore blob URLs
 */
export const deserializeProject = async (jsonString) => {
  const projectData = JSON.parse(jsonString);
  const { timeline, textEffect, public: publicState } = projectData;

  // Collect all Base64 URLs from tracks
  const base64Urls = new Set();
  timeline.tracks.forEach(track => {
    track.items.forEach(item => {
      if (item.url && item.url.startsWith('data:')) {
        base64Urls.add(item.url);
      }
    });
  });

  // Convert each Base64 back to blob URL
  const base64ToUrlMap = {};
  for (const base64 of base64Urls) {
    const blobUrl = await base64ToBlobUrl(base64);
    if (blobUrl) {
      base64ToUrlMap[base64] = blobUrl;
    }
  }

  // Also handle audioUrl in textEffect
  let restoredAudioUrl = textEffect.audioUrl;
  if (textEffect.audioUrl && textEffect.audioUrl.startsWith('data:')) {
    restoredAudioUrl = await base64ToBlobUrl(textEffect.audioUrl);
  }

  // Replace Base64 URLs with blob URLs in tracks
  const restoredTracks = replaceUrlsInTracks(timeline.tracks, base64ToUrlMap);

  return {
    timeline: {
      ...timeline,
      tracks: restoredTracks
    },
    textEffect: {
      ...textEffect,
      audioUrl: restoredAudioUrl
    },
    public: publicState
  };
};

/**
 * Download project as JSON file
 */
export const downloadProjectFile = (jsonString, filename = 'almo-project.json') => {
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Read project file from input
 */
export const readProjectFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

