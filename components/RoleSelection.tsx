
import React, { useState } from 'react';
import { Sword, Users, Shield, Wand2 } from 'lucide-react';

interface RoleSelectionProps {
  onSelectDM: () => void;
  onJoin: (code: string, name: string) => void;
}

const RoleSelection: React.FC<RoleSelectionProps> = ({ onSelectDM, onJoin }) => {
  const [joinCode, setJoinCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-600/10 rounded-full blur-[120px]" />

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
            <button 
              onClick={onSelectDM}
              className="mt-auto w-full py-5 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest border-b-4 border-amber-800 active:translate-y-1 active:border-b-0 flex items-center justify-center gap-2"
            >
              <Wand2 size={24} /> CREATE ENCOUNTER
            </button>
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
              <button 
                onClick={() => setIsJoining(true)}
                className="mt-auto w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest border-b-4 border-blue-800 active:translate-y-1 active:border-b-0"
              >
                JOIN SESSION
              </button>
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
