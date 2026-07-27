const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const privateKey = process.env.PRIVATE_KEY
  ? process.env.PRIVATE_KEY.replace(/\\n/g, '\n')
  : '';

console.log('=== DIAGNÓSTICO ENV ===');
console.log('CLIENT_EMAIL definido:', !!process.env.CLIENT_EMAIL);
console.log('PRIVATE_KEY definido:', !!process.env.PRIVATE_KEY);
console.log('PRIVATE_KEY length:', privateKey.length);
console.log('=======================');

app.post('/agendar', async (req, res) => {
  try {
    const auth = new google.auth.JWT(
      process.env.CLIENT_EMAIL,
      null,
      privateKey,
      ['https://www.googleapis.com/auth/calendar']
    );

    await auth.authorize();

    const calendar = google.calendar({ version: 'v3', auth });

    const response = await calendar.events.insert({
      calendarId: 'arteyestilomodas@gmail.com',
      requestBody: {
        summary: req.body.summary || 'Cita de Clínica',
        description: req.body.description || '',
        start: req.body.start,
        end: req.body.end,
      },
    });

    res.status(200).json({ success: true, event: response.data });
  } catch (error) {
    console.error('Error al crear la cita:', error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 10000;

app.get('/api/ping', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});