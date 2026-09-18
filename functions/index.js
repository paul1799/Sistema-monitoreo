/**
 * FUNCIÓN OPCIONAL — solo necesaria si quieres la opción "Cargar ficha
 * escaneada (lectura automática con IA)" dentro de la app.
 *
 * Qué hace: recibe una imagen (foto de una ficha llenada a mano) desde la
 * app web, la envía a la API de Anthropic (Claude) pidiendo que devuelva
 * los datos en JSON, y reenvía ese JSON de vuelta a la app para
 * pre-llenar el formulario de registro.
 *
 * Requiere:
 *  1. Una cuenta y API key de Anthropic (https://console.anthropic.com) —
 *     esto es un servicio de pago aparte de Firebase, con su propia
 *     facturación por uso.
 *  2. El plan "Blaze" (pago por uso) de Firebase, porque las Cloud
 *     Functions con llamadas salientes a internet requieren ese plan
 *     (Firebase tiene una capa gratuita generosa dentro de Blaze).
 *
 * Configurar la API key como secreto (una sola vez):
 *   firebase functions:secrets:set ANTHROPIC_API_KEY
 *
 * Desplegar solo esta función:
 *   firebase deploy --only functions:scanFicha
 *
 * Luego copia la URL que imprime el despliegue en AI_SCAN_ENDPOINT dentro
 * de public/index.html y vuelve a desplegar el hosting.
 *
 * Revisa en https://docs.anthropic.com/en/docs/about-claude/models cuál es
 * el identificador de modelo vigente antes de usar esto en producción —
 * el valor de ANTHROPIC_MODEL de abajo puede quedar desactualizado.
 */
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

admin.initializeApp();
const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');
const ANTHROPIC_MODEL = 'claude-sonnet-4-5'; // revisa la doc de Anthropic por si cambió

exports.scanFicha = onRequest(
  { secrets: [ANTHROPIC_API_KEY], cors: true, region: 'us-central1' },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Método no permitido' });
      return;
    }
    try {
      // Solo acepta llamadas de usuarios ya autenticados en la app.
      const authHeader = req.headers.authorization || '';
      const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (!idToken) {
        res.status(401).json({ error: 'Falta el token de autenticación' });
        return;
      }
      await admin.auth().verifyIdToken(idToken);

      const { prompt, imageBase64, mediaType } = req.body || {};
      if (!prompt || !imageBase64) {
        res.status(400).json({ error: 'Falta "prompt" o "imageBase64" en el cuerpo de la solicitud' });
        return;
      }

      const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY.value(),
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: 2000,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: imageBase64 } },
                { type: 'text', text: prompt },
              ],
            },
          ],
        }),
      });

      const data = await anthropicResp.json();
      if (!anthropicResp.ok) {
        console.error('Anthropic API error', data);
        res.status(502).json({ error: 'Error de la API de Anthropic', detail: data });
        return;
      }

      const text = (data.content || []).map((b) => b.text || '').join('');
      let parsed;
      try {
        const match = text.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(match ? match[0] : text);
      } catch (e) {
        res.status(502).json({ error: 'La IA no devolvió un JSON válido', raw: text });
        return;
      }
      res.json(parsed);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: String((err && err.message) || err) });
    }
  }
);
