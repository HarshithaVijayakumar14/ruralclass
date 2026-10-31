/**
 * Web Speech API Voice Dictation Helper for Teacher Observations
 */

export const isSpeechRecognitionSupported = () => {
  return typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
};

export const createSpeechRecognizer = ({ onResult, onError, onEnd }) => {
  if (!isSpeechRecognitionSupported()) {
    return null;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-IN'; // Default to Indian English, supports Kannada 'kn-IN' / Hindi 'hi-IN'

  recognition.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }

    if (onResult) {
      onResult({
        finalText: finalTranscript,
        interimText: interimTranscript,
        fullText: (finalTranscript + ' ' + interimTranscript).trim()
      });
    }
  };

  recognition.onerror = (event) => {
    console.warn('[SpeechRecognition] Error:', event.error);
    if (onError) onError(event.error);
  };

  recognition.onend = () => {
    if (onEnd) onEnd();
  };

  return recognition;
};

