import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const CACHE_FILE = path.resolve(DATA_DIR, 'translations_cache.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {}
}

// In-memory runtime translation cache
let translationCache = {};
if (fs.existsSync(CACHE_FILE)) {
  try {
    translationCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
  } catch (e) {
    translationCache = {};
  }
}

const persistCache = () => {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(translationCache, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[Sarvam Cache] Persist failed:', e.message);
  }
};

// Map BCP-47 / ISO codes to Sarvam AI Language Codes
export const SARVAM_LANGUAGE_MAP = {
  'hi': 'hi-IN',   // Hindi
  'kn': 'kn-IN',   // Kannada
  'ta': 'ta-IN',   // Tamil
  'te': 'te-IN',   // Telugu
  'ml': 'ml-IN',   // Malayalam
  'mr': 'mr-IN',   // Marathi
  'gu': 'gu-IN',   // Gujarati
  'bn': 'bn-IN',   // Bengali
  'or': 'od-IN',   // Odia
  'pa': 'pa-IN',   // Punjabi
  'as': 'as-IN',   // Assamese
  'ur': 'ur-IN',   // Urdu
  'ne': 'ne-IN',   // Nepali
  'sa': 'sa-IN',   // Sanskrit
  'kok': 'kok-IN', // Konkani
  'mai': 'mai-IN', // Maithili
  'doi': 'doi-IN', // Dogri
  'ks': 'ks-IN',   // Kashmiri
  'sd': 'sd-IN',   // Sindhi
  'sat': 'sat-IN', // Santali
  'brx': 'brx-IN', // Bodo
  'mni': 'mni-IN', // Manipuri
  'en': 'en-IN'
};

// Runtime memory config for API key
let runtimeSarvamApiKey = process.env.SARVAM_API_KEY || '';

export const getSarvamApiKey = () => {
  return runtimeSarvamApiKey || process.env.SARVAM_API_KEY || '';
};

export const setSarvamApiKey = (key) => {
  runtimeSarvamApiKey = key ? key.trim() : '';
  process.env.SARVAM_API_KEY = runtimeSarvamApiKey;
  
  // Also persist to backend/.env if possible
  try {
    const envPath = path.resolve(__dirname, '../../.env');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf-8');
      if (envContent.includes('SARVAM_API_KEY=')) {
        envContent = envContent.replace(/SARVAM_API_KEY=.*/, `SARVAM_API_KEY=${runtimeSarvamApiKey}`);
      } else {
        envContent += `\nSARVAM_API_KEY=${runtimeSarvamApiKey}\n`;
      }
      fs.writeFileSync(envPath, envContent, 'utf-8');
    }
  } catch (e) {
    console.warn('[Sarvam] Could not write to .env:', e.message);
  }
};

/**
 * High-quality educational fallback vocabulary for Indian classrooms
 */
