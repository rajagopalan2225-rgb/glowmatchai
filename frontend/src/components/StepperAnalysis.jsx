import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, RefreshCw, CheckCircle2, Wand2, ThermometerSun, AlertCircle, MapPin, Loader2, ArrowRight, ShieldCheck, Clock, DollarSign } from 'lucide-react';

const MAKEUP_IMAGES = {
  foundation: "https://images.unsplash.com/photo-1599305090598-fe179d501227?w=400&q=80",
  lipstick: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400&q=80",
  blush: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&q=80",
  mascara: "https://images.unsplash.com/photo-1631214500115-598fc2cb8d2d?w=400&q=80",
  concealer: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400&q=80",
  default: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80"
};

const MODE_IMAGES = {
  'Simple Makeup': "/images/modes/simple.png",
  'Occasional Makeup': "/images/modes/occasional.png",
  'Weather Makeup': "/images/modes/weather.png"
};

const BG_IMAGES = {
  hero: "https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=2000&q=80",
  input: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=2000&q=80",
  products: "https://images.unsplash.com/photo-1512496229467-f47ffb00ae0c?w=2000&q=80",
  weather: "https://images.unsplash.com/photo-1500534623283-312aade485b7?w=2000&q=80",
  final: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=2000&q=80"
};

const StepperAnalysis = () => {
  // Application State
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [useCamera, setUseCamera] = useState(false);
  const [stream, setStream] = useState(null);
  const [capturingFor, setCapturingFor] = useState(null);

  const [mode, setMode] = useState('');
  const [city, setCity] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const [beforeFile, setBeforeFile] = useState(null);
  const [afterFile, setAfterFile] = useState(null);
  const [beforePreview, setBeforePreview] = useState(null);
  const [afterPreview, setAfterPreview] = useState(null);

  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeStep, setActiveStep] = useState('hero');
  const [tempCapturedFile, setTempCapturedFile] = useState(null);
  const [tempCapturedPreview, setTempCapturedPreview] = useState(null);

  // Render Fast-Wake & Smart Loader
  const [serverState, setServerState] = useState('checking');
  const [loadingText, setLoadingText] = useState('');

  // Layout Refs
  const heroRef = useRef(null);
  const uploadRef = useRef(null);
  const resultRef = useRef(null);
  const detailsRef = useRef(null);
  const weatherRef = useRef(null);
  const beforeAfterRef = useRef(null);

  // Video/Canvas Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const initialInputRef = useRef(null);
  const afterInputRef = useRef(null);
  const cityInputRef = useRef(null);
  const suggestionsRef = useRef(null);

  const videoRefCallback = useCallback((el) => {
    videoRef.current = el;
    if (el && stream) {
      el.srcObject = stream;
      el.play().catch(e => console.error(e));
    }
  }, [stream]);

  useEffect(() => {
    let isMounted = true;
    const wakeServer = async () => {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const slowStartTimer = setTimeout(() => {
        if (isMounted) setServerState('waking');
      }, 3000); // After 3 seconds, assume cold start

      try {
        await fetch(`${baseUrl}/`);
        clearTimeout(slowStartTimer);
        if (isMounted) setServerState('online');
      } catch {
        clearTimeout(slowStartTimer);
        if (isMounted) setServerState('error');
      }
    };
    wakeServer();
    return () => { isMounted = false; stopCamera(); };
  }, []);

  // Weather Search
  useEffect(() => {
    if (city !== '' || !cityQuery || cityQuery.length < 2) {
      setCitySuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const res = await fetch(`${baseUrl}/api/weather/search?q=${encodeURIComponent(cityQuery)}`);
        const data = await res.json();
        setCitySuggestions(data);
        setShowSuggestions(data.length > 0);
      } catch {
        setCitySuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [cityQuery]);

  useEffect(() => {
    const handler = (e) => {
      if (cityInputRef.current && !cityInputRef.current.contains(e.target) &&
        suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectCity = (suggestion) => {
    const label = `${suggestion.name}, ${suggestion.country}`;
    setCity(`id:${suggestion.id}`);
    setCityQuery(label);
    setCitySuggestions([]);
    setShowSuggestions(false);
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) return setError("Geolocation unavailable.");
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCity(`${pos.coords.latitude},${pos.coords.longitude}`);
        setCityQuery("Current Live Location");
        setCitySuggestions([]);
        setShowSuggestions(false);
        setLocationLoading(false);
      },
      () => { setError("Unable to retrieve location."); setLocationLoading(false); }
    );
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setStream(mediaStream);
      setUseCamera(true);
    } catch (err) {
      setError(`Camera access denied. ${err.message || 'Please check browser permissions.'}`);
    }
  };

  const stopCamera = () => {
    if (stream) stream.getTracks().forEach(track => track.stop());
    setStream(null);
    setUseCamera(false);
    setTempCapturedFile(null);
    setTempCapturedPreview(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile);
      setPreview(URL.createObjectURL(droppedFile));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) return;
        setTempCapturedFile(new File([blob], "capture.jpg", { type: "image/jpeg" }));
        setTempCapturedPreview(URL.createObjectURL(blob));
      }, 'image/jpeg');
    }
  };

  const commitPhoto = () => {
    if (tempCapturedFile && tempCapturedPreview) {
      if (capturingFor === 'before') {
        setBeforeFile(tempCapturedFile); setBeforePreview(tempCapturedPreview);
      } else if (capturingFor === 'after') {
        setAfterFile(tempCapturedFile); setAfterPreview(tempCapturedPreview);
        setTimeout(() => performTransformationAnalysis(), 200);
      } else {
        setFile(tempCapturedFile); setPreview(tempCapturedPreview);
        // Note: intentional manual proceed required, no auto performInitialAnalysis
      }
      stopCamera(); setCapturingFor(null);
    }
  };

  const startCameraFor = async (target) => {
    setCapturingFor(target);
    await startCamera();
  };

  const handleFileUpload = (e, setFileFn, setPreviewFn, isAfter = false) => {
    const f = e.target.files?.[0];
    if (f) {
      setFileFn(f);
      if (setPreviewFn) setPreviewFn(URL.createObjectURL(f));
      if (isAfter) setTimeout(() => performTransformationAnalysis(), 200);
    }
  };

  const handleStartOver = () => {
    setFile(null);
    setPreview(null);
    setAnalysisData(null);
    setAfterFile(null);
    setAfterPreview(null);
    setMode('');
    setCity('');
    setCityQuery('');
    setActiveStep('hero');
  };

  const callApi = async (formData) => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/full-analysis`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error("Analysis failed");
      return await res.json();
    } catch (err) {
      setError(err.message); return null;
    } finally {
      setLoading(false);
    }
  };

  const performInitialAnalysis = async (providedFile) => {
    const f = providedFile || file;
    if (!f) return setError("No body image.");
    const formData = new FormData();
    formData.append('image', f);
    const data = await callApi(formData);
    if (data) {
      setAnalysisData(prev => ({ ...prev, ...data }));
      setActiveStep('mode');
    }
  };

  const advanceToDetails = async () => {
    if (!mode || (mode === 'Weather' && !city)) return setError("Required fields missing.");
    const formData = new FormData();
    formData.append('image', file);
    // Map display labels back to internal keys for the backend
    const internalMode = mode === 'Simple Makeup' ? 'Simple' : 
                        mode === 'Occasional Makeup' ? 'Occasion' : 
                        mode === 'Weather Makeup' ? 'Weather' : mode;
    
    formData.append('mode', internalMode);
    if (city) formData.append('city', city);
    const data = await callApi(formData);
    if (data) {
      setAnalysisData(prev => ({ ...prev, ...data }));
      setActiveStep('collections');
    }
  };

  const performTransformationAnalysis = async () => {
    const formData = new FormData();
    formData.append('image', file);
    const internalMode = mode === 'Simple Makeup' ? 'Simple' : 
                        mode === 'Occasional Makeup' ? 'Occasion' : 
                        mode === 'Weather Makeup' ? 'Weather' : mode;
    if (mode) formData.append('mode', internalMode);
    if (city) formData.append('city', city);
    formData.append('before_image', beforeFile || file);
    formData.append('after_image', afterFile);
    const data = await callApi(formData);
    if (data) {
      setAnalysisData(prev => ({ ...prev, ...data }));
      setActiveStep('final');
    }
  };

  return (
    <div className="w-full bg-black text-white font-sans overflow-x-hidden">

      {/* ERROR MODAL */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }} className="fixed top-10 left-1/2 -translate-x-1/2 z-[200] bg-white/10 backdrop-blur-3xl border border-rose-gold/50 p-4 rounded-full shadow-2xl flex items-center gap-3 max-w-md w-full">
            <AlertCircle size={20} className="text-rose-gold" />
            <p className="text-sm font-medium text-white">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CAMERA OVERLAY */}
      <AnimatePresence>
        {useCamera && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center">

            {/* Close Button */}
            <button type="button" onClick={stopCamera} className="absolute top-8 right-8 z-[200] w-12 h-12 bg-white/10 rounded-full text-white flex items-center justify-center backdrop-blur-md hover:bg-white/30 border border-white/20 transition-all">
              ✕
            </button>

            <div className="w-full max-w-4xl rounded-[3rem] overflow-hidden relative shadow-[0_0_80px_rgba(200,100,100,0.2)] border border-white/10">
              <video ref={videoRefCallback} autoPlay playsInline muted className={`w-full h-[600px] object-cover scale-x-[-1] transition-opacity ${tempCapturedPreview ? 'opacity-0' : 'opacity-100'}`} />
              {tempCapturedPreview && <img src={tempCapturedPreview} className="absolute inset-0 w-full h-full object-cover" />}
              <canvas ref={canvasRef} className="hidden" />

              <div className="absolute bottom-10 w-full flex justify-center z-[160]">
                {!tempCapturedPreview ? (
                  <button type="button" onClick={capturePhoto} className="w-20 h-20 rounded-full border-4 border-white flex justify-center items-center backdrop-blur-md bg-white/20 hover:scale-105 transition-transform"><Camera size={32} /></button>
                ) : (
                  <div className="flex gap-4">
                    <button type="button" onClick={() => setTempCapturedPreview(null)} className="px-8 py-4 rounded-full bg-white/10 backdrop-blur text-white font-medium hover:bg-white/20 transition-all">Retake</button>
                    <button type="button" onClick={commitPhoto} className="px-8 py-4 rounded-full bg-gradient-to-r from-[#ce9a8f] to-[#e4b8b0] text-black font-bold shadow-xl hover:scale-105 transition-all">Use Visual</button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SECTION 1: HERO */}
      <AnimatePresence mode="wait">
        {activeStep === 'hero' && (
          <motion.section key="hero" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }} className="fixed inset-0 w-full h-full flex items-center justify-center z-10">
            <img src={BG_IMAGES.hero} className="absolute inset-0 w-full h-full object-cover object-top" alt="Hero Background" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80" />

            {/* Server Status Badge */}
            <div className="absolute top-8 right-8 bg-black/40 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full flex items-center gap-2 z-50">
              <div className={`w-2 h-2 rounded-full ${serverState === 'online' ? 'bg-green-400' : serverState === 'waking' ? 'bg-amber-400 animate-pulse' : serverState === 'checking' ? 'bg-white/50' : 'bg-red-500'}`} />
              <span className="text-[10px] tracking-widest uppercase font-light text-white/70">
                {serverState === 'online' ? 'Systems Online' : serverState === 'waking' ? 'Waking Cloud Server...' : 'Checking connection'}
              </span>
            </div>

            <div className="relative z-20 text-center mt-auto pb-32 flex flex-col items-center">
              <h1 className="text-5xl md:text-8xl font-playfair tracking-tight mb-2 text-white">AI Beauty Studio</h1>
              <p className="text-lg md:text-2xl font-light tracking-[0.4em] uppercase text-white/80">Glow with AI</p>
              <button type="button" onClick={() => setActiveStep('upload')} className="mt-10 px-12 py-5 rounded-full bg-white/10 backdrop-blur-lg border border-white/20 text-white font-medium hover:bg-white text-lg transition-all hover:text-black shadow-2xl flex items-center gap-3">
                Start <ArrowRight size={20} />
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* SECTION 2: IMAGE INPUT */}
      <AnimatePresence mode="wait">
        {activeStep === 'upload' && (
          <motion.section key="upload" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }} transition={{ duration: 0.6 }} className="fixed inset-0 w-full h-full flex items-center justify-center z-10 bg-black">
            <img src={BG_IMAGES.input} className="absolute inset-0 w-full h-full object-cover" alt="Input Background" />
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            <div className="relative z-20 w-full max-w-5xl px-6 h-full overflow-y-auto py-20 flex flex-col justify-center">
              <div className="text-center mb-16">
                <h2 className="text-5xl font-playfair tracking-wide text-white drop-shadow-md">Capture Layout</h2>
              </div>

              {!preview ? (
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="group flex-1 h-[400px]">
                    <button
                      type="button"
                      onClick={() => initialInputRef.current?.click()}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      className="w-full h-full rounded-[3rem] bg-white/10 backdrop-blur-2xl border border-white/20 flex flex-col items-center justify-center hover:bg-white/20 hover:scale-[1.02] transition-all shadow-[0_0_50px_rgba(0,0,0,0.3)]"
                    >
                      <Upload size={48} className="text-[#ce9a8f] mb-6 group-hover:-translate-y-2 transition-transform" />
                      <span className="text-xl font-light tracking-widest text-white uppercase text-center px-4">Upload / Drag & Drop</span>
                    </button>
                    <input type="file" ref={initialInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, setFile, setPreview, false)} />
                  </div>
                  <button type="button" onClick={() => startCameraFor(null)} className="group flex-1 h-[400px] rounded-[3rem] bg-[#ce9a8f]/30 backdrop-blur-2xl border border-[#ce9a8f]/40 flex flex-col items-center justify-center hover:bg-[#ce9a8f]/50 hover:scale-[1.02] transition-all shadow-[0_0_50px_rgba(200,100,100,0.1)]">
                    <Camera size={48} className="text-white mb-6 group-hover:-translate-y-2 transition-transform" />
                    <span className="text-xl font-light tracking-widest text-white uppercase text-center">Live Camera</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <div className="w-64 h-80 rounded-[3rem] border-4 border-white/20 shadow-2xl relative overflow-hidden mb-8">
                    <img src={preview} className="absolute inset-0 w-full h-full object-cover" />
                  </div>
                  <div className="flex gap-4">
                    <button type="button" onClick={() => { setPreview(null); setFile(null); }} className="px-10 py-4 rounded-full bg-white/10 backdrop-blur text-white font-medium hover:bg-white/20 transition-all border border-white/20">
                      Discard
                    </button>
                    <button type="button" onClick={() => performInitialAnalysis()} disabled={loading} className="px-10 py-4 rounded-full bg-gradient-to-r from-[#ce9a8f] to-[#e4b8b0] text-black font-bold shadow-xl hover:scale-105 transition-all flex items-center gap-2">
                      {loading ? <><Loader2 className="animate-spin" size={20} /> <span className="text-sm">{loadingText}</span></> : 'Scan & Proceed'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* SECTION 3 & 4: AI RESULT & MODE */}
      <AnimatePresence>
        {analysisData?.skin_tone && (
          <motion.section ref={resultRef} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative w-full min-h-screen flex items-center justify-center py-32">
            {/* Background is uploaded image slightly blurred */}
            <img src={preview || BG_IMAGES.hero} className="absolute inset-0 w-full h-full object-cover blur-3xl scale-110 opacity-60" />
            <div className="absolute inset-0 bg-black/40 mix-blend-overlay" />

            <div className="relative z-10 w-full max-w-6xl px-6 flex flex-col items-center">
              {/* Profile Badge */}
              <button type="button" onClick={handleStartOver} className="absolute top-0 left-6 px-6 py-3 bg-white/10 border border-white/20 rounded-full hover:bg-white/30 backdrop-blur transition-all text-xs font-light tracking-[0.2em] uppercase">
                ← Start Over
              </button>

              <div className="w-48 h-48 rounded-full overflow-hidden mb-8 border-[6px] border-white/20 shadow-[0_0_80px_rgba(255,255,255,0.3)] mt-12 md:mt-0">
                <img src={preview} className="w-full h-full object-cover" />
              </div>
              <div className="bg-white/10 backdrop-blur-md px-10 py-3 rounded-full border border-white/20 shadow-2xl mb-24">
                <span className="text-3xl font-playfair bg-gradient-to-r from-pink-200 to-rose-300 bg-clip-text text-transparent">{analysisData.skin_tone}</span>
              </div>

              {/* Grid of Modes (Horizontal full width) */}
              <div className="w-full grid md:grid-cols-3 gap-6">
                {['Simple Makeup', 'Occasional Makeup', 'Weather Makeup'].map(m => (
                  <button type="button" key={m} onClick={() => setMode(m)} className={`group relative h-[600px] rounded-[3rem] overflow-hidden hover:scale-105 transition-all duration-700 ${mode === m ? 'ring-4 ring-white shadow-[0_0_100px_rgba(255,255,255,0.2)]' : 'border border-white/10'}`}>
                    <img src={MODE_IMAGES[m]} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                    <div className="absolute bottom-10 left-8 text-left">
                      <h3 className="text-3xl font-playfair tracking-wider text-white mb-2">{m}</h3>
                    </div>
                    {mode === m && <CheckCircle2 className="absolute top-8 right-8 text-white z-20" size={32} />}
                  </button>
                ))}
              </div>

              {/* Floating Weather Tool directly inside */}
              <AnimatePresence>
                {mode === 'Weather Makeup' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="w-full max-w-2xl mt-12 bg-white/10 backdrop-blur-2xl border border-white/30 rounded-[3rem] p-4 relative shadow-2xl">
                    <div className="relative flex items-center px-6">
                      <MapPin size={24} className="text-white/60 absolute left-8" />
                      <input type="text" value={cityQuery} onChange={e => { setCityQuery(e.target.value); setCity(''); }} onFocus={() => citySuggestions.length > 0 && setShowSuggestions(true)} placeholder="Enter live location..." className="w-full py-5 pl-16 pr-12 text-xl font-light tracking-wide outline-none bg-transparent text-white placeholder-white/40" />
                      {loading || locationLoading ? <Loader2 className="absolute right-8 animate-spin text-white/80" /> : city && <CheckCircle2 className="absolute right-8 text-white/80" />}
                    </div>
                    {showSuggestions && (
                      <ul className="absolute top-full mt-4 left-0 w-full bg-black/80 backdrop-blur-3xl border border-white/10 rounded-[2rem] overflow-hidden z-50">
                        {citySuggestions.map(s => (
                          <li key={s.id} onClick={() => selectCity(s)} className="p-5 border-b border-white/5 hover:bg-white/10 cursor-pointer flex items-center gap-4 text-white">
                            <MapPin size={16} className="text-white/50" />
                            <span className="font-light tracking-wider">{s.name}, {s.country}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <button type="button" onClick={handleCurrentLocation} className="mt-4 w-full py-4 bg-white/10 hover:bg-white/20 transition-all rounded-[2rem] font-medium tracking-widest uppercase text-sm">📍 Auto Detect Location</button>
                  </motion.div>
                )}
              </AnimatePresence>

              <button type="button" onClick={advanceToDetails} disabled={!mode || (mode === 'Weather Makeup' && !city) || loading} className="mt-16 mb-20 bg-white/20 hover:bg-white text-white hover:text-black backdrop-blur-lg border border-white/30 px-16 py-6 rounded-full text-xl font-bold transition-all shadow-[0_0_50px_rgba(255,255,255,0.1)] flex items-center gap-3 disabled:opacity-0">
                {loading ? <><Loader2 size={24} className="animate-spin" /> <span className="text-sm">{loadingText}</span></> : <>{'Curate Style'} <ArrowRight size={24} /></>}
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* SECTION 5 & 6: MAKEUP DETAILS GRID & WEATHER */}
      <AnimatePresence mode="wait">
        {(activeStep === 'collections' && analysisData?.makeup_details) && (
          <motion.section key="collections" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }} transition={{ duration: 0.6 }} className="fixed inset-0 w-full h-full z-10">
            <img src={BG_IMAGES.products} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/70 backdrop-blur-lg" />
            <div className="relative z-20 w-full h-full overflow-y-auto px-6 py-20 pb-40">

              {/* Weather Ribbon (if weather mode) */}
              {analysisData?.weather && (
                <div className="mb-16 w-full max-w-4xl mx-auto bg-white/5 backdrop-blur-3xl border border-white/20 p-8 rounded-[3rem] flex flex-col md:flex-row items-center text-center md:text-left gap-8 shadow-2xl">
                  <ThermometerSun size={56} className="text-[#ce9a8f]" />
                  <div>
                    <h3 className="text-4xl font-playfair mb-2">{analysisData.weather.temp}°C</h3>
                    <p className="text-sm font-light tracking-widest text-white/80">"{analysisData.weather.tip}"</p>
                  </div>
                </div>
              )}

              <h2 className="text-5xl md:text-7xl font-playfair text-white text-center mb-16 drop-shadow-lg leading-snug tracking-wide">The Collection</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 max-w-7xl mx-auto">
                {Object.entries(analysisData.makeup_details).map(([key, val]) => (
                  <div key={key} className="bg-white/5 backdrop-blur-2xl rounded-[3rem] border border-white/10 overflow-hidden group shadow-2xl flex flex-col hover:-translate-y-4 transition-all duration-500">
                    <div className="w-full aspect-[4/5] relative overflow-hidden">
                      <img src={MAKEUP_IMAGES[key.toLowerCase()] || MAKEUP_IMAGES.default} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 mix-blend-screen" />
                    </div>
                    <div className="p-6 bg-black/40 flex flex-col flex-grow">
                      <h4 className="text-xs uppercase tracking-[0.3em] text-[#ce9a8f] font-bold mb-3">{key}</h4>
                      <p className="text-sm font-light tracking-wider leading-relaxed line-clamp-4">{val}</p>

                      <div className="mt-6 flex flex-col gap-2 mt-auto">
                        <a href={`https://www.amazon.in/s?k=${encodeURIComponent('best premium ' + (analysisData.skin_tone || '') + ' ' + key + ' makeup')}&s=review-rank`} target="_blank" rel="noreferrer" className="w-full py-3 bg-white/5 hover:bg-[#ff9900]/80 hover:text-white border border-white/10 hover:border-[#ff9900] text-center rounded-xl text-[10px] tracking-widest uppercase transition-all duration-300 font-bold block">Top Rated Amazon</a>
                        <a href={`https://www.flipkart.com/search?q=${encodeURIComponent('best premium ' + (analysisData.skin_tone || '') + ' ' + key + ' makeup')}&sort=popularity`} target="_blank" rel="noreferrer" className="w-full py-3 bg-white/5 hover:bg-[#2874f0]/80 hover:text-white border border-white/10 hover:border-[#2874f0] text-center rounded-xl text-[10px] tracking-widest uppercase transition-all duration-300 font-bold block">Top Rated Flipkart</a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-center mt-20">
                <button type="button" onClick={() => setActiveStep('final')} className="border border-white/30 bg-white/5 hover:bg-white/20 backdrop-blur-md text-white font-light tracking-widest uppercase px-16 py-5 rounded-full transition-all text-sm">
                  Final Look Verification
                </button>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* SECTION 7: BEFORE / AFTER OVERLAY */}
      <AnimatePresence mode="wait">
        {(activeStep === 'final' && analysisData?.makeup_details) && (
          <motion.section key="final" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }} transition={{ duration: 0.6 }} className="fixed inset-0 w-full h-full flex flex-col items-center justify-center z-10 w-full overflow-y-auto">
            <img src={BG_IMAGES.final} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />

            <div className="relative z-20 w-full max-w-6xl px-6 py-20 pb-40 min-h-full flex flex-col justify-center">
              <h2 className="text-5xl md:text-7xl font-playfair text-center mb-16 shadow-black drop-shadow-2xl">Enhancement</h2>

              <div className="grid lg:grid-cols-2 gap-12 items-center">

                {/* LEFT: ALWAYS BEFORE IMAGE */}
                <div className="relative aspect-[3/4] rounded-[3rem] border-4 border-white/20 overflow-hidden shadow-2xl flex-1 max-w-md mx-auto w-full">
                  <img src={preview} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                  <span className="absolute bottom-8 left-8 tracking-[0.4em] uppercase text-xs font-bold text-white/50">Before Image</span>
                </div>

                {/* RIGHT: AFTER IMAGE OR ACTION BUTTONS */}
                <div className="flex-1 max-w-md mx-auto w-full">
                  {!analysisData?.transformation ? (
                    <div className="flex flex-col gap-6">
                      <button type="button" onClick={() => afterInputRef.current?.click()} className="group w-full h-48 rounded-[3rem] bg-white/10 backdrop-blur-2xl border border-white/20 flex flex-col items-center justify-center hover:bg-white/20 transition-all shadow-[0_0_50px_rgba(0,0,0,0.3)]">
                        <Upload size={32} className="mb-4 text-white/60 group-hover:text-white transition-colors" />
                        <span className="font-light tracking-widest text-sm uppercase">Upload Result</span>
                      </button>
                      <input type="file" ref={afterInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, setAfterFile, setAfterPreview, true)} />

                      <button type="button" onClick={() => startCameraFor('after')} className="group w-full h-48 rounded-[3rem] bg-[#ce9a8f]/30 backdrop-blur-2xl border border-[#ce9a8f]/50 flex flex-col items-center justify-center hover:bg-[#ce9a8f]/50 transition-all shadow-[0_0_50px_rgba(200,100,100,0.1)]">
                        <Camera size={32} className="mb-4 text-white/80 group-hover:text-white transition-colors" />
                        <span className="font-light tracking-widest text-sm uppercase">Live Camera</span>
                      </button>
                      {loading && (
                        <div className="mt-4 flex items-center justify-center gap-3 w-full animate-pulse text-[#ce9a8f]">
                          <Loader2 className="animate-spin" />
                          <span className="text-sm font-light tracking-widest uppercase">{loadingText}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="relative aspect-[3/4] rounded-[3rem] border-4 border-[#ce9a8f]/60 overflow-hidden shadow-[0_0_80px_rgba(200,150,150,0.3)]">
                      <img src={afterPreview} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                      <span className="absolute bottom-8 right-8 tracking-[0.4em] uppercase text-xs font-bold text-[#ce9a8f]">After Image</span>

                      {/* Floating Score overlay directly over the after image if finished */}
                      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-8 py-4 rounded-[2rem] border border-white/20 shadow-2xl text-center">
                        <h1 className="text-5xl font-playfair bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent mb-1">{Math.round(analysisData.transformation.score)}%</h1>
                        <span className="text-[10px] tracking-[0.3em] font-medium uppercase text-[#ce9a8f]">Matched</span>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Metrics shown at bottom full width if completed */}
              {analysisData?.transformation && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-16 grid grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl flex flex-col items-center justify-center text-center">
                    <Clock className="text-white/40 mb-3" size={24} />
                    <span className="text-2xl font-light mb-1">{analysisData.transformation.longevity}</span>
                    <span className="text-xs tracking-widest text-white/50 uppercase">Longevity</span>
                  </div>
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl flex flex-col items-center justify-center text-center">
                    <ShieldCheck className="text-white/40 mb-3" size={24} />
                    <span className="text-2xl font-light mb-1">{analysisData.transformation.risk}</span>
                    <span className="text-xs tracking-widest text-white/50 uppercase">Risk Profile</span>
                  </div>
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl flex flex-col items-center justify-center text-center">
                    <DollarSign className="text-white/40 mb-3" size={24} />
                    <span className="text-2xl font-light mb-1">₹{analysisData.transformation.cost}</span>
                    <span className="text-xs tracking-widest text-white/50 uppercase">Est Cost</span>
                  </div>
                </motion.div>
              )}

              {/* Final Reset Action */}
              {analysisData?.transformation && (
                <div className="flex justify-center mt-20">
                  <button type="button" onClick={handleStartOver} className="px-12 py-5 bg-white/10 hover:bg-white text-white hover:text-black rounded-full border border-white/30 backdrop-blur-xl font-bold tracking-widest uppercase transition-all shadow-[0_0_50px_rgba(255,255,255,0.1)]">
                    Start New Analysis
                  </button>
                </div>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

    </div>
  );
};

export default StepperAnalysis;
