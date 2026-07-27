const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();
app.use(cors());
app.use(express.json());

function getAuthAndCalendar() {
  const rawKey = process.env.PRIVATE_KEY || '';
  const formattedKey = rawKey.replace(/\\n/g, '\n');
  const auth = new google.auth.JWT({
    email: process.env.CLIENT_EMAIL,
    key: formattedKey,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
  const calendar = google.calendar({ version: 'v3', auth });
  return { auth, calendar };
}

app.get(['/', '/ping', '/api/ping'], (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get(['/ocupados', '/api/ocupados'], async (req, res) => {
  try {
    const { fecha } = req.query;
    if (!fecha) {
      return res.status(400).json({ error: 'Falta el parámetro ?fecha=YYYY-MM-DD' });
    }

    const { calendar } = getAuthAndCalendar();
    const calendarId = process.env.CALENDAR_ID || 'primary';

    const timeMin = new Date(`${fecha}T00:00:00-03:00`).toISOString();
    const timeMax = new Date(`${fecha}T23:59:59-03:00`).toISOString();

    const response = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const ocupados = (response.data.items || []).map(event => ({
      inicio: event.start.dateTime || event.start.date,
      fin: event.end.dateTime || event.end.date,
    }));

    res.status(200).json({ ocupados });
  } catch (error) {
    console.error('Error al consultar ocupados (Detalle):', error.response ? error.response.data : error.message);
    res.status(500).json({ error: error.message, details: error.response ? error.response.data : null });
  }
});

app.post(['/agendar', '/api/agendar'], async (req, res) => {
  try {
    const { calendar } = getAuthAndCalendar();
    const calendarId = process.env.CALENDAR_ID || 'primary';

    const response = await calendar.events.insert({
      calendarId,
      requestBody: req.body,
    });

    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    console.error('Error al crear la cita (Detalle):', error.response ? error.response.data : error.message);
    res.status(500).json({ error: error.message, details: error.response ? error.response.data : null });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));