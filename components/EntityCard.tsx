
import React from 'react';
import { Entity } from '../types';
import { Shield, Heart, Trash2, Edit3, Plus, Minus, UserCircle } from 'lucide-react';

interface EntityCardProps {
  entity: Entity;
  onUpdateHp: (id: string, newHp: number) => void;
  onDelete: (id: string) => void;
  onEdit: (entity: Entity) => void;
  onSelect: (id: string) => void;
  isSelected: boolean;
  canEdit: boolean;
}

const EntityCard: React.FC<EntityCardProps> = ({ 
  entity, 
  onUpdateHp, 
  onDelete, 
  onEdit, 
  onSelect,
  isSelected,
  canEdit
}) => {
  const hpPercent = Math.max(0, Math.min(100, (entity.hp / entity.maxHp) * 100));
  const isPlayerSlot = entity.type === 'player';
  const isClaimed = !!entity.claimedBy;
  
  const getHpColor = () => {
    if (hpPercent > 50) return 'bg-green-500';
    if (hpPercent > 20) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div 
      onClick={() => onSelect(entity.id)}
      className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
        isSelected 
          ? 'border-white bg-slate-800 shadow-xl' 
          : 'border-slate-700 bg-slate-900/80 hover:border-slate-600'
      } ${isPlayerSlot && !isClaimed ? 'border-dashed opacity-70' : ''}`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="space-y-1">
          <h3 className="font-bold text-base text-white truncate w-40 flex items-center gap-2">
            {entity.name}
            {isClaimed && <UserCircle size={14} className="text-blue-400" />}
          </h3>
          <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-md tracking-wider text-white ${
            entity.type === 'enemy' ? 'bg-red-600' : 
            entity.type === 'player' ? 'bg-green-600' : 'bg-slate-600'
          }`}>
            {isPlayerSlot && !isClaimed ? 'EMPTY SLOT' : entity.type}
          </span>
          {isClaimed && <p className="text-[10px] text-blue-400 font-bold uppercase">Player: {entity.claimedBy}</p>}
        </div>
        <div className="flex gap-1">
          {canEdit && (
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(entity); }}
              className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
            >
              <Edit3 size={16} />
            </button>
          )}
          {canEdit && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(entity.id); }}
              className="p-1.5 hover:bg-red-900/50 rounded-lg text-slate-400 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {(isClaimed || entity.type === 'enemy') && (
        <>
          <div className="flex items-center gap-4 mb-3 bg-black/20 p-2 rounded-lg">
            <div className="flex flex-col items-center justify-center min-w-[32px] border-r border-slate-700 pr-2">
              <Shield size={14} className="text-slate-400 mb-1" />
              <span className="text-xs font-black text-white">{entity.ac}</span>
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-end mb-1">
                <div className="flex items-center gap-1.5 text-white">
                  <Heart size={14} className={`${entity.hp <= 0 ? 'text-slate-600' : 'text-red-500 fill-red-500'}`} />
                  <span className="text-xs font-bold">{entity.hp} <span className="text-slate-500 text-[10px]">/ {entity.maxHp}</span></span>
                </div>
                {entity.hp <= 0 && <span className="text-[10px] font-black text-red-500 animate-pulse">DOWN</span>}
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
                <div 
                  className={`h-full transition-all duration-500 ${getHpColor()}`}
                  style={{ width: `${hpPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); onUpdateHp(entity.id, entity.hp - 1); }}
              className="flex items-center justify-center gap-1 py-1.5 bg-slate-800 hover:bg-red-900/30 rounded-lg text-[10px] text-red-400 font-black transition-colors"
            >
              <Minus size={12} /> DAMAGE
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onUpdateHp(entity.id, entity.hp + 1); }}
              className="flex items-center justify-center gap-1 py-1.5 bg-slate-800 hover:bg-green-900/30 rounded-lg text-[10px] text-green-400 font-black transition-colors"
            >
              <Plus size={12} /> HEAL
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default EntityCard;
