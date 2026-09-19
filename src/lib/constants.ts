export const APP_NAME = "Lumina";

export const CATEGORIES = [
  "All",
  "Cinematic",
  "Music",
  "Gaming",
  "Tech",
  "Design",
  "Travel",
  "Cooking",
  "Fitness",
  "Education",
  "Comedy",
  "News",
  "Sports",
  "General",
] as const;

export const VIDEO_CATEGORIES = CATEGORIES.filter((c) => c !== "All");

export const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-matroska"];
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024; // 2GB (1GB+ auto-compressed, CPU)
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
