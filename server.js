const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 1. Formatear correctamente la clave privada para Render
const formattedPrivateKey = process.env.PRIVATE_KEY
  ? process.env.PRIVATE_KEY.replace(/\\n/g, '\n')
  : '';

// 2. Crear la autenticación JWT
const auth = new google.auth.JWT(
  process.env.CLIENT_EMAIL,
  null,
  formattedPrivateKey,
  ['https://www.googleapis.com/auth/calendar']
);

// 3. Crear el cliente pasando 'auth' explícitamente
const calendar = google.calendar({ version: 'v3', auth });

// Ruta para agendar
app.post('/api/agendar', async (req, res) => {
  try {
    const { summary, description, start, end } = req.body;

    const response = await calendar.events.insert({
      auth: auth, // <-- Poner auth aquí garantiza que no dé error 401
      calendarId: 'arteyestilomodas@gmail.com',
      requestBody: {
        summary: summary,
        description: description,
        start: start,
        end: end,
      },
    });

    res.status(200).json({ success: true, event: response.data });
  } catch (error) {
    console.error('Error al crear la cita:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 10000;

// Health check para evitar timeout por inactividad en Render
app.get('/api/ping', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});