import { createWorker } from 'tesseract.js';

/**
 * Perform direct client-side Optical Character Recognition (OCR) on a single photo
 */
export const runClientOCR = async (imageSource, onProgress = () => {}) => {
  return await runBatchClientOCR([imageSource], ({ status, percent }) => {
    onProgress({ status, progress: percent / 100 });
  });
};

/**
 * Perform batch client-side OCR on multiple photos (e.g. multiple textbook pages)
 * Works 100% locally and directly in the browser with zero external API keys.
 */
export const runBatchClientOCR = async (imageSources, onProgress = () => {}) => {
  if (!imageSources || imageSources.length === 0) return null;

  let worker = null;
  try {
    onProgress({
      status: 'Initializing OCR engine...',
      currentFile: 0,
      totalFiles: imageSources.length,
      percent: 5
    });

    worker = await createWorker('eng');

    const pageResults = [];
    for (let i = 0; i < imageSources.length; i++) {
      const src = imageSources[i];
      const pageNum = i + 1;
      
      onProgress({
        status: `Reading photo ${pageNum} of ${imageSources.length}...`,
        currentFile: pageNum,
        totalFiles: imageSources.length,
        percent: Math.round(((i + 0.1) / imageSources.length) * 90)
      });

      const result = await worker.recognize(src);
      const text = result?.data?.text?.trim() || '';
      pageResults.push({
        pageNumber: pageNum,
        text
      });
    }

    onProgress({
      status: 'Analyzing pedagogical concepts across all pages...',
      currentFile: imageSources.length,
      totalFiles: imageSources.length,
      percent: 95
    });

    const combinedText = pageResults.map(p => `[Page ${p.pageNumber}]\n${p.text}`).join('\n\n');
    const parsed = parseEducationalContentFromText(combinedText);
    parsed.pageResults = pageResults;
    return parsed;
  } catch (err) {
    console.warn('[Client OCR] Error during batch recognition:', err);
    throw err;
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch (e) {}
    }
  }
};

/**
 * Filter out editor chrome, window menus, and random punctuation noise
 */
export const cleanOcrLines = (lines) => {
  const noisyPatterns = [
    /file\s+edit\s+selection/i,
    /view\s+go\s+run/i,
    /terminal\s+help/i,
    /localhost:\d+/i,
    /https?:\/\//i,
    /doctype\s+html/i,
    /import\s+.*\s+from/i,
    /^\W+$/,
    /^[0-9\W]+$/
  ];

  return lines.filter(line => {
    const trimmed = line.trim();
    if (trimmed.length < 3) return false;
    return !noisyPatterns.some(pattern => pattern.test(trimmed));
  });
};

/**
 * Intelligently derive pedagogical topics, subject, and zero-cost TLM
 * from real extracted OCR text across one or more pages.
 */
