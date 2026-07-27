const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 1. Formatear correctamente la clave privada para Render
let privateKey = process.env.PRIVATE_KEY || '';
console.log('=== DIAGNÓSTICO ENV ===');
console.log('CLIENT_EMAIL definido:', !!process.env.CLIENT_EMAIL);
console.log('PRIVATE_KEY definido:', !!privateKey);
console.log('PRIVATE_KEY empieza con:', privateKey ? privateKey.substring(0, 40) + '...' : '(vacio)');
console.log('PRIVATE_KEY incluye \\n literal:', privateKey.includes('\\n'));
console.log('PRIVATE_KEY incluye newline real:', privateKey.includes('\n'));
console.log('=======================');

if (privateKey) {
  privateKey = privateKey.replace(/\\n/g, '\n');
}

if (!process.env.CLIENT_EMAIL || !privateKey) {
  console.error('Faltan CLIENT_EMAIL o PRIVATE_KEY en las variables de entorno');
}

// 2. Crear la autenticación JWT
console.log('Creando JWT con privateKey length:', privateKey.length);
const auth = new google.auth.JWT(
  process.env.CLIENT_EMAIL,
  null,
  privateKey,
  ['https://www.googleapis.com/auth/calendar']
);

// 3. Crear el cliente de Calendar con auth
console.log('Creando cliente calendar...');
const calendar = google.calendar({ version: 'v3', auth });

// Ruta para agendar
app.post('/api/agendar', async (req, res) => {
  try {
    const { summary, description, start, end } = req.body;

    const response = await calendar.events.insert({
      auth: auth,
      calendarId: 'arteyestilomodas@gmail.com',
      requestBody: {
        summary,
        description,
        start,
        end
      }
    });

    res.status(200).json({ success: true, event: response.data });
  } catch (error) {
    console.error('Error al crear la cita:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 10000;

// Health check
app.get('/api/ping', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});