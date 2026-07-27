const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();
app.use(cors());
app.use(express.json());

const privateKey = process.env.PRIVATE_KEY
  ? process.env.PRIVATE_KEY.replace(/\\n/g, '\n')
  : '';

const auth = new google.auth.JWT(
  process.env.CLIENT_EMAIL,
  null,
  privateKey,
  ['https://www.googleapis.com/auth/calendar']
);

const calendar = google.calendar({ version: 'v3', auth });

app.get(['/ping', '/api/ping'], (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Servidor activo' });
});

app.post(['/agendar', '/api/agendar'], async (req, res) => {
  try {
    await auth.authorize();

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