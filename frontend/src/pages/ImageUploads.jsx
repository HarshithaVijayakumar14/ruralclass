import React, { useState } from 'react';
import { 
  Camera, 
  Upload, 
  Image as ImageIcon, 
  Sparkles, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  BookOpen,
  Edit3,
  Loader2,
  Check,
  Plus,
  ChevronLeft,
  ChevronRight,
  Layers,
  ArrowRight,
  Sparkle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { runBatchClientOCR } from '../lib/ocr';
import { useTranslation } from 'react-i18next';

const SUBJECT_OPTIONS = [
  'Environmental Studies (EVS)',
  'Mathematics',
  'Language & Reading',
  'Computer Science / Digital Skills',
  'General Science',
  'Social Studies'
];

export const ImageUploads = ({ activeClassroom }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // Multi-photo state: array of { id, dataUrl, name, size, type }
  const [photos, setPhotos] = useState([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  
  // OCR processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanProgress, setScanProgress] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [activeMode, setActiveMode] = useState('scan'); // 'scan' | 'manual'

  // Extracted pedagogical data (editable by teacher)
  const [extractedTopic, setExtractedTopic] = useState('');
  const [extractedSubject, setExtractedSubject] = useState('Environmental Studies (EVS)');
  const [extractedGrades, setExtractedGrades] = useState([2, 3, 4]);
  const [extractedText, setExtractedText] = useState('');
  const [keyConcepts, setKeyConcepts] = useState([]);
  const [tlmIdeas, setTlmIdeas] = useState([]);
  const [pageBreakdowns, setPageBreakdowns] = useState([]);

  // Handle multi-file selection & appending
  const handleAddPhotos = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    const validFiles = [];
    for (const file of selectedFiles) {
      if (file.size > 10 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds 10MB limit and was skipped.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    let loadedCount = 0;
    const newLoadedPhotos = [];

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        newLoadedPhotos.push({
          id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          dataUrl: reader.result,
          name: file.name,
          size: (file.size / 1024).toFixed(1) + ' KB',
          type: file.type || 'image/jpeg'
        });

        loadedCount++;
        if (loadedCount === validFiles.length) {
          setPhotos(prev => {
            const updated = [...prev, ...newLoadedPhotos];
            // If first photos added, focus on first
            if (prev.length === 0) setActivePhotoIndex(0);
            return updated;
          });
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset input so user can re-add same file if needed
    e.target.value = '';
  };

  // Remove individual photo from batch
  const handleRemovePhoto = (idToRemove) => {
    setPhotos(prev => {
      const nextPhotos = prev.filter(p => p.id !== idToRemove);
      if (activePhotoIndex >= nextPhotos.length) {
        setActivePhotoIndex(Math.max(0, nextPhotos.length - 1));
      }
      return nextPhotos;
    });
  };

  // Clear all photos
  const handleClearAllPhotos = () => {
    setPhotos([]);
    setActivePhotoIndex(0);
    setExtractedTopic('');
    setExtractedText('');
    setKeyConcepts([]);
    setTlmIdeas([]);
    setPageBreakdowns([]);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  // Batch OCR extraction across all uploaded photos
  const handleExtractAllPhotos = async () => {
    if (photos.length === 0) return;

    setIsProcessing(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setScanProgress({ status: 'Starting multi-photo OCR scanner...', percent: 5, currentFile: 0, totalFiles: photos.length });

    try {
      const imageUrls = photos.map(p => p.dataUrl);
      const data = await runBatchClientOCR(imageUrls, ({ status, percent, currentFile, totalFiles }) => {
        setScanProgress({
          status,
          percent: percent || 10,
          currentFile: currentFile || 1,
          totalFiles: totalFiles || photos.length
        });
      });

      if (data) {
        setExtractedTopic(data.extracted_topic || 'Multi-Grade Lesson Concepts');
        setExtractedSubject(data.suggested_subject || 'Environmental Studies (EVS)');
        setExtractedGrades(data.suggested_grades || [2, 3, 4]);
        setExtractedText(data.extracted_passage || '');
        setKeyConcepts(data.key_concepts || []);
        setTlmIdeas(data.zero_cost_tlm_ideas || []);
        setPageBreakdowns(data.pageResults || []);
        setSuccessMsg(`Successfully extracted pedagogical data from ${photos.length} photo${photos.length > 1 ? 's' : ''}!`);
      } else {
        throw new Error('No legible text recognized in uploaded photos.');
      }
    } catch (err) {
      console.warn('[OCR] Recognition error:', err);
      setErrorMsg('Could not read text clearly from the photos. Please ensure photos are well lit, or use Manual Entry to type the topic.');
    } finally {
      setIsProcessing(false);
      setScanProgress(null);
    }
  };

  // Toggle grade selection
  const handleToggleGrade = (gradeNum) => {
    setExtractedGrades(prev => 
      prev.includes(gradeNum)
        ? prev.length > 1 ? prev.filter(g => g !== gradeNum) : prev
        : [...prev, gradeNum].sort((a, b) => a - b)
    );
  };

  // Send to Lesson Planner
  const handlePrefillLesson = () => {
    if (!extractedTopic.trim()) {
      alert('Please provide a lesson topic before prefilling.');
      return;
    }
    navigate('/lessons', {
      state: {
        prefillTopic: extractedTopic.trim(),
        prefillSubject: extractedSubject,
        prefillGrades: extractedGrades,
        prefillMaterials: tlmIdeas.length > 0 ? tlmIdeas : ['Chalkboard', 'Student Slates & Chalk', 'Tamarind Seeds / Pebbles']
      }
    });
  };

  const activePhoto = photos[activePhotoIndex] || null;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <Camera className="w-6 h-6 text-[#2E7D32]" />
            <span>{t('nav.imageUploads', 'Textbook & Slate Photos')}</span>
          </h1>
          <p className="text-xs text-stone-500">
            Upload single or multiple textbook pages, blackboard photos, or plant specimens to extract real lesson topics directly
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex bg-stone-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveMode('scan')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeMode === 'scan' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#2E7D32]" />
            <span>Multi-Photo Scanner</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('manual')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeMode === 'manual' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 text-stone-500" />
            <span>{t('common.edit', 'Manual Entry')}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#2E7D32] shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {activeMode === 'scan' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: Multi-Photo Manager & Preview (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Main Upload Box */}
            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-stone-900">Upload Textbook or Blackboard Photos</h2>
                  <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Direct Multi-Photo OCR
                  </span>
                </div>
                {photos.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllPhotos}
                    className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All ({photos.length})</span>
                  </button>
                )}
              </div>

              {/* Upload Dropzone / Add Button */}
              {photos.length === 0 ? (
                <div className="border-2 border-dashed border-stone-300 rounded-2xl p-8 text-center space-y-3 hover:border-emerald-500 transition-colors bg-stone-50/50">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 text-[#2E7D32] flex items-center justify-center mx-auto shadow-xs">
                    <Camera className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-stone-800">
                      Add photos of textbook pages, blackboards, or specimens
                    </div>
                    <p className="text-[11px] text-stone-500 max-w-sm mx-auto">
                      Select one or multiple photos at once (Page 1, Page 2, exercises, specimens). PNG, JPG, or WEBP.
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-bold text-xs transition-colors shadow-xs cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <span>Choose Multiple Photos</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple 
                      onChange={handleAddPhotos} 
                      className="hidden" 
                    />
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  
                  {/* Photo Strip / Carousel of all uploaded pages */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-stone-600 mb-2">
                      <span>Uploaded Photos ({photos.length} page{photos.length > 1 ? 's' : ''}):</span>
                      <label className="text-[#2E7D32] hover:underline cursor-pointer flex items-center gap-1 text-xs font-bold">
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add More Photos</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          multiple 
                          onChange={handleAddPhotos} 
                          className="hidden" 
                        />
                      </label>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                      {photos.map((photo, idx) => (
                        <div 
                          key={photo.id}
                          onClick={() => setActivePhotoIndex(idx)}
                          className={`relative group shrink-0 w-20 h-24 rounded-xl border-2 overflow-hidden cursor-pointer transition-all ${
                            idx === activePhotoIndex
                              ? 'border-[#2E7D32] ring-2 ring-emerald-100 shadow-sm'
                              : 'border-stone-200 hover:border-stone-400 opacity-75 hover:opacity-100'
                          }`}
                        >
                          <img 
                            src={photo.dataUrl} 
                            alt={`Page ${idx + 1}`} 
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-0 inset-x-0 bg-stone-900/80 text-[10px] text-white font-bold px-1 py-0.5 text-center truncate">
                            Page {idx + 1}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemovePhoto(photo.id);
                            }}
                            className="absolute top-1 right-1 p-1 bg-red-600/90 hover:bg-red-700 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove this photo"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}

                      {/* Quick "+ Add More" card */}
                      <label className="shrink-0 w-20 h-24 rounded-xl border-2 border-dashed border-stone-300 hover:border-[#2E7D32] flex flex-col items-center justify-center gap-1 text-stone-500 hover:text-[#2E7D32] cursor-pointer transition-colors bg-stone-50">
                        <Plus className="w-5 h-5" />
                        <span className="text-[10px] font-bold">Add More</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          multiple 
                          onChange={handleAddPhotos} 
                          className="hidden" 
                        />
                      </label>
                    </div>
                  </div>

                  {/* Active Photo Large Viewer */}
                  {activePhoto && (
                    <div className="relative rounded-2xl border border-stone-200 bg-stone-950 p-2 overflow-hidden">
                      <div className="flex items-center justify-between text-white/80 text-xs px-2 py-1 mb-1">
                        <span className="font-semibold">
                          Viewing Photo {activePhotoIndex + 1} of {photos.length} ({activePhoto.name})
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={activePhotoIndex === 0}
                            onClick={() => setActivePhotoIndex(prev => Math.max(0, prev - 1))}
                            className="p-1 rounded-lg hover:bg-white/10 disabled:opacity-30 text-white"
                            title="Previous Photo"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={activePhotoIndex === photos.length - 1}
                            onClick={() => setActivePhotoIndex(prev => Math.min(photos.length - 1, prev + 1))}
                            className="p-1 rounded-lg hover:bg-white/10 disabled:opacity-30 text-white"
                            title="Next Photo"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-center max-h-72 overflow-hidden rounded-xl bg-black/40">
                        <img 
                          src={activePhoto.dataUrl} 
                          alt={`Active page ${activePhotoIndex + 1}`} 
                          className="max-h-72 w-auto object-contain mx-auto"
                        />
                      </div>
                    </div>
                  )}

                  {/* Extraction Trigger Button with Live Progress */}
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={handleExtractAllPhotos}
                      disabled={isProcessing}
                      className="w-full py-3 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] disabled:bg-stone-300 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{scanProgress?.status || `Extracting text from ${photos.length} photos...`}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-300" />
                          <span>Extract Text & Topics from All Photos ({photos.length})</span>
                        </>
                      )}
                    </button>

                    {scanProgress && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-medium text-stone-500">
                          <span>{scanProgress.status}</span>
                          <span>{scanProgress.percent}%</span>
                        </div>
                        <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-[#2E7D32] h-full transition-all duration-300 rounded-full"
                            style={{ width: `${scanProgress.percent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>

          </div>

          {/* RIGHT: Extracted Pedagogical Data & Direct Transfer (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#2E7D32]" />
                  <h2 className="text-sm font-bold text-stone-900">Extracted Pedagogical Data</h2>
                </div>
                {extractedTopic && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Ready to Plan
                  </span>
                )}
              </div>

              {!extractedTopic && !extractedText ? (
                <div className="py-12 px-4 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                    <FileText className="w-6 h-6" />
                  </div>
                  <p className="text-xs text-stone-500 leading-relaxed max-w-xs mx-auto">
                    Upload your textbook or blackboard photos on the left, then click <strong>"Extract Text & Topics"</strong> to auto-detect lesson content.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  
                  {/* Primary Call to Action Button: Send to Planner */}
                  <button
                    type="button"
                    onClick={handlePrefillLesson}
                    className="w-full py-3 px-4 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-transform active:scale-98 cursor-pointer"
                  >
                    <span>🚀 Prefill Multi-Grade Lesson Planner</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  {/* Editable Lesson Topic */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-stone-600 block">
                      Lesson Topic (Editable)
                    </label>
                    <input
                      type="text"
                      value={extractedTopic}
                      onChange={(e) => setExtractedTopic(e.target.value)}
                      placeholder="e.g. Parts of a Flower & Plant Growth"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-semibold text-stone-900 focus:outline-none focus:border-[#2E7D32]"
                    />
                  </div>

                  {/* Subject Dropdown Selector */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-stone-600 block">
                      Subject
                    </label>
                    <select
                      value={extractedSubject}
                      onChange={(e) => setExtractedSubject(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-medium text-stone-800 bg-white focus:outline-none focus:border-[#2E7D32]"
                    >
                      {SUBJECT_OPTIONS.map(subj => (
                        <option key={subj} value={subj}>{subj}</option>
                      ))}
                    </select>
                  </div>

                  {/* Target Grades Multi-Select */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-stone-600 block">
                      Participating Grades
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(g => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => handleToggleGrade(g)}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                            extractedGrades.includes(g)
                              ? 'bg-[#2E7D32] text-white shadow-xs'
                              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                          }`}
                        >
                          G{g}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Key Concepts List */}
                  {keyConcepts.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-stone-600 block">
                        Extracted Key Concepts
                      </label>
                      <ul className="space-y-1 text-xs text-stone-700 bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                        {keyConcepts.map((kc, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32] shrink-0 mt-1.5" />
                            <span>{kc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Zero-Cost TLM Ideas */}
                  {tlmIdeas.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-stone-600 block">
                        Zero-Cost Rural TLM Ideas
                      </label>
                      <ul className="space-y-1 text-xs text-stone-700 bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/80">
                        {tlmIdeas.map((idea, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0 mt-1.5" />
                            <span>{idea}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Combined OCR Text / Passages */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-stone-600 block">
                      Recognized Text across {photos.length > 0 ? `${photos.length} Photo(s)` : 'Source'}
                    </label>
                    <textarea
                      rows={5}
                      value={extractedText}
                      onChange={(e) => setExtractedText(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-300 text-xs font-mono bg-stone-50 text-stone-800 focus:outline-none focus:border-[#2E7D32] resize-y"
                    />
                  </div>

                  {/* Bottom Prefill Button */}
                  <button
                    type="button"
                    onClick={handlePrefillLesson}
                    className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <span>Send to Multi-Grade Lesson Planner</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                </div>
              )}
            </div>

          </div>

        </div>
      ) : (
        /* MANUAL ENTRY TAB */
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs max-w-2xl mx-auto space-y-5">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
            <Edit3 className="w-5 h-5 text-[#2E7D32]" />
            <div>
              <h2 className="text-sm font-bold text-stone-900">Direct Manual Lesson Entry</h2>
              <p className="text-xs text-stone-500">
                Type or paste any textbook topic or curriculum unit directly without using a camera
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 block">
                Lesson Topic *
              </label>
              <input
                type="text"
                required
                value={extractedTopic}
                onChange={(e) => setExtractedTopic(e.target.value)}
                placeholder="e.g. Parts of a Plant & Seed Germination"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-[#2E7D32]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 block">
                Subject
              </label>
              <select
                value={extractedSubject}
                onChange={(e) => setExtractedSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white focus:outline-none focus:border-[#2E7D32]"
              >
                {SUBJECT_OPTIONS.map(subj => (
                  <option key={subj} value={subj}>{subj}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 block">
                Grades Taught Simultaneously
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => handleToggleGrade(g)}
                    className={`w-9 h-9 rounded-xl text-xs font-bold transition-colors ${
                      extractedGrades.includes(g)
                        ? 'bg-[#2E7D32] text-white shadow-xs'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    G{g}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 block">
                Key Notes / Textbook Paragraph (Optional)
              </label>
              <textarea
                rows={4}
                value={extractedText}
                onChange={(e) => setExtractedText(e.target.value)}
                placeholder="Paste key textbook definitions or sentences here..."
                className="w-full p-3 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-[#2E7D32]"
              />
            </div>

            <button
              type="button"
              onClick={handlePrefillLesson}
              disabled={!extractedTopic.trim()}
              className="w-full py-3 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] disabled:bg-stone-300 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>Prefill Multi-Grade Lesson Planner</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
