import React from 'react';
import { Sun, Cloud, CloudRain, Droplet, ThermometerSun, AlertCircle, Wind } from 'lucide-react';

/**
 * Reusable WeatherCard component.
 * Displays live weather parameters and corresponding beauty warning/tips at the top of the collections page.
 */
const WeatherCard = ({ weather }) => {
  if (!weather) return null;

  const { city, temp, condition, humidity, rain_status, tip } = weather;

  const getWeatherIcon = (cond) => {
    const c = cond?.toLowerCase() || '';
    if (c.includes('rain')) return <CloudRain className="w-16 h-16 text-blue-400" />;
    if (c.includes('cloud')) return <Cloud className="w-16 h-16 text-gray-300" />;
    if (c.includes('sun') || c.includes('clear')) return <Sun className="w-16 h-16 text-yellow-400" />;
    if (c.includes('cold') || temp < 15) return <Wind className="w-16 h-16 text-cyan-300" />;
    return <ThermometerSun className="w-16 h-16 text-[#ce9a8f]" />;
  };

  return (
    <div className="mb-16 w-full max-w-4xl mx-auto bg-white/5 backdrop-blur-3xl border border-white/20 p-8 rounded-[3rem] shadow-2xl flex flex-col md:flex-row items-center md:items-stretch gap-8 relative overflow-hidden group">
      {/* Background glow animation */}
      <div className="absolute -inset-1 bg-gradient-to-r from-[#ce9a8f]/10 to-[#ff4d6d]/10 rounded-[3rem] blur opacity-30 group-hover:opacity-50 transition duration-1000" />
      
      {/* Weather Icon Side */}
      <div className="flex items-center justify-center bg-white/5 p-6 rounded-[2rem] border border-white/10 w-28 h-28 md:w-32 md:h-32 flex-shrink-0 z-10">
        {getWeatherIcon(condition)}
      </div>

      {/* Weather Info & Stats */}
      <div className="flex-1 flex flex-col justify-between text-center md:text-left z-10 space-y-4">
        <div>
          <span className="text-[10px] tracking-[0.3em] font-bold text-[#ce9a8f] uppercase">Live Weather Report</span>
          <h3 className="text-4xl font-playfair font-bold text-white mt-1">{city}</h3>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <div className="bg-white/5 border border-white/5 p-3 rounded-2xl">
            <span className="text-[9px] uppercase tracking-wider text-white/40 block mb-1">Temperature</span>
            <span className="text-xl font-medium text-white">{temp}°C</span>
          </div>
          <div className="bg-white/5 border border-white/5 p-3 rounded-2xl">
            <span className="text-[9px] uppercase tracking-wider text-white/40 block mb-1">Condition</span>
            <span className="text-xl font-medium text-white">{condition}</span>
          </div>
          <div className="bg-white/5 border border-white/5 p-3 rounded-2xl">
            <span className="text-[9px] uppercase tracking-wider text-white/40 block mb-1">Humidity</span>
            <span className="text-xl font-medium text-white">{humidity}%</span>
          </div>
          <div className="bg-white/5 border border-white/5 p-3 rounded-2xl">
            <span className="text-[9px] uppercase tracking-wider text-white/40 block mb-1">Rain Status</span>
            <span className={`text-xl font-medium ${rain_status === 'Rainy' ? 'text-blue-400' : 'text-white'}`}>
              {rain_status === 'Rainy' ? '🌧️ Rainy' : '☀️ Dry'}
            </span>
          </div>
        </div>
      </div>

      {/* Separator line for desktop */}
      <div className="hidden md:block w-[1px] bg-white/10" />

      {/* Beauty Alert side */}
      <div className="md:w-72 flex flex-col justify-center text-center md:text-left z-10">
        <div className="flex items-center justify-center md:justify-start gap-2 text-rose-gold mb-2">
          <AlertCircle className="w-4 h-4 text-[#ce9a8f]" />
          <span className="text-[10px] tracking-[0.2em] font-bold uppercase text-[#ce9a8f]">AI Advice</span>
        </div>
        <p className="text-sm font-light leading-relaxed text-white/80 italic">
          "{tip}"
        </p>
      </div>
    </div>
  );
};

export default WeatherCard;
