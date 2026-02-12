
import React from 'react';
import { Entity, GridSettings } from '../types';
import { COLORS } from '../constants';
import { 
  User, 
  BrickWall, 
  Flame, 
  Waves, 
  TreePine, 
  Mountain, 
  Leaf, 
  CircleDot, 
  DoorClosed, 
  DoorOpen,
  Package, 
  PackageOpen,
  Skull, 
  Square, 
  Landmark, 
  Droplets, 
  MoveUp, 
  Church,
  Key,
  ShieldAlert,
  EyeOff,
  ArrowRightCircle
} from 'lucide-react';

interface GridMapProps {
  entities: Entity[];
  settings: GridSettings;
  selectedEntityId: string | null;
  onCellClick: (x: number, y: number) => void;
  role: 'dm' | 'member';
  showEnemyHpToPlayers: boolean;
  isEditorOpen: boolean;
  highlightedEntityId?: string | null;
  localPlayerName?: string;
}

const GridMap: React.FC<GridMapProps> = ({ 
  entities, 
  settings, 
  selectedEntityId, 
  onCellClick,
  role,
  showEnemyHpToPlayers,
  isEditorOpen,
  highlightedEntityId,
  localPlayerName
}) => {
  const { rows, cols, cellSize } = settings;

  const getColLabel = (index: number) => {
    let label = '';
    let i = index;
    while (i >= 0) {
      label = String.fromCharCode((i % 26) + 65) + label;
      i = Math.floor(i / 26) - 1;
    }
    return label;
  };

  const getTerrainIcon = (entity: Entity) => {
    const { subtype, isOpen, linkedRoomId } = entity;
    const iconProps = { size: cellSize * 0.6, className: "opacity-80" };
    
    // Add visual indicator for doors with links for DM/Architect
    const showLinkIcon = role === 'dm' && linkedRoomId;

    switch(subtype) {
      case 'wall': return <BrickWall {...iconProps} className="text-slate-300 opacity-60" />;
      case 'lava': return <Flame {...iconProps} className="text-orange-200 animate-pulse" />;
      case 'water': return <Waves {...iconProps} className="text-blue-200" />;
      case 'forest': return <TreePine {...iconProps} className="text-emerald-400" />;
      case 'rock': return <Mountain {...iconProps} className="text-zinc-400" />;
      case 'grass': return <Leaf {...iconProps} className="text-green-300 opacity-40" />;
      // Fix: Changed 'split' to 'pit' to match valid subtypes in types.ts
      case 'pit': return <CircleDot {...iconProps} className="text-slate-800 scale-150" />;
      case 'door': return (
        <div className="relative">
          {isOpen ? <DoorOpen {...iconProps} className="text-amber-400" /> : <DoorClosed {...iconProps} className="text-amber-200" />}
          {showLinkIcon && <ArrowRightCircle size={14} className="absolute -top-1 -right-1 text-emerald-400 bg-slate-900 rounded-full" />}
        </div>
      );
      case 'chest': return isOpen ? <PackageOpen {...iconProps} className="text-amber-300" /> : <Package {...iconProps} className="text-yellow-400" />;
      case 'trap': return <Skull {...iconProps} className="text-red-400 animate-pulse" />;
      case 'pillar': return <Square {...iconProps} className="text-zinc-300 fill-zinc-700" />;
      case 'statue': return <Landmark {...iconProps} className="text-slate-300" />;
      case 'fountain': return <Droplets {...iconProps} className="text-cyan-200" />;
      case 'stairs': return <MoveUp {...iconProps} className="text-slate-100" />;
      case 'altar': return <Church {...iconProps} className="text-violet-300" />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col items-center select-none p-10">
      <div className="flex ml-10">
        {Array.from({ length: cols }).map((_, i) => (
          <div 
            key={`col-label-${i}`} 
            className="flex items-center justify-center text-xs font-black text-slate-600 uppercase"
            style={{ width: cellSize, height: 28 }}
          >
            {getColLabel(i)}
          </div>
        ))}
      </div>

      <div className="flex">
        <div className="flex flex-col">
          {Array.from({ length: rows }).map((_, i) => (
            <div 
              key={`row-label-${i}`} 
              className="flex items-center justify-center text-xs font-black text-slate-600 pr-3"
              style={{ height: cellSize, width: 38 }}
            >
              {i + 1}
            </div>
          ))}
        </div>

        <div 
          className="relative bg-slate-900 shadow-[0_0_50px_rgba(0,0,0,0.5)] border-2 border-slate-700 rounded-sm"
          style={{
            width: cols * cellSize,
            height: rows * cellSize,
            backgroundImage: `
              linear-gradient(to right, #1e293b 1px, transparent 1px),
              linear-gradient(to bottom, #1e293b 1px, transparent 1px)
            `,
            backgroundSize: `${cellSize}px ${cellSize}px`
          }}
        >
          {entities.map(entity => {
            if (entity.x >= cols || entity.y >= rows) return null;
            if (role === 'member' && entity.isVisibleToPlayers === false) return null;
            
            const isObstacle = entity.type === 'obstacle';
            const isKey = entity.type === 'key';
            const hideHpOnToken = entity.type === 'enemy' && role === 'member' && !showEnemyHpToPlayers;
            const isHighlighted = highlightedEntityId === entity.id;
            const isSelf = entity.claimedBy === localPlayerName;
            
            return (
              <div
                key={entity.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onCellClick(entity.x, entity.y);
                }}
                className={`absolute flex items-center justify-center transition-all duration-300 z-10 cursor-pointer ${
                  isObstacle ? 'rounded-none' : 'rounded-lg border shadow-lg'
                } ${
                  selectedEntityId === entity.id ? 'scale-110 ring-2 ring-white z-20' : 'hover:scale-105'
                } ${!isObstacle && entity.hp <= 0 ? 'grayscale opacity-60' : ''} ${isHighlighted ? 'animate-pulse ring-4 ring-amber-500 z-[50]' : ''}`}
                style={{
                  left: entity.x * cellSize + (isObstacle ? 0 : 4),
                  top: entity.y * cellSize + (isObstacle ? 0 : 4),
                  width: cellSize - (isObstacle ? 0 : 8),
                  height: cellSize - (isObstacle ? 0 : 8),
                  backgroundColor: isKey ? entity.color : (entity.type === 'player' && !entity.claimedBy ? 'rgba(51, 65, 85, 0.4)' : entity.color),
                  borderColor: isHighlighted ? '#f59e0b' : (isObstacle ? 'transparent' : (selectedEntityId === entity.id ? '#ffffff' : 'rgba(255,255,255,0.2)')),
                  borderStyle: entity.type === 'player' && !entity.claimedBy ? 'dashed' : 'solid',
                  boxShadow: isObstacle && entity.subtype === 'lava' ? '0 0 15px rgba(249, 115, 22, 0.5)' : undefined
                }}
              >
                {isSelf && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-lg pointer-events-none z-[60]">YOU</div>
                )}
                
                {isObstacle ? (
                  getTerrainIcon(entity)
                ) : isKey ? (
                  <Key size={cellSize * 0.6} className="text-white drop-shadow-lg" />
                ) : (
                  <>
                    {entity.type === 'player' && !entity.claimedBy ? (
                      <User size={Math.min(24, cellSize / 2)} className="text-slate-600" />
                    ) : (
                      <span className="text-white font-black text-[12px] pointer-events-none drop-shadow-md">
                        {entity.name.substring(0, 2).toUpperCase()}
                      </span>
                    )}
                    
                    {(!entity.claimedBy && entity.type === 'player') || hideHpOnToken ? null : (
                      <div className="absolute -bottom-1 left-0.5 right-0.5 h-1 bg-black/60 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${
                            (entity.hp / entity.maxHp) > 0.5 ? 'bg-green-400' : 
                            (entity.hp / entity.maxHp) > 0.2 ? 'bg-yellow-400' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.max(0, Math.min(100, (entity.hp / entity.maxHp) * 100))}%` }}
                        />
                      </div>
                    )}
                  </>
                )}
                {role === 'dm' && isEditorOpen && isObstacle && (
                    <div className="absolute inset-0 border border-amber-500/30 bg-amber-500/5"></div>
                )}
                {role === 'dm' && entity.isVisibleToPlayers === false && (
                    <div className="absolute -top-1 -right-1 bg-red-600 rounded-full p-0.5"><EyeOff size={10} className="text-white"/></div>
                )}
              </div>
            );
          })}

          {Array.from({ length: rows * cols }).map((_, idx) => {
            const x = idx % cols;
            const y = Math.floor(idx / cols);
            return (
              <div
                key={idx}
                className="absolute hover:bg-white/5 transition-colors cursor-crosshair group flex items-center justify-center"
                style={{
                  left: x * cellSize,
                  top: y * cellSize,
                  width: cellSize,
                  height: cellSize
                }}
                onClick={() => onCellClick(x, y)}
              >
                <span className="opacity-0 group-hover:opacity-100 text-[9px] text-slate-700 font-bold pointer-events-none select-none">
                  {getColLabel(x)}{y + 1}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GridMap;
