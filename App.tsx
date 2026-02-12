
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Entity, EntityType, GridSettings, EncounterStatus, SessionData } from './types';
import { INITIAL_GRID_SETTINGS, ENTITY_DEFAULTS, COLORS } from './constants';
import GridMap from './components/GridMap';
import EntityCard from './components/EntityCard';
import RoleSelection from './components/RoleSelection';
import { generateMonster } from './services/geminiService';
import { 
  Sparkles, 
  ChevronRight, 
  ChevronLeft,
  Sword,
  ShieldAlert,
  Users,
  User,
  MousePointer2,
  Trash2,
  Plus,
  RefreshCw,
  LogOut,
  BedDouble,
  Timer,
  Trophy,
  Skull,
  Settings,
  Heart
} from 'lucide-react';

const App: React.FC = () => {
  const [role, setRole] = useState<'dm' | 'member' | null>(null);
  const [playerName, setPlayerName] = useState<string>('');
  const [sessionCode, setSessionCode] = useState<string>('');
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [gridSettings, setGridSettings] = useState<GridSettings>(INITIAL_GRID_SETTINGS);
  const [encounterStatus, setEncounterStatus] = useState<EncounterStatus>('active');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [lastSync, setLastSync] = useState<Date>(new Date());

  const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  // Helper to persist data to "Cloud" (localStorage)
  const syncToCloud = useCallback((data: Partial<SessionData>) => {
    if (sessionCode) {
      const storageKey = `dnd_session_${sessionCode}`;
      const existingRaw = localStorage.getItem(storageKey);
      const existing: SessionData = existingRaw ? JSON.parse(existingRaw) : {
        entities: [],
        gridSettings: INITIAL_GRID_SETTINGS,
        status: 'active',
        updatedAt: new Date().toISOString()
      };

      const updated: SessionData = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString()
      };
      
      localStorage.setItem(storageKey, JSON.stringify(updated));
      setLastSync(new Date());
    }
  }, [sessionCode]);

  // Helper to fetch latest session state
  const fetchFromCloud = useCallback(() => {
    if (sessionCode) {
      const storageKey = `dnd_session_${sessionCode}`;
      const rawData = localStorage.getItem(storageKey);
      if (rawData) {
        const data: SessionData = JSON.parse(rawData);
        setEntities(data.entities);
        setGridSettings(data.gridSettings);
        setEncounterStatus(data.status);
        setLastSync(new Date(data.updatedAt));
      }
    }
  }, [sessionCode]);

  // Sync Timer: Polling logic
  useEffect(() => {
    if (sessionCode) {
      // First fetch
      fetchFromCloud();
      // Regular intervals
      const interval = setInterval(fetchFromCloud, role === 'member' ? 15000 : 5000);
      return () => clearInterval(interval);
    }
  }, [sessionCode, role, fetchFromCloud]);

  // DM Specific: Save every local change to "Cloud"
  useEffect(() => {
    if (role === 'dm' && sessionCode) {
      syncToCloud({ 
        entities, 
        gridSettings, 
        status: encounterStatus 
      });
    }
  }, [entities, gridSettings, encounterStatus, role, sessionCode, syncToCloud]);

  const handleSelectDM = () => {
    const code = generateCode();
    setSessionCode(code);
    setRole('dm');
    // Save initial state immediately
    const initialState: SessionData = {
      entities: [],
      gridSettings: INITIAL_GRID_SETTINGS,
      status: 'active',
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(`dnd_session_${code}`, JSON.stringify(initialState));
  };

  const handleJoinSession = (code: string, name: string) => {
    setSessionCode(code.toUpperCase());
    setPlayerName(name);
    setRole('member');
    // Session state will be picked up by the useEffect fetchFromCloud
  };

  const handleCellClick = useCallback((x: number, y: number) => {
    const found = entities.find(e => e.x === x && e.y === y);
    
    if (role === 'dm') {
      if (selectedEntityId) {
        setEntities(prev => prev.map(e => e.id === selectedEntityId ? { ...e, x, y } : e));
        setSelectedEntityId(null);
      } else if (found) {
        setSelectedEntityId(found.id);
      }
    } else {
      // Team Member behavior
      if (found && found.type === 'player' && !found.claimedBy) {
        // Claim slot
        const updated = entities.map(e => 
          e.id === found.id ? { ...e, claimedBy: playerName, name: playerName } : e
        );
        setEntities(updated);
        syncToCloud({ entities: updated });
        setSelectedEntityId(found.id);
      } else if (found && (found.claimedBy === playerName || found.type === 'enemy')) {
        setSelectedEntityId(found.id);
      }
    }
  }, [selectedEntityId, entities, role, playerName, syncToCloud]);

  const addEntity = (type: EntityType) => {
    if (role !== 'dm') return;
    const newEntity: Entity = {
      id: Math.random().toString(36).substr(2, 9),
      name: type === 'player' ? 'Player Slot' : `New ${type}`,
      type,
      hp: ENTITY_DEFAULTS.maxHp,
      maxHp: ENTITY_DEFAULTS.maxHp,
      ac: ENTITY_DEFAULTS.ac,
      initiative: ENTITY_DEFAULTS.initiative,
      x: 0,
      y: 0,
      color: COLORS[type]
    };
    setEntities(prev => [...prev, newEntity]);
  };

  const handleRest = (type: 'short' | 'long') => {
    if (role !== 'dm') return;
    const updated = entities.map(e => ({
      ...e,
      hp: type === 'long' ? e.maxHp : Math.min(e.maxHp, e.hp + Math.floor(e.maxHp * 0.25))
    }));
    setEntities(updated);
  };

  const updateEntityHp = (id: string, newHp: number) => {
    const updated = entities.map(e => 
      e.id === id ? { ...e, hp: Math.max(0, Math.min(e.maxHp, newHp)) } : e
    );
    setEntities(updated);
    // If player is updating themselves, force a sync immediately
    if (role === 'member') {
       syncToCloud({ entities: updated });
    }
  };

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntity) return;
    const updated = entities.map(ent => ent.id === editingEntity.id ? editingEntity : ent);
    setEntities(updated);
    if (role === 'member') {
      syncToCloud({ entities: updated });
    }
    setEditingEntity(null);
  };

  if (!role) return <RoleSelection onSelectDM={handleSelectDM} onJoin={handleJoinSession} />;

  const myCharacter = entities.find(e => e.claimedBy === playerName);
  const isDead = myCharacter && myCharacter.hp <= 0;
  const selectedEntity = entities.find(e => e.id === selectedEntityId);

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden relative">
      {/* Overlays */}
      {encounterStatus !== 'active' && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl animate-in fade-in duration-700">
          <div className={`p-12 rounded-[3rem] border-4 text-center shadow-[0_0_100px_rgba(0,0,0,0.5)] ${encounterStatus === 'victory' ? 'border-amber-500 bg-amber-950/20' : 'border-red-600 bg-red-950/20'}`}>
            {encounterStatus === 'victory' ? (
              <>
                <Trophy size={120} className="text-amber-500 mx-auto mb-6 animate-bounce" />
                <h2 className="font-medieval text-7xl text-amber-400 mb-4 tracking-tighter">VICTORY</h2>
                <p className="text-slate-300 font-bold tracking-widest uppercase">The encounter is won! Glory to the heroes!</p>
              </>
            ) : (
              <>
                <Skull size={120} className="text-red-600 mx-auto mb-6 animate-pulse" />
                <h2 className="font-medieval text-7xl text-red-500 mb-4 tracking-tighter">DEFEAT</h2>
                <p className="text-slate-300 font-bold tracking-widest uppercase">Darkness falls upon the party today...</p>
              </>
            )}
            {role === 'dm' && (
              <button 
                onClick={() => setEncounterStatus('active')}
                className="mt-12 px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-2xl uppercase tracking-widest transition-all"
              >
                Return to Battlefield
              </button>
            )}
          </div>
        </div>
      )}

      {isDead && (
        <div className="absolute inset-0 z-[90] flex flex-col items-center justify-center bg-red-950/90 backdrop-blur-md animate-in fade-in zoom-in duration-500">
          <Skull size={100} className="text-red-500 mb-6 animate-pulse" />
          <h2 className="font-medieval text-6xl text-white mb-4 tracking-tighter">YOU ARE DOWN!</h2>
          <p className="text-white text-xl font-bold tracking-widest uppercase mb-2">HP: 0 / {myCharacter?.maxHp}</p>
          <p className="text-red-100 opacity-80 max-w-md text-center">Your vision fades. You must be stabilized or revived by a teammate to rejoin the fight!</p>
          <div className="mt-12 flex gap-4">
             <div className="px-6 py-3 bg-white/10 rounded-xl text-white text-xs font-black uppercase tracking-tighter flex items-center gap-2">
               <RefreshCw size={14} className="animate-spin" /> Waiting for Revive
             </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`bg-slate-900 border-r-2 border-slate-800 transition-all duration-300 flex flex-col z-30 shadow-2xl ${isSidebarOpen ? 'w-96' : 'w-0'}`}>
        {isSidebarOpen && (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="p-6 border-b-2 border-slate-800 bg-slate-900/50">
              <div className="flex justify-between items-center mb-4">
                <h1 className="font-medieval text-3xl text-amber-500 flex items-center gap-3">
                  <Sword size={28} className="text-amber-600" />
                  {role === 'dm' ? 'DM Hub' : playerName}
                </h1>
                <button onClick={() => setRole(null)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 transition-colors">
                  <LogOut size={20} />
                </button>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-700 rounded-xl">
                 <div className="text-xs font-black text-slate-500 uppercase">Code: <span className="text-white text-base tracking-widest">{sessionCode}</span></div>
                 <div className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${role === 'dm' ? 'bg-amber-600 text-white' : 'bg-blue-600 text-white'}`}>
                   {role === 'dm' ? 'MASTER' : 'HERO'}
                 </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {role === 'dm' && (
                <>
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Encounter Controls</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setEncounterStatus('victory')} className="flex items-center justify-center gap-2 p-3 bg-amber-600 hover:bg-amber-500 rounded-xl text-white text-xs font-black transition-all border-b-4 border-amber-800"><Trophy size={16}/> VICTORY</button>
                      <button onClick={() => setEncounterStatus('defeat')} className="flex items-center justify-center gap-2 p-3 bg-red-700 hover:bg-red-600 rounded-xl text-white text-xs font-black transition-all border-b-4 border-red-900"><Skull size={16}/> DEFEAT</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => handleRest('short')} className="flex items-center justify-center gap-2 p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 text-[10px] font-black border border-slate-700"><Timer size={14}/> SHORT REST</button>
                      <button onClick={() => handleRest('long')} className="flex items-center justify-center gap-2 p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 text-[10px] font-black border border-slate-700"><BedDouble size={14}/> LONG REST</button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Spawning</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => addEntity('player')} className="flex items-center justify-center gap-2 p-3 bg-green-600/20 hover:bg-green-600/30 border-2 border-green-600/50 rounded-xl text-green-400 text-xs font-black"><Plus size={16}/> PLAYER SLOT</button>
                      <button onClick={() => addEntity('enemy')} className="flex items-center justify-center gap-2 p-3 bg-red-600/20 hover:bg-red-600/30 border-2 border-red-600/50 rounded-xl text-red-400 text-xs font-black"><Plus size={16}/> ENEMY</button>
                    </div>
                  </div>
                </>
              )}

              {role === 'member' && !myCharacter && (
                <div className="bg-blue-600/10 border border-blue-600/30 p-4 rounded-2xl text-center">
                  <User size={32} className="mx-auto text-blue-400 mb-2" />
                  <p className="text-xs font-bold text-white uppercase mb-1">Unassigned</p>
                  <p className="text-[10px] text-blue-300/80">Click a "Player Slot" on the grid to claim your character!</p>
                </div>
              )}

              <div className="space-y-4 pb-12">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex justify-between">
                  Initiative Order <span>{entities.length} TOTAL</span>
                </h3>
                {entities.sort((a,b) => b.initiative - a.initiative).map(entity => (
                  <EntityCard 
                    key={entity.id}
                    entity={entity}
                    isSelected={selectedEntityId === entity.id}
                    onSelect={setSelectedEntityId}
                    onUpdateHp={updateEntityHp}
                    onDelete={(id) => role === 'dm' && setEntities(entities.filter(e => e.id !== id))}
                    onEdit={setEditingEntity}
                    canEdit={role === 'dm' || entity.claimedBy === playerName}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Grid Area */}
      <main className="flex-1 flex flex-col relative">
        <header className="p-4 px-8 border-b-2 border-slate-800 bg-slate-900 flex justify-between items-center shadow-xl">
           <div className="flex items-center gap-4">
             <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
               <span className="text-[10px] font-black text-slate-500 block">ENCOUNTER</span>
               <span className={`text-xs font-black uppercase ${encounterStatus === 'active' ? 'text-green-400' : 'text-red-400'}`}>{encounterStatus}</span>
             </div>
             {role === 'dm' && (
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-2 rounded-xl">
                  <span className="text-[10px] font-black text-slate-500 px-2">GRID:</span>
                  <input 
                    type="number" value={gridSettings.cols}
                    onChange={(e) => setGridSettings({...gridSettings, cols: Math.max(5, Math.min(30, Number(e.target.value)))})}
                    className="w-10 bg-slate-800 rounded text-center text-white text-xs font-bold p-1"
                  />
                  <span className="text-slate-600">x</span>
                  <input 
                    type="number" value={gridSettings.rows}
                    onChange={(e) => setGridSettings({...gridSettings, rows: Math.max(5, Math.min(30, Number(e.target.value)))})}
                    className="w-10 bg-slate-800 rounded text-center text-white text-xs font-bold p-1"
                  />
                </div>
             )}
           </div>
           <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-widest">
             <RefreshCw size={14} className="animate-spin" /> {lastSync.toLocaleTimeString()}
           </div>
        </header>

        <div className="flex-1 overflow-auto bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 p-12 flex items-center justify-center">
           <GridMap 
             entities={entities} 
             settings={gridSettings} 
             selectedEntityId={selectedEntityId} 
             onCellClick={handleCellClick}
           />
        </div>
      </main>

      {/* Edit Modal */}
      {editingEntity && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
             <div className="p-6 border-b border-slate-800 flex justify-between bg-slate-800/50">
                <h2 className="font-bold text-amber-500 uppercase tracking-widest">Update Stats</h2>
                <button onClick={() => setEditingEntity(null)} className="text-slate-500 text-2xl">&times;</button>
             </div>
             <form onSubmit={handleEditSave} className="p-6 space-y-4">
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-500 uppercase">Name</label>
                   <input type="text" value={editingEntity.name} onChange={e => setEditingEntity({...editingEntity, name: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-amber-500 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Current HP</label>
                      <input type="number" value={editingEntity.hp} onChange={e => setEditingEntity({...editingEntity, hp: Number(e.target.value)})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-amber-500 outline-none" />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Max HP</label>
                      <input type="number" value={editingEntity.maxHp} onChange={e => setEditingEntity({...editingEntity, maxHp: Number(e.target.value)})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-amber-500 outline-none" />
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">AC</label>
                      <input type="number" value={editingEntity.ac} onChange={e => setEditingEntity({...editingEntity, ac: Number(e.target.value)})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-amber-500 outline-none" />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Initiative Mod</label>
                      <input type="number" value={editingEntity.initiative} onChange={e => setEditingEntity({...editingEntity, initiative: Number(e.target.value)})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-amber-500 outline-none" />
                   </div>
                </div>
                <button type="submit" className="w-full py-4 bg-amber-600 hover:bg-amber-500 rounded-xl text-white font-black uppercase tracking-widest mt-6 transition-all shadow-lg">Confirm Changes</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
