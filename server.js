const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();
app.use(cors());
app.use(express.json());

app.get(['/', '/ping', '/api/ping'], (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.post(['/agendar', '/api/agendar'], async (req, res) => {
  try {
    const rawKey = process.env.PRIVATE_KEY || '';
    const formattedKey = rawKey.replace(/\\n/g, '\n');

    console.log('--- DIAGNÓSTICO EN PETICIÓN ---');
    console.log('CLIENT_EMAIL:', process.env.CLIENT_EMAIL);
    console.log('PRIVATE_KEY presente:', Boolean(formattedKey));
    console.log('PRIVATE_KEY longitud:', formattedKey.length);

    if (!formattedKey || !process.env.CLIENT_EMAIL) {
      throw new Error('Las credenciales de Google no están definidas correctamente en process.env');
    }

    const auth = new google.auth.JWT({
      email: process.env.CLIENT_EMAIL,
      key: formattedKey,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    const calendar = google.calendar({ version: 'v3', auth });

    const response = await calendar.events.insert({
      calendarId: 'arteyestilomodas@gmail.com',
      requestBody: req.body,
    });

    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    console.error('Error al crear la cita:', error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));