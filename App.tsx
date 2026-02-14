
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Entity, EntityType, GridSettings, EncounterStatus, SessionData, Room } from './types';
import { INITIAL_GRID_SETTINGS, ENTITY_DEFAULTS, COLORS } from './constants';
import GridMap from './components/GridMap';
import EntityCard from './components/EntityCard';
import RoleSelection from './components/RoleSelection';
import { 
  ChevronRight, 
  ChevronLeft,
  Sword,
  // Added Shield to fix the "Cannot find name 'Shield'" error on line 372
  Shield,
  LogOut,
  Maximize,
  ZoomIn,
  ZoomOut,
  Settings2,
  Map as MapIcon,
  Upload,
  Compass,
  AlertTriangle,
  Wifi,
  WifiOff,
  Loader2,
  Hammer
} from 'lucide-react';

const App: React.FC = () => {
  const [role, setRole] = useState<'dm' | 'member' | 'workshop' | null>(null);
  const [playerName, setPlayerName] = useState<string>('');
  const [sessionCode, setSessionCode] = useState<string>('');
  const [encounterStatus, setEncounterStatus] = useState<EncounterStatus>('active');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFieldEditorOpen, setIsFieldEditorOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [placementMode, setPlacementMode] = useState<string | null>(null);
  const [showEnemyHpToPlayers, setShowEnemyHpToPlayers] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [sessionExists, setSessionExists] = useState<boolean | null>(null); 
  
  const [rooms, setRooms] = useState<Record<string, Room>>({});
  const [activeRoomId, setActiveRoomId] = useState<string>('');
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [tempRoomName, setTempRoomName] = useState('');
  
  const [pendingClaimId, setPendingClaimId] = useState<string | null>(null);
  const [claimMaxHp, setClaimMaxHp] = useState<number>(20);
  const [claimAc, setClaimAc] = useState<number>(10);

  const containerRef = useRef<HTMLDivElement>(null);
  // FIX: Initialize with empty string so any cloud data is seen as "newer" on the first fetch
  const lastUpdateRef = useRef<string>('');

  const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();
  const generateId = () => Math.random().toString(36).substr(2, 9);

  const currentRoom = rooms[activeRoomId];
  const entities = currentRoom?.entities || [];
  const gridSettings = currentRoom?.gridSettings || INITIAL_GRID_SETTINGS;

  useEffect(() => {
    const saved = sessionStorage.getItem('dnd_active_session');
    if (saved) {
      const data = JSON.parse(saved);
      setRole(data.role);
      setPlayerName(data.playerName);
      setSessionCode(data.sessionCode);
    }
  }, []);

  useEffect(() => {
    if (role && sessionCode) {
      sessionStorage.setItem('dnd_active_session', JSON.stringify({
        role, playerName, sessionCode
      }));
    } else if (role === null) {
      sessionStorage.removeItem('dnd_active_session');
    }
  }, [role, playerName, sessionCode]);

  const syncToCloud = useCallback((data: Partial<SessionData>) => {
    if (!sessionCode || role === 'workshop') return;
    const storageKey = `dnd_session_${sessionCode}`;
    const timestamp = new Date().toISOString();
    
    const existingRaw = localStorage.getItem(storageKey);
    const existing: SessionData = existingRaw ? JSON.parse(existingRaw) : {
      rooms: {},
      activeRoomId: '',
      status: 'active',
      updatedAt: timestamp,
      showEnemyHpToPlayers: true
    };
    
    const updated: SessionData = { 
      ...existing, 
      ...data, 
      updatedAt: timestamp 
    };
    
    lastUpdateRef.current = timestamp;
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setSessionExists(true);
  }, [sessionCode, role]);

  const fetchFromCloud = useCallback(() => {
    if (!sessionCode || role === 'workshop' || isTransitioning) return;
    const storageKey = `dnd_session_${sessionCode}`;
    const rawData = localStorage.getItem(storageKey);
    
    if (rawData) {
      const data: SessionData = JSON.parse(rawData);
      setSessionExists(true);
      
      // If lastUpdateRef is empty (first fetch) or data is newer, apply it
      if (!lastUpdateRef.current || data.updatedAt > lastUpdateRef.current) {
        lastUpdateRef.current = data.updatedAt;
        setRooms(data.rooms || {});
        setActiveRoomId(data.activeRoomId);
        setEncounterStatus(data.status);
        setShowEnemyHpToPlayers(data.showEnemyHpToPlayers ?? true);
      }
    } else {
      // Small optimization: If we're a DM, we don't care if it's not there, we'll create it.
      // If we're a member, we only set false after a moment.
      if (role === 'member') {
        setSessionExists(false);
      }
    }
  }, [sessionCode, role, isTransitioning]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `dnd_session_${sessionCode}`) {
        fetchFromCloud();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [sessionCode, fetchFromCloud]);

  useEffect(() => {
    if (sessionCode && role !== 'workshop') {
      fetchFromCloud();
      const interval = setInterval(fetchFromCloud, 2000); 
      return () => clearInterval(interval);
    }
  }, [sessionCode, role, fetchFromCloud]);

  useEffect(() => {
    const isDM = role === 'dm';
    const isMemberWithData = role === 'member' && Object.keys(rooms).length > 0;
    
    if ((isDM || isMemberWithData) && sessionCode && !isTransitioning) {
      syncToCloud({ 
        rooms, 
        activeRoomId, 
        status: encounterStatus, 
        showEnemyHpToPlayers 
      });
    }
  }, [rooms, activeRoomId, encounterStatus, role, sessionCode, syncToCloud, showEnemyHpToPlayers, isTransitioning]);

  const fitToScreen = useCallback(() => {
    if (!containerRef.current || !currentRoom) return;
    const padding = 80;
    const gridWidth = gridSettings.cols * gridSettings.cellSize;
    const gridHeight = gridSettings.rows * gridSettings.cellSize;
    const scaleX = (containerRef.current.clientWidth - padding) / gridWidth;
    const scaleY = (containerRef.current.clientHeight - padding) / gridHeight;
    setZoom(Math.min(Math.max(0.2, Math.min(scaleX, scaleY)), 1.5));
  }, [gridSettings, currentRoom]);

  const createRoom = (name: string, data?: Room) => {
    const id = data?.id || generateId();
    const newRoom: Room = data || {
      id,
      name,
      entities: [],
      gridSettings: { ...INITIAL_GRID_SETTINGS }
    };
    setRooms(prev => ({ ...prev, [id]: newRoom }));
    setActiveRoomId(id);
    return id;
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const imported = JSON.parse(evt.target?.result as string);
        if (imported.rooms) {
          setRooms(imported.rooms);
          if (imported.activeRoomId) setActiveRoomId(imported.activeRoomId);
          if (imported.status) setEncounterStatus(imported.status);
          if (imported.showEnemyHpToPlayers !== undefined) setShowEnemyHpToPlayers(imported.showEnemyHpToPlayers);
          setNotification("Adventure Bundle Loaded!");
        } else if (imported.entities) {
          const newId = generateId();
          createRoom(`${imported.name || 'Imported Room'}`, { ...imported, id: newId });
          setNotification("Room Imported!");
        }
      } catch (err) {
        setNotification("Error importing map file.");
      }
      setTimeout(() => setNotification(null), 3000);
    };
    reader.readAsText(file);
  };

  const handleUpdateHp = useCallback((id: string, newHp: number) => {
    const nextEntities = entities.map(e => {
      if (e.id === id) {
        const cappedHp = newHp > e.hp ? Math.min(newHp, e.maxHp) : newHp;
        return { ...e, hp: cappedHp };
      }
      return e;
    });
    updateCurrentRoom({ entities: nextEntities });
  }, [entities, activeRoomId]);

  const updateCurrentRoom = (updates: Partial<Room>) => {
    if (!activeRoomId) return;
    setRooms(prev => ({
      ...prev,
      [activeRoomId]: { ...prev[activeRoomId], ...updates }
    }));
  };

  const handleUpdateEntity = (updated: Entity) => {
    updateCurrentRoom({ entities: entities.map(e => e.id === updated.id ? updated : e) });
  };

  const handleDeleteEntity = (id: string) => {
    updateCurrentRoom({ entities: entities.filter(e => e.id !== id) });
    if (selectedEntityId === id) setSelectedEntityId(null);
  };

  const handleCellClick = useCallback((x: number, y: number) => {
    if (!currentRoom || isTransitioning) return;
    const found = entities.find(e => e.x === x && e.y === y);
    if (role === 'dm' || role === 'workshop') {
      if (selectedEntityId) {
        const selected = entities.find(e => e.id === selectedEntityId);
        handleUpdateEntity({ ...selected!, x, y });
        setSelectedEntityId(null);
      } else if (found) {
        setSelectedEntityId(found.id);
      }
    } else {
      const myHero = entities.find(e => e.claimedBy === playerName);
      if (found && found.type === 'player' && !found.claimedBy && !myHero) {
        setPendingClaimId(found.id);
        return;
      }
      if (selectedEntityId && myHero && selectedEntityId === myHero.id) {
        const isTraversable = !found || found.type === 'key' || (found.type === 'obstacle' && found.isOpen);
        if (isTraversable) {
          updateCurrentRoom({ entities: entities.map(e => e.id === selectedEntityId ? { ...e, x, y } : e) });
          setSelectedEntityId(null);
        }
      } else if (found && (found.claimedBy === playerName || found.type === 'enemy')) {
        setSelectedEntityId(found.id);
      }
    }
  }, [selectedEntityId, entities, role, playerName, activeRoomId, rooms, currentRoom, isTransitioning]);

  const confirmLogout = () => {
    setRole(null);
    setSessionCode('');
    setRooms({});
    setActiveRoomId('');
    setSessionExists(null);
    lastUpdateRef.current = '';
    sessionStorage.removeItem('dnd_active_session');
    setShowLogoutConfirm(false);
  };

  if (!role) return (
    <RoleSelection 
      onSelectDM={() => { 
        const code = generateCode();
        setSessionCode(code);
        setRole('dm');
        setPlayerName('The Dungeon Master');
        setRooms({});
        setActiveRoomId('');
        // Eagerly initialize session in storage
        const storageKey = `dnd_session_${code}`;
        const timestamp = new Date().toISOString();
        localStorage.setItem(storageKey, JSON.stringify({
          rooms: {}, activeRoomId: '', status: 'active', updatedAt: timestamp, showEnemyHpToPlayers: true
        }));
        lastUpdateRef.current = timestamp;
      }} 
      onJoin={(c, n) => { 
        const upperCode = c.toUpperCase();
        setSessionCode(upperCode); 
        setPlayerName(n); 
        setRole('member'); 
        setSessionExists(null);
        lastUpdateRef.current = '';
      }} 
      onSelectWorkshop={() => {
        setRole('workshop'); setSessionCode('WORKSHOP'); setPlayerName('Architect');
        const id = generateId(); setRooms({ [id]: { id, name: 'New Blueprint', entities: [], gridSettings: { ...INITIAL_GRID_SETTINGS } } }); setActiveRoomId(id);
      }}
    />
  );

  const filteredEntities = entities.filter(e => e.type !== 'obstacle' || (e.subtype === 'chest' || e.subtype === 'door'));

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden relative text-white">
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[700] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-slate-900 border-2 border-red-500 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center border-2 border-red-500/30">
                <AlertTriangle size={32} className="text-red-500 animate-pulse" />
              </div>
              <h2 className="font-medieval text-3xl text-white">Abandon Session?</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                {role === 'dm' ? "As the DM, leaving will leave the party in darkness." : "Are you sure you want to leave the party?"}
              </p>
              <div className="w-full flex flex-col gap-3">
                <button onClick={confirmLogout} className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl uppercase tracking-widest shadow-lg">LEAVE SESSION</button>
                <button onClick={() => setShowLogoutConfirm(false)} className="w-full py-3 text-slate-500 hover:text-white font-bold text-xs uppercase tracking-[0.2em]">STAY</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {pendingClaimId && (
        <div className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-green-500 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl">
            <div className="flex flex-col items-center text-center space-y-6">
              <Sword size={40} className="text-green-500" />
              <h2 className="font-medieval text-3xl text-white">Initialize Hero</h2>
              <div className="w-full space-y-4 text-left">
                 <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Max HP</label>
                    <input type="number" value={claimMaxHp} onChange={e => setClaimMaxHp(parseInt(e.target.value) || 1)} className="w-full bg-slate-800 p-4 rounded-xl text-white font-bold border border-slate-700 focus:border-green-500 outline-none"/>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Armor Class</label>
                    <input type="number" value={claimAc} onChange={e => setClaimAc(parseInt(e.target.value) || 1)} className="w-full bg-slate-800 p-4 rounded-xl text-white font-bold border border-slate-700 focus:border-green-500 outline-none"/>
                 </div>
              </div>
              <button onClick={() => {
                const updated = entities.map(e => e.id === pendingClaimId ? { ...e, claimedBy: playerName, name: playerName, maxHp: claimMaxHp, hp: claimMaxHp, ac: claimAc } : e);
                updateCurrentRoom({ entities: updated });
                setPendingClaimId(null);
                setNotification(`${playerName} joined!`);
                setTimeout(() => setNotification(null), 3000);
              }} className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-black rounded-2xl uppercase tracking-widest">ENTER REALM</button>
            </div>
          </div>
        </div>
      )}

      <aside className={`bg-slate-900 border-r-2 border-slate-800 transition-all duration-300 flex flex-col z-30 shadow-2xl ${isSidebarOpen ? 'w-96' : 'w-0'}`}>
        {isSidebarOpen && (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="p-6 border-b-2 border-slate-800 flex justify-between items-center bg-slate-900/50">
                <h1 className="font-medieval text-xl text-amber-500 flex items-center gap-3 truncate">
                  {role === 'dm' ? <Shield size={24}/> : <Sword size={24} />} 
                  {role === 'dm' ? 'Dungeon Master' : 'The Hero'}
                </h1>
                <div className="flex items-center gap-2">
                   {role !== 'workshop' && (
                     <div title={sessionExists ? "Synced" : "Connecting..."}>
                       {sessionExists ? <Wifi size={16} className="text-green-500" /> : <WifiOff size={16} className="text-slate-600 animate-pulse" />}
                     </div>
                   )}
                   <button onClick={() => setShowLogoutConfirm(true)} className="text-slate-500 hover:text-red-500 transition-colors ml-2"><LogOut size={18} /></button>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{currentRoom ? `Entities in ${currentRoom.name}` : 'No Active Room'}</h3>
              {filteredEntities.map(entity => (
                <EntityCard 
                  key={entity.id} 
                  entity={entity} 
                  entities={entities} 
                  isSelected={selectedEntityId === entity.id} 
                  onSelect={setSelectedEntityId} 
                  onUpdateHp={handleUpdateHp} 
                  onUpdateEntity={handleUpdateEntity} 
                  onDelete={handleDeleteEntity} 
                  onEdit={() => {}} 
                  canEdit={role === 'dm' || entity.claimedBy === playerName} 
                  role={role === 'dm' ? 'dm' : 'member'} 
                  showEnemyHpToPlayers={showEnemyHpToPlayers}
                  playerName={playerName}
                />
              ))}
            </div>
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col relative" ref={containerRef}>
        <header className="p-4 border-b border-slate-800 bg-slate-900 flex justify-between items-center z-20 shadow-md">
           <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-400 hover:text-amber-500 transition-colors"><ChevronLeft size={20}/></button>
           <div className="flex flex-col items-center bg-black/40 px-6 py-2 rounded-2xl border border-slate-700/50 shadow-inner">
             <span className="text-[10px] text-amber-500 font-black uppercase tracking-[0.2em]">Session Code</span>
             <span className="text-xl font-medieval text-white tracking-[0.2em]">{sessionCode}</span>
           </div>
           <div className="flex gap-4 items-center">
             <div className="flex gap-2 bg-slate-800/50 p-1 rounded-xl border border-slate-700">
               <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} className="p-2 text-slate-400 hover:text-white" title="Zoom Out"><ZoomOut size={16} /></button>
               <button onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} className="p-2 text-slate-400 hover:text-white" title="Zoom In"><ZoomIn size={16} /></button>
               <button onClick={fitToScreen} className="p-2 text-slate-400 hover:text-white" title="Fit"><Maximize size={16} /></button>
             </div>
           </div>
        </header>

        <div className="flex-1 overflow-auto bg-slate-950 relative flex items-center justify-center custom-scrollbar">
           {currentRoom ? (
             <div style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }} className="transition-transform duration-300">
               <GridMap 
                  entities={entities} 
                  settings={gridSettings} 
                  selectedEntityId={selectedEntityId} 
                  onCellClick={handleCellClick} 
                  role={role === 'dm' ? 'dm' : 'member'} 
                  showEnemyHpToPlayers={showEnemyHpToPlayers} 
                  isEditorOpen={isFieldEditorOpen} 
                  localPlayerName={playerName}
               />
             </div>
           ) : (
             <div className="flex flex-col items-center justify-center text-center p-12 max-w-lg space-y-6 animate-in fade-in zoom-in-95 duration-700">
               <div className="w-32 h-32 bg-slate-900 rounded-full border-4 border-slate-800 flex items-center justify-center mb-4">
                 {sessionExists === null ? <Loader2 size={64} className="text-amber-500 animate-spin" /> : <MapIcon size={64} className="text-slate-700 opacity-50" />}
               </div>
               <h2 className="font-medieval text-4xl text-slate-400">
                 {sessionExists === null ? "Connecting to Realm..." : (sessionExists === false ? "Realm Not Found" : "The Realm is Empty")}
               </h2>
               <p className="text-slate-500 leading-relaxed font-bold uppercase text-xs tracking-widest">
                 {role === 'dm' 
                    ? "As the Master of Fate, you must import an adventure bundle to begin." 
                    : (sessionExists === null ? "Searching the scrolls for your session..." : (sessionExists === false ? "The code provided has not been etched in history. Try again." : "Waiting for the DM to manifest the map..."))}
               </p>
               {role === 'dm' && (
                 <label className="group relative py-5 px-10 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-[2rem] uppercase tracking-[0.2em] cursor-pointer shadow-xl transition-all border-b-4 border-amber-800 active:border-b-0 active:translate-y-1">
                   <div className="flex items-center gap-4">
                     <Upload size={24} /> LOAD ADVENTURE
                   </div>
                   <input type="file" className="hidden" accept=".json" onChange={importData}/>
                 </label>
               )}
               {sessionExists === false && role === 'member' && (
                  <button onClick={() => setRole(null)} className="py-4 px-8 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest">Return to Menu</button>
               )}
             </div>
           )}
        </div>
      </main>
    </div>
  );
};

export default App;