const BUILTIN_VOCABULARY = {
  'hi': {
    'Classroom Schedule & Rotations': 'कक्षा समय-सारणी और आवर्तन',
    'Live Classroom Rotation Companion': 'लाइव कक्षा आवर्तन साथी',
    'Classroom Opening & Context Hook': 'कक्षा प्रारंभ और विषय परिचय',
    'Joint Review & Slate Check': 'सामूहिक समीक्षा और स्लेट जांच',
    'Direct Instruction: Grade 1 Focus': 'प्रत्यक्ष शिक्षण: कक्षा 1 फोकस',
    'Direct Instruction: Grade 2 Focus': 'प्रत्यक्ष शिक्षण: कक्षा 2 फोकस',
    'Direct Instruction: Grade 3 Focus': 'प्रत्यक्ष शिक्षण: कक्षा 3 फोकस',
    'Direct Instruction: Grade 4 Focus': 'प्रत्यक्ष शिक्षण: कक्षा 4 फोकस',
    'Direct Instruction: Grade 5 Focus': 'प्रत्यक्ष शिक्षण: कक्षा 5 फोकस',
    'Teacher Direct': 'शिक्षक प्रत्यक्ष',
    'Peer Buddy': 'सहपाठी मित्र',
    'Independent Slate': 'स्वतंत्र स्लेट अभ्यास',
    'Start Slot': 'स्लॉट प्रारंभ करें',
    'Pause': 'रोकें',
    'Reset': 'रीसेट',
    'Regenerate Slots': 'स्लॉट पुनः बनाएं',
    'Save Schedule': 'शेड्यूल सहेजें',
    'Add Slot': 'नया स्लॉट जोड़ें',
    'Active Lesson Plan': 'सक्रिय पाठ योजना',
    'Duration': 'अवधि',
    'Dashboard': 'डैशबोर्ड',
    'Classroom Setup': 'कक्षा सेटअप',
    'Student Roster': 'छात्र सूची',
    'Attendance': 'उपस्थिति',
    'AI Lesson Planner': 'एआई पाठ योजनाकार',
    'Worksheets & Tests': 'कार्यपत्रक व परीक्षण',
    'Student Progress': 'छात्र प्रगति',
    'Support & Remedial': 'सहायता व उपचारात्मक',
    'Class Analytics': 'कक्षा विश्लेषण',
    'Settings & Language': 'सेटिंग्स व भाषा'
  },
  'kn': {
    'Classroom Schedule & Rotations': 'ತರಗತಿ ವೇಳಾಪಟ್ಟಿ ಮತ್ತು ಸರದಿಗಳು',
    'Live Classroom Rotation Companion': 'ಲೈವ್ ತರಗತಿ ಸರದಿ ಸಹಾಯಕ',
    'Classroom Opening & Context Hook': 'ತರಗತಿ ಪ್ರಾರಂಭ ಮತ್ತು ವಿಷಯ ಪರಿಚಯ',
    'Joint Review & Slate Check': 'ಜಂಟಿ ಪರಿಶೀಲನೆ ಮತ್ತು ಸ್ಲೇಟ್ ತಪಾಸಣೆ',
    'Direct Instruction: Grade 1 Focus': 'ನೇರ ಬೋಧನೆ: ತರಗತಿ 1 ಆದ್ಯತೆ',
    'Direct Instruction: Grade 2 Focus': 'ನೇರ ಬೋಧನೆ: ತರಗತಿ 2 ಆದ್ಯತೆ',
    'Direct Instruction: Grade 3 Focus': 'ನೇರ ಬೋಧನೆ: ತರಗತಿ 3 ಆದ್ಯತೆ',
    'Direct Instruction: Grade 4 Focus': 'ನೇರ ಬೋಧನೆ: ತರಗತಿ 4 ಆದ್ಯತೆ',
    'Direct Instruction: Grade 5 Focus': 'ನೇರ ಬೋಧನೆ: ತರಗತಿ 5 ಆದ್ಯತೆ',
    'Teacher Direct': 'ಶಿಕ್ಷಕರ ನೇರ ಬೋಧನೆ',
    'Peer Buddy': 'ಸಹಪಾಠಿ ಜೋಡಿ',
    'Independent Slate': 'ಸ್ವತಂತ್ರ ಸ್ಲೇಟ್ ಅಭ್ಯಾಸ',
    'Start Slot': 'ಸ್ಲಾಟ್ ಪ್ರಾರಂಭಿಸಿ',
    'Pause': 'ವಿರಾಮ',
    'Reset': 'ಮರುಹೊಂದಿಸಿ',
    'Regenerate Slots': 'ಸ್ಲಾಟ್‌ಗಳನ್ನು ಮರುರಚಿಸಿ',
    'Save Schedule': 'ವೇಳಾಪಟ್ಟಿ ಉಳಿಸಿ',
    'Add Slot': 'ಸ್ಲಾಟ್ ಸೇರಿಸಿ',
    'Active Lesson Plan': 'ಸಕ್ರಿಯ ಪಾಠ ಯೋಜನೆ',
    'Duration': 'ಅವಧಿ',
    'Dashboard': 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    'Classroom Setup': 'ತರಗತಿ ಸೆಟಪ್',
    'Student Roster': 'ವಿದ್ಯಾರ್ಥಿಗಳ ಪಟ್ಟಿ',
    'Attendance': 'ಹಾಜರಾತಿ',
    'AI Lesson Planner': 'ಎಐ ಪಾಠ ಯೋಜನೆ',
    'Worksheets & Tests': 'ವರ್ಕ್‌ಶೀಟ್‌ಗಳು ಮತ್ತು ಪರೀಕ್ಷೆಗಳು',
    'Student Progress': 'ವಿದ್ಯಾರ್ಥಿ ಪ್ರಗತಿ',
    'Support & Remedial': 'ಬೆಂಬಲ ಮತ್ತು ಪರಿಹಾರ',
    'Class Analytics': 'ತರಗತಿ ವಿಶ್ಲೇಷಣೆ',
    'Settings & Language': 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು ಮತ್ತು ಭಾಷೆ'
  },
  'ta': {
    'Classroom Schedule & Rotations': 'வகுப்பறை அட்டவணை & சுழற்சிகள்',
    'Live Classroom Rotation Companion': 'நேரடி வகுப்பறை சுழற்சி தோழன்',
    'Classroom Opening & Context Hook': 'வகுப்பறை தொடக்கம் & சூழல் அறிமுகம்',
    'Joint Review & Slate Check': 'கூட்டு மதிப்பாய்வு & பலகை சரிபார்ப்பு',
    'Teacher Direct': 'ஆசிரியர் நேரடி கற்பித்தல்',
    'Peer Buddy': 'இணை நண்பர் பயிற்சி',
    'Independent Slate': 'சுயேச்சை பலகை பயிற்சி',
    'Start Slot': 'தொடங்கு',
    'Regenerate Slots': 'மறுஉருவாக்கு',
    'Save Schedule': 'அட்டவணையைச் சேமி',
    'Add Slot': 'நேரம் சேர்',
    'Dashboard': 'டாஷ்போர்டு',
    'Attendance': 'வருகை',
    'AI Lesson Planner': 'AI பாடத் திட்டம்'
  },
  'te': {
    'Classroom Schedule & Rotations': 'తరగతి గది కాలపట్టిక & రొటేషన్లు',
    'Live Classroom Rotation Companion': 'లైవ్ తరగతి గది రొటేషన్ సహచరుడు',
    'Classroom Opening & Context Hook': 'తరగతి ప్రారంభం & పరిచయం',
    'Joint Review & Slate Check': 'సమిష్టి సమీక్ష & పలక పరిశీలన',
    'Teacher Direct': 'ఉపాధ్యాయుల ప్రత్యక్ష బోధన',
    'Peer Buddy': 'తోటి మిత్రుల అభ్యాసం',
    'Independent Slate': 'స్వతంత్ర పలక సాధన',
    'Start Slot': 'ప్రారంభించు',
    'Regenerate Slots': 'తిరిగి రూపొందించు',
    'Save Schedule': 'షెడ్యూల్ సేవ్ చేయి',
    'Add Slot': 'స్లాట్ జోడించు',
    'Dashboard': 'డ్యాష్‌బోర్డ్',
    'Attendance': 'హాజరు',
    'AI Lesson Planner': 'AI పాఠ్య ప్రణాళిక'
  }
};

