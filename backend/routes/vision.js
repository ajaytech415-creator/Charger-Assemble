import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /api/vision/extract
 * Receives an image file, calls Cohere Vision API securely using server-side key,
 * returns extracted production plan rows.
 */
export const visionUpload = upload.single('image');

export async function extractFromImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided.' });
    }

    const COHERE_API_KEY = process.env.COHERE_API_KEY || 'mieD5wk3pNS6c58rluXs09M8qgRdtnw2EBLOhvns';
    if (!COHERE_API_KEY) {
      return res.status(500).json({ message: 'Cohere API key not configured on server.' });
    }

    // Convert buffer to base64 data URL
    const mimeType = req.file.mimetype || 'image/jpeg';
    const base64 = req.file.buffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const prompt = `You are a production data extraction assistant.
Analyze this image which contains a manufacturing production plan, possibly a table, spreadsheet, or handwritten document.

Extract ALL rows/entries you can see. For each row, identify these fields:
- "type": The product type (e.g. C2, C2.5, C3, Diesel, LUX). If not visible, use empty string.
- "refer": A short reference code. If not visible, use empty string.
- "moNumber": The Manufacturing Order number (e.g. MO-001, MFG-123, 123/45). CRITICAL: You MUST exactly match all characters as they appear in the image, including any slashes (/) or special formatting (e.g., if the image says "123/45", you must output "123/45"). If not visible, use empty string.
- "size": The size or product code (e.g. 05, 06, AA10, RX9). Required.
- "qty": The total quantity as a plain integer. Required.

IMPORTANT: Respond ONLY with a valid JSON array. No explanation. No markdown. Just raw JSON. Ensure you accurately capture exact text including any slashes (/) in the moNumber.
Example:
[{"type":"C2","refer":"o","moNumber":"MO/001/45","size":"10","qty":500}]

If no data is found, return: []`;

    const body = {
      model: 'command-a-vision-07-2025',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: dataUrl } }
          ]
        }
      ],
      temperature: 0.1,
    };

    const cohereRes = await fetch('https://api.cohere.com/v2/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${COHERE_API_KEY}`
      },
      body: JSON.stringify(body),
    });

    if (!cohereRes.ok) {
      const errData = await cohereRes.json().catch(() => ({}));
      const msg = errData?.message || errData?.error?.message || 'Unknown Cohere error';
      return res.status(502).json({ message: `Cohere API error ${cohereRes.status}: ${msg}` });
    }

    const data = await cohereRes.json();
    const text = data?.message?.content?.[0]?.text || '';

    if (!text) {
      return res.status(502).json({ message: 'Cohere returned an empty response.' });
    }

    // Strip markdown fences if any
    const cleaned = text.replace(/```json|```/g, '').trim();

    let rows;
    try {
      rows = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (match) {
        try { rows = JSON.parse(match[0]); }
        catch { return res.status(502).json({ message: 'Could not parse AI response: ' + cleaned.slice(0, 200) }); }
      } else {
        return res.status(502).json({ message: 'Could not parse AI response: ' + cleaned.slice(0, 200) });
      }
    }

    if (!Array.isArray(rows)) {
      return res.status(502).json({ message: 'AI returned non-array response' });
    }

    const normalized = rows
      .filter(r => (r.sku || r.size) && r.qty)
      .map(r => ({
        type: String(r.type || r.od || ''),
        refer: String(r.refer || ''),
        moNumber: String(r.moNumber || ''),
        size: String(r.size || r.sku || '').trim().toUpperCase(),
        qty: String(parseInt(r.qty) || 0),
      }));

    return res.json({ rows: normalized });

  } catch (err) {
    console.error('Vision route error:', err);
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
}
