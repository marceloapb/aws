import toast from 'react-hot-toast';

export const showToast = {
  success: (message) => toast.success(message, {
    style: { borderRadius: '8px', background: '#10b981', color: '#fff' }
  }),
  error: (message) => toast.error(message, {
    style: { borderRadius: '8px', background: '#ef4444', color: '#fff' }
  }),
  info: (message) => toast(message, {
    style: { borderRadius: '8px', background: '#3b82f6', color: '#fff' }
  })
};
