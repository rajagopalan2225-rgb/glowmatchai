import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Wand2, Loader2, RefreshCcw, AlertCircle, CheckCircle2, ArrowLeftRight } from 'lucide-react';
import api from '../api';

const UploadZone = ({ id, type, preview, onUpload, onCamera, label, subLabel, icon: Icon }) => (
  <div className="flex flex-col gap-3 w-full">
    <div
      className="glass-card border-dashed min-h-[280px] flex flex-col items-center justify-center p-4 relative group cursor-pointer overflow-hidden transition-all hover:border-rose-gold/40 flex-1"
      onClick={() => document.getElementById(id).click()}
    >
      <input id={id} type="file" hidden accept="image/*" onChange={onUpload} />
      {preview && (
        <img
          src={preview}
          alt={type}
          className="absolute inset-0 w-full h-full object-cover rounded-2xl transition-transform group-hover:scale-105"
          style={{ opacity: 0.55 }}
        />
      )}
      <div className={`relative z-10 text-center space-y-3 transition-opacity ${preview ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
        <Icon className="w-12 h-12 text-rose-gold mx-auto drop-shadow" />
        <h3 className="text-xl font-playfair font-bold">{label}</h3>
        <p className="text-xs text-cream/40 uppercase tracking-widest">{subLabel}</p>
      </div>
      {preview && (
        <div className="absolute bottom-3 right-3 z-10 bg-rose-gold/80 text-dark text-[10px] font-bold uppercase px-2 py-1 rounded-full">
          Click to change
        </div>
      )}
    </div>
    <button 
      onClick={(e) => { e.stopPropagation(); onCamera(); }}
      className="bg-white/5 border border-rose-gold/10 hover:bg-rose-gold/10 text-rose-gold py-3 rounded-2xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
    >
      <Camera className="w-4 h-4" /> Use Live Camera
    </button>
  </div>
);

const TransformationTool = () => {
  const [before, setBefore]             = useState(null);
  const [after, setAfter]               = useState(null);
  const [beforePreview, setBeforePreview] = useState(null);
  const [afterPreview, setAfterPreview]   = useState(null);
  const [loading, setLoading]           = useState(false);
  const [result, setResult]             = useState(null);
  const [error, setError]               = useState(null);

  const [useCamera, setUseCamera]       = useState(false);
  const [stream, setStream]             = useState(null);
  const [capturingFor, setCapturingFor] = useState(null); // 'before' or 'after'
  const [isFlashing, setIsFlashing]     = useState(false);
  
  const [tempCapturedFile, setTempCapturedFile] = useState(null);
  const [tempCapturedPreview, setTempCapturedPreview] = useState(null);
  const beforeInputRef = useRef(null);
  const afterInputRef = useRef(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Persistent video ref callback for stream attachment
  const videoRefCallback = (el) => {
    videoRef.current = el;
    if (el && stream) {
      el.srcObject = stream;
      el.play().catch(e => console.error("Video play failed:", e));
    }
  };

  // Stop camera when unmounting
  useEffect(() => {
    return () => stopCamera();
  }, []);

  const startCamera = async (type) => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      setStream(mediaStream);
      setCapturingFor(type);
      setUseCamera(true);
      setError(null);
    } catch (err) {
      setError("Could not access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    setUseCamera(false);
    setCapturingFor(null);
    setTempCapturedFile(null);
    setTempCapturedPreview(null);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 200);

      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        if (!blob) return;
        const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
        const url = URL.createObjectURL(blob);
        
        setTempCapturedFile(file);
        setTempCapturedPreview(url);
      }, 'image/jpeg');
    }
  };

  const commitPhoto = () => {
    if (tempCapturedFile && tempCapturedPreview) {
      if (capturingFor === 'before') {
        setBefore(tempCapturedFile);
        setBeforePreview(tempCapturedPreview);
      } else {
        setAfter(tempCapturedFile);
        setAfterPreview(tempCapturedPreview);
      }
      stopCamera();
    }
  };

  const retakePhoto = () => {
    setTempCapturedFile(null);
    setTempCapturedPreview(null);
  };

  const handleUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (type === 'before') { setBefore(file); setBeforePreview(url); }
    else                   { setAfter(file);  setAfterPreview(url); }
    setResult(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!before || !after) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('before', before);
    formData.append('after', after);

    try {
      const { data } = await api.post('/api/transform', formData);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Transformation analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null); setError(null);
    setBefore(null); setAfter(null);
    setBeforePreview(null); setAfterPreview(null);
  };

  const pct = result?.transformation_percentage ?? 0;
  const circumference = 2 * Math.PI * 88; // r=88 → ~552.92

  return (
    <div className="max-w-5xl mx-auto space-y-10">

      {/* Camera Overlay */}
      <AnimatePresence>
        {useCamera && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/95 backdrop-blur-xl"
          >
            <div className="relative w-full max-w-2xl aspect-[4/3] rounded-[2rem] overflow-hidden bg-black shadow-2xl border border-white/10">
              <video 
                ref={videoRefCallback} 
                autoPlay 
                playsInline 
                muted
                className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-300 ${tempCapturedPreview ? 'opacity-0' : 'opacity-100'}`} 
              />
              
              {/* PREVIEW IMAGE OVERLAY */}
              {tempCapturedPreview && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0">
                  <img src={tempCapturedPreview} className="w-full h-full object-cover" alt="Captured Transformation" />
                </motion.div>
              )}

              <canvas ref={canvasRef} className="hidden" />
              
              <AnimatePresence>
                {isFlashing && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-white z-50 shadow-2xl" />
                )}
              </AnimatePresence>
              
              <div className="absolute top-6 left-6 bg-rose-gold text-dark text-[10px] font-bold uppercase px-4 py-2 rounded-full tracking-widest z-[60]">
                {tempCapturedPreview ? 'Review' : 'Capturing'} {capturingFor} look
              </div>

              <div className="absolute top-6 right-6 z-[60]">
                <button onClick={stopCamera} className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all border border-white/10 shadow-lg active:scale-95">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="absolute bottom-8 left-0 w-full flex flex-col items-center gap-6 z-[60]">
                {!tempCapturedPreview ? (
                  <button 
                    onClick={capturePhoto} 
                    className="group flex flex-col items-center gap-3 active:scale-95 transition-all"
                  >
                    <div className="w-16 h-16 rounded-full bg-rose-gold text-dark flex items-center justify-center hover:scale-110 shadow-xl shadow-rose-gold/20 transition-all border-4 border-white/10">
                      <Camera className="w-8 h-8" />
                    </div>
                    <span className="text-[10px] font-bold tracking-[0.2em] text-white bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 uppercase transition-all group-hover:bg-rose-gold group-hover:text-dark">Capture</span>
                  </button>
                ) : (
                  <div className="flex gap-4 px-6 w-full max-w-sm animate-in slide-in-from-bottom-4">
                    <button 
                      onClick={commitPhoto} 
                      className="flex-1 py-3 bg-rose-gold text-dark font-bold rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-rose-gold/20 hover:scale-[1.02] active:scale-95 transition-all text-xs uppercase tracking-widest"
                    >
                      <CheckCircle2 size={16} /> Use Photo
                    </button>
                    <button 
                      onClick={retakePhoto} 
                      className="flex-1 py-3 bg-white/10 border border-white/10 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-white/20 active:scale-95 transition-all text-xs uppercase tracking-widest backdrop-blur-md"
                    >
                       <RefreshCcw size={16} /> Retake
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <UploadZone
          id="before-in" type="before"
          preview={beforePreview}
          onUpload={(e) => handleUpload(e, 'before')}
          onCamera={() => startCamera('before')}
          label="Before 📷" subLabel="Base skin / morning look"
          icon={Camera}
        />
        <UploadZone
          id="after-in" type="after"
          preview={afterPreview}
          onUpload={(e) => handleUpload(e, 'after')}
          onCamera={() => startCamera('after')}
          label="After 💄" subLabel="Makeup applied / styled look"
          icon={Wand2}
        />
      </div>

      {/* Instruction hint */}
      {(!before || !after) && (
        <p className="text-center text-cream/30 text-sm">
          Upload both a <span className="text-rose-gold">Before</span> and an <span className="text-rose-gold">After</span> photo to compare your transformation.
        </p>
      )}

      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-center gap-3 max-w-2xl mx-auto"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400/60 hover:text-red-400 text-xs font-bold uppercase">Dismiss</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analyze Button — shown whenever both images loaded and no result yet */}
      {before && after && !result && (
        <motion.div className="flex justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="bg-rose-gold text-dark font-bold px-12 py-4 rounded-xl flex items-center gap-3 active:scale-95 transition-all shadow-xl disabled:opacity-50"
          >
            {loading
              ? <><Loader2 className="animate-spin" /> Analyzing...</>
              : <><ArrowLeftRight className="w-5 h-5" /> Analyze Transformation</>
            }
          </button>
        </motion.div>
      )}

      {/* Result Card */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="glass-card !p-12 text-center space-y-8 max-w-2xl mx-auto"
          >
            {/* Circular Progress */}
            <div className="relative w-48 h-48 mx-auto">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 192 192">
                <circle cx="96" cy="96" r="88" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                <motion.circle
                  cx="96" cy="96" r="88" fill="none"
                  stroke="#c9956a" strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: circumference - (circumference * pct) / 100 }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold text-rose-gold">{pct}%</span>
                <span className="text-[10px] uppercase font-bold text-cream/30">Styled Change</span>
              </div>
            </div>

            {/* Feedback Badge */}
            <div className="space-y-4">
              <div className={`inline-flex items-center gap-2 px-6 py-2 rounded-full font-bold text-sm tracking-widest uppercase border ${
                pct > 75 ? 'bg-rose-gold/20 border-rose-gold text-rose-gold' :
                pct > 50 ? 'bg-orange-500/20 border-orange-500 text-orange-400' :
                pct > 20 ? 'bg-green-500/20 border-green-500 text-green-400' :
                           'bg-white/10 border-white/20 text-cream/40'
              }`}>
                <CheckCircle2 className="w-4 h-4" />
                {result.feedback}
              </div>
              <p className="text-cream/40 max-w-md mx-auto text-sm italic">
                "Based on color saturation and light reflection analysis, we've detected a unique transformation. Your styling choice enhances your natural features beautifully."
              </p>
            </div>

            {/* Reset */}
            <button
              onClick={reset}
              className="text-rose-gold/60 text-xs font-bold uppercase hover:text-rose-gold transition-colors flex items-center justify-center gap-2 mx-auto"
            >
              <RefreshCcw className="w-3 h-3" /> Start New Analysis
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TransformationTool;
