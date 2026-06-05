import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, CheckCircle2 } from 'lucide-react';
import api from '../api';

/**
 * Reusable WeatherInput component.
 * Allows entering city/location, provides suggestions from backend, and supports geolocation.
 */
const WeatherInput = ({
  city,
  setCity,
  cityQuery,
  setCityQuery,
  onGetRecommendation,
  loading,
  setError
}) => {
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const suggestionsRef = useRef(null);
  const cityInputRef = useRef(null);

  // Auto-fetch suggestions as user types in cityInput field
  useEffect(() => {
    if (city !== '' || !cityQuery || cityQuery.length < 2) {
      setCitySuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get(`/api/weather/search?q=${encodeURIComponent(cityQuery)}`);
        setCitySuggestions(data || []);
        setShowSuggestions(data && data.length > 0);
      } catch (err) {
        setCitySuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [cityQuery, city]);

  // Click outside listener to dismiss autocomplete list
  useEffect(() => {
    const handler = (e) => {
      if (
        cityInputRef.current && !cityInputRef.current.contains(e.target) &&
        suggestionsRef.current && !suggestionsRef.current.contains(e.target)
      ) {
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
    if (!navigator.geolocation) {
      return setError("Geolocation is not supported by your browser.");
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCity(`${pos.coords.latitude},${pos.coords.longitude}`);
        setCityQuery("Current Live Location");
        setCitySuggestions([]);
        setShowSuggestions(false);
        setLocationLoading(false);
      },
      (err) => {
        setError(`Unable to retrieve location: ${err.message}`);
        setLocationLoading(false);
      }
    );
  };

  return (
    <div className="w-full max-w-2xl mt-12 bg-white/10 backdrop-blur-2xl border border-white/30 rounded-[3rem] p-6 relative shadow-2xl space-y-4">
      <div className="relative flex items-center px-6">
        <MapPin size={24} className="text-white/60 absolute left-8" />
        <input
          type="text"
          ref={cityInputRef}
          value={cityQuery}
          onChange={(e) => {
            setCityQuery(e.target.value);
            setCity(''); // Clear locked city ID when user starts typing again
          }}
          onFocus={() => citySuggestions.length > 0 && setShowSuggestions(true)}
          onKeyDown={(e) => e.key === 'Enter' && cityQuery && onGetRecommendation()}
          placeholder="Enter live location (e.g. Chennai, London)..."
          className="w-full py-5 pl-16 pr-12 text-xl font-light tracking-wide outline-none bg-transparent text-white placeholder-white/40"
        />
        {locationLoading ? (
          <Loader2 className="absolute right-8 animate-spin text-white/80" />
        ) : (
          city && <CheckCircle2 className="absolute right-8 text-white/80" />
        )}
      </div>

      {showSuggestions && (
        <ul
          ref={suggestionsRef}
          className="absolute top-full left-0 w-full bg-black/90 backdrop-blur-3xl border border-white/10 rounded-[2rem] overflow-hidden z-50 shadow-2xl"
        >
          {citySuggestions.map((s) => (
            <li
              key={s.id}
              onClick={() => selectCity(s)}
              className="p-5 border-b border-white/5 hover:bg-white/10 cursor-pointer flex items-center gap-4 text-white"
            >
              <MapPin size={16} className="text-white/50" />
              <span className="font-light tracking-wider">{s.label || `${s.name}, ${s.country}`}</span>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={handleCurrentLocation}
        className="w-full py-4 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all rounded-[2rem] font-medium tracking-widest uppercase text-xs border border-white/10"
      >
        📍 Auto Detect Location
      </button>

      <button
        type="button"
        onClick={onGetRecommendation}
        disabled={loading || !cityQuery}
        className="w-full mt-4 bg-white/20 hover:bg-white text-white hover:text-black backdrop-blur-lg border border-white/30 py-5 rounded-[2rem] text-lg font-bold transition-all shadow-[0_0_50px_rgba(255,255,255,0.1)] flex items-center justify-center gap-3 disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" size={20} />
            <span>Fetching Weather Recommendation...</span>
          </>
        ) : (
          <span>Get Weather Recommendation</span>
        )}
      </button>
    </div>
  );
};

export default WeatherInput;
