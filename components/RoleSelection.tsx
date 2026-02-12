
import React, { useState } from 'react';
import { Sword, Users, Shield, Wand2, HelpCircle, X, ChevronRight, ChevronLeft, LayoutGrid, Heart, Package, Settings2, UserPlus, Play, Sparkles } from 'lucide-react';

interface RoleSelectionProps {
  onSelectDM: () => void;
  onJoin: (code: string, name: string) => void;
  onTutorial: (type: 'dm' | 'member') => void;
}

const GuideModal: React.FC<{ isOpen: boolean; onClose: () => void; onStartTutorial: (type: 'dm' | 'member') => void }> = ({ isOpen, onClose, onStartTutorial }) => {
  const [activeTab, setActiveTab] = useState<'dm' | 'hero'>('dm');
  const [step, setStep] = useState(0);

  const dmSteps = [
    {
      title: "Master of the Field",
      icon: <Settings2 className="text-amber-500" size={40} />,
      desc: "As a DM, you control the 'Field Editor' on the left. Click the arrow tab to open it. You can paint terrain, set grid size, and toggle enemy HP visibility.",
      tip: "Use the 'Eraser' tool in the Field Editor to remove unwanted tiles."
    },
    {
      title: "Summoning & Combat",
      icon: <UserPlus className="text-green-500" size={40} />,
      desc: "Use the sidebar to add 'Player Slots' and 'Enemies'. Players cannot move their tokens until they claim a slot. You can move any token by clicking it and then clicking a destination.",
      tip: "Enemies you place are automatically visible to players unless you hide the session."
    },
    {
      title: "Interactive World",
      icon: <Package className="text-amber-600" size={40} />,
      desc: "Place Chests and Doors from the 'Objects' section. You can type secrets inside chests. These stay hidden from players until they 'Open' the chest.",
      tip: "Click a chest in the sidebar to edit its contents before the players find it!"
    },
    {
      title: "Encounters & Rests",
      icon: <Sword className="text-red-500" size={40} />,
      desc: "Trigger Victory/Defeat screens or Short/Long rests from the sidebar. Resting automatically heals tokens based on D&D 5e logic (Long Rest = Full Heal).",
      tip: "The session code at the top is what your players need to join."
    }
  ];

  const heroSteps = [
    {
      title: "Enter the Realm",
      icon: <Users className="text-blue-500" size={40} />,
      desc: "Enter your character name and the 6-digit code provided by your DM. Once inside, look for a green 'Player Slot' on the grid.",
      tip: "Make sure your name matches your character for the best experience!"
    },
    {
      title: "Claiming Your Hero",
      icon: <Heart className="text-red-500" size={40} />,
      desc: "Click a green empty slot to claim it. Once claimed, you can move your token and use the sidebar to track your HP and AC.",
      tip: "You can only move your own token, but you can view stats for anyone."
    },
    {
      title: "Interaction",
      icon: <LayoutGrid className="text-indigo-400" size={40} />,
      desc: "See a chest or a door? Click it on the grid or find it in your sidebar. If the DM hasn't locked it, you can open it to reveal treasures or pathways.",
      tip: "Chests will display their contents directly in your sidebar once opened."
    },
    {
      title: "Combat Tactics",
      icon: <Play className="text-emerald-500" size={40} />,
      desc: "Use the + and - buttons on your card to adjust your HP. Your health bar on the grid will update in real-time for everyone to see.",
      tip: "If your HP hits 0, a 'Down' overlay will appear until you are healed!"
    }
  ];

  const currentSteps = activeTab === 'dm' ? dmSteps : heroSteps;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
          <div className="flex items-center gap-3">
            <HelpCircle className="text-amber-500" size={24} />
            <h2 className="font-medieval text-2xl text-white">Adventurer's Guide</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={28} />
          </button>
        </div>

        <div className="flex border-b border-slate-800">
          <button 
            onClick={() => { setActiveTab('dm'); setStep(0); }}
            className={`flex-1 py-4 font-black uppercase tracking-widest text-sm transition-all ${activeTab === 'dm' ? 'bg-amber-600/10 text-amber-500 border-b-2 border-amber-500' : 'text-slate-500 hover:bg-slate-800'}`}
          >
            Dungeon Master
          </button>
          <button 
            onClick={() => { setActiveTab('hero'); setStep(0); }}
            className={`flex-1 py-4 font-black uppercase tracking-widest text-sm transition-all ${activeTab === 'hero' ? 'bg-blue-600/10 text-blue-500 border-b-2 border-blue-500' : 'text-slate-500 hover:bg-slate-800'}`}
          >
            The Hero
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="flex flex-col items-center text-center space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="p-6 bg-slate-800 rounded-3xl border border-slate-700 shadow-inner">
              {currentSteps[step].icon}
            </div>
            <h3 className="font-medieval text-3xl text-white">{currentSteps[step].title}</h3>
            <p className="text-slate-300 text-lg leading-relaxed">
              {currentSteps[step].desc}
            </p>
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl w-full">
              <p className="text-amber-500 text-sm font-bold italic">
                Pro-Tip: {currentSteps[step].tip}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-800 bg-slate-800/30 flex justify-between items-center">
          <div className="flex gap-2">
            {currentSteps.map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all ${step === i ? 'w-8 bg-amber-500' : 'w-2 bg-slate-700'}`}
              />
            ))}
          </div>
          <div className="flex gap-3">
            <button 
              disabled={step === 0}
              onClick={() => setStep(s => s - 1)}
              className="p-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl disabled:opacity-20 transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            
            <button 
              onClick={() => onStartTutorial(activeTab === 'dm' ? 'dm' : 'member')}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl flex items-center gap-2 transition-all shadow-lg"
            >
              <Sparkles size={18} /> INTERACTIVE WALKTHROUGH
            </button>

            {step < currentSteps.length - 1 ? (
              <button 
                onClick={() => setStep(s => s + 1)}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-xl flex items-center gap-2 transition-all shadow-lg"
              >
                NEXT <ChevronRight size={20} />
              </button>
            ) : (
              <button 
                onClick={onClose}
                className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-black rounded-xl transition-all shadow-lg"
              >
                GOT IT!
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const RoleSelection: React.FC<RoleSelectionProps> = ({ onSelectDM, onJoin, onTutorial }) => {
  const [joinCode, setJoinCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-600/10 rounded-full blur-[120px]" />

      {/* Help Button */}
      <div className="absolute top-8 right-8 z-20">
        <button 
          onClick={() => setIsGuideOpen(true)}
          className="flex items-center gap-3 px-6 py-3 bg-slate-900 border-2 border-slate-800 hover:border-amber-500 rounded-2xl text-slate-400 hover:text-white transition-all font-black uppercase tracking-widest text-xs shadow-xl group"
        >
          <HelpCircle size={18} className="text-amber-500 group-hover:animate-bounce" />
          How to Play
        </button>
      </div>

      <GuideModal 
        isOpen={isGuideOpen} 
        onClose={() => setIsGuideOpen(false)} 
        onStartTutorial={(type) => {
          setIsGuideOpen(false);
          onTutorial(type);
        }}
      />

      <div className="max-w-4xl w-full z-10">
        <div className="text-center mb-12">
          <h1 className="font-medieval text-7xl text-amber-500 mb-4 drop-shadow-2xl flex items-center justify-center gap-4">
            <Sword size={60} className="text-amber-600" />
            Tactician 5e
          </h1>
          <p className="text-slate-500 text-lg font-bold uppercase tracking-[0.4em]">Choose your destiny</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="group bg-slate-900 border-2 border-slate-800 rounded-[2.5rem] p-10 transition-all hover:border-amber-500 flex flex-col items-center text-center shadow-2xl">
            <div className="w-24 h-24 bg-amber-600/20 rounded-3xl flex items-center justify-center mb-8 border-2 border-amber-600/30">
              <Shield size={50} className="text-amber-500" />
            </div>
            <h2 className="font-medieval text-4xl text-white mb-4">Dungeon Master</h2>
            <p className="text-slate-400 mb-10 text-sm leading-relaxed max-w-[240px]">
              Control the field, spawn monsters, and manage the encounter flow.
            </p>
            <div className="w-full space-y-3">
              <button 
                onClick={onSelectDM}
                className="w-full py-5 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest border-b-4 border-amber-800 active:translate-y-1 active:border-b-0 flex items-center justify-center gap-2"
              >
                <Wand2 size={24} /> CREATE ENCOUNTER
              </button>
              <button 
                onClick={() => onTutorial('dm')}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-indigo-400 font-black rounded-xl text-[10px] uppercase tracking-[0.2em] border border-slate-700 flex items-center justify-center gap-2"
              >
                <Sparkles size={14} /> Interactive Tutorial
              </button>
            </div>
          </div>

          <div className="group bg-slate-900 border-2 border-slate-800 rounded-[2.5rem] p-10 transition-all hover:border-blue-500 flex flex-col items-center text-center shadow-2xl">
            <div className="w-24 h-24 bg-blue-600/20 rounded-3xl flex items-center justify-center mb-8 border-2 border-blue-600/30">
              <Users size={50} className="text-blue-500" />
            </div>
            <h2 className="font-medieval text-4xl text-white mb-4">Hero</h2>
            <p className="text-slate-400 mb-10 text-sm leading-relaxed max-w-[240px]">
              Join the party, claim your token, and track your character's vitals.
            </p>
            
            {!isJoining ? (
              <div className="w-full space-y-3">
                <button 
                  onClick={() => setIsJoining(true)}
                  className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest border-b-4 border-blue-800 active:translate-y-1 active:border-b-0"
                >
                  JOIN SESSION
                </button>
                <button 
                  onClick={() => onTutorial('member')}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-indigo-400 font-black rounded-xl text-[10px] uppercase tracking-[0.2em] border border-slate-700 flex items-center justify-center gap-2"
                >
                  <Sparkles size={14} /> Interactive Tutorial
                </button>
              </div>
            ) : (
              <div className="mt-auto w-full space-y-4">
                <input 
                  type="text" autoFocus placeholder="YOUR CHARACTER NAME"
                  value={playerName} onChange={e => setPlayerName(e.target.value)}
                  className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl p-4 text-center font-bold text-white outline-none focus:border-blue-500 transition-all uppercase"
                />
                <input 
                  type="text" placeholder="6-DIGIT CODE" maxLength={6}
                  value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl p-4 text-center font-black text-white outline-none focus:border-blue-500 tracking-[0.5em]"
                />
                <div className="flex gap-2">
                  <button onClick={() => setIsJoining(false)} className="flex-1 py-4 text-slate-500 font-bold text-xs uppercase">BACK</button>
                  <button 
                    disabled={!joinCode || !playerName}
                    onClick={() => onJoin(joinCode, playerName)}
                    className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-xl uppercase tracking-widest disabled:opacity-30"
                  >
                    ENTER
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
