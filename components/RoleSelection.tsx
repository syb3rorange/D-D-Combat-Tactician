
import React, { useState, useEffect } from 'react';
import { Sword, Users, Shield, Hammer, ArrowRight } from 'lucide-react';

interface RoleSelectionProps {
  onSelectDM: () => void;
  onJoin: (code: string, name: string) => void;
  onSelectWorkshop: () => void;
  initialSessionCode?: string;
}

const RoleSelection: React.FC<RoleSelectionProps> = ({ onSelectDM, onJoin, onSelectWorkshop, initialSessionCode }) => {
  const [joinCode, setJoinCode] = useState(initialSessionCode || '');
  const [playerName, setPlayerName] = useState('');
  const [isJoining, setIsJoining] = useState(!!initialSessionCode);

  useEffect(() => {
    if (initialSessionCode) {
      setJoinCode(initialSessionCode);
      setIsJoining(true);
    }
  }, [initialSessionCode]);

  const handleJoin = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (joinCode && playerName) {
      onJoin(joinCode.toUpperCase(), playerName);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-amber-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]" />

      <div className="max-w-6xl w-full z-10">
        <div className="text-center mb-16">
          <h1 className="font-medieval text-7xl md:text-8xl text-amber-500 mb-4 drop-shadow-2xl flex items-center justify-center gap-6">
            <Shield size={72} className="text-amber-600" />
            Tactician
          </h1>
          <p className="text-slate-500 text-sm md:text-lg font-black uppercase tracking-[0.5em]">The Ultimate VTT Experience</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Dungeon Master Card */}
          <div className="group bg-slate-900 border-2 border-slate-800 rounded-[2.5rem] p-10 transition-all hover:border-amber-500 flex flex-col items-center text-center shadow-2xl">
            <div className="w-20 h-20 bg-amber-600/20 rounded-3xl flex items-center justify-center mb-8 border-2 border-amber-600/30">
              <Shield size={40} className="text-amber-500" />
            </div>
            <h2 className="font-medieval text-3xl text-white mb-4">Host Realm</h2>
            <p className="text-slate-400 mb-10 text-xs font-medium">Manifest a new session and lead your party through the encounter.</p>
            <button onClick={onSelectDM} className="w-full mt-auto py-5 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest transition-all active:scale-95">
              START SESSION
            </button>
          </div>

          {/* Hero Card */}
          <div className={`group bg-slate-900 border-2 rounded-[2.5rem] p-10 transition-all flex flex-col items-center text-center shadow-2xl ${isJoining && initialSessionCode ? 'border-blue-500 ring-4 ring-blue-500/20' : 'border-slate-800 hover:border-blue-500'}`}>
            <div className="w-20 h-20 bg-blue-600/20 rounded-3xl flex items-center justify-center mb-8 border-2 border-blue-600/30">
              <Users size={40} className="text-blue-500" />
            </div>
            <h2 className="font-medieval text-3xl text-white mb-4">{isJoining && initialSessionCode ? 'Join Portal' : 'Enter Party'}</h2>
            
            {isJoining && initialSessionCode && (
               <div className="mb-6 bg-blue-500/10 text-blue-400 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-500/30 animate-pulse">
                 Realm Connected: {initialSessionCode}
               </div>
            )}
            
            {!isJoining ? (
              <button onClick={() => setIsJoining(true)} className="w-full mt-auto py-5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest transition-all">
                JOIN PARTY
              </button>
            ) : (
              <form onSubmit={handleJoin} className="w-full space-y-4 mt-auto">
                <div className="space-y-1 text-left">
                   <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Character Name</label>
                   <input 
                     type="text" autoFocus placeholder="e.g. Grog" value={playerName} onChange={e => setPlayerName(e.target.value)}
                     className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl p-4 font-bold text-white outline-none focus:border-blue-500 transition-all uppercase"
                   />
                </div>
                {!initialSessionCode && (
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Session Code</label>
                    <input 
                      type="text" placeholder="6-DIGIT CODE" maxLength={6} value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
                      className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl p-4 font-black text-white outline-none focus:border-blue-500 tracking-[0.4em]"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <button type="submit" disabled={!joinCode || !playerName} className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl uppercase tracking-widest disabled:opacity-20 flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
                    ENTER REALM <ArrowRight size={20}/>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Architect Card */}
          <div className="group bg-slate-900 border-2 border-slate-800 rounded-[2.5rem] p-10 transition-all hover:border-emerald-500 flex flex-col items-center text-center shadow-2xl">
            <div className="w-20 h-20 bg-emerald-600/20 rounded-3xl flex items-center justify-center mb-8 border-2 border-emerald-600/30">
              <Hammer size={40} className="text-emerald-500" />
            </div>
            <h2 className="font-medieval text-3xl text-white mb-4">Architect</h2>
            <p className="text-slate-400 mb-10 text-xs font-medium">Design encounter blueprints in an offline workshop environment.</p>
            <button onClick={onSelectWorkshop} className="w-full mt-auto py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest transition-all active:scale-95">
              OPEN WORKSHOP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
