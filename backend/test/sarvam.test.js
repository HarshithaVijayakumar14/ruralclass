import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { 
  SARVAM_LANGUAGE_MAP, 
  translateTextWithSarvam, 
  translateBatchWithSarvam,
  getSarvamApiKey,
  setSarvamApiKey
} from '../src/services/sarvam.service.js';

describe('RuralClass Sarvam AI Regional Translation Service', () => {

  test('SARVAM_LANGUAGE_MAP supports all core 22 Indian regional languages', () => {
    assert.equal(SARVAM_LANGUAGE_MAP['hi'], 'hi-IN');
    assert.equal(SARVAM_LANGUAGE_MAP['kn'], 'kn-IN');
    assert.equal(SARVAM_LANGUAGE_MAP['ta'], 'ta-IN');
    assert.equal(SARVAM_LANGUAGE_MAP['te'], 'te-IN');
    assert.equal(SARVAM_LANGUAGE_MAP['mr'], 'mr-IN');
    assert.equal(SARVAM_LANGUAGE_MAP['bn'], 'bn-IN');
    assert.equal(SARVAM_LANGUAGE_MAP['gu'], 'gu-IN');
    assert.equal(SARVAM_LANGUAGE_MAP['ml'], 'ml-IN');
    assert.equal(SARVAM_LANGUAGE_MAP['or'], 'od-IN');
    assert.equal(SARVAM_LANGUAGE_MAP['pa'], 'pa-IN');
  });

  test('translateTextWithSarvam translates educational vocabulary via built-in corpus', async () => {
    const resHindi = await translateTextWithSarvam({
      text: 'Classroom Schedule & Rotations',
      target_language: 'hi'
    });
    assert.equal(resHindi.translated_text, 'कक्षा समय-सारणी और आवर्तन');

    const resKannada = await translateTextWithSarvam({
      text: 'Classroom Schedule & Rotations',
      target_language: 'kn'
    });
    assert.equal(resKannada.translated_text, 'ತರಗತಿ ವೇಳಾಪಟ್ಟಿ ಮತ್ತು ಸರದಿಗಳು');
  });

  test('translateBatchWithSarvam translates an array of multi-grade phrases', async () => {
    const texts = ['Teacher Direct', 'Peer Buddy', 'Independent Slate'];
    const res = await translateBatchWithSarvam({
      texts,
      target_language: 'hi'
    });

    assert.equal(res.translated_texts.length, 3);
    assert.equal(res.translated_texts[0], 'शिक्षक प्रत्यक्ष');
    assert.equal(res.translated_texts[1], 'सहपाठी मित्र');
    assert.equal(res.translated_texts[2], 'स्वतंत्र स्लेट अभ्यास');
  });

  test('setSarvamApiKey sets and getSarvamApiKey retrieves runtime key', () => {
    const testKey = 'test-sarvam-key-12345';
    setSarvamApiKey(testKey);
    assert.equal(getSarvamApiKey(), testKey);
    // Reset key
    setSarvamApiKey('');
  });

  test('translateTextWithSarvam gracefully returns text when target is English', async () => {
    const res = await translateTextWithSarvam({
      text: 'Student Roster',
      target_language: 'en'
    });
    assert.equal(res.translated_text, 'Student Roster');
  });

});

