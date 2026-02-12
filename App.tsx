
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
  Loader2,
  Trophy,
  Skull,
  Coffee,
  BedDouble,
  Shield,
  Heart,
  Download,
  Upload,
  Plus,
  Layers,
  Map as MapIcon,
  Save,
  Hammer,
  DoorOpen,
  ArrowRightCircle,
  Edit2,
  Check,
  Archive
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  
  const [rooms, setRooms] = useState<Record<string, Room>>({});
  const [activeRoomId, setActiveRoomId] = useState<string>('');
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [tempRoomName, setTempRoomName] = useState('');
  
  const [pendingClaimId, setPendingClaimId] = useState<string | null>(null);
  const [claimMaxHp, setClaimMaxHp] = useState<number>(20);
  const [claimAc, setClaimAc] = useState<number>(10);

  const containerRef = useRef<HTMLDivElement>(null);

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
    const existingRaw = localStorage.getItem(storageKey);
    const existing: SessionData = existingRaw ? JSON.parse(existingRaw) : {
      rooms: {},
      activeRoomId: '',
      status: 'active',
      updatedAt: new Date().toISOString(),
      showEnemyHpToPlayers: true
    };
    const updated: SessionData = { ...existing, ...data, updatedAt: new Date().toISOString() };
    localStorage.setItem(storageKey, JSON.stringify(updated));
  }, [sessionCode, role]);

  const fetchFromCloud = useCallback(() => {
    if (!sessionCode || role === 'workshop') return;
    const storageKey = `dnd_session_${sessionCode}`;
    const rawData = localStorage.getItem(storageKey);
    if (rawData) {
      const data: SessionData = JSON.parse(rawData);
      setRooms(data.rooms || {});
      setActiveRoomId(data.activeRoomId);
      setEncounterStatus(data.status);
      setShowEnemyHpToPlayers(data.showEnemyHpToPlayers ?? true);
    }
  }, [sessionCode, role]);

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
      const interval = setInterval(fetchFromCloud, 10000); 
      return () => clearInterval(interval);
    }
  }, [sessionCode, role, fetchFromCloud]);

  useEffect(() => {
    if ((role === 'dm' || role === 'member') && sessionCode && Object.keys(rooms).length > 0) {
      syncToCloud({ 
        rooms, 
        activeRoomId, 
        status: encounterStatus, 
        showEnemyHpToPlayers 
      });
    }
  }, [rooms, activeRoomId, encounterStatus, role, sessionCode, syncToCloud, showEnemyHpToPlayers]);

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

  const deleteRoom = (id: string) => {
    if (Object.keys(rooms).length <= 1) {
      setNotification("Cannot delete the last remaining room.");
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    const nextRooms = { ...rooms };
    delete nextRooms[id];
    setRooms(nextRooms);
    if (activeRoomId === id) {
      setActiveRoomId(Object.keys(nextRooms)[0]);
    }
    setNotification("Room deleted.");
    setTimeout(() => setNotification(null), 3000);
  };

  const startRenaming = (id: string, name: string) => {
    setEditingRoomId(id);
    setTempRoomName(name);
  };

  const saveRoomName = () => {
    if (editingRoomId && tempRoomName.trim()) {
      setRooms(prev => ({
        ...prev,
        [editingRoomId]: { ...prev[editingRoomId], name: tempRoomName.trim() }
      }));
    }
    setEditingRoomId(null);
  };

  const exportFullSession = () => {
    const bundle: SessionData = { 
      rooms, 
      activeRoomId, 
      status: encounterStatus, 
      showEnemyHpToPlayers,
      updatedAt: new Date().toISOString()
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(bundle));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `Adventure_Campaign.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    setNotification("Adventure Bundle exported.");
    setTimeout(() => setNotification(null), 3000);
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

  const updateCurrentRoom = (updates: Partial<Room>) => {
    if (!activeRoomId) return;
    setRooms(prev => ({
      ...prev,
      [activeRoomId]: { ...prev[activeRoomId], ...updates }
    }));
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

  const handleUpdateEntity = (updated: Entity) => {
    updateCurrentRoom({ entities: entities.map(e => e.id === updated.id ? updated : e) });
  };

  const handleDeleteEntity = (id: string) => {
    updateCurrentRoom({ entities: entities.filter(e => e.id !== id) });
    if (selectedEntityId === id) setSelectedEntityId(null);
  };

  const findEmptySquare = useCallback((startX: number, startY: number, currentEntities: Entity[], settings: GridSettings) => {
    const isOccupied = (x: number, y: number) => currentEntities.some(e => e.x === x && e.y === y);
    let x = startX, y = startY, dx = 0, dy = -1, step = 1, count = 0;
    for (let i = 0; i < 100; i++) {
      if (x >= 0 && x < settings.cols && y >= 0 && y < settings.rows) {
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
  }, []);

  const handleAddLinkedKey = (targetId: string) => {
    const target = entities.find(e => e.id === targetId);
    if (!target) return;
    const randomColor = `hsl(${Math.random() * 360}, 70%, 60%)`;
    const keyId = generateId();
    const spawnPos = findEmptySquare(target.x, target.y, entities, gridSettings);
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
    updateCurrentRoom({ 
      entities: [
        ...entities.map(e => e.id === targetId ? { ...e, linkedEntityId: keyId, color: randomColor, isLocked: true } : e),
        newKey
      ] 
    });
    setNotification("Linked key created!");
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCellClick = useCallback((x: number, y: number) => {
    if (!currentRoom) return;
    const found = entities.find(e => e.x === x && e.y === y);
    if (role === 'dm' || role === 'workshop') {
      if (isFieldEditorOpen) {
        if (placementMode === 'eraser' && found) {
          handleDeleteEntity(found.id);
          return;
        }
        if (placementMode && !['player', 'enemy'].includes(placementMode) && placementMode !== 'eraser') {
          if (found) {
             setSelectedEntityId(found.id);
             return;
          }
          const newEntity: Entity = {
            id: generateId(),
            name: placementMode.charAt(0).toUpperCase() + placementMode.slice(1),
            type: 'obstacle',
            subtype: placementMode as any,
            hp: 1, maxHp: 1, ac: 0, initiative: -999, x, y,
            color: COLORS[placementMode as keyof typeof COLORS] || '#475569',
            isOpen: false, contents: placementMode === 'chest' ? '' : undefined,
            isVisibleToPlayers: true,
            isLocked: placementMode === 'chest' || placementMode === 'door'
          };
          updateCurrentRoom({ entities: [...entities, newEntity] });
          setSelectedEntityId(newEntity.id);
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
            let nextEntities = entities.map(e => e.id === selectedEntityId ? { ...e, x, y } : e);
            if (found && found.type === 'key') {
                setNotification(`Collected ${found.name}!`);
                setTimeout(() => setNotification(null), 3000);
                nextEntities = nextEntities.filter(e => e.id !== found.id);
            }
            
            updateCurrentRoom({ entities: nextEntities });
            setSelectedEntityId(null);
            
            // PARTY TRAVEL LOGIC
            if (found && found.subtype === 'door' && found.linkedRoomId) {
              const targetRoomId = found.linkedRoomId;
              const targetRoom = rooms[targetRoomId];
              const sourceRoomId = activeRoomId;
              
              if (targetRoom) {
                setNotification(`Party Traveling to ${targetRoom.name}...`);
                
                // Get all party members (all entities of type 'player')
                const partyToTransfer = entities.filter(e => e.type === 'player');
                
                setTimeout(() => {
                  setRooms(prev => {
                    const source = prev[sourceRoomId];
                    const target = prev[targetRoomId];
                    if (!source || !target) return prev;

                    // Remove party from old room
                    const partyIds = new Set(partyToTransfer.map(p => p.id));
                    const cleanedSourceEntities = source.entities.filter(e => !partyIds.has(e.id));
                    
                    // Identify exit door in target room to place party members around
                    const partnerDoor = target.entities.find(e => e.subtype === 'door' && e.linkedRoomId === sourceRoomId)
                                     || target.entities.find(e => e.subtype === 'door');

                    const spawnBaseX = partnerDoor ? partnerDoor.x : Math.floor(target.gridSettings.cols / 2);
                    const spawnBaseY = partnerDoor ? partnerDoor.y : Math.floor(target.gridSettings.rows / 2);
                    
                    let currentTargetEntities = [...target.entities.filter(e => !partyIds.has(e.id))];
                    const transferredParty: Entity[] = [];

                    partyToTransfer.forEach(hero => {
                      const spawnPoint = findEmptySquare(spawnBaseX, spawnBaseY, [...currentTargetEntities, ...transferredParty], target.gridSettings);
                      transferredParty.push({ ...hero, x: spawnPoint.x, y: spawnPoint.y });
                    });

                    return {
                      ...prev,
                      [sourceRoomId]: { ...source, entities: cleanedSourceEntities },
                      [targetRoomId]: { ...target, entities: [...currentTargetEntities, ...transferredParty] }
                    };
                  });
                  
                  setActiveRoomId(targetRoomId);
                  setNotification(null);
                }, 800);
              }
            }
            return;
         }
      }
      
      if (found && (found.claimedBy === playerName || found.type === 'enemy' || found.subtype === 'chest' || found.subtype === 'door' || found.type === 'key')) {
        setSelectedEntityId(found.id);
      } else if (selectedEntityId && myHero && selectedEntityId === myHero.id) {
        setSelectedEntityId(null);
      }
    }
  }, [selectedEntityId, entities, role, playerName, placementMode, isFieldEditorOpen, activeRoomId, rooms, currentRoom, findEmptySquare]);

  const addEntity = (type: EntityType) => {
    if (!currentRoom) return;
    const center = { x: Math.floor(gridSettings.cols / 2), y: Math.floor(gridSettings.rows / 2) };
    const spawnPos = findEmptySquare(center.x, center.y, entities, gridSettings);
    const newEntity: Entity = {
      id: generateId(),
      name: type === 'player' ? 'Player Slot' : `New ${type}`,
      type,
      hp: ENTITY_DEFAULTS.maxHp, maxHp: ENTITY_DEFAULTS.maxHp,
      ac: ENTITY_DEFAULTS.ac, initiative: ENTITY_DEFAULTS.initiative,
      x: spawnPos.x, y: spawnPos.y, color: COLORS[type],
      isVisibleToPlayers: type !== 'key'
    };
    updateCurrentRoom({ entities: [...entities, newEntity] });
    setPlacementMode(null);
    setSelectedEntityId(newEntity.id);
  };

  const handleFinishClaim = () => {
    if (!pendingClaimId) return;
    const updated = entities.map(e => e.id === pendingClaimId ? { ...e, claimedBy: playerName, name: playerName, maxHp: claimMaxHp, hp: claimMaxHp, ac: claimAc } : e);
    updateCurrentRoom({ entities: updated });
    setSelectedEntityId(pendingClaimId);
    setPendingClaimId(null);
    setNotification(`${playerName} has arrived!`);
    setTimeout(() => setNotification(null), 3000);
  };

  if (!role) return (
    <RoleSelection 
      onSelectDM={() => { 
        const code = generateCode(); setSessionCode(code); setRole('dm'); setPlayerName('The Dungeon Master');
        setRooms({}); setActiveRoomId('');
      }} 
      onJoin={(c, n) => { setSessionCode(c.toUpperCase()); setPlayerName(n); setRole('member'); }} 
      onSelectWorkshop={() => {
        setRole('workshop'); setSessionCode('WORKSHOP'); setPlayerName('Architect');
        const id = generateId(); setRooms({ [id]: { id, name: 'New Blueprint', entities: [], gridSettings: { ...INITIAL_GRID_SETTINGS } } }); setActiveRoomId(id);
      }}
    />
  );

  const filteredEntities = entities.filter(e => e.type !== 'obstacle' || (e.subtype === 'chest' || e.subtype === 'door'));
  const selectedEntity = entities.find(e => e.id === selectedEntityId);

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden relative text-white">
      {notification && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[300] bg-amber-600 text-white px-8 py-4 rounded-3xl shadow-2xl font-black flex items-center gap-4 animate-bounce border-2 border-amber-400">
              <Key className="animate-pulse" size={20} />
              {notification}
          </div>
      )}

      {pendingClaimId && (
        <div className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-green-500 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl">
            <div className="flex flex-col items-center text-center space-y-6">
              <Sword size={40} className="text-green-500" />
              <h2 className="font-medieval text-3xl text-white">Initialize Hero</h2>
              <div className="w-full space-y-4">
                 <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Max HP</label>
                    <input type="number" value={claimMaxHp} onChange={e => setClaimMaxHp(parseInt(e.target.value) || 1)} className="w-full bg-slate-800 p-4 rounded-xl text-center text-white text-xl font-bold border border-slate-700 focus:border-green-500 outline-none"/>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Armor Class</label>
                    <input type="number" value={claimAc} onChange={e => setClaimAc(parseInt(e.target.value) || 1)} className="w-full bg-slate-800 p-4 rounded-xl text-center text-white text-xl font-bold border border-slate-700 focus:border-green-500 outline-none"/>
                 </div>
              </div>
              <button onClick={handleFinishClaim} className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-black rounded-2xl uppercase tracking-widest">CONFIRM HERO</button>
            </div>
          </div>
        </div>
      )}

      {(role === 'dm' || role === 'workshop') && (
        <>
          <div className={`fixed left-0 top-1/2 -translate-y-1/2 z-[60] flex items-center transition-all duration-300 ${isFieldEditorOpen ? 'translate-x-[22rem]' : 'translate-x-0'}`}>
            <button onClick={() => setIsFieldEditorOpen(!isFieldEditorOpen)} className="bg-amber-600 p-2 rounded-r-xl shadow-2xl border-y border-r border-amber-500 hover:bg-amber-500">
              {isFieldEditorOpen ? <ChevronLeft size={20} className="text-white" /> : <ChevronRight size={20} className="text-white" />}
            </button>
          </div>
          <div className={`fixed inset-y-0 left-0 z-[55] w-[22rem] bg-slate-900 border-r border-slate-700 shadow-2xl transition-transform duration-300 transform ${isFieldEditorOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="p-6 h-full flex flex-col space-y-6 overflow-y-auto custom-scrollbar pb-24">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                {role === 'workshop' ? <Hammer className="text-emerald-500" size={24} /> : <Settings2 className="text-amber-500" size={24} />}
                <h2 className="font-medieval text-xl text-white">{role === 'workshop' ? 'Blueprint Editor' : 'Map Manager'}</h2>
              </div>

              {selectedEntity && (selectedEntity.subtype === 'chest' || selectedEntity.subtype === 'door') ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Box size={14} /> Object Inspector
                    </h3>
                    <button onClick={() => setSelectedEntityId(null)} className="text-slate-500 hover:text-white"><X size={16}/></button>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-2xl border border-amber-500/30 space-y-4 shadow-2xl">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-600/20 border border-amber-600/40">
                           {selectedEntity.subtype === 'chest' ? <Package className="text-amber-500" /> : <DoorClosed className="text-amber-500" />}
                        </div>
                        <div>
                           <h4 className="text-white font-bold">{selectedEntity.name}</h4>
                           <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Grid: {String.fromCharCode(65 + selectedEntity.x)}{selectedEntity.y + 1}</span>
                        </div>
                     </div>
                     
                     {selectedEntity.subtype === 'door' && role === 'workshop' && (
                       <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 tracking-widest"><MapIcon size={12}/> Link to Room</label>
                          <select 
                            value={selectedEntity.linkedRoomId || ''} 
                            onChange={(e) => handleUpdateEntity({...selectedEntity, linkedRoomId: e.target.value || undefined})}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none focus:border-amber-500"
                          >
                            <option value="">No Link (Manual Exit)</option>
                            {Object.values(rooms).filter(r => r.id !== activeRoomId).map(room => (
                              <option key={room.id} value={room.id}>{room.name}</option>
                            ))}
                          </select>
                          <button 
                            onClick={() => {
                              const newName = `Room ${Object.keys(rooms).length + 1}`;
                              const id = generateId();
                              createRoom(newName, { id, name: newName, entities: [], gridSettings: { ...INITIAL_GRID_SETTINGS } });
                              handleUpdateEntity({...selectedEntity, linkedRoomId: id});
                            }}
                            className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                          >
                            <Plus size={12}/> Create & Link New Room
                          </button>
                       </div>
                     )}

                     <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => handleUpdateEntity({...selectedEntity, isLocked: !selectedEntity.isLocked})} className={`py-2 rounded-xl text-[10px] font-black flex items-center justify-center gap-2 border transition-all ${selectedEntity.isLocked ? 'bg-red-600 border-red-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                          {selectedEntity.isLocked ? <Lock size={12}/> : <Unlock size={12}/>} 
                          {selectedEntity.isLocked ? 'LOCKED' : 'UNLOCKED'}
                        </button>
                        <button onClick={() => handleDeleteEntity(selectedEntity.id)} className="py-2 bg-slate-800 border border-slate-700 hover:bg-red-900/40 text-slate-400 hover:text-red-400 rounded-xl text-[10px] font-black flex items-center justify-center gap-2">
                          <Trash2 size={12}/> DELETE
                        </button>
                     </div>
                     {role === 'workshop' && !selectedEntity.linkedEntityId && (
                       <button onClick={() => handleAddLinkedKey(selectedEntity.id)} className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-black text-xs flex items-center justify-center gap-3 shadow-xl">
                         <Link size={18} /> FORGE LINKED KEY
                       </button>
                     )}
                  </div>
                  <button onClick={() => setSelectedEntityId(null)} className="w-full py-2 text-slate-500 text-[10px] font-black uppercase hover:text-slate-300">Back</button>
                </div>
              ) : (
                <>
                  <div className="space-y-3 p-4 bg-slate-950/50 rounded-2xl border border-slate-800">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Layers size={12}/> {role === 'workshop' ? 'Map Management' : 'Loaded Maps'}</h3>
                        {role === 'workshop' && <button onClick={() => createRoom(`Room ${Object.keys(rooms).length + 1}`)} className="p-1 hover:bg-slate-800 rounded text-amber-500 transition-colors"><Plus size={14}/></button>}
                    </div>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                        {Object.keys(rooms).length === 0 ? (
                           <p className="text-[10px] text-slate-600 italic py-2">No maps loaded yet.</p>
                        ) : (
                          Object.values(rooms).map(room => (
                              <div key={room.id} className="group relative">
                                  {editingRoomId === room.id && role === 'workshop' ? (
                                    <div className="flex gap-1 items-center bg-slate-800 p-1 rounded-lg border border-amber-500">
                                      <input 
                                        type="text" autoFocus value={tempRoomName} 
                                        onChange={e => setTempRoomName(e.target.value)} 
                                        onKeyDown={e => e.key === 'Enter' && saveRoomName()}
                                        className="flex-1 bg-transparent text-xs text-white outline-none px-2 py-1"
                                      />
                                      <button onClick={saveRoomName} className="p-1 text-green-500 hover:text-green-400"><Check size={14}/></button>
                                    </div>
                                  ) : (
                                    <div className={`w-full flex items-center justify-between rounded-lg transition-all border overflow-hidden ${activeRoomId === room.id ? 'bg-amber-600/20 border-amber-500 text-amber-500' : 'bg-slate-800/40 border-slate-700 text-slate-500 hover:text-slate-300'}`}>
                                      <button onClick={() => setActiveRoomId(room.id)} className="flex-1 text-left px-3 py-2 text-xs font-bold truncate">
                                        {room.name}
                                      </button>
                                      {role === 'workshop' && (
                                        <div className="flex items-center gap-1 pr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button onClick={() => startRenaming(room.id, room.name)} className="p-1.5 hover:text-amber-500 transition-colors"><Edit2 size={12}/></button>
                                          <button onClick={() => deleteRoom(room.id)} className="p-1.5 hover:text-red-500 transition-colors"><Trash2 size={12}/></button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                              </div>
                          ))
                        )}
                    </div>
                  </div>

                  {role === 'workshop' && (
                    <>
                      <div className="space-y-4 p-4 bg-slate-950/50 rounded-2xl border border-slate-800">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Grid size={12}/> Grid Canvas</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-600 font-black uppercase">Rows</label>
                            <input type="number" min="5" max="50" value={gridSettings.rows} onChange={(e) => updateCurrentRoom({ gridSettings: { ...gridSettings, rows: parseInt(e.target.value) || 15 } })} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs"/>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-600 font-black uppercase">Cols</label>
                            <input type="number" min="5" max="50" value={gridSettings.cols} onChange={(e) => updateCurrentRoom({ gridSettings: { ...gridSettings, cols: parseInt(e.target.value) || 15 } })} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs"/>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><LayoutGrid size={12}/> Terrain</h3>
                        <div className="grid grid-cols-3 gap-2">
                          <button onClick={() => setPlacementMode('wall')} className={`p-3 rounded-xl text-[10px] font-black flex flex-col items-center gap-1 border transition-all ${placementMode === 'wall' ? 'bg-amber-600 text-white border-amber-500' : 'bg-slate-800 text-slate-400 border-slate-700'}`}><BrickWall size={16} /> WALL</button>
                          <button onClick={() => setPlacementMode('lava')} className={`p-3 rounded-xl text-[10px] font-black flex flex-col items-center gap-1 border transition-all ${placementMode === 'lava' ? 'bg-orange-600 text-white border-orange-500' : 'bg-slate-800 text-slate-400 border-slate-700'}`}><Flame size={16}/> LAVA</button>
                          <button onClick={() => setPlacementMode('eraser')} className={`p-3 rounded-xl text-[10px] font-black flex flex-col items-center gap-1 border transition-all ${placementMode === 'eraser' ? 'bg-red-600 text-white border-red-500' : 'bg-slate-800 text-slate-400 border-slate-700'}`}><Eraser size={16}/> ERASE</button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Box size={12}/> Objects</h3>
                        <div className="grid grid-cols-3 gap-2">
                          <button onClick={() => setPlacementMode('door')} className={`p-3 rounded-xl text-[10px] font-black flex flex-col items-center gap-1 border transition-all ${placementMode === 'door' ? 'bg-amber-600 text-white border-amber-500' : 'bg-slate-800 text-slate-400 border-slate-700'}`}><DoorClosed size={16}/> DOOR</button>
                          <button onClick={() => setPlacementMode('chest')} className={`p-3 rounded-xl text-[10px] font-black flex flex-col items-center gap-1 border transition-all ${placementMode === 'chest' ? 'bg-amber-600 text-white border-amber-500' : 'bg-slate-800 text-slate-400 border-slate-700'}`}><Package size={16}/> CHEST</button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              <div className="mt-auto pt-6 border-t border-slate-800 space-y-3">
                {role === 'workshop' && (
                  <button 
                    onClick={exportFullSession} 
                    disabled={Object.keys(rooms).length === 0} 
                    className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-black rounded-xl uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-colors border border-amber-500 disabled:opacity-20"
                  >
                    <Archive size={18}/> EXPORT ADVENTURE BUNDLE
                  </button>
                )}
                <label className={`w-full py-4 text-white text-[10px] font-black rounded-xl uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition-colors border shadow-xl ${role === 'dm' ? 'bg-amber-600 hover:bg-amber-500 border-amber-500' : 'bg-slate-800 hover:bg-slate-700 border-slate-700'}`}>
                    <Upload size={18}/> {role === 'dm' ? 'IMPORT ADVENTURE BUNDLE' : 'Import Map/Bundle'}<input type="file" className="hidden" accept=".json" onChange={importData}/>
                </label>
              </div>
            </div>
          </div>
        </>
      )}

      <aside className={`bg-slate-900 border-r-2 border-slate-800 transition-all duration-300 flex flex-col z-30 shadow-2xl ${isSidebarOpen ? 'w-96' : 'w-0'}`}>
        {isSidebarOpen && (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="p-6 border-b-2 border-slate-800 flex justify-between items-center bg-slate-900/50">
                <h1 className="font-medieval text-xl text-amber-500 flex items-center gap-3 truncate">
                  {role === 'workshop' ? <Hammer size={24} /> : <Sword size={24} />} 
                  {role === 'dm' ? 'Dungeon Master' : (role === 'workshop' ? 'Map Architect' : 'The Hero')}
                </h1>
                <button onClick={() => { setRole(null); setSessionCode(''); sessionStorage.removeItem('dnd_active_session'); }} className="text-slate-500 hover:text-red-500 transition-colors"><LogOut size={18} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {(role === 'dm' || role === 'workshop') && currentRoom && (
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Summon</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => addEntity('player')} className="p-3 bg-green-600/20 border border-green-600/50 rounded-xl text-green-400 text-xs font-black hover:bg-green-600/30 transition-colors">PLAYER SLOT</button>
                    <button onClick={() => addEntity('enemy')} className="p-3 bg-red-600/20 border border-red-600/50 rounded-xl text-red-400 text-xs font-black hover:bg-red-600/30 transition-colors">ENEMY</button>
                  </div>
                </div>
              )}
              
              <div className="space-y-4 pb-12">
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
                    onAddLinkedKey={handleAddLinkedKey}
                    canEdit={role === 'dm' || role === 'workshop' || entity.claimedBy === playerName} 
                    role={role === 'dm' || role === 'workshop' ? 'dm' : 'member'} 
                    showEnemyHpToPlayers={showEnemyHpToPlayers}
                    playerName={playerName}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col relative" ref={containerRef}>
        <header className="p-4 border-b border-slate-800 bg-slate-900 flex justify-between items-center z-20 shadow-md">
           <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-400 hover:text-amber-500 transition-colors"><ChevronLeft size={20}/></button>
           <div className="flex flex-col items-center bg-black/40 px-6 py-2 rounded-2xl border border-slate-700/50 shadow-inner group transition-all hover:bg-black/60">
             <span className="text-[10px] text-amber-500 font-black uppercase tracking-[0.2em] group-hover:scale-105 transition-transform">
               {role === 'workshop' ? 'ACTIVE BLUEPRINT' : 'Session Code'}
             </span>
             <span className="text-xl font-medieval text-white tracking-[0.2em]">{role === 'workshop' ? (currentRoom?.name || 'Empty Session') : sessionCode}</span>
           </div>
           <div className="flex gap-4 items-center">
             <div className="flex gap-2 bg-slate-800/50 p-1 rounded-xl border border-slate-700 shadow-xl">
               <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} className="p-2 text-slate-400 hover:text-white transition-colors" title="Zoom Out"><ZoomOut size={16} /></button>
               <button onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} className="p-2 text-slate-400 hover:text-white transition-colors" title="Zoom In"><ZoomIn size={16} /></button>
               <button onClick={fitToScreen} className="p-2 text-slate-400 hover:text-white transition-colors" title="Fit to Screen"><Maximize size={16} /></button>
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
                  role={role === 'dm' || role === 'workshop' ? 'dm' : 'member'} 
                  showEnemyHpToPlayers={showEnemyHpToPlayers} 
                  isEditorOpen={isFieldEditorOpen} 
                  localPlayerName={playerName}
               />
             </div>
           ) : (
             <div className="flex flex-col items-center justify-center text-center p-12 max-w-lg space-y-6 animate-in fade-in zoom-in-95 duration-700">
               <div className="w-32 h-32 bg-slate-900 rounded-full border-4 border-slate-800 flex items-center justify-center mb-4">
                 <MapIcon size={64} className="text-slate-700 opacity-50" />
               </div>
               <h2 className="font-medieval text-4xl text-slate-400">The Realm is Empty</h2>
               <p className="text-slate-500 leading-relaxed font-bold uppercase text-xs tracking-widest">
                 {role === 'dm' 
                    ? "No maps have been loaded into this session. As the Master of Fate, you must import an adventure bundle or room file to begin the journey." 
                    : "Waiting for the Dungeon Master to materialize the world..."}
               </p>
               {role === 'dm' && (
                 <label className="group relative py-5 px-10 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-[2rem] uppercase tracking-[0.2em] cursor-pointer shadow-[0_0_30px_rgba(217,119,6,0.3)] transition-all border-b-4 border-amber-800 active:border-b-0 active:translate-y-1">
                   <div className="flex items-center gap-4">
                     <Upload size={24} className="group-hover:bounce" />
                     LOAD ADVENTURE
                   </div>
                   <input type="file" className="hidden" accept=".json" onChange={importData}/>
                 </label>
               )}
             </div>
           )}
        </div>
      </main>
    </div>
  );
};

export default App;
