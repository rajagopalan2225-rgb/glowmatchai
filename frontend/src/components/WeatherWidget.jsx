import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Sun, Cloud, CloudRain, Wind, Droplet, Sparkles, ThermometerSun } from 'lucide-react';
import api from '../api';

const WeatherWidget = () => {
  const [city, setCity] = useState('Chennai');
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchWeather = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/weather/?city=${city}`);
      setWeather(data);
    } catch {
      setWeather(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, []);

  const getWeatherIcon = (desc) => {
    const d = desc?.toLowerCase() || '';
    if (d.includes('rain')) return <CloudRain className="w-12 h-12 text-blue-400" />;
    if (d.includes('cloud')) return <Cloud className="w-12 h-12 text-gray-300" />;
    if (d.includes('sun') || d.includes('clear')) return <Sun className="w-12 h-12 text-yellow-400" />;
    return <Wind className="w-12 h-12 text-rose-gold" />;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Search Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-cream/40 w-5 h-5" />
          <input 
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full bg-white/5 border border-white/10 pl-12 pr-4 py-4 rounded-2xl outline-none focus:border-rose-gold transition-all"
            placeholder="Enter city for weather beauty tips..."
            onKeyDown={(e) => e.key === 'Enter' && fetchWeather()}
          />
        </div>
        <button 
          onClick={fetchWeather}
          className="bg-rose-gold text-dark px-8 rounded-2xl font-bold hover:scale-105 active:scale-95 transition-all"
        >
          Check
        </button>
      </div>

      {loading ? (
        <div className="glass-card animate-pulse py-20 flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-white/10 rounded-full" />
          <div className="w-48 h-8 bg-white/10 rounded" />
          <div className="w-32 h-4 bg-white/10 rounded" />
        </div>
      ) : weather && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row items-center gap-8 py-4">
            <div className="text-center sm:text-left space-y-2">
              <h3 className="text-4xl font-bold font-playfair">{weather.city}</h3>
              <p className="text-rose-gold font-medium uppercase tracking-widest text-sm">{weather.description}</p>
            </div>
            
            <div className="flex-1 flex justify-center gap-12 items-center">
              <div className="text-center">
                <div className="flex items-center gap-2 text-rose-gold justify-center mb-1">
                  <ThermometerSun className="w-4 h-4" />
                  <span className="text-xs font-bold">Temp</span>
                </div>
                <p className="text-5xl font-playfair">{weather.temperature.toFixed(0)}°<span className="text-2xl text-cream/40">C</span></p>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-2 text-blue-400 justify-center mb-1">
                  <Droplet className="w-4 h-4" />
                  <span className="text-xs font-bold">Humidity</span>
                </div>
                <p className="text-5xl font-playfair">{weather.humidity}<span className="text-2xl text-cream/40">%</span></p>
              </div>
            </div>

            <div className="bg-rose-gold/10 p-6 rounded-2xl border border-rose-gold/20">
              {getWeatherIcon(weather.description)}
            </div>
          </div>

          <div className="mt-8 relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-rose-gold to-yellow-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition" />
            <div className="relative glass-card !p-8 flex gap-6 items-start border-rose-gold/40">
              <Sparkles className="w-8 h-8 text-rose-gold flex-shrink-0" />
              <div className="space-y-2">
                <h4 className="text-rose-gold font-bold uppercase tracking-[0.2em] text-xs">AI Beauty Recommendation</h4>
                <p className="text-xl font-medium leading-relaxed italic text-white">"{weather.beauty_tip}"</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default WeatherWidget;
