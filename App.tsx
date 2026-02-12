
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Entity, EntityType, GridSettings, EncounterStatus, SessionData } from './types';
import { INITIAL_GRID_SETTINGS, ENTITY_DEFAULTS, COLORS } from './constants';
import GridMap from './components/GridMap';
import EntityCard from './components/EntityCard';
import RoleSelection from './components/RoleSelection';
import { TutorialOverlay } from './components/TutorialOverlay';
import { 
  ChevronRight, 
  ChevronLeft,
  Sword,
  RefreshCw,
  LogOut,
  Maximize,
  ZoomIn,
  ZoomOut,
  Flame,
  BrickWall,
  Eraser,
  Eye,
  EyeOff,
  Settings2,
  Grid,
  DoorClosed,
  Package,
  LayoutGrid,
  Box,
  Key,
  Bell,
  Link,
  Lock,
  Unlock,
  Trash2,
  X,
  Loader2
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
  const [isFieldEditorOpen, setIsFieldEditorOpen] = useState(false);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [zoom, setZoom] = useState(1);
  const [placementMode, setPlacementMode] = useState<string | null>(null);
  const [showEnemyHpToPlayers, setShowEnemyHpToPlayers] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Tutorial State
  const [isTutorial, setIsTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  // Persist session to session storage so reloads don't lose the connection
  useEffect(() => {
    const saved = sessionStorage.getItem('dnd_active_session');
    if (saved) {
      const data = JSON.parse(saved);
      setRole(data.role);
      setPlayerName(data.playerName);
      setSessionCode(data.sessionCode);
      setIsTutorial(data.isTutorial || false);
    }
  }, []);

  useEffect(() => {
    if (role && sessionCode) {
      sessionStorage.setItem('dnd_active_session', JSON.stringify({
        role, playerName, sessionCode, isTutorial
      }));
    } else if (role === null) {
      sessionStorage.removeItem('dnd_active_session');
    }
  }, [role, playerName, sessionCode, isTutorial]);

  const syncToCloud = useCallback((data: Partial<SessionData>) => {
    if (!sessionCode || isTutorial) return;
    const storageKey = `dnd_session_${sessionCode}`;
    const existingRaw = localStorage.getItem(storageKey);
    const existing: SessionData = existingRaw ? JSON.parse(existingRaw) : {
      entities: [],
      gridSettings: INITIAL_GRID_SETTINGS,
      status: 'active',
      updatedAt: new Date().toISOString(),
      showEnemyHpToPlayers: true
    };

    const updated: SessionData = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setLastSync(new Date());
  }, [sessionCode, isTutorial]);

  const fetchFromCloud = useCallback(() => {
    if (!sessionCode || isTutorial) return;
    
    // Show visual "Reloading" indicator
    setIsRefreshing(true);
    
    const storageKey = `dnd_session_${sessionCode}`;
    const rawData = localStorage.getItem(storageKey);
    if (rawData) {
      const data: SessionData = JSON.parse(rawData);
      setEntities(data.entities);
      setGridSettings(data.gridSettings);
      setEncounterStatus(data.status);
      setShowEnemyHpToPlayers(data.showEnemyHpToPlayers ?? true);
      setLastSync(new Date(data.updatedAt));
    }

    // Hide indicator after a brief "processing" delay to feel like a reload
    setTimeout(() => setIsRefreshing(false), 800);
  }, [sessionCode, isTutorial]);

  const fitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const padding = 80;
    const gridWidth = gridSettings.cols * gridSettings.cellSize;
    const gridHeight = gridSettings.rows * gridSettings.cellSize;
    const scaleX = (containerRef.current.clientWidth - padding) / gridWidth;
    const scaleY = (containerRef.current.clientHeight - padding) / gridHeight;
    setZoom(Math.min(Math.max(0.2, Math.min(scaleX, scaleY)), 1.5));
  }, [gridSettings]);

  // The 15-second refresh interval requested by user
  useEffect(() => {
    if (sessionCode && !isTutorial) {
      fetchFromCloud();
      const interval = setInterval(fetchFromCloud, 15000);
      return () => clearInterval(interval);
    }
  }, [sessionCode, role, fetchFromCloud, isTutorial]);

  useEffect(() => {
    if (role === 'dm' && sessionCode && !isTutorial) {
      syncToCloud({ entities, gridSettings, status: encounterStatus, showEnemyHpToPlayers });
    }
  }, [entities, gridSettings, encounterStatus, role, sessionCode, syncToCloud, showEnemyHpToPlayers, isTutorial]);

  const findEmptySquare = useCallback((startX: number, startY: number) => {
    const isOccupied = (x: number, y: number) => entities.some(e => e.x === x && e.y === y);
    let x = startX, y = startY, dx = 0, dy = -1, step = 1, count = 0;
    for (let i = 0; i < 100; i++) {
      if (x >= 0 && x < gridSettings.cols && y >= 0 && y < gridSettings.rows) {
        if (!isOccupied(x, y)) return { x, y };
      }
      x += dx; y += dy; count++;
      if (count === step) {
        count = 0;
        const temp = dx; dx = -dy; dy = temp;
        if (dy === 0) step++;
      }
    }
    return { x: startX, y: startY };
  }, [entities, gridSettings]);

  // Handle Tutorial Progression
  useEffect(() => {
    if (!isTutorial) return;
    if (role === 'dm') {
      if (tutorialStep === 0 && isFieldEditorOpen) setTutorialStep(1);
      if (tutorialStep === 1 && placementMode === 'chest') setTutorialStep(2);
      if (tutorialStep === 2 && entities.some(e => e.subtype === 'chest')) setTutorialStep(3);
      if (tutorialStep === 3) {
          const chest = entities.find(e => e.subtype === 'chest');
          if (chest && selectedEntityId === chest.id) setTutorialStep(4);
      }
      if (tutorialStep === 4) {
          const chest = entities.find(e => e.subtype === 'chest');
          if (chest && chest.linkedEntityId) setTutorialStep(5);
      }
      if (tutorialStep === 5 && entities.some(e => e.type === 'key' && e.isVisibleToPlayers !== false)) setTutorialStep(6);
      if (tutorialStep === 6 && !isFieldEditorOpen) setTutorialStep(7);
      if (tutorialStep === 7 && entities.some(e => e.type === 'player')) setTutorialStep(8);
      if (tutorialStep === 8 && entities.some(e => e.type === 'enemy')) setTutorialStep(9);
    } else {
      const myChar = entities.find(e => e.claimedBy === playerName);
      if (tutorialStep === 0 && myChar) setTutorialStep(1);
      if (tutorialStep === 1 && myChar && (myChar.x === 6 && myChar.y === 7)) setTutorialStep(2);
      if (tutorialStep === 2 && selectedEntityId === 'tut-door-1') setTutorialStep(3);
      if (tutorialStep === 3 && myChar && (myChar.x === 7 && myChar.y === 6)) setTutorialStep(4);
      if (tutorialStep === 4 && entities.find(e => e.id === 'tut-door-1')?.isOpen) setTutorialStep(5);
    }
  }, [isTutorial, tutorialStep, role, isFieldEditorOpen, placementMode, entities, playerName, selectedEntityId]);

  const handleCellClick = useCallback((x: number, y: number) => {
    const found = entities.find(e => e.x === x && e.y === y);

    if (role === 'dm') {
      if (isFieldEditorOpen) {
        if (placementMode === 'eraser' && found) {
          setEntities(prev => prev.filter(e => e.id !== found.id));
          return;
        }
        if (placementMode && !['player', 'enemy'].includes(placementMode) && placementMode !== 'eraser') {
          if (found) {
             setSelectedEntityId(found.id);
             return;
          }
          const newTerrain: Entity = {
            id: Math.random().toString(36).substr(2, 9),
            name: placementMode.charAt(0).toUpperCase() + placementMode.slice(1),
            type: 'obstacle',
            subtype: placementMode as any,
            hp: 1, maxHp: 1, ac: 0, initiative: -999, x, y,
            color: COLORS[placementMode as keyof typeof COLORS] || '#475569',
            isOpen: false, contents: placementMode === 'chest' ? '' : undefined,
            isVisibleToPlayers: true,
            isLocked: placementMode === 'chest' || placementMode === 'door'
          };
          setEntities(prev => [...prev, newTerrain]);
          setSelectedEntityId(newTerrain.id);
          return;
        }
      }

      if (selectedEntityId) {
        const selected = entities.find(e => e.id === selectedEntityId);
        if (selected?.type === 'obstacle' && !isFieldEditorOpen) return;
        if (found && found.id !== selectedEntityId && (found.type !== 'obstacle' || isFieldEditorOpen)) {
            setSelectedEntityId(found.id);
            return;
        }
        setEntities(prev => prev.map(e => e.id === selectedEntityId ? { ...e, x, y } : e));
        setSelectedEntityId(null);
      } else if (found) {
        setSelectedEntityId(found.id);
      }
    } else {
      const myHero = entities.find(e => e.claimedBy === playerName);
      
      if (found && found.type === 'player' && !found.claimedBy) {
        const updated = entities.map(e => e.id === found.id ? { ...e, claimedBy: playerName, name: playerName } : e);
        setEntities(updated);
        setSelectedEntityId(found.id);
        return;
      }

      if (selectedEntityId && myHero && selectedEntityId === myHero.id) {
         const isTraversable = !found || found.type === 'key' || (found.type === 'obstacle' && found.isOpen);
         if (isTraversable) {
            let nextEntities = entities.map(e => e.id === selectedEntityId ? { ...e, x, y } : e);
            if (found && found.type === 'key') {
                setNotification(`You collected the ${found.name}!`);
                setTimeout(() => setNotification(null), 3000);
                nextEntities = nextEntities.filter(e => e.id !== found.id);
            }
            setEntities(nextEntities);
            setSelectedEntityId(null);
            return;
         }
      }

      if (found && (found.claimedBy === playerName || found.type === 'enemy' || found.subtype === 'chest' || found.subtype === 'door' || found.type === 'key')) {
        setSelectedEntityId(found.id);
      } else if (selectedEntityId && myHero && selectedEntityId === myHero.id) {
        setSelectedEntityId(null);
      }
    }
  }, [selectedEntityId, entities, role, playerName, placementMode, isFieldEditorOpen]);

  const addEntity = (type: EntityType) => {
    if (role !== 'dm') return;
    const center = { x: Math.floor(gridSettings.cols / 2), y: Math.floor(gridSettings.rows / 2) };
    const spawnPos = findEmptySquare(center.x, center.y);
    const newEntity: Entity = {
      id: Math.random().toString(36).substr(2, 9),
      name: type === 'player' ? 'Player Slot' : `New ${type}`,
      type,
      hp: ENTITY_DEFAULTS.maxHp, maxHp: ENTITY_DEFAULTS.maxHp,
      ac: ENTITY_DEFAULTS.ac, initiative: ENTITY_DEFAULTS.initiative,
      x: spawnPos.x, y: spawnPos.y, color: COLORS[type],
      isVisibleToPlayers: type !== 'key'
    };
    setEntities(prev => [...prev, newEntity]);
    setPlacementMode(null);
    setSelectedEntityId(newEntity.id);
  };

  const handleAddLinkedKey = (targetId: string) => {
    if (role !== 'dm') return;
    const target = entities.find(e => e.id === targetId);
    if (!target) return;

    const randomColor = `hsl(${Math.random() * 360}, 70%, 60%)`;
    const keyId = Math.random().toString(36).substr(2, 9);
    const spawnPos = findEmptySquare(target.x, target.y);

    const newKey: Entity = {
      id: keyId,
      name: `Key to ${target.name}`,
      type: 'key',
      hp: 1, maxHp: 1, ac: 0, initiative: 0,
      x: spawnPos.x, y: spawnPos.y,
      color: randomColor,
      isVisibleToPlayers: false,
      linkedEntityId: targetId
    };

    setEntities(prev => [
      ...prev.map(e => e.id === targetId ? { ...e, linkedEntityId: keyId, color: randomColor, isLocked: true } : e),
      newKey
    ]);
  };

  const handleUpdateEntity = (updated: Entity) => {
    const nextEntities = entities.map(e => e.id === updated.id ? updated : e);
    if (updated.type === 'key' && updated.isVisibleToPlayers !== entities.find(e => e.id === updated.id)?.isVisibleToPlayers) {
        if (updated.isVisibleToPlayers) {
            setNotification(`A ${updated.name} has been discovered!`);
            setTimeout(() => setNotification(null), 5000);
        }
    }
    setEntities(nextEntities);
  };

  const handleDeleteEntity = (id: string) => {
    if (role !== 'dm') return;
    setEntities(prev => prev.filter(e => e.id !== id));
    if (selectedEntityId === id) setSelectedEntityId(null);
  };

  if (!role) return (
    <RoleSelection 
      onSelectDM={() => { 
        const code = generateCode();
        setSessionCode(code); 
        setRole('dm'); 
        setIsTutorial(false); 
        setPlayerName('The Dungeon Master'); 
      }} 
      onJoin={(c, n) => { 
        setSessionCode(c.toUpperCase()); 
        setPlayerName(n); 
        setRole('member'); 
        setIsTutorial(false); 
      }} 
      onTutorial={(t) => {
        setIsTutorial(true); 
        setTutorialStep(0); 
        setRole(t); 
        setSessionCode('TUTOR'); 
        setGridSettings(INITIAL_GRID_SETTINGS);
        setIsSidebarOpen(true);
        if (t === 'member') {
          setPlayerName('Tutorial Hero');
          setEntities([{ id: 'tut-slot-1', name: 'Hero Slot', type: 'player', hp: 20, maxHp: 20, ac: 15, initiative: 10, x: 7, y: 7, color: COLORS.player, isVisibleToPlayers: true }, { id: 'tut-key-1', name: 'Shiny Key', type: 'key', hp: 1, maxHp: 1, ac: 0, initiative: 0, x: 6, y: 7, color: '#facc15', isVisibleToPlayers: true }, { id: 'tut-door-1', name: 'Locked Gate', type: 'obstacle', subtype: 'door', hp: 1, maxHp: 1, ac: 0, initiative: 0, x: 7, y: 6, color: COLORS.door, isOpen: false, isLocked: false, isVisibleToPlayers: true }]);
        } else {
          setPlayerName('Tutorial DM');
          setEntities([]);
        }
      }} 
    />
  );

  const filteredEntities = entities.filter(e => e.type !== 'obstacle' || (e.subtype === 'chest' || e.subtype === 'door'));
  const selectedEntity = entities.find(e => e.id === selectedEntityId);

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden relative">
      {/* Refreshing Indicator */}
      {isRefreshing && (
        <div className="fixed inset-0 z-[500] bg-black/40 backdrop-blur-sm flex items-center justify-center transition-all duration-300">
           <div className="bg-slate-900 border-2 border-amber-500/50 p-8 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col items-center gap-4 animate-in zoom-in duration-300">
              <Loader2 size={48} className="text-amber-500 animate-spin" />
              <div className="text-center">
                <p className="text-white font-black text-xl font-medieval tracking-widest uppercase">Refreshing Session</p>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Syncing with Dungeon Master...</p>
              </div>
           </div>
        </div>
      )}

      {notification && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[300] bg-amber-600 text-white px-8 py-4 rounded-3xl shadow-2xl font-black flex items-center gap-4 animate-bounce">
              <Key className="animate-pulse" size={20} />
              {notification}
          </div>
      )}
      {isTutorial && (
        <TutorialOverlay role={role} currentStep={tutorialStep} onFinish={() => { setRole(null); setIsTutorial(false); }} />
      )}

      {role === 'dm' && (
        <>
          <div className={`fixed left-0 top-1/2 -translate-y-1/2 z-[60] flex items-center transition-all duration-300 ${isFieldEditorOpen ? 'translate-x-[22rem]' : 'translate-x-0'}`}>
            <button onClick={() => setIsFieldEditorOpen(!isFieldEditorOpen)} className={`bg-amber-600 p-2 rounded-r-xl shadow-2xl border-y border-r border-amber-500 hover:bg-amber-500 transition-colors ${(tutorialStep === 0 || tutorialStep === 6) && isTutorial ? 'animate-pulse scale-110 ring-4 ring-white' : ''}`}>
              {isFieldEditorOpen ? <ChevronLeft size={20} className="text-white" /> : <ChevronRight size={20} className="text-white" />}
            </button>
          </div>
          <div className={`fixed inset-y-0 left-0 z-[55] w-[22rem] bg-slate-900 border-r border-slate-700 shadow-[20px_0_50px_rgba(0,0,0,0.5)] transition-transform duration-300 transform ${isFieldEditorOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="p-6 h-full flex flex-col space-y-6 overflow-y-auto custom-scrollbar pb-24">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <Settings2 className="text-amber-500" size={24} />
                <h2 className="font-medieval text-xl text-white">Field Editor</h2>
              </div>
              {selectedEntity && (selectedEntity.subtype === 'chest' || selectedEntity.subtype === 'door') ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Box size={14} /> Object Inspector
                    </h3>
                    <button onClick={() => setSelectedEntityId(null)} className="text-slate-500 hover:text-white"><X size={16}/></button>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-2xl border border-amber-500/30 shadow-2xl space-y-4">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-600/20 border border-amber-600/40">
                           {selectedEntity.subtype === 'chest' ? <Package className="text-amber-500" /> : <DoorClosed className="text-amber-500" />}
                        </div>
                        <div>
                           <h4 className="text-white font-bold">{selectedEntity.name}</h4>
                           <span className="text-[10px] text-slate-500 font-black uppercase">Grid: {String.fromCharCode(65 + selectedEntity.x)}{selectedEntity.y + 1}</span>
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => handleUpdateEntity({...selectedEntity, isLocked: !selectedEntity.isLocked})} className={`py-2 rounded-xl text-[10px] font-black flex items-center justify-center gap-2 border transition-all ${selectedEntity.isLocked ? 'bg-red-600 border-red-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                          {selectedEntity.isLocked ? <Lock size={12}/> : <Unlock size={12}/>} 
                          {selectedEntity.isLocked ? 'LOCKED' : 'UNLOCKED'}
                        </button>
                        <button onClick={() => handleDeleteEntity(selectedEntity.id)} className="py-2 bg-slate-800 border border-slate-700 hover:bg-red-900/40 hover:border-red-500/50 text-slate-400 hover:text-red-400 rounded-xl text-[10px] font-black flex items-center justify-center gap-2 transition-all">
                          <Trash2 size={12}/> DELETE
                        </button>
                     </div>
                     {!selectedEntity.linkedEntityId && (
                       <button onClick={() => handleAddLinkedKey(selectedEntity.id)} className={`w-full py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-black text-xs flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 ${tutorialStep === 4 && isTutorial ? 'animate-pulse ring-4 ring-white' : ''}`}>
                         <Link size={18} /> FORGE LINKED KEY
                       </button>
                     )}
                  </div>
                  <button onClick={() => setSelectedEntityId(null)} className="w-full py-2 text-slate-500 text-[10px] font-black uppercase hover:text-slate-300">Back to Brushes</button>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><LayoutGrid size={12}/> Terrain</h3>
                    <div className="grid grid-cols-3 gap-2">
                      <button onClick={() => setPlacementMode('wall')} className={`p-3 rounded-xl text-[10px] font-black flex flex-col items-center gap-1 border transition-all ${placementMode === 'wall' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'}`}><BrickWall size={16} /> WALL</button>
                      <button onClick={() => setPlacementMode('lava')} className={`p-3 rounded-xl text-[10px] font-black flex flex-col items-center gap-1 border transition-all ${placementMode === 'lava' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400'}`}><Flame size={16}/> LAVA</button>
                      <button onClick={() => setPlacementMode('eraser')} className={`p-3 rounded-xl text-[10px] font-black flex flex-col items-center gap-1 border transition-all ${placementMode === 'eraser' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400'}`}><Eraser size={16}/> ERASE</button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Box size={12}/> Objects</h3>
                    <div className="grid grid-cols-3 gap-2">
                      <button onClick={() => setPlacementMode('door')} className={`p-3 rounded-xl text-[10px] font-black flex flex-col items-center gap-1 border transition-all ${placementMode === 'door' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'}`}><DoorClosed size={16}/> DOOR</button>
                      <button onClick={() => setPlacementMode('chest')} className={`p-3 rounded-xl text-[10px] font-black flex flex-col items-center gap-1 border transition-all ${placementMode === 'chest' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'} ${tutorialStep === 1 && isTutorial ? 'animate-pulse ring-4 ring-white' : ''}`}><Package size={16}/> CHEST</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      <aside className={`bg-slate-900 border-r-2 border-slate-800 transition-all duration-300 flex flex-col z-30 shadow-2xl ${isSidebarOpen ? 'w-96' : 'w-0'}`}>
        {isSidebarOpen && (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="p-6 border-b-2 border-slate-800 flex justify-between items-center">
                <h1 className="font-medieval text-xl text-amber-500 flex items-center gap-3 truncate"><Sword size={24} /> {isTutorial ? 'Tutorial' : (role === 'dm' ? 'Dungeon Master' : 'The Hero')}</h1>
                <button onClick={() => { setRole(null); setSessionCode(''); }} className="text-slate-500 hover:text-red-500 transition-colors"><LogOut size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {role === 'dm' && (
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Summon</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => addEntity('player')} className={`p-3 bg-green-600/20 border border-green-600/50 rounded-xl text-green-400 text-xs font-black ${tutorialStep === 8 && isTutorial ? 'animate-pulse ring-4 ring-white' : ''}`}>PLAYER SLOT</button>
                    <button onClick={() => addEntity('enemy')} className={`p-3 bg-red-600/20 border border-red-600/50 rounded-xl text-red-400 text-xs font-black ${tutorialStep === 9 && isTutorial ? 'animate-pulse ring-4 ring-white' : ''}`}>ENEMY</button>
                  </div>
                </div>
              )}
              <div className="space-y-4 pb-12">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Entities</h3>
                {filteredEntities.map(entity => (
                  <EntityCard 
                    key={entity.id} 
                    entity={entity} 
                    entities={entities} 
                    isSelected={selectedEntityId === entity.id} 
                    onSelect={setSelectedEntityId} 
                    onUpdateHp={(id, hp) => setEntities(prev => prev.map(e => e.id === id ? {...e, hp} : e))} 
                    onUpdateEntity={handleUpdateEntity} 
                    onDelete={handleDeleteEntity} 
                    onEdit={() => {}} 
                    onAddLinkedKey={handleAddLinkedKey} 
                    canEdit={role === 'dm' || entity.claimedBy === playerName} 
                    role={role || 'member'} 
                    showEnemyHpToPlayers={showEnemyHpToPlayers} 
                    isEditorOpen={isFieldEditorOpen}
                    isTutorialStep={isTutorial && role === 'member' && tutorialStep === 2 && entity.id === 'tut-door-1'}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col relative" ref={containerRef}>
        <header className="p-4 border-b border-slate-800 bg-slate-900 flex justify-between items-center z-20">
           <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-400"><ChevronLeft size={20}/></button>
           {!isTutorial && (
             <div className="flex flex-col items-center bg-black/40 px-6 py-2 rounded-2xl border border-slate-700">
               <span className="text-[10px] text-amber-500 font-black uppercase tracking-widest">Session Code</span>
               <span className="text-xl font-medieval text-white tracking-[0.2em]">{sessionCode}</span>
             </div>
           )}
           <div className="flex gap-2"><ZoomOut size={16} className="cursor-pointer" onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} /><ZoomIn size={16} className="cursor-pointer" onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} /><Maximize size={16} className="cursor-pointer" onClick={fitToScreen} /></div>
        </header>
        <div className="flex-1 overflow-auto bg-slate-950 relative flex items-center justify-center">
           <div style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}>
             <GridMap 
                entities={entities} 
                settings={gridSettings} 
                selectedEntityId={selectedEntityId} 
                onCellClick={handleCellClick} 
                role={role || 'member'} 
                showEnemyHpToPlayers={showEnemyHpToPlayers} 
                isEditorOpen={isFieldEditorOpen} 
                highlightedEntityId={
                  isTutorial && role === 'member' ? (
                    tutorialStep === 0 ? 'tut-slot-1' :
                    tutorialStep === 1 ? 'tut-key-1' :
                    tutorialStep === 2 ? 'tut-door-1' :
                    tutorialStep === 3 ? 'tut-door-1' :
                    tutorialStep === 4 ? 'tut-door-1' : null
                  ) : null
                } 
             />
           </div>
        </div>
      </main>
    </div>
  );
};

export default App;
