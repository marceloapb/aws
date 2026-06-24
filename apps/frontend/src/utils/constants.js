export const API_URL = import.meta.env.VITE_API_URL;
export const CLOUDFRONT_URL = import.meta.env.VITE_CLOUDFRONT_URL;
export const REGION = import.meta.env.VITE_REGION;

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff'];
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_PARALLEL_UPLOADS = 5;
