export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
export const CLOUDFRONT_URL = import.meta.env.VITE_CLOUDFRONT_URL || '';
export const COGNITO_USER_POOL_ID = import.meta.env.VITE_COGNITO_USER_POOL_ID || '';
export const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID || '';
export const REGION = import.meta.env.VITE_REGION || 'us-east-1';

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff'];
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_PARALLEL_UPLOADS = 5;
