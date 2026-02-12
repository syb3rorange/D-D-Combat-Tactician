
import React from 'react';
import { Entity, GridSettings } from '../types';
import { COLORS } from '../constants';
import { User, BrickWall, Flame, Waves, TreePine, Mountain, Leaf, CircleDot } from 'lucide-react';

interface GridMapProps {
  entities: Entity[];
  settings: GridSettings;
  selectedEntityId: string | null;
  onCellClick: (x: number, y: number) => void;
}

const GridMap: React.FC<GridMapProps> = ({ 
  entities, 
  settings, 
  selectedEntityId, 
  onCellClick 
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

  const getTerrainIcon = (subtype?: string) => {
    switch(subtype) {
      case 'wall': return <BrickWall className="text-slate-300 opacity-60" />;
      case 'lava': return <Flame className="text-orange-200 animate-pulse" />;
      case 'water': return <Waves className="text-blue-200" />;
      case 'forest': return <TreePine className="text-emerald-400" />;
      case 'rock': return <Mountain className="text-zinc-400" />;
      case 'grass': return <Leaf className="text-green-300 opacity-40" />;
      case 'pit': return <CircleDot className="text-slate-800 scale-150" />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col items-center select-none p-10">
      {/* Column Labels */}
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
        {/* Row Labels */}
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

        {/* The Grid */}
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
            
            const isObstacle = entity.type === 'obstacle';
            
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
                } ${!isObstacle && entity.hp <= 0 ? 'grayscale opacity-60' : ''}`}
                style={{
                  left: entity.x * cellSize + (isObstacle ? 0 : 4),
                  top: entity.y * cellSize + (isObstacle ? 0 : 4),
                  width: cellSize - (isObstacle ? 0 : 8),
                  height: cellSize - (isObstacle ? 0 : 8),
                  backgroundColor: entity.type === 'player' && !entity.claimedBy ? 'rgba(51, 65, 85, 0.4)' : entity.color,
                  borderColor: isObstacle ? 'transparent' : (selectedEntityId === entity.id ? '#ffffff' : 'rgba(255,255,255,0.2)'),
                  borderStyle: entity.type === 'player' && !entity.claimedBy ? 'dashed' : 'solid',
                  boxShadow: isObstacle && entity.subtype === 'lava' ? '0 0 15px rgba(249, 115, 22, 0.5)' : undefined
                }}
              >
                {isObstacle ? (
                  getTerrainIcon(entity.subtype)
                ) : (
                  <>
                    {entity.type === 'player' && !entity.claimedBy ? (
                      <User size={Math.min(24, cellSize / 2)} className="text-slate-600" />
                    ) : (
                      <span className="text-white font-black text-[12px] pointer-events-none drop-shadow-md">
                        {entity.name.substring(0, 2).toUpperCase()}
                      </span>
                    )}
                    
                    {/* Mini HP bar on token */}
                    {(!entity.claimedBy && entity.type === 'player') ? null : (
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
              </div>
            );
          })}

          {/* Interactive Cell Overlay */}
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
