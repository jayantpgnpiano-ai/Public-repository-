import React, { useState } from 'react';
import { Feather, Sparkles, Compass, MessageSquare, ArrowRight, ShieldCheck, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LandingPageProps {
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onExplorePublic: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth, onExplorePublic }) => {
  const { demoLogin } = useAuth();
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  const handleQuickDemo = async (username: string) => {
    setIsDemoLoading(true);
    await demoLogin(username);
    setIsDemoLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1C1917] flex flex-col justify-between selection:bg-[#EAE4D7]">
      {/* Editorial Navigation */}
      <header className="max-w-5xl w-full mx-auto px-6 py-6 flex items-center justify-between border-b border-[#E8E4DC]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#2A2724] text-[#FAF8F5] flex items-center justify-center shadow-xs">
            <Feather className="w-4 h-4 text-[#EFECE6]" />
          </div>
          <div>
            <span className="font-serif-editorial text-xl font-medium tracking-tight text-[#1C1917]">
              Project Connect
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onOpenAuth('login')}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#57534E] hover:text-[#1C1917] transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={() => onOpenAuth('register')}
            className="px-4 py-2 rounded-lg bg-[#2A2724] text-[#FAF8F5] hover:bg-black text-xs font-medium transition-all shadow-xs"
          >
            Join Network
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-3xl w-full mx-auto px-6 py-16 md:py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F4F1EA] border border-[#E8E4DC] text-xs font-medium text-[#57534E] mb-6">
          <Sparkles className="w-3.5 h-3.5 text-[#8A5F38]" />
          <span>A calm social space with a personal AI companion</span>
        </div>

        <h1 className="font-serif-editorial text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight text-[#1C1917] leading-[1.15] mb-6">
          Silence the algorithmic noise. Cultivate deliberate thought.
        </h1>

        <p className="text-base sm:text-lg text-[#57534E] leading-relaxed max-w-xl mx-auto mb-10 font-normal">
          A minimalist platform engineered for writers, designers, and reflective thinkers.
          Share lasting ideas, build authentic connections, and converse with a personal AI companion.
        </p>

        {/* Primary CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto mb-14">
          <button
            onClick={() => handleQuickDemo('elena')}
            disabled={isDemoLoading}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#2A2724] hover:bg-black text-[#FAF8F5] text-sm font-medium transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <span>{isDemoLoading ? 'Entering space...' : 'Experience Demo as Elena'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onExplorePublic}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white border border-[#D5D0C4] hover:bg-[#FAF8F5] text-[#1C1917] text-sm font-medium transition-colors"
          >
            Explore Public Reflections
          </button>
        </div>

        {/* 3 Core Editorial Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left pt-6 border-t border-[#E8E4DC]">
          <div className="p-5 rounded-2xl bg-white border border-[#E8E4DC] shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] border border-[#E8E4DC] flex items-center justify-center mb-3 text-[#1C1917]">
              <Compass className="w-4 h-4 text-[#8A5F38]" />
            </div>
            <h3 className="font-serif-editorial text-lg font-medium text-[#1C1917] mb-1">
              Mindful Horizon
            </h3>
            <p className="text-xs text-[#57534E] leading-relaxed">
              No bottomless infinite loops or outrage traps. Chronological feeds and clear closure points protect your focus.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#E8E4DC] shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] border border-[#E8E4DC] flex items-center justify-center mb-3 text-[#1C1917]">
              <Sparkles className="w-4 h-4 text-[#8A5F38]" />
            </div>
            <h3 className="font-serif-editorial text-lg font-medium text-[#1C1917] mb-1">
              Connect AI Companion
            </h3>
            <p className="text-xs text-[#57534E] leading-relaxed">
              A private, grounded reasoning partner powered by Gemini 3.8 Flash to refine your essays, critique ideas, and brainstorm.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#E8E4DC] shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] border border-[#E8E4DC] flex items-center justify-center mb-3 text-[#1C1917]">
              <MessageSquare className="w-4 h-4 text-[#8A5F38]" />
            </div>
            <h3 className="font-serif-editorial text-lg font-medium text-[#1C1917] mb-1">
              Deep Collaboration
            </h3>
            <p className="text-xs text-[#57534E] leading-relaxed">
              Engage with curated architects, artists, and creators in private 1-on-1 dialogues and quiet community threads.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E8E4DC] py-6 px-6 text-center text-xs text-[#8C857B] bg-white">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="font-serif-editorial text-sm text-[#1C1917]">
            Project Connect · An editorial social platform
          </div>
          <div>Crafted with soft neutrals, accessible contrast, and zero-pill discipline.</div>
        </div>
      </footer>
    </div>
  );
};
