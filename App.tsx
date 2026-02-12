
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
  Maximize,
  ZoomIn,
  ZoomOut,
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
  const [zoom, setZoom] = useState(1);

  const containerRef = useRef<HTMLDivElement>(null);

  const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  // Unified save logic
  const syncToCloud = useCallback((data: Partial<SessionData>) => {
    if (!sessionCode) return;
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
  }, [sessionCode]);

  // Fetch logic
  const fetchFromCloud = useCallback(() => {
    if (!sessionCode) return;
    const storageKey = `dnd_session_${sessionCode}`;
    const rawData = localStorage.getItem(storageKey);
    if (rawData) {
      const data: SessionData = JSON.parse(rawData);
      setEntities(data.entities);
      setGridSettings(data.gridSettings); // This fixes the grid size loading
      setEncounterStatus(data.status);
      setLastSync(new Date(data.updatedAt));
    }
  }, [sessionCode]);

  // Auto-fit grid to screen
  const fitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const padding = 80;
    const availableWidth = containerRef.current.clientWidth - padding;
    const availableHeight = containerRef.current.clientHeight - padding;
    const gridWidth = gridSettings.cols * gridSettings.cellSize;
    const gridHeight = gridSettings.rows * gridSettings.cellSize;

    const scaleX = availableWidth / gridWidth;
    const scaleY = availableHeight / gridHeight;
    const newZoom = Math.min(Math.max(0.2, Math.min(scaleX, scaleY)), 1.5);
    setZoom(newZoom);
  }, [gridSettings]);

  useEffect(() => {
    if (sessionCode) {
      fetchFromCloud();
      const interval = setInterval(fetchFromCloud, role === 'member' ? 10000 : 5000);
      return () => clearInterval(interval);
    }
  }, [sessionCode, role, fetchFromCloud]);

  // Ensure DM changes are synced immediately
  useEffect(() => {
    if (role === 'dm' && sessionCode) {
      syncToCloud({ entities, gridSettings, status: encounterStatus });
    }
  }, [entities, gridSettings, encounterStatus, role, sessionCode, syncToCloud]);

  // Auto-fit when grid size changes for the first time
  useEffect(() => {
    if (entities.length > 0) {
      fitToScreen();
    }
  }, [gridSettings.cols, gridSettings.rows]);

  const handleSelectDM = () => {
    const code = generateCode();
    setSessionCode(code);
    setRole('dm');
    syncToCloud({ entities: [], gridSettings: INITIAL_GRID_SETTINGS, status: 'active' });
  };

  const handleJoinSession = (code: string, name: string) => {
    setSessionCode(code.toUpperCase());
    setPlayerName(name);
    setRole('member');
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
      if (found && found.type === 'player' && !found.claimedBy) {
        const updated = entities.map(e => e.id === found.id ? { ...e, claimedBy: playerName, name: playerName } : e);
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
      x: Math.floor(gridSettings.cols / 2),
      y: Math.floor(gridSettings.rows / 2),
      color: COLORS[type]
    };
    setEntities(prev => [...prev, newEntity]);
  };

  const handleRest = (type: 'short' | 'long') => {
    if (role !== 'dm') return;
    setEntities(prev => prev.map(e => ({
      ...e,
      hp: type === 'long' ? e.maxHp : Math.min(e.maxHp, e.hp + Math.floor(e.maxHp * 0.25))
    })));
  };

  const updateEntityHp = (id: string, newHp: number) => {
    const updated = entities.map(e => e.id === id ? { ...e, hp: Math.max(0, Math.min(e.maxHp, newHp)) } : e);
    setEntities(updated);
    if (role === 'member') syncToCloud({ entities: updated });
  };

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntity) return;
    const updated = entities.map(ent => ent.id === editingEntity.id ? editingEntity : ent);
    setEntities(updated);
    if (role === 'member') syncToCloud({ entities: updated });
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
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl">
          <div className={`p-12 rounded-[3rem] border-4 text-center shadow-2xl ${encounterStatus === 'victory' ? 'border-amber-500 bg-amber-950/20' : 'border-red-600 bg-red-950/20'}`}>
            {encounterStatus === 'victory' ? (
              <><Trophy size={100} className="text-amber-500 mx-auto mb-6"/><h2 className="font-medieval text-7xl text-amber-400 mb-4">VICTORY</h2></>
            ) : (
              <><Skull size={100} className="text-red-600 mx-auto mb-6"/><h2 className="font-medieval text-7xl text-red-500 mb-4">DEFEAT</h2></>
            )}
            {role === 'dm' && (
              <button onClick={() => setEncounterStatus('active')} className="mt-8 px-8 py-4 bg-slate-800 text-white font-black rounded-2xl uppercase tracking-widest">Return</button>
            )}
          </div>
        </div>
      )}

      {isDead && (
        <div className="absolute inset-0 z-[90] flex flex-col items-center justify-center bg-red-950/90 backdrop-blur-md">
          <Skull size={100} className="text-red-500 mb-6 animate-pulse" />
          <h2 className="font-medieval text-6xl text-white mb-4">YOU ARE DOWN!</h2>
          <p className="text-white text-xl font-bold uppercase mb-2">HP: 0 / {myCharacter?.maxHp}</p>
          <p className="text-red-100 opacity-80 text-center">Wait for a teammate to revive you!</p>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`bg-slate-900 border-r-2 border-slate-800 transition-all duration-300 flex flex-col z-30 shadow-2xl ${isSidebarOpen ? 'w-96' : 'w-0'}`}>
        {isSidebarOpen && (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="p-6 border-b-2 border-slate-800">
              <div className="flex justify-between items-center mb-4">
                <h1 className="font-medieval text-2xl text-amber-500 flex items-center gap-3 truncate">
                  <Sword size={24} className="text-amber-600" />
                  {role === 'dm' ? 'DM Hub' : playerName}
                </h1>
                <button onClick={() => setRole(null)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"><LogOut size={18} /></button>
              </div>
              <div className="p-2 bg-slate-950 border border-slate-700 rounded-lg text-center">
                 <span className="text-[10px] font-black text-slate-500 uppercase">Session Code</span>
                 <p className="text-white font-black tracking-[0.3em]">{sessionCode}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {role === 'dm' && (
                <>
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Combat Flow</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setEncounterStatus('victory')} className="p-3 bg-amber-600 rounded-xl text-white text-xs font-black">VICTORY</button>
                      <button onClick={() => setEncounterStatus('defeat')} className="p-3 bg-red-700 rounded-xl text-white text-xs font-black">DEFEAT</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => handleRest('short')} className="p-2 bg-slate-800 rounded-lg text-slate-300 text-[10px] font-black">SHORT REST</button>
                      <button onClick={() => handleRest('long')} className="p-2 bg-slate-800 rounded-lg text-slate-300 text-[10px] font-black">LONG REST</button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Summoning</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => addEntity('player')} className="p-3 bg-green-600/20 border border-green-600/50 rounded-xl text-green-400 text-xs font-black">PLAYER SLOT</button>
                      <button onClick={() => addEntity('enemy')} className="p-3 bg-red-600/20 border border-red-600/50 rounded-xl text-red-400 text-xs font-black">ENEMY</button>
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-4 pb-12">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Initiative Order</h3>
                {entities.sort((a,b) => b.initiative - a.initiative).map(entity => (
                  <EntityCard 
                    key={entity.id} entity={entity} isSelected={selectedEntityId === entity.id}
                    onSelect={setSelectedEntityId} onUpdateHp={updateEntityHp}
                    onDelete={(id) => role === 'dm' && setEntities(prev => prev.filter(e => e.id !== id))}
                    onEdit={setEditingEntity} canEdit={role === 'dm' || entity.claimedBy === playerName}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Grid Area */}
      <main className="flex-1 flex flex-col relative" ref={containerRef}>
        <header className="p-4 px-8 border-b-2 border-slate-800 bg-slate-900 flex justify-between items-center z-20 shadow-xl">
           <div className="flex items-center gap-4">
             <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"
              >
                {isSidebarOpen ? <ChevronLeft size={20}/> : <ChevronRight size={20}/>}
              </button>
             {role === 'dm' && (
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-1.5 rounded-lg">
                  <span className="text-[10px] font-black text-slate-500 px-1">GRID:</span>
                  <input 
                    type="number" value={gridSettings.cols}
                    onChange={(e) => setGridSettings(prev => ({...prev, cols: Math.max(5, Math.min(40, Number(e.target.value)))}))}
                    className="w-10 bg-slate-800 rounded text-center text-white text-xs font-bold"
                  />
                  <span className="text-slate-600">x</span>
                  <input 
                    type="number" value={gridSettings.rows}
                    onChange={(e) => setGridSettings(prev => ({...prev, rows: Math.max(5, Math.min(40, Number(e.target.value)))}))}
                    className="w-10 bg-slate-800 rounded text-center text-white text-xs font-bold"
                  />
                </div>
             )}
             <div className="flex items-center gap-2 px-3 border-l border-slate-800 ml-2">
                <ZoomOut size={16} className="text-slate-500 cursor-pointer hover:text-white" onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} />
                <input type="range" min="0.2" max="1.5" step="0.05" value={zoom} onChange={e => setZoom(Number(e.target.value))} className="w-24 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" />
                <ZoomIn size={16} className="text-slate-500 cursor-pointer hover:text-white" onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} />
                <button onClick={fitToScreen} className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 hover:text-white" title="Fit to Screen"><Maximize size={14} /></button>
             </div>
           </div>
           <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-widest">
             <RefreshCw size={14} className="animate-spin" /> {lastSync.toLocaleTimeString()}
           </div>
        </header>

        <div className="flex-1 overflow-auto bg-slate-950 relative flex items-center justify-center custom-scrollbar">
           <div 
             className="transition-transform duration-200 ease-out"
             style={{ 
                transform: `scale(${zoom})`,
                transformOrigin: 'center center'
             }}
           >
             <GridMap 
               entities={entities} 
               settings={gridSettings} 
               selectedEntityId={selectedEntityId} 
               onCellClick={handleCellClick}
             />
           </div>
        </div>
      </main>

      {/* Edit Modal */}
      {editingEntity && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-4">
          <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl w-full max-w-md overflow-hidden">
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
                      <label className="text-[10px] font-black text-slate-500 uppercase">HP</label>
                      <input type="number" value={editingEntity.hp} onChange={e => setEditingEntity({...editingEntity, hp: Number(e.target.value)})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white" />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Max HP</label>
                      <input type="number" value={editingEntity.maxHp} onChange={e => setEditingEntity({...editingEntity, maxHp: Number(e.target.value)})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white" />
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Armor Class (AC)</label>
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