/**
 * Translate a single string using Sarvam AI Translation API
 */
export const translateTextWithSarvam = async ({
  text,
  target_language = 'hi',
  source_language = 'en'
}) => {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return { translated_text: text || '', source: 'passthrough' };
  }

  // Normalize language codes
  const targetCode = SARVAM_LANGUAGE_MAP[target_language] || `${target_language}-IN`;
  const sourceCode = SARVAM_LANGUAGE_MAP[source_language] || 'en-IN';

  if (targetCode === sourceCode || target_language === 'en') {
    return { translated_text: text, source: 'same-language' };
  }

  // 1. Check in-memory / persistent cache
  const cacheKey = `${sourceCode}_${targetCode}_${text.trim()}`;
  if (translationCache[cacheKey]) {
    return { translated_text: translationCache[cacheKey], source: 'cache' };
  }

  // 2. Check built-in educational vocabulary
  const shortTarget = target_language.split('-')[0].toLowerCase();
  if (BUILTIN_VOCABULARY[shortTarget] && BUILTIN_VOCABULARY[shortTarget][text.trim()]) {
    const matched = BUILTIN_VOCABULARY[shortTarget][text.trim()];
    translationCache[cacheKey] = matched;
    persistCache();
    return { translated_text: matched, source: 'vocabulary' };
  }

  const apiKey = getSarvamApiKey();

  // 3. Call Sarvam AI Translation API if key is available
  if (apiKey && apiKey !== 'your_sarvam_api_key_here') {
    try {
      const response = await fetch('https://api.sarvam.ai/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-subscription-key': apiKey
        },
        body: JSON.stringify({
          input: text.trim(),
          source_language_code: sourceCode,
          target_language_code: targetCode,
          model: 'mayura:v1',
          mode: 'formal'
        })
      });

      if (response.ok) {
        const data = await response.json();
        const translated = data.translated_text || text;
        translationCache[cacheKey] = translated;
        persistCache();
        return {
          translated_text: translated,
          request_id: data.request_id,
          source: 'sarvam-ai'
        };
      } else {
        const errText = await response.text();
        console.warn(`[Sarvam API Error ${response.status}]:`, errText);
      }
    } catch (apiErr) {
      console.warn('[Sarvam API Call Exception]:', apiErr.message);
    }
  }

  // 4. Fallback: Return original text gracefully if no API key or call failed
  return {
    translated_text: text,
    source: 'fallback-original',
    note: 'Configure SARVAM_API_KEY in settings or backend/.env for real-time translation'
  };
};

/**
 * Translate an array of text strings using Sarvam AI
 */
export const translateBatchWithSarvam = async ({
  texts = [],
  target_language = 'hi',
  source_language = 'en'
}) => {
  if (!Array.isArray(texts) || texts.length === 0) {
    return { translated_texts: [], source: 'empty' };
  }

  const results = [];
  // Concurrently translate with concurrency limit of 5
  const concurrency = 5;
  for (let i = 0; i < texts.length; i += concurrency) {
    const chunk = texts.slice(i, i + concurrency);
    const chunkPromises = chunk.map(text => 
      translateTextWithSarvam({ text, target_language, source_language })
    );
    const chunkResults = await Promise.all(chunkPromises);
    chunkResults.forEach(res => results.push(res.translated_text));
  }

  return {
    translated_texts: results,
    count: results.length,
    source: 'sarvam-batch'
  };
};

/**
 * Recursively translate an entire JSON i18n bundle object
 */
export const translateBundleWithSarvam = async (bundleObj, targetLang) => {
  const result = {};

  const processNode = async (source, dest) => {
    for (const key of Object.keys(source)) {
      const val = source[key];
      if (typeof val === 'string') {
        const res = await translateTextWithSarvam({
          text: val,
          target_language: targetLang,
          source_language: 'en'
        });
        dest[key] = res.translated_text;
      } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        dest[key] = {};
        await processNode(val, dest[key]);
      } else {
        dest[key] = val;
      }
    }
  };

  await processNode(bundleObj, result);
  return result;
};

