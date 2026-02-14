
import React, { useState, useCallback, useEffect, useRef } from 'react';
import Peer, { DataConnection } from 'peerjs';
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
  Settings2,
  Map as MapIcon,
  AlertTriangle,
  Wifi,
  WifiOff,
  Loader2,
  Hammer,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  Search,
  Share2,
  ZoomIn,
  ZoomOut,
  Users
} from 'lucide-react';

const App: React.FC = () => {
  // --- Core State ---
  const [role, setRole] = useState<'dm' | 'member' | 'workshop' | null>(null);
  const [playerName, setPlayerName] = useState<string>('');
  const [sessionCode, setSessionCode] = useState<string>('');
  const [encounterStatus, setEncounterStatus] = useState<EncounterStatus>('active');
  const [rooms, setRooms] = useState<Record<string, Room>>({});
  const [activeRoomId, setActiveRoomId] = useState<string>('');
  const [showEnemyHpToPlayers, setShowEnemyHpToPlayers] = useState(true);
  
  // --- UI State ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFieldEditorOpen, setIsFieldEditorOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [placementMode, setPlacementMode] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [monsterPrompt, setMonsterPrompt] = useState('');
  const [isGeneratingMonster, setIsGeneratingMonster] = useState(false);
  const [tutorialStep, setTutorialStep] = useState<number>(-1);
  const [pendingClaimId, setPendingClaimId] = useState<string | null>(null);
  const [claimMaxHp, setClaimMaxHp] = useState<number>(20);
  const [claimAc, setClaimAc] = useState<number>(10);

  // --- Networking State ---
  const [peerStatus, setPeerStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);
  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef<Record<string, DataConnection>>({});
  const lastBroadcastRef = useRef<string>('');

  const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();
  const generateId = () => Math.random().toString(36).substr(2, 9);

  const currentRoom = (activeRoomId && rooms && rooms[activeRoomId]) ? rooms[activeRoomId] : null;
  const entities = currentRoom?.entities || [];
  const gridSettings = currentRoom?.gridSettings || INITIAL_GRID_SETTINGS;

  // --- Utility Functions ---
  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // --- Networking Logic ---
  
  const broadcastState = useCallback((forceState?: Partial<SessionData>) => {
    if (role !== 'dm') return;
    const data: SessionData = {
      rooms,
      activeRoomId,
      status: encounterStatus,
      showEnemyHpToPlayers,
      updatedAt: new Date().toISOString(),
      ...forceState
    };
    
    // Only broadcast if something meaningful changed
    const serialized = JSON.stringify(data);
    if (serialized === lastBroadcastRef.current) return;
    lastBroadcastRef.current = serialized;

    // Fix: Explicitly cast to DataConnection[] to ensure 'open' and 'send' are accessible.
    (Object.values(connectionsRef.current) as DataConnection[]).forEach(conn => {
      if (conn.open) {
        conn.send({ type: 'STATE_UPDATE', data });
      }
    });
  }, [role, rooms, activeRoomId, encounterStatus, showEnemyHpToPlayers]);

  const handleUpdateHp = useCallback((id: string, hp: number) => {
    if (role === 'member') {
      connectionsRef.current[`DND-${sessionCode}`]?.send({ 
        type: 'ACTION_REQUEST', action: 'UPDATE_HP', payload: { id, hp } 
      });
      return;
    }
    setRooms(prev => {
      if (!activeRoomId || !prev[activeRoomId]) return prev;
      const room = prev[activeRoomId];
      return {
        ...prev,
        [activeRoomId]: {
          ...room,
          entities: room.entities.map(e => e.id === id ? { ...e, hp: Math.max(0, Math.min(e.maxHp, hp)) } : e)
        }
      };
    });
  }, [activeRoomId, role, sessionCode]);

  const handleUpdateEntity = useCallback((updated: Entity) => {
    if (role === 'member') {
      connectionsRef.current[`DND-${sessionCode}`]?.send({ 
        type: 'ACTION_REQUEST', action: 'UPDATE_ENTITY', payload: updated 
      });
      return;
    }
    setRooms(prev => {
      if (!activeRoomId || !prev[activeRoomId]) return prev;
      const room = prev[activeRoomId];
      return {
        ...prev,
        [activeRoomId]: {
          ...room,
          entities: room.entities.map(e => e.id === updated.id ? updated : e)
        }
      };
    });
  }, [activeRoomId, role, sessionCode]);

  const handleData = useCallback((data: any, conn: DataConnection) => {
    if (data.type === 'STATE_UPDATE' && role === 'member') {
      const remote = data.data as SessionData;
      setRooms(remote.rooms);
      setActiveRoomId(remote.activeRoomId);
      setEncounterStatus(remote.status);
      setShowEnemyHpToPlayers(remote.showEnemyHpToPlayers ?? true);
      setPeerStatus('connected');
    }

    if (data.type === 'ACTION_REQUEST' && role === 'dm') {
      const { action, payload } = data;
      if (action === 'UPDATE_ENTITY') {
        handleUpdateEntity(payload);
      } else if (action === 'UPDATE_HP') {
        handleUpdateHp(payload.id, payload.hp);
      }
    }
  }, [role, handleUpdateEntity, handleUpdateHp]);

  // Handle URL Entry
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSession = params.get('session');
    if (urlSession && !sessionCode) {
      setSessionCode(urlSession.toUpperCase());
    }
  }, [sessionCode]);

  // Init Networking
  useEffect(() => {
    if (!sessionCode || role === 'workshop') return;

    const p = new Peer(role === 'dm' ? `DND-${sessionCode}` : undefined, {
      debug: 1
    });
    peerRef.current = p;

    p.on('open', (id) => {
      setPeerStatus(role === 'dm' ? 'connected' : 'connecting');
      if (role === 'member') {
        const conn = p.connect(`DND-${sessionCode}`, { reliable: true });
        conn.on('open', () => {
          setPeerStatus('connected');
          connectionsRef.current[conn.peer] = conn;
          conn.send({ type: 'JOIN_REQUEST', name: playerName });
        });
        conn.on('data', (d) => handleData(d, conn));
        conn.on('close', () => setPeerStatus('disconnected'));
      }
    });

    p.on('connection', (conn) => {
      conn.on('open', () => {
        connectionsRef.current[conn.peer] = conn;
        setConnectedPeers(prev => [...new Set([...prev, conn.peer])]);
        // Send initial state to new joiner
        conn.send({ 
          type: 'STATE_UPDATE', 
          data: { rooms, activeRoomId, status: encounterStatus, showEnemyHpToPlayers, updatedAt: new Date().toISOString() } 
        });
      });
      conn.on('data', (d) => handleData(d, conn));
      conn.on('close', () => {
        setConnectedPeers(prev => prev.filter(id => id !== conn.peer));
        delete connectionsRef.current[conn.peer];
      });
    });

    return () => {
      p.destroy();
      connectionsRef.current = {};
    };
  }, [sessionCode, role, handleData, playerName, activeRoomId, encounterStatus, rooms, showEnemyHpToPlayers]);

  // Broadcast loop for DM
  useEffect(() => {
    if (role === 'dm') broadcastState();
  }, [rooms, activeRoomId, encounterStatus, showEnemyHpToPlayers, role, broadcastState]);

  // --- Handlers ---

  const handleDeleteEntity = useCallback((id: string) => {
    if (role !== 'dm') return;
    setRooms(prev => {
      if (!activeRoomId || !prev[activeRoomId]) return prev;
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
  }, [activeRoomId, role, selectedEntityId]);

  const startHosting = () => {
    const code = generateCode();
    const firstId = generateId();
    const initialRooms = { [firstId]: { id: firstId, name: 'The Entrance', entities: [], gridSettings: { ...INITIAL_GRID_SETTINGS } } };
    setRooms(initialRooms);
    setActiveRoomId(firstId);
    setSessionCode(code);
    setPlayerName('Dungeon Master');
    setRole('dm');
  };

  const generateMagicLink = () => {
    if (!sessionCode) return;
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('session', sessionCode);
    navigator.clipboard.writeText(url.toString()).then(() => notify("Magic Portal Link Copied!"));
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
    setRooms(prev => ({
      ...prev,
      [activeRoomId]: { ...prev[activeRoomId], entities: [...prev[activeRoomId].entities, newEntity] }
    }));
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
            id: generateId(), name: placementMode.toUpperCase(), type: 'obstacle', subtype: placementMode as any,
            hp: 1, maxHp: 1, ac: 0, initiative: 0, x, y, isVisibleToPlayers: true,
            color: COLORS[placementMode as keyof typeof COLORS] || '#475569'
          };
          setRooms(prev => ({
            ...prev,
            [activeRoomId]: { ...prev[activeRoomId], entities: [...prev[activeRoomId].entities, newEntity] }
          }));
          return;
        }
      }
      
      if (selectedEntityId) {
        const selected = entities.find(e => e.id === selectedEntityId);
        if (selected) { handleUpdateEntity({ ...selected, x, y }); setSelectedEntityId(null); }
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

  const handleMonsterGeneration = async () => {
    if (!monsterPrompt || isGeneratingMonster || !currentRoom) return;
    setIsGeneratingMonster(true);
    try {
      const stats = await generateMonster(monsterPrompt);
      if (stats) {
        const center = { x: Math.floor(gridSettings.cols / 2), y: Math.floor(gridSettings.rows / 2) };
        const newEntity: Entity = {
          id: generateId(), name: stats.name || "Manifestation", type: 'enemy',
          hp: stats.hp || 10, maxHp: stats.hp || 10, ac: stats.ac || 10,
          initiative: 10, notes: stats.notes, x: center.x, y: center.y,
          color: COLORS.enemy, isVisibleToPlayers: true
        };
        setRooms(prev => ({
          ...prev,
          [activeRoomId]: { ...prev[activeRoomId], entities: [...prev[activeRoomId].entities, newEntity] }
        }));
        setSelectedEntityId(newEntity.id);
        setMonsterPrompt('');
        notify(`${newEntity.name} Summoned!`);
      }
    } catch (e) {
      notify("Void Summoning Failed.");
    } finally {
      setIsGeneratingMonster(false);
    }
  };

  if (!role) return <RoleSelection onSelectDM={startHosting} onJoin={(c, n) => { setSessionCode(c.toUpperCase()); setPlayerName(n); setRole('member'); }} onSelectWorkshop={() => setRole('workshop')} initialSessionCode={sessionCode} />;

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden relative text-white">
      {notification && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[300] bg-amber-600 text-white px-8 py-3 rounded-full shadow-2xl font-black flex items-center gap-2 animate-bounce border border-amber-400">
           <CheckCircle2 size={18}/> {notification}
        </div>
      )}

      {pendingClaimId && (
        <div className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-green-500 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl">
            <div className="flex flex-col items-center text-center space-y-6">
              <Sword size={40} className="text-green-500" />
              <h2 className="font-medieval text-3xl">Hero Onboarding</h2>
              <div className="w-full space-y-4">
                 <div className="space-y-1">
                   <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Max HP</label>
                   <input type="number" value={claimMaxHp} onChange={e => setClaimMaxHp(parseInt(e.target.value) || 1)} className="w-full bg-slate-800 p-4 rounded-xl text-white font-bold border border-slate-700 outline-none"/>
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Armor Class</label>
                   <input type="number" value={claimAc} onChange={e => setClaimAc(parseInt(e.target.value) || 1)} className="w-full bg-slate-800 p-4 rounded-xl text-white font-bold border border-slate-700 outline-none"/>
                 </div>
              </div>
              <button onClick={() => {
                const entity = entities.find(e => e.id === pendingClaimId);
                if (entity) handleUpdateEntity({ ...entity, claimedBy: playerName, name: playerName, maxHp: claimMaxHp, hp: claimMaxHp, ac: claimAc });
                setPendingClaimId(null);
              }} className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-black rounded-2xl uppercase tracking-widest transition-all">ENTER REALM</button>
            </div>
          </div>
        </div>
      )}

      <aside className={`bg-slate-900 border-r-2 border-slate-800 transition-all duration-300 flex flex-col z-30 shadow-2xl ${isSidebarOpen ? 'w-96' : 'w-0'}`}>
        {isSidebarOpen && (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="p-6 border-b-2 border-slate-800 flex justify-between items-center bg-slate-900/50">
                <h1 className="font-medieval text-xl text-amber-500 flex items-center gap-3">
                  {role === 'dm' ? <Shield size={24}/> : <Sword size={24} />} 
                  {playerName?.split(' ')[0] || 'Unknown'}
                </h1>
                <div className="flex items-center gap-2">
                   <div className={`w-3 h-3 rounded-full status-pulse ${peerStatus === 'connected' ? 'bg-green-500' : peerStatus === 'connecting' ? 'bg-amber-500' : 'bg-red-500'}`} />
                   <button onClick={() => setShowLogoutConfirm(true)} className="text-slate-500 hover:text-red-500 ml-2 transition-colors"><LogOut size={18} /></button>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-4 pb-24 custom-scrollbar">
              {role === 'dm' && (
                <div className="bg-slate-800/40 border border-slate-700 p-3 rounded-xl mb-4">
                  <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1"><Users size={10}/> Party Pulse</h3>
                  <div className="flex flex-wrap gap-2">
                     {connectedPeers.length === 0 ? <span className="text-[10px] text-slate-600 italic">No heroes present...</span> : connectedPeers.map(p => (
                       <div key={p} className="bg-green-600/10 border border-green-500/30 text-green-500 text-[8px] px-2 py-1 rounded-full font-bold">HERO-{p.slice(-4)}</div>
                     ))}
                  </div>
                </div>
              )}

              {role === 'dm' && currentRoom && (
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
                    onDelete={handleDeleteEntity} onEdit={() => {}} canEdit={role === 'dm' || entity.claimedBy === playerName} 
                    role={role === 'dm' ? 'dm' : 'member'} showEnemyHpToPlayers={showEnemyHpToPlayers} playerName={playerName}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col relative">
        <header className="p-4 border-b border-slate-800 bg-slate-900 flex justify-between items-center z-20">
           <div className="flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-400 hover:text-amber-500"><ChevronLeft size={20}/></button>
              {role === 'dm' && <button onClick={generateMagicLink} className="flex items-center gap-2 bg-amber-600/20 hover:bg-amber-600/40 text-amber-500 border border-amber-600/30 px-4 py-2 rounded-xl text-[10px] font-black tracking-widest"><Share2 size={14}/> MAGIC PORTAL</button>}
           </div>
           
           <div className="flex flex-col items-center bg-black/40 px-6 py-2 rounded-2xl border border-slate-700/50">
             <span className="text-[10px] text-amber-500 font-black uppercase tracking-[0.2em]">Realm Key</span>
             <span className="text-xl font-medieval text-white tracking-[0.2em]">{sessionCode}</span>
           </div>
           
           <div className="flex gap-2">
             <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} className="p-2 text-slate-400 hover:text-white"><ZoomOut size={16} /></button>
             <button onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} className="p-2 text-slate-400 hover:text-white"><ZoomIn size={16} /></button>
           </div>
        </header>

        <div className="flex-1 overflow-auto bg-slate-950 relative flex items-center justify-center custom-scrollbar">
           {currentRoom ? (
             <div style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }} className="transition-transform duration-300">
               <GridMap 
                  entities={entities} settings={gridSettings} selectedEntityId={selectedEntityId} 
                  onCellClick={handleCellClick} role={role === 'dm' ? 'dm' : 'member'} 
                  showEnemyHpToPlayers={showEnemyHpToPlayers} isEditorOpen={isFieldEditorOpen} localPlayerName={playerName}
               />
             </div>
           ) : (
             <div className="flex flex-col items-center justify-center text-center p-12 max-w-lg space-y-6">
               <div className="w-32 h-32 bg-slate-900 rounded-full border-4 border-slate-800 flex items-center justify-center mb-4 shadow-2xl">
                 {peerStatus === 'connecting' ? <Loader2 size={64} className="text-amber-500 animate-spin" /> : <MapIcon size={64} className="text-slate-700 opacity-20" />}
               </div>
               <h2 className="font-medieval text-4xl text-slate-400">{peerStatus === 'connecting' ? 'Traversing the Void' : 'Realm Null'}</h2>
               <p className="text-slate-500 leading-relaxed font-bold uppercase text-xs tracking-widest">
                 {role === 'dm' ? "Initializing the world..." : `Connecting to Realm [${sessionCode}]...`}
               </p>
               {peerStatus === 'disconnected' && role === 'member' && (
                 <p className="text-[10px] text-amber-500 font-black animate-pulse">Ensure the Dungeon Master is online and the Realm is open.</p>
               )}
             </div>
           )}
        </div>

        {role === 'dm' && (
           <>
            <button onClick={() => setIsFieldEditorOpen(!isFieldEditorOpen)} className={`fixed left-0 top-1/2 -translate-y-1/2 z-[60] bg-amber-600 p-2 rounded-r-xl shadow-2xl transition-all ${isFieldEditorOpen ? 'translate-x-[22rem]' : 'translate-x-0'}`}>
              {isFieldEditorOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </button>
            <div className={`fixed inset-y-0 left-0 z-[55] w-[22rem] bg-slate-900 border-r border-slate-700 shadow-2xl transition-transform duration-300 transform ${isFieldEditorOpen ? 'translate-x-0' : '-translate-x-full'}`}>
              <div className="p-6 h-full flex flex-col space-y-6 overflow-y-auto custom-scrollbar">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                  <Settings2 className="text-amber-500" size={24} />
                  <h2 className="font-medieval text-xl">World Forge</h2>
                </div>
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Brushes</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {['wall', 'lava', 'water', 'grass', 'eraser'].map(brush => (
                      <button key={brush} onClick={() => setPlacementMode(brush)} className={`p-2 rounded-lg border text-[10px] font-bold capitalize transition-all ${placementMode === brush ? 'bg-amber-600 border-amber-500 shadow-lg scale-105' : 'bg-slate-800 border-slate-700'}`}>{brush}</button>
                    ))}
                  </div>
                </div>
                <div className="mt-auto pt-4 border-t border-slate-800">
                  <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">Monster Weaver</h3>
                  <div className="relative">
                    <input type="text" value={monsterPrompt} onChange={e => setMonsterPrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleMonsterGeneration()} placeholder="Describe a beast..." className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs outline-none focus:border-amber-500"/>
                    <button onClick={handleMonsterGeneration} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-amber-500">
                      {isGeneratingMonster ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
           </>
        )}
      </main>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[700] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-red-500 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl text-center space-y-6">
            <AlertTriangle size={32} className="text-red-500 mx-auto animate-pulse" />
            <h2 className="font-medieval text-3xl">Sever Realm Link?</h2>
            <div className="flex flex-col gap-3">
              <button onClick={() => window.location.reload()} className="py-4 bg-red-600 text-white font-black rounded-2xl uppercase tracking-widest">DISCONNECT</button>
              <button onClick={() => setShowLogoutConfirm(false)} className="py-3 text-slate-500 font-bold uppercase hover:text-white">REMAIN</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
