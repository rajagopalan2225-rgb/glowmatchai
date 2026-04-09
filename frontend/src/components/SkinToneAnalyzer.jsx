import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, Upload, CheckCircle2, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import api from '../api';

const SkinToneAnalyzer = ({ onAnalysisComplete, onSwitchToRecommendations }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFile = (e) => {
    const selected = e.target.files[0];
    if (selected && selected.type.startsWith('image/')) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setResult(null);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await api.post('/api/predict', formData);
      setResult(data);
      onAnalysisComplete(data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to analyze image. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const swatches = {
    'Fair':   '#FDDBB4',
    'Medium': '#C68642',
    'Dusky':  '#8D5524',
    'Dark':   '#4A2912',
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Upload Zone */}
      <div 
        onClick={() => fileInputRef.current.click()}
        className={`glass-card border-dashed cursor-pointer text-center py-12 ${!file && 'hover:bg-rose-gold/5'}`}
      >
        <input type="file" ref={fileInputRef} onChange={handleFile} hidden accept="image/*" />
        
        {!preview ? (
          <div className="space-y-4">
            <Upload className="w-12 h-12 text-rose-gold mx-auto" />
            <h3 className="text-xl font-medium">Drag & Drop or Click to Upload</h3>
            <p className="text-cream/40">Upload a clear selfie for best skin tone analysis</p>
          </div>
        ) : (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <img src={preview} alt="Selfie preview" className="max-h-[400px] mx-auto rounded-xl shadow-2xl border border-white/10" />
            <p className="mt-4 text-rose-gold font-medium">Image Selected</p>
          </motion.div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-center gap-3 justify-center text-center">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </motion.div>
      )}

      {/* Action Button */}
      {preview && !result && !error && (
        <motion.div className="flex justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <button 
            onClick={handleAnalyze} 
            disabled={analyzing}
            className="bg-rose-gold text-dark font-bold px-10 py-4 rounded-full flex items-center gap-3 disabled:opacity-50 shadow-lg"
          >
            {analyzing ? <Loader2 className="animate-spin" /> : <Camera />}
            {analyzing ? 'Analyzing your skin tone...' : 'Analyze Skin Tone'}
          </button>
        </motion.div>
      )}

      {/* Result Card */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1 w-full space-y-6">
              <div className="flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-full border-2 border-white/20 shadow-inner"
                  style={{ backgroundColor: swatches[result.skin_tone] || '#888' }}
                />
                <div>
                  <h3 className="text-3xl font-playfair font-bold text-rose-gold">{result.skin_tone}</h3>
                  <p className="text-cream/50">Predicted Skin Tone</p>
                </div>
                <div className="ml-auto text-right">
                  <span className="text-4xl font-bold text-rose-gold">{(result.confidence * 100).toFixed(0)}%</span>
                  <p className="text-xs uppercase tracking-widest text-cream/30">Confidence</p>
                </div>
              </div>

              <div className="space-y-4">
                {Object.entries(result.all_probabilities).map(([tone, prob]) => (
                  <div key={tone} className="space-y-1">
                    <div className="flex justify-between text-xs uppercase font-medium">
                      <span>{tone}</span>
                      <span>{(prob * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${prob * 100}%` }}
                        className="h-full bg-rose-gold shadow-[0_0_10px_rgba(201,149,106,0.5)]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="md:w-px h-auto md:h-48 bg-white/10" />

            <div className="flex-shrink-0 text-center space-y-4 px-8">
              <div className="rounded-full bg-rose-gold/10 p-6 inline-block">
                <Sparkles className="w-10 h-10 text-rose-gold" />
              </div>
              <h4 className="font-playfair text-xl">Perfect Match Ready</h4>
              <p className="text-sm text-cream/40 max-w-[200px]">We've found products that will shine best on you.</p>
              <button 
                onClick={() => document.querySelectorAll('button')[2].click()} // Fallback click to switch tab
                className="text-rose-gold border border-rose-gold/30 px-6 py-2 rounded-full hover:bg-rose-gold hover:text-dark transition-all text-sm font-bold"
              >
                View Recommendations →
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default SkinToneAnalyzer;
