import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Package, ArrowRight, Tag, Filter, Sparkles } from 'lucide-react';
import api from '../api';

const SKIN_TONES = ['Fair', 'Medium', 'Dusky', 'Dark'];

const TONE_COLORS = {
  Fair:   '#FDDBB4',
  Medium: '#C68642',
  Dusky:  '#8D5524',
  Dark:   '#4A2912',
};

const RecommendationPanel = ({ skinTone }) => {
  const [selectedSkinTone, setSelectedSkinTone] = useState(skinTone || 'Fair');
  const [selectedMode, setSelectedMode] = useState('Daily');
  const [modes, setModes] = useState(['Daily', 'Party', 'Office', 'Bridal', 'Natural']);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  // Sync incoming skinTone prop
  useEffect(() => {
    if (skinTone) setSelectedSkinTone(skinTone);
  }, [skinTone]);

  // Fetch available modes once on mount
  useEffect(() => {
    api.get('/api/recommend/modes')
      .then(({ data }) => { if (data.modes?.length > 0) setModes(data.modes); })
      .catch(() => {});
  }, []);

  // Auto-fetch when skinTone becomes available OR when mode changes after first fetch
  const handleFetch = useCallback(async (tone, mode) => {
    setLoading(true);
    try {
      const { data } = await api.get(
        `/api/recommend/?skin_tone=${encodeURIComponent(tone)}&mode=${encodeURIComponent(mode)}`
      );
      setProducts(data.products || []);
      setFetched(true);
    } catch {
      setProducts([]);
      setFetched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-trigger fetch when skin tone is passed from analysis
  useEffect(() => {
    if (skinTone) handleFetch(skinTone, selectedMode);
  }, [skinTone]);

  return (
    <div className="space-y-8">
      {/* Filter Bar */}
      <div className="glass-card space-y-6">
        {/* Skin Tone Selector */}
        <div className="space-y-3">
          <label className="text-xs uppercase tracking-widest text-rose-gold font-bold flex items-center gap-2">
            <Sparkles className="w-3 h-3" /> Select Skin Tone
          </label>
          <div className="flex flex-wrap gap-3">
            {SKIN_TONES.map(tone => (
              <button
                key={tone}
                onClick={() => setSelectedSkinTone(tone)}
                className={`flex items-center gap-2 px-5 py-2 rounded-full border font-medium text-sm transition-all duration-200 ${
                  selectedSkinTone === tone
                    ? 'border-rose-gold bg-rose-gold/10 text-rose-gold shadow-[0_0_12px_rgba(201,149,106,0.25)]'
                    : 'border-white/10 text-cream/60 hover:border-rose-gold/40'
                }`}
              >
                <span
                  className="w-4 h-4 rounded-full border border-white/20 flex-shrink-0"
                  style={{ backgroundColor: TONE_COLORS[tone] }}
                />
                {tone}
              </button>
            ))}
          </div>
        </div>

        {/* Mode Selector + Search */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px] space-y-2">
            <label className="text-xs uppercase tracking-widest text-rose-gold font-bold flex items-center gap-1">
              <Filter className="w-3 h-3" /> Application Mode
            </label>
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              className="w-full bg-[#1a1a24] border border-white/10 p-3 rounded-xl focus:border-rose-gold outline-none text-cream"
            >
              {modes.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <button
            onClick={() => handleFetch(selectedSkinTone, selectedMode)}
            disabled={loading}
            className="bg-rose-gold text-dark font-bold py-3 px-8 rounded-xl hover:shadow-[0_0_15px_rgba(201,149,106,0.3)] transition-all flex items-center gap-2 disabled:opacity-60"
          >
            <Search className="w-5 h-5" />
            {loading ? 'Finding...' : 'Get Recommendations'}
          </button>
        </div>
      </div>

      {/* Results Header */}
      {products.length > 0 && (
        <h3 className="text-xl font-playfair flex items-center gap-3">
          <span className="text-rose-gold font-bold">{products.length}</span>
          Products for{' '}
          <span className="inline-flex items-center gap-1.5 text-rose-gold">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: TONE_COLORS[selectedSkinTone] }} />
            {selectedSkinTone}
          </span>{' '}
          — <span className="italic text-rose-gold">{selectedMode}</span> look
        </h3>
      )}

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((p, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="glass-card hover:-translate-y-2 transition-transform cursor-default group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="bg-rose-gold/10 p-2 rounded-lg">
                <Tag className="w-5 h-5 text-rose-gold" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-tighter bg-white/10 px-2 py-1 rounded text-cream/50 group-hover:text-rose-gold">
                Match
              </span>
            </div>

            <h4 className="text-lg font-bold mb-4 font-playfair group-hover:text-rose-gold transition-colors truncate">
              {p.product_name || p.foundation_shadename || 'Beauty Product'}
            </h4>

            <div className="space-y-3">
              {Object.entries(p)
                .filter(([k]) => !['product_name', 'skin_tone'].includes(k))
                .slice(0, 5)
                .map(([key, value]) => (
                  <div key={key} className="flex justify-between items-baseline border-b border-white/5 pb-1">
                    <span className="text-[10px] uppercase tracking-wider text-cream/30">{key.replace(/_/g, ' ')}</span>
                    <span className="text-sm font-medium text-cream/80 truncate max-w-[60%] text-right">{value}</span>
                  </div>
                ))}
            </div>

            <button className="w-full mt-6 flex items-center justify-center gap-2 text-xs font-bold uppercase text-rose-gold/60 group-hover:text-rose-gold transition-all py-2 rounded-lg group-hover:bg-rose-gold/5">
              Product Details <ArrowRight className="w-3 h-3" />
            </button>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {!loading && fetched && products.length === 0 && (
        <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/5 border-dashed">
          <Package className="w-16 h-16 text-cream/10 mx-auto mb-4" />
          <h3 className="text-2xl font-playfair text-cream/40">No recommendations found.</h3>
          <p className="text-cream/20 mt-2">Try a different skin tone or application mode.</p>
        </div>
      )}

      {/* Prompt to analyze first */}
      {!loading && !fetched && !skinTone && (
        <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/5 border-dashed">
          <Sparkles className="w-16 h-16 text-rose-gold/20 mx-auto mb-4" />
          <h3 className="text-2xl font-playfair text-cream/40">Analyse your skin tone first</h3>
          <p className="text-cream/20 mt-2">Go to Skin Analysis, upload a photo, and we'll auto-fill your tone here!</p>
        </div>
      )}
    </div>
  );
};

export default RecommendationPanel;
