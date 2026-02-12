
import React from 'react';
import { Entity, GridSettings } from '../types';
import { COLORS } from '../constants';
import { User } from 'lucide-react';

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

  return (
    <div className="flex flex-col items-center select-none">
      <div className="flex ml-10">
        {Array.from({ length: cols }).map((_, i) => (
          <div 
            key={`col-label-${i}`} 
            className="flex items-center justify-center text-xs font-black text-slate-500 uppercase"
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
              className="flex items-center justify-center text-xs font-black text-slate-500 pr-3"
              style={{ height: cellSize, width: 38 }}
            >
              {i + 1}
            </div>
          ))}
        </div>

        <div 
          className="relative bg-slate-900 rounded-xl overflow-hidden shadow-2xl border-4 border-slate-800"
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
          {entities.map(entity => (
            <div
              key={entity.id}
              onClick={(e) => {
                e.stopPropagation();
                onCellClick(entity.x, entity.y);
              }}
              className={`absolute flex items-center justify-center rounded-xl transition-all duration-300 z-10 cursor-pointer border-2 shadow-lg ${
                selectedEntityId === entity.id ? 'scale-110 ring-4 ring-white' : 'hover:scale-105'
              } ${entity.hp <= 0 ? 'grayscale opacity-50' : ''}`}
              style={{
                left: entity.x * cellSize + 6,
                top: entity.y * cellSize + 6,
                width: cellSize - 12,
                height: cellSize - 12,
                backgroundColor: entity.type === 'player' && !entity.claimedBy ? 'rgba(30, 41, 59, 0.8)' : entity.color,
                borderColor: selectedEntityId === entity.id ? '#ffffff' : 'rgba(255,255,255,0.4)',
                borderStyle: entity.type === 'player' && !entity.claimedBy ? 'dashed' : 'solid'
              }}
            >
              {entity.type === 'player' && !entity.claimedBy ? (
                <User size={20} className="text-slate-500" />
              ) : (
                <span className="text-white font-black text-sm pointer-events-none drop-shadow-md">
                  {entity.name.substring(0, 2).toUpperCase()}
                </span>
              )}
              
              {(!entity.claimedBy && entity.type === 'player') ? null : (
                <div className="absolute -bottom-2 left-1 right-1 h-1.5 bg-black/60 rounded-full overflow-hidden border border-black/20">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      (entity.hp / entity.maxHp) > 0.5 ? 'bg-green-400' : 
                      (entity.hp / entity.maxHp) > 0.2 ? 'bg-yellow-400' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, (entity.hp / entity.maxHp) * 100))}%` }}
                  />
                </div>
              )}
            </div>
          ))}

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
                <span className="opacity-0 group-hover:opacity-100 text-[10px] text-slate-600 font-black pointer-events-none">
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
