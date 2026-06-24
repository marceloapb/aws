import api from './api';

export const notificationsService = {
  send: (to, subject, htmlBody, textBody) =>
    api.post('/notifications/send', { to, subject, htmlBody, textBody })
};
