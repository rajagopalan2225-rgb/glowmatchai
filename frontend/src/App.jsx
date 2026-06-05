import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkle } from 'lucide-react';

// Components
import StepperAnalysis from './components/StepperAnalysis';

const App = () => {
  // Auth removed — app is publicly accessible without login
  return (
    <div className="w-full min-h-screen">
      <main className="w-full">
        <StepperAnalysis />
      </main>
    </div>
  );
};

export default App;
