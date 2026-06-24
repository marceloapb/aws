import api from './api';

export const notificationsService = {
  async send(to, subject, htmlBody = null, textBody = null) {
    const { data } = await api.post('/notifications/send', {
      to,
      subject,
      htmlBody,
      textBody
    });
    return data;
  }
};
