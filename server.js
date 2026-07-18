const express = require('express');
const cors = require('cors');
const { google } = require('@googleapis/calendar');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

// -------------------------------------------------------------------
// Google Calendar — service account auth
// -------------------------------------------------------------------
function getCredentials() {
  if (process.env.GOOGLE_CREDENTIALS) {
    return JSON.parse(process.env.GOOGLE_CREDENTIALS);
  }
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'google-calendar-key.json'), 'utf8'));
}

async function getCalendarClient() {
  const creds = getCredentials();
  const auth = new google.auth.JWT(
    creds.client_email, null, creds.private_key,
    ['https://www.googleapis.com/auth/calendar']
  );
  return google.calendar({ version: 'v3', auth });
}

// -------------------------------------------------------------------
// Mail transporter (uses Gmail SMTP — enable App Password in Gmail)
// -------------------------------------------------------------------
function getTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.MAIL_USER || 'arteyestilomodas@gmail.com',
      pass: process.env.MAIL_PASS || ''
    }
  });
}

async function sendEmail({ to, subject, html }) {
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"Clínica del Pie" <${process.env.MAIL_USER || 'arteyestilomodas@gmail.com'}>`,
      to,
      subject,
      html
    });
    return true;
  } catch (err) {
    console.error('Error sending email:', err.message);
    return false;
  }
}

// -------------------------------------------------------------------
// POST /api/crear-cita
// -------------------------------------------------------------------
app.post('/api/crear-cita', async (req, res) => {
  try {
    const { nombre, telefono, email, fechaHora } = req.body;

    if (!nombre || !telefono || !email || !fechaHora) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son obligatorios.'
      });
    }

    const startTime = new Date(fechaHora);
    if (isNaN(startTime.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'La fecha/hora ingresada no es válida.'
      });
    }

    const endTime = new Date(startTime.getTime() + 45 * 60 * 1000);
    const opciones = {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'America/Montevideo'
    };
    const fechaFormateada = startTime.toLocaleString('es-UY', opciones);

    // ---------- Google Calendar ----------
    const calendar = await getCalendarClient();

    // ⚠️ El calendario de la podóloga debe estar compartido con la cuenta de servicio:
    //    agendar@gen-lang-client-0386738774.iam.gserviceaccount.com (permiso: "Hacer cambios")
    const CALENDAR_ID = 'arteyestilomodas@gmail.com';

    const event = {
      summary: `Cita Podológica: ${nombre}`,
      description: `Paciente: ${nombre}\nTeléfono: ${telefono}\nEmail: ${email}`,
      start: { dateTime: startTime.toISOString(), timeZone: 'America/Montevideo' },
      end: { dateTime: endTime.toISOString(), timeZone: 'America/Montevideo' }
    };

    const calResponse = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      requestBody: event
    });

    console.log(`Cita creada en calendario: ${calResponse.data.htmlLink}`);

    // ---------- Email a la podóloga ----------
    await sendEmail({
      to: 'arteyestilomodas@gmail.com',
      subject: `Nueva cita: ${nombre} - ${fechaFormateada}`,
      html: `
        <div style="font-family:sans-serif;max-width:500px">
          <h2 style="color:#0b5345">Nueva Cita Agendada</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px 0;color:#4a6a7a">Paciente</td><td style="padding:8px 0;font-weight:600">${nombre}</td></tr>
            <tr><td style="padding:8px 0;color:#4a6a7a">Teléfono</td><td style="padding:8px 0;font-weight:600">${telefono}</td></tr>
            <tr><td style="padding:8px 0;color:#4a6a7a">Email</td><td style="padding:8px 0;font-weight:600">${email}</td></tr>
            <tr><td style="padding:8px 0;color:#4a6a7a">Fecha y hora</td><td style="padding:8px 0;font-weight:600">${fechaFormateada}</td></tr>
          </table>
          <p style="margin-top:16px;color:#94a3b8;font-size:0.85rem">Clínica del Pie Isabel Aguiar</p>
        </div>
      `
    });

    // ---------- Email de confirmación al paciente ----------
    await sendEmail({
      to: email,
      subject: 'Tu cita fue agendada - Clínica del Pie',
      html: `
        <div style="font-family:sans-serif;max-width:500px">
          <h2 style="color:#0b5345">¡Cita confirmada!</h2>
          <p>Hola <strong>${nombre}</strong>,</p>
          <p>Tu cita podológica fue agendada correctamente.</p>
          <table style="width:100%;border-collapse:collapse;background:#f0fdfa;border-radius:12px;padding:16px;margin:16px 0">
            <tr><td style="padding:6px 12px;color:#4a6a7a">Día</td><td style="padding:6px 12px;font-weight:600">${fechaFormateada}</td></tr>
            <tr><td style="padding:6px 12px;color:#4a6a7a">Dirección</td><td style="padding:6px 12px;font-weight:600">Av. 18 de Julio 966, Local 6</td></tr>
            <tr><td style="padding:6px 12px;color:#4a6a7a">Teléfono</td><td style="padding:6px 12px;font-weight:600">094 943 875</td></tr>
          </table>
          <p style="color:#4a6a7a">Si necesitás cancelar o reagendar, comunicate al 094 943 875.</p>
          <p style="color:#94a3b8;font-size:0.85rem">Clínica del Pie Isabel Aguiar — Pedicuría Técnica</p>
        </div>
      `
    });

    res.json({
      success: true,
      message: 'Cita agendada correctamente. Revisá tu email para los detalles.',
      eventLink: calResponse.data.htmlLink
    });

  } catch (error) {
    console.error('Error al crear la cita:', error);
    res.status(500).json({
      success: false,
      message: 'Ocurrió un error al agendar la cita. Intentalo de nuevo más tarde.'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
