
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Entity, EntityType, GridSettings, EncounterStatus, SessionData, Room } from './types';
import { INITIAL_GRID_SETTINGS, ENTITY_DEFAULTS, COLORS } from './constants';
import GridMap from './components/GridMap';
import EntityCard from './components/EntityCard';
import RoleSelection from './components/RoleSelection';
import { TutorialOverlay } from './components/TutorialOverlay';
import { generateMonster } from './services/geminiService';
import { 
  ChevronRight, 
  ChevronLeft,
  Sword,
  Shield,
  LogOut,
  Maximize,
  ZoomIn,
  ZoomOut,
  Settings2,
  Map as MapIcon,
  AlertTriangle,
  Wifi,
  WifiOff,
  Loader2,
  Hammer,
  Plus,
  Trash2,
  Box,
  Copy,
  CheckCircle2,
  Sparkles,
  Search,
  Link as LinkIcon,
  Share2
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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [sessionExists, setSessionExists] = useState<boolean | null>(null); 
  const [monsterPrompt, setMonsterPrompt] = useState('');
  const [isGeneratingMonster, setIsGeneratingMonster] = useState(false);
  const [tutorialStep, setTutorialStep] = useState<number>(-1);
  
  const [rooms, setRooms] = useState<Record<string, Room>>({});
  const [activeRoomId, setActiveRoomId] = useState<string>('');
  
  const [pendingClaimId, setPendingClaimId] = useState<string | null>(null);
  const [claimMaxHp, setClaimMaxHp] = useState<number>(20);
  const [claimAc, setClaimAc] = useState<number>(10);

  const containerRef = useRef<HTMLDivElement>(null);
  const lastUpdateRef = useRef<string>('');

  const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Extremely defensive currentRoom calculation
  const currentRoom = (activeRoomId && rooms && rooms[activeRoomId]) ? rooms[activeRoomId] : null;
  const entities = currentRoom?.entities || [];
  const gridSettings = currentRoom?.gridSettings || INITIAL_GRID_SETTINGS;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSession = params.get('session');
    const urlData = params.get('data');

    if (urlSession && !sessionCode) {
      setSessionCode(urlSession.toUpperCase());
      
      if (urlData) {
        try {
          const safeBase64 = urlData.replace(/-/g, '+').replace(/_/g, '/');
          const decodedData = JSON.parse(atob(safeBase64));
          if (decodedData.rooms) {
            setRooms(decodedData.rooms);
            setActiveRoomId(decodedData.activeRoomId);
            setEncounterStatus(decodedData.status || 'active');
            setSessionExists(true);
          }
        } catch (e) {
          console.error("Portal Data Corruption", e);
        }
      }
    }
  }, [sessionCode]);

  useEffect(() => {
    if (sessionCode && role) {
      const url = new URL(window.location.href);
      url.searchParams.set('session', sessionCode);
      window.history.replaceState({}, '', url.toString());
      sessionStorage.setItem('dnd_active_session', JSON.stringify({ role, playerName, sessionCode }));
    }
  }, [sessionCode, role, playerName]);

  const syncToCloud = useCallback((data: Partial<SessionData>) => {
    if (!sessionCode || role === 'workshop') return;
    const storageKey = `dnd_session_${sessionCode}`;
    const timestamp = new Date().toISOString();
    
    try {
      const existingRaw = localStorage.getItem(storageKey);
      const existing = existingRaw ? JSON.parse(existingRaw) : {
        rooms: {}, activeRoomId: '', status: 'active', updatedAt: timestamp, showEnemyHpToPlayers: true
      };
      const updated: SessionData = { ...existing, ...data, updatedAt: timestamp };
      lastUpdateRef.current = timestamp;
      localStorage.setItem(storageKey, JSON.stringify(updated));
      setSessionExists(true);
    } catch (e) {
      console.error("Sync Error", e);
    }
  }, [sessionCode, role]);

  const fetchFromCloud = useCallback(() => {
    if (!sessionCode || role === 'workshop') return;
    const storageKey = `dnd_session_${sessionCode}`;
    const rawData = localStorage.getItem(storageKey);
    
    if (rawData) {
      try {
        const data: SessionData = JSON.parse(rawData);
        setSessionExists(true);
        if (!lastUpdateRef.current || data.updatedAt > lastUpdateRef.current) {
          lastUpdateRef.current = data.updatedAt;
          setRooms(data.rooms || {});
          setActiveRoomId(data.activeRoomId);
          setEncounterStatus(data.status);
          setShowEnemyHpToPlayers(data.showEnemyHpToPlayers ?? true);
        }
      } catch (e) {
        console.error("Fetch failure", e);
      }
    } else if (role === 'member' && !activeRoomId) {
      setSessionExists(false);
    }
  }, [sessionCode, role, activeRoomId]);

  useEffect(() => {
    if (sessionCode && role !== 'workshop') {
      fetchFromCloud();
      const interval = setInterval(fetchFromCloud, 2500); 
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === `dnd_session_${sessionCode}`) fetchFromCloud();
      };
      window.addEventListener('storage', handleStorageChange);
      return () => {
        clearInterval(interval);
        window.removeEventListener('storage', handleStorageChange);
      };
    }
  }, [sessionCode, role, fetchFromCloud]);

  useEffect(() => {
    const isDM = role === 'dm';
    if (isDM && sessionCode && Object.keys(rooms || {}).length > 0) {
      syncToCloud({ rooms, activeRoomId, status: encounterStatus, showEnemyHpToPlayers });
    }
  }, [rooms, activeRoomId, encounterStatus, role, sessionCode, syncToCloud, showEnemyHpToPlayers]);

  const handleUpdateHp = useCallback((id: string, hp: number) => {
    setRooms(prev => {
      if (!activeRoomId || !prev || !prev[activeRoomId]) return prev;
      const room = prev[activeRoomId];
      return {
        ...prev,
        [activeRoomId]: {
          ...room,
          entities: room.entities.map(e => e.id === id ? { ...e, hp: Math.max(0, Math.min(e.maxHp, hp)) } : e)
        }
      };
    });
  }, [activeRoomId]);

  const handleUpdateEntity = useCallback((updated: Entity) => {
    setRooms(prev => {
      if (!activeRoomId || !prev || !prev[activeRoomId]) return prev;
      const room = prev[activeRoomId];
      return {
        ...prev,
        [activeRoomId]: {
          ...room,
          entities: room.entities.map(e => e.id === updated.id ? updated : e)
        }
      };
    });
  }, [activeRoomId]);

  const handleDeleteEntity = useCallback((id: string) => {
    setRooms(prev => {
      if (!activeRoomId || !prev || !prev[activeRoomId]) return prev;
      const room = prev[activeRoomId];
      return {
        ...prev,
        [activeRoomId]: {
          ...room,
          entities: room.entities.filter(e => e.id !== id)
        }
      };
    });
    if (selectedEntityId === id) setSelectedEntityId(null);
  }, [activeRoomId, selectedEntityId]);

  const generateMagicLink = () => {
    try {
      const data = { rooms, activeRoomId, status: encounterStatus };
      const encoded = btoa(JSON.stringify(data));
      const url = new URL(window.location.href);
      url.searchParams.set('session', sessionCode);
      url.searchParams.set('data', encoded);
      navigator.clipboard.writeText(url.toString());
      setNotification("Magic Portal Link Copied!");
      setTimeout(() => setNotification(null), 3000);
    } catch (e) {
      setNotification("Linking Failed.");
    }
  };

  const createRoom = (name: string, data?: Room) => {
    const id = data?.id || generateId();
    const newRoom: Room = data || {
      id, name, entities: [], gridSettings: { ...INITIAL_GRID_SETTINGS }
    };
    setRooms(prev => ({ ...prev, [id]: newRoom }));
    setActiveRoomId(id);
    return id;
  };

  const handleMonsterGeneration = async () => {
    if (!monsterPrompt || isGeneratingMonster || !currentRoom) return;
    setIsGeneratingMonster(true);
    try {
      const stats = await generateMonster(monsterPrompt);
      if (stats) {
        const center = { x: Math.floor(gridSettings.cols / 2), y: Math.floor(gridSettings.rows / 2) };
        const newEntity: Entity = {
          id: generateId(),
          name: stats.name || "Manifestation",
          type: 'enemy',
          hp: stats.hp || 10,
          maxHp: stats.hp || 10,
          ac: stats.ac || 10,
          initiative: 10,
          notes: stats.notes,
          x: center.x,
          y: center.y,
          color: COLORS.enemy,
          isVisibleToPlayers: true
        };
        
        setRooms(prev => {
          if (!activeRoomId || !prev || !prev[activeRoomId]) return prev;
          const room = prev[activeRoomId];
          return { ...prev, [activeRoomId]: { ...room, entities: [...room.entities, newEntity] } };
        });
        setSelectedEntityId(newEntity.id);
        setMonsterPrompt('');
        setNotification(`${newEntity.name} Summoned!`);
      }
    } catch (e) {
      setNotification("Void Summoning Failed.");
    } finally {
      setIsGeneratingMonster(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const addEntity = (type: EntityType) => {
    if (!currentRoom) return;
    const center = { x: Math.floor(gridSettings.cols / 2), y: Math.floor(gridSettings.rows / 2) };
    const newEntity: Entity = {
      id: generateId(),
      name: type === 'player' ? 'Hero Slot' : `New ${type}`,
      type, hp: ENTITY_DEFAULTS.maxHp, maxHp: ENTITY_DEFAULTS.maxHp,
      ac: ENTITY_DEFAULTS.ac, initiative: ENTITY_DEFAULTS.initiative,
      x: center.x, y: center.y, color: COLORS[type], isVisibleToPlayers: true
    };
    setRooms(prev => {
      if (!activeRoomId || !prev || !prev[activeRoomId]) return prev;
      const room = prev[activeRoomId];
      return { ...prev, [activeRoomId]: { ...room, entities: [...room.entities, newEntity] } };
    });
    setSelectedEntityId(newEntity.id);
  };

  const handleCellClick = useCallback((x: number, y: number) => {
    if (!currentRoom) return;
    const found = entities.find(e => e.x === x && e.y === y);
    
    if (role === 'dm' || role === 'workshop') {
      if (isFieldEditorOpen && placementMode) {
        if (placementMode === 'eraser' && found) {
          handleDeleteEntity(found.id);
          return;
        }
        if (!['player', 'enemy'].includes(placementMode) && placementMode !== 'eraser') {
           const newEntity: Entity = {
            id: generateId(),
            name: placementMode.toUpperCase(),
            type: 'obstacle', subtype: placementMode as any,
            hp: 1, maxHp: 1, ac: 0, initiative: 0, x, y,
            color: COLORS[placementMode as keyof typeof COLORS] || '#475569',
            isVisibleToPlayers: true
          };
          setRooms(prev => {
            if (!activeRoomId || !prev || !prev[activeRoomId]) return prev;
            const room = prev[activeRoomId];
            return { ...prev, [activeRoomId]: { ...room, entities: [...room.entities, newEntity] } };
          });
          return;
        }
      }
      
      if (selectedEntityId) {
        const selected = entities.find(e => e.id === selectedEntityId);
        if (selected) {
           handleUpdateEntity({ ...selected, x, y });
           setSelectedEntityId(null);
        }
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
        handleUpdateEntity({ ...myHero, x, y });
        setSelectedEntityId(null);
      } else if (found) {
        setSelectedEntityId(found.id);
      }
    }
  }, [selectedEntityId, entities, role, playerName, activeRoomId, currentRoom, isFieldEditorOpen, placementMode, handleUpdateEntity, handleDeleteEntity]);

  const logout = () => {
    setRole(null);
    setSessionCode('');
    setRooms({});
    setActiveRoomId('');
    sessionStorage.removeItem('dnd_active_session');
    const url = new URL(window.location.href);
    url.searchParams.delete('session');
    url.searchParams.delete('data');
    window.history.replaceState({}, '', url.toString());
    setShowLogoutConfirm(false);
  };

  const startHosting = () => {
    const code = generateCode();
    const firstId = generateId();
    const initialRooms = { [firstId]: { id: firstId, name: 'The Entrance', entities: [], gridSettings: { ...INITIAL_GRID_SETTINGS } } };
    
    // Crucial: Set all states needed for the main view before switching role
    setRooms(initialRooms);
    setActiveRoomId(firstId);
    setSessionCode(code);
    setPlayerName('The Dungeon Master');
    // Role switch must be last to ensure re-render has the context it needs
    setRole('dm');
  };

  const startWorkshop = () => {
    const firstId = generateId();
    const initialRooms = { [firstId]: { id: firstId, name: 'Main Blueprint', entities: [], gridSettings: { ...INITIAL_GRID_SETTINGS } } };
    
    setRooms(initialRooms);
    setActiveRoomId(firstId);
    setSessionCode('WORKSHOP');
    setPlayerName('Architect');
    setRole('workshop');
  };

  if (!role) return (
    <RoleSelection 
      onSelectDM={startHosting} 
      onJoin={(c, n) => { 
        setSessionCode(c.toUpperCase()); 
        setPlayerName(n); 
        setRole('member'); 
      }} 
      onSelectWorkshop={startWorkshop}
      initialSessionCode={sessionCode}
    />
  );

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden relative text-white">
      {notification && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[300] bg-amber-600 text-white px-8 py-3 rounded-full shadow-2xl font-black flex items-center gap-2 animate-bounce border border-amber-400">
           <CheckCircle2 size={18}/> {notification}
        </div>
      )}

      {tutorialStep >= 0 && (
        <TutorialOverlay role={role === 'dm' ? 'dm' : 'member'} currentStep={tutorialStep} onFinish={() => setTutorialStep(-1)} />
      )}

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[700] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-red-500 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl">
            <div className="flex flex-col items-center text-center space-y-6">
              <AlertTriangle size={32} className="text-red-500 animate-pulse" />
              <h2 className="font-medieval text-3xl text-white">Abandon Realm?</h2>
              <div className="w-full flex flex-col gap-3">
                <button onClick={logout} className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl uppercase tracking-widest transition-all">LEAVE SESSION</button>
                <button onClick={() => setShowLogoutConfirm(false)} className="w-full py-3 text-slate-500 font-bold uppercase hover:text-white">STAY</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <aside className={`bg-slate-900 border-r-2 border-slate-800 transition-all duration-300 flex flex-col z-30 shadow-2xl ${isSidebarOpen ? 'w-96' : 'w-0'}`}>
        {isSidebarOpen && (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="p-6 border-b-2 border-slate-800 flex justify-between items-center bg-slate-900/50">
                <h1 className="font-medieval text-xl text-amber-500 flex items-center gap-3">
                  {role === 'dm' ? <Shield size={24}/> : (role === 'workshop' ? <Hammer size={24}/> : <Sword size={24} />)} 
                  {playerName?.split(' ')[0] || 'Unknown'}
                </h1>
                <div className="flex items-center gap-2">
                   {role !== 'workshop' && (
                     <div title={sessionExists ? "Synced" : "Offline Mode"}>
                       {sessionExists ? <Wifi size={16} className="text-green-500" /> : <WifiOff size={16} className="text-red-500 animate-pulse" />}
                     </div>
                   )}
                   <button onClick={() => setShowLogoutConfirm(true)} className="text-slate-500 hover:text-red-500 ml-2 transition-colors"><LogOut size={18} /></button>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-4 pb-24 custom-scrollbar">
              {(role === 'dm' || role === 'workshop') && currentRoom && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button onClick={() => addEntity('player')} className="p-3 bg-green-900/20 border border-green-600/30 rounded-xl text-green-400 text-[10px] font-black hover:bg-green-900/30">Hero Slot</button>
                  <button onClick={() => addEntity('enemy')} className="p-3 bg-red-900/20 border border-red-600/30 rounded-xl text-red-400 text-[10px] font-black hover:bg-red-900/30">Monster Slot</button>
                </div>
              )}
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{currentRoom ? `Presence in ${currentRoom.name}` : 'Void'}</h3>
              <div className="space-y-3">
                {entities.filter(e => e.type !== 'obstacle').map(entity => (
                  <EntityCard 
                    key={entity.id} entity={entity} entities={entities} isSelected={selectedEntityId === entity.id} 
                    onSelect={setSelectedEntityId} onUpdateHp={handleUpdateHp} onUpdateEntity={handleUpdateEntity} 
                    onDelete={handleDeleteEntity} onEdit={() => {}} canEdit={role === 'dm' || role === 'workshop' || entity.claimedBy === playerName} 
                    role={role === 'dm' || role === 'workshop' ? 'dm' : 'member'} showEnemyHpToPlayers={showEnemyHpToPlayers} playerName={playerName}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col relative" ref={containerRef}>
        <header className="p-4 border-b border-slate-800 bg-slate-900 flex justify-between items-center z-20 shadow-md">
           <div className="flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-400 hover:text-amber-500 transition-colors"><ChevronLeft size={20}/></button>
              {role === 'dm' && (
                 <button onClick={generateMagicLink} className="flex items-center gap-2 bg-amber-600/20 hover:bg-amber-600/40 text-amber-500 border border-amber-600/30 px-4 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all shadow-lg active:scale-95">
                    <Share2 size={14}/> MAGIC PORTAL LINK
                 </button>
              )}
           </div>
           
           <div className="flex flex-col items-center bg-black/40 px-6 py-2 rounded-2xl border border-slate-700/50 shadow-inner">
             <span className="text-[10px] text-amber-500 font-black uppercase tracking-[0.2em]">{role === 'workshop' ? 'Blueprints' : 'Realm Key'}</span>
             <span className="text-xl font-medieval text-white tracking-[0.2em]">{sessionCode}</span>
           </div>
           
           <div className="flex gap-2">
             <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} className="p-2 text-slate-400 hover:text-white transition-colors"><ZoomOut size={16} /></button>
             <button onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} className="p-2 text-slate-400 hover:text-white transition-colors"><ZoomIn size={16} /></button>
           </div>
        </header>

        <div className="flex-1 overflow-auto bg-slate-950 relative flex items-center justify-center custom-scrollbar">
           {currentRoom ? (
             <div style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }} className="transition-transform duration-300">
               <GridMap 
                  entities={entities} settings={gridSettings} selectedEntityId={selectedEntityId} 
                  onCellClick={handleCellClick} role={role === 'dm' || role === 'workshop' ? 'dm' : 'member'} 
                  showEnemyHpToPlayers={showEnemyHpToPlayers} isEditorOpen={isFieldEditorOpen} localPlayerName={playerName}
               />
             </div>
           ) : (
             <div className="flex flex-col items-center justify-center text-center p-12 max-w-lg space-y-6">
               <div className="w-32 h-32 bg-slate-900 rounded-full border-4 border-slate-800 flex items-center justify-center mb-4 shadow-2xl">
                 <MapIcon size={64} className="text-slate-700 opacity-20" />
               </div>
               <h2 className="font-medieval text-4xl text-slate-400">Realm Null</h2>
               <p className="text-slate-500 leading-relaxed font-bold uppercase text-xs tracking-widest">
                 {role === 'dm' ? "Initializing the world..." : "Searching the void for your Master's manifest..."}
               </p>
             </div>
           )}
        </div>
      </main>
    </div>
  );
};

export default App;