export const parseEducationalContentFromText = (rawText) => {
  if (!rawText || rawText.length < 5) {
    return {
      extracted_topic: 'General Multi-Grade Study',
      suggested_subject: 'General Studies',
      suggested_grades: [2, 3],
      extracted_passage: rawText || 'No legible text detected. Please ensure photos are well-lit and in focus.',
      key_concepts: ['Visual observation', 'Slate practice'],
      zero_cost_tlm_ideas: ['Chalkboard demonstration', 'Student slates & chalk']
    };
  }

  const allLines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const meaningfulLines = cleanOcrLines(allLines);
  const lower = rawText.toLowerCase();

  let subject = 'Language & General Studies';
  let grades = [2, 3];
  let topic = '';
  let tlmIdeas = ['Chalkboard diagrams', 'Student slates & chalk', 'Peer review'];
  let keyConcepts = [];

  // 1. Flowers / Plants / Botany (e.g. flower searches or botany textbooks)
  if (lower.includes('flower') || lower.includes('petal') || lower.includes('sepal') || lower.includes('stamen') || lower.includes('pistil') || lower.includes('pollen') || lower.includes('pollination') || lower.includes('blossom') || lower.includes('corolla') || lower.includes('calyx')) {
    subject = 'Environmental Studies (EVS)';
    grades = [3, 4, 5];
    topic = 'Parts of a Flower & Plant Reproduction';
    tlmIdeas = [
      'Real garden flowers (Hibiscus/Mustard/Marigold) from school grounds to dissect',
      'Chalkboard diagram showing Sepal, Petal, Stamen, and Pistil',
      'Student slates: Draw and label flower components with bench partner'
    ];
    keyConcepts = [
      'Four main whorls of a flower (Calyx, Corolla, Androecium, Gynoecium)',
      'Functions of colorful petals in attracting pollinators',
      'Observation and dissection of real flower specimens on slates'
    ];
  } 
  // 2. Plants / Living Things / EVS
  else if (lower.includes('plant') || lower.includes('leaf') || lower.includes('leaves') || lower.includes('root') || lower.includes('stem') || lower.includes('seed') || lower.includes('soil') || lower.includes('germinat') || lower.includes('photosynthesis')) {
    subject = 'Environmental Studies (EVS)';
    grades = [2, 3, 4];
    topic = 'Structure of Plants & Seed Growth';
    tlmIdeas = [
      'Real leaves, roots, and soil specimens collected from school courtyard',
      'Sprouted seeds in moist cloth to inspect roots and shoots',
      'Chalkboard comparative sketches of taproots vs fibrous roots'
    ];
    keyConcepts = [
      'Functions of roots (absorption) and green leaves (food preparation)',
      'Conditions needed for seed germination (water, warmth, air)',
      'Hands-on specimen observation on slates'
    ];
  }
  // 3. Computer Science / Digital Literacy / Web Code
  else if (lower.includes('html') || lower.includes('react') || lower.includes('component') || lower.includes('javascript') || lower.includes('function') || lower.includes('code') || lower.includes('css') || lower.includes('terminal') || lower.includes('tag')) {
    subject = 'Computer Science / Digital Skills';
    grades = [5, 6, 7, 8];
    topic = 'Introduction to Web Pages & Software Components';
    tlmIdeas = [
      'Chalkboard wireframe blocks representing Header, Body, and Footer',
      'Paper card coding: students arrange physical paper strips into page layout',
      'Slate syntax drills: write matching opening and closing tags in pairs'
    ];
    keyConcepts = [
      'Hierarchical page structure (Headers, Main content, and Footers)',
      'Reusability of building blocks (components/modules)',
      'Logical step-by-step sequencing of computer instructions'
    ];
  }
  // 4. Mathematics / Arithmetic
  else if (lower.includes('math') || lower.includes('fraction') || lower.includes('multiply') || lower.includes('division') || lower.includes('addition') || lower.includes('subtract') || lower.includes('number') || lower.includes('geometry') || lower.includes('angle') || /\b\d+\s*[\+\-\*\/]\s*\d+\b/.test(rawText)) {
    subject = 'Mathematics';
    grades = [2, 3, 4];
    topic = 'Multi-Grade Number Concepts & Arithmetic';
    tlmIdeas = [
      'Tamarind seeds or river pebbles for concrete grouping and arrays',
      'Chalkboard place value columns (Units, Tens, Hundreds)',
      'Slate peer speed drills with buddy checking'
    ];
    keyConcepts = [
      'Place value decomposition and concrete representation',
      'Arithmetic operations visualized through pebble arrays',
      'Slate mental math calculations'
    ];
  }
  // 5. Language / Reading / Grammar
  else if (lower.includes('noun') || lower.includes('verb') || lower.includes('adjective') || lower.includes('sentence') || lower.includes('story') || lower.includes('poem') || lower.includes('grammar') || lower.includes('paragraph')) {
    subject = 'Language & Reading';
    grades = [1, 2, 3];
    topic = 'Reading Comprehension & Grammar Foundations';
    tlmIdeas = [
      'Chalkboard word tree with leaves holding new vocabulary words',
      'Student slates: write 3 sentences using newly learned words',
      'Peer buddy read-aloud: one reads while partner tracks with finger'
    ];
    keyConcepts = [
      'Identification of action words and naming words',
      'Phonics pronunciation and sentence punctuation',
      'Reading fluency through paired oral practice'
    ];
  }

  // If topic wasn't set by specific keywords, pick the first clean meaningful line
  if (!topic) {
    const candidate = meaningfulLines[0] || allLines[0] || 'Key Lesson Concepts';
    topic = candidate.replace(/[<>{}\/\\#*`=_~\[\]]/g, '').trim();
    if (topic.length > 55) {
      topic = topic.substring(0, 52) + '...';
    }
    if (!topic || topic.length < 3) {
      topic = `${subject} Foundational Exploration`;
    }
  }

  if (keyConcepts.length === 0) {
    const topLines = meaningfulLines.slice(0, 3).map(l => l.replace(/[<>{}\/\\#*`=_~\[\]]/g, '').trim()).filter(l => l.length > 4);
    keyConcepts = topLines.length > 0 ? topLines : ['Foundational concepts', 'Hands-on slate practice', 'Peer collaboration'];
  }

  return {
    extracted_topic: topic,
    suggested_subject: subject,
    suggested_grades: grades,
    extracted_passage: rawText.substring(0, 3000),
    key_concepts: keyConcepts.slice(0, 3),
    zero_cost_tlm_ideas: tlmIdeas
  };
};
