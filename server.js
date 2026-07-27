const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 1. Formatear correctamente la clave privada para Render
const rawKey = process.env.PRIVATE_KEY || '';
const formattedPrivateKey = rawKey.replace(/\\n/g, '\n');

// Diagnóstico: qué variables de entorno están presentes (sin exponer la clave completa)
console.log('=== DIAGNÓSTICO ENV ===');
console.log('CLIENT_EMAIL definido:', !!process.env.CLIENT_EMAIL);
console.log('PRIVATE_KEY definido:', !!rawKey);
console.log('PRIVATE_KEY empieza con:', rawKey ? rawKey.substring(0, 30) + '...' : '(vacio)');
console.log('PRIVATE_KEY incluye \\n:', rawKey.includes('\\n'));
console.log('PRIVATE_KEY incluye newline real:', rawKey.includes('\n'));
console.log('=======================');

if (!process.env.CLIENT_EMAIL || !rawKey) {
  console.error('Faltan CLIENT_EMAIL o PRIVATE_KEY en las variables de entorno');
}

// 2. Crear la autenticación JWT
const auth = new google.auth.JWT(
  process.env.CLIENT_EMAIL,
  null,
  formattedPrivateKey,
  ['https://www.googleapis.com/auth/calendar']
);

// 3. Obtener token al iniciar
async function initAuth() {
  try {
    const token = await auth.getAccessToken();
    console.log('Google Calendar auth OK — token obtenido');
  } catch (err) {
    console.error('Error al autenticar con Google Calendar:', err.message);
  }
}
initAuth();

// 4. Crear el cliente
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