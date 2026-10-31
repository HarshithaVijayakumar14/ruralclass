import express from 'express';
import { 
  translateTextWithSarvam, 
  translateBatchWithSarvam, 
  translateBundleWithSarvam,
  getSarvamApiKey, 
  setSarvamApiKey,
  SARVAM_LANGUAGE_MAP 
} from '../services/sarvam.service.js';

const router = express.Router();

/**
 * GET /api/translate/status
 * Check Sarvam AI configuration status
 */
router.get('/status', (req, res) => {
  const apiKey = getSarvamApiKey();
  const configured = Boolean(apiKey && apiKey !== 'your_sarvam_api_key_here');
  
  res.json({
    success: true,
    provider: 'sarvam-ai',
    configured,
    model: 'mayura:v1',
    supported_languages: Object.keys(SARVAM_LANGUAGE_MAP)
  });
});

/**
 * POST /api/translate/config
 * Save or update Sarvam API key from frontend settings
 */
router.post('/config', (req, res) => {
  const { sarvam_api_key } = req.body;
  if (typeof sarvam_api_key !== 'string') {
    return res.status(400).json({ success: false, error: 'sarvam_api_key must be a string' });
  }

  setSarvamApiKey(sarvam_api_key);
  res.json({
    success: true,
    message: 'Sarvam AI configuration updated successfully',
    configured: Boolean(sarvam_api_key.trim())
  });
});

/**
 * POST /api/translate
 * Translate a single string or an array of strings
 */
router.post('/', async (req, res, next) => {
  try {
    const { text, texts, target_language = 'hi', source_language = 'en' } = req.body;

    if (Array.isArray(texts)) {
      const result = await translateBatchWithSarvam({
        texts,
        target_language,
        source_language
      });
      return res.json({ success: true, ...result });
    }

    if (text !== undefined) {
      const result = await translateTextWithSarvam({
        text: String(text),
        target_language,
        source_language
      });
      return res.json({ success: true, ...result });
    }

    res.status(400).json({ success: false, error: 'Either "text" or "texts" array is required' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/translate/bundle
 * Translate an entire UI key-value bundle object into the target language
 */
router.post('/bundle', async (req, res, next) => {
  try {
    const { bundle, target_language = 'hi' } = req.body;
    if (!bundle || typeof bundle !== 'object') {
      return res.status(400).json({ success: false, error: 'bundle object is required' });
    }

    const translatedBundle = await translateBundleWithSarvam(bundle, target_language);
    res.json({
      success: true,
      target_language,
      bundle: translatedBundle,
      source: 'sarvam-ai'
    });
  } catch (err) {
    next(err);
  }
});

export default router;

