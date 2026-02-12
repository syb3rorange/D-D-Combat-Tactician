
import React, { useState } from 'react';
import { Sword, Users, Shield, Wand2, HelpCircle, X, ChevronRight, ChevronLeft, LayoutGrid, Heart, Package, Settings2, UserPlus, Play, Sparkles, Map as MapIcon, Hammer } from 'lucide-react';

interface RoleSelectionProps {
  onSelectDM: () => void;
  onJoin: (code: string, name: string) => void;
  onSelectWorkshop: () => void;
}

const RoleSelection: React.FC<RoleSelectionProps> = ({ onSelectDM, onJoin, onSelectWorkshop }) => {
  const [joinCode, setJoinCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = () => {
    if (joinCode && playerName) {
      onJoin(joinCode.toUpperCase(), playerName);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-600/10 rounded-full blur-[120px]" />

      <div className="max-w-6xl w-full z-10">
        <div className="text-center mb-12">
          <h1 className="font-medieval text-7xl text-amber-500 mb-4 drop-shadow-2xl flex items-center justify-center gap-4">
            <Sword size={60} className="text-amber-600" />
            Tactician 5e
          </h1>
          <p className="text-slate-500 text-lg font-bold uppercase tracking-[0.4em]">Prepare your adventure</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Dungeon Master Card */}
          <div className="group bg-slate-900 border-2 border-slate-800 rounded-[2.5rem] p-8 transition-all hover:border-amber-500 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Shield size={120}/></div>
            <div className="w-20 h-20 bg-amber-600/20 rounded-3xl flex items-center justify-center mb-6 border-2 border-amber-600/30">
              <Shield size={40} className="text-amber-500" />
            </div>
            <h2 className="font-medieval text-3xl text-white mb-3">Dungeon Master</h2>
            <p className="text-slate-400 mb-8 text-xs leading-relaxed max-w-[200px]">
              Host a live game, manage multiple rooms, and lead your party through the deep.
            </p>
            <div className="w-full mt-auto space-y-3">
              <button onClick={onSelectDM} className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest active:scale-95 transition-all">
                HOST SESSION
              </button>
            </div>
          </div>

          {/* Hero Card */}
          <div className="group bg-slate-900 border-2 border-slate-800 rounded-[2.5rem] p-8 transition-all hover:border-blue-500 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Users size={120}/></div>
            <div className="w-20 h-20 bg-blue-600/20 rounded-3xl flex items-center justify-center mb-6 border-2 border-blue-600/30">
              <Users size={40} className="text-blue-500" />
            </div>
            <h2 className="font-medieval text-3xl text-white mb-3">The Hero</h2>
            <p className="text-slate-400 mb-8 text-xs leading-relaxed max-w-[200px]">
              Join an existing session and claim your place in the party.
            </p>
            
            {!isJoining ? (
              <div className="w-full mt-auto">
                <button onClick={() => setIsJoining(true)} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest transition-all">
                  JOIN PARTY
                </button>
              </div>
            ) : (
              <div className="w-full space-y-3 mt-auto animate-in slide-in-from-bottom-2">
                <input 
                  type="text" placeholder="HERO NAME" value={playerName} onChange={e => setPlayerName(e.target.value)}
                  className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl p-3 text-center font-bold text-white text-sm outline-none focus:border-blue-500 transition-all uppercase"
                />
                <input 
                  type="text" placeholder="6-DIGIT CODE" maxLength={6} value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl p-3 text-center font-black text-white text-sm outline-none focus:border-blue-500 tracking-[0.3em]"
                />
                <div className="flex gap-2">
                  <button onClick={() => setIsJoining(false)} className="flex-1 py-3 text-slate-500 font-bold text-xs uppercase">BACK</button>
                  <button disabled={!joinCode || !playerName} onClick={handleJoin} className="flex-[2] py-3 bg-blue-600 text-white font-black rounded-xl uppercase tracking-widest disabled:opacity-30">ENTER</button>
                </div>
              </div>
            )}
          </div>

          {/* Map Architect Card */}
          <div className="group bg-slate-900 border-2 border-slate-800 rounded-[2.5rem] p-8 transition-all hover:border-emerald-500 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><MapIcon size={120}/></div>
            <div className="w-20 h-20 bg-emerald-600/20 rounded-3xl flex items-center justify-center mb-6 border-2 border-emerald-600/30">
              <Hammer size={40} className="text-emerald-500" />
            </div>
            <h2 className="font-medieval text-3xl text-white mb-3">Architect</h2>
            <p className="text-slate-400 mb-8 text-xs leading-relaxed max-w-[200px]">
              Design intricate maps, save them as files, and import them into your DM sessions.
            </p>
            <div className="w-full mt-auto">
              <button onClick={onSelectWorkshop} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest active:scale-95 transition-all">
                OPEN WORKSHOP
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
