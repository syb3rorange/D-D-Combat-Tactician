
import React from 'react';
import { Entity } from '../types';
import { Shield, Heart, Trash2, Edit3, Plus, Minus, UserCircle, EyeOff, Eye, Package, Lock, Unlock, DoorOpen, DoorClosed, Key, Settings2 } from 'lucide-react';

interface EntityCardProps {
  entity: Entity;
  entities: Entity[];
  onUpdateHp: (id: string, newHp: number) => void;
  onUpdateEntity: (entity: Entity) => void;
  onDelete: (id: string) => void;
  onEdit: (entity: Entity) => void;
  onSelect: (id: string) => void;
  onAddLinkedKey?: (targetId: string) => void;
  isSelected: boolean;
  canEdit: boolean;
  role: 'dm' | 'member';
  showEnemyHpToPlayers: boolean;
  isEditorOpen?: boolean;
  isTutorialStep?: boolean;
}

const EntityCard: React.FC<EntityCardProps> = ({ 
  entity, 
  entities,
  onUpdateHp, 
  onUpdateEntity,
  onDelete, 
  onEdit, 
  onSelect,
  onAddLinkedKey,
  isSelected,
  canEdit,
  role,
  showEnemyHpToPlayers,
  isEditorOpen,
  isTutorialStep
}) => {
  const hpPercent = Math.max(0, Math.min(100, (entity.hp / entity.maxHp) * 100));
  const isPlayerSlot = entity.type === 'player';
  const isClaimed = !!entity.claimedBy;
  const isEnemy = entity.type === 'enemy';
  const isKey = entity.type === 'key';
  const isChest = entity.subtype === 'chest';
  const isDoor = entity.subtype === 'door';
  const isInteractive = isChest || isDoor;
  const shouldHideHp = isEnemy && role === 'member' && !showEnemyHpToPlayers;
  
  const getHpColor = () => {
    if (hpPercent > 50) return 'bg-green-500';
    if (hpPercent > 20) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const toggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (entity.isLocked && role === 'member') return;
    onUpdateEntity({ ...entity, isOpen: !entity.isOpen });
  };

  const toggleVisibility = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateEntity({ ...entity, isVisibleToPlayers: !entity.isVisibleToPlayers });
  };

  if (entity.type === 'obstacle' && !isInteractive) return null;
  if (role === 'member' && entity.isVisibleToPlayers === false) return null;

  return (
    <div 
      onClick={() => onSelect(entity.id)}
      className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative overflow-hidden group ${
        isSelected 
          ? 'border-white bg-slate-800 shadow-xl' 
          : 'border-slate-700 bg-slate-900/80 hover:border-slate-600'
      } ${isPlayerSlot && !isClaimed ? 'border-dashed opacity-70' : ''}`}
    >
      {role === 'dm' && entity.linkedEntityId && (
          <div className="absolute top-0 right-0 w-8 h-8 opacity-40 -rotate-12 translate-x-2 -translate-y-2" style={{ backgroundColor: entity.color }}></div>
      )}

      <div className="flex justify-between items-start mb-3">
        <div className="space-y-1">
          <h3 className="font-bold text-base text-white truncate w-40 flex items-center gap-2">
            {entity.name}
            {isClaimed && <UserCircle size={14} className="text-blue-400" />}
            {isInteractive && (entity.isLocked ? <Lock size={14} className="text-red-500" /> : (entity.isOpen ? <Unlock size={14} className="text-amber-400" /> : <Lock size={14} className="text-slate-500" />))}
            {isKey && <Key size={14} className="text-yellow-400" />}
          </h3>
          <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-md tracking-wider text-white ${
            entity.type === 'enemy' ? 'bg-red-600' : 
            entity.type === 'player' ? 'bg-green-600' : 
            isKey ? 'bg-yellow-600' :
            entity.type === 'obstacle' ? 'bg-amber-700' : 'bg-slate-600'
          }`}>
            {isPlayerSlot && !isClaimed ? 'EMPTY SLOT' : (entity.subtype || entity.type)}
          </span>
          {isClaimed && <p className="text-[10px] text-blue-400 font-bold uppercase">Player: {entity.claimedBy}</p>}
        </div>
        <div className="flex gap-1">
          {role === 'dm' && (
            <>
              <button onClick={toggleVisibility} className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors">
                 {entity.isVisibleToPlayers !== false ? <Eye size={16} /> : <EyeOff size={16} className="text-red-500" />}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(entity.id); }}
                className="p-1.5 hover:bg-red-900/40 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                title="Delete Entity"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {isInteractive && (
        <div className="space-y-3 mt-2">
          {isChest && (
            <div className="bg-black/40 rounded-lg p-3 border border-slate-700/50">
              <div className="flex items-center gap-2 mb-2">
                <Package size={14} className="text-amber-500" />
                <span className="text-[10px] font-black text-slate-500 uppercase">Chest Contents</span>
              </div>
              
              {role === 'dm' ? (
                <textarea 
                  value={entity.contents || ''}
                  onChange={(e) => onUpdateEntity({...entity, contents: e.target.value})}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Items, gold, or notes inside..."
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white h-16 resize-none focus:border-amber-500 outline-none"
                />
              ) : (
                <div className="min-h-[40px] flex items-center justify-center">
                  {entity.isOpen ? (
                    <p className="text-sm text-amber-200 font-medium italic">{entity.contents || 'The chest is empty.'}</p>
                  ) : (
                    <p className="text-[10px] text-slate-600 font-bold uppercase flex items-center gap-2">
                      {entity.isLocked ? <Lock size={12}/> : <Unlock size={12}/>} 
                      {entity.isLocked ? 'Locked' : 'Closed'}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <button 
            disabled={entity.isLocked && role === 'member'}
            onClick={toggleOpen}
            className={`w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border shadow-lg flex items-center justify-center gap-2 ${
              entity.isOpen 
                ? 'bg-amber-600/20 border-amber-600/50 text-amber-500 hover:bg-amber-600/30' 
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-50'
            } ${isTutorialStep ? 'animate-pulse ring-4 ring-amber-500' : ''}`}
          >
            {isDoor ? (entity.isOpen ? <DoorOpen size={16}/> : <DoorClosed size={16}/>) : (entity.isOpen ? <Unlock size={16}/> : <Lock size={16}/>)}
            {entity.isOpen ? 'OPEN' : (entity.isLocked ? 'LOCKED' : 'CLOSED')}
          </button>
        </div>
      )}

      {(isClaimed || isEnemy) && !isInteractive && !isKey && (
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
                  {shouldHideHp ? (
                    <span className="text-[10px] text-slate-500 font-black italic">HP HIDDEN</span>
                  ) : (
                    <span className="text-xs font-bold">{entity.hp} <span className="text-slate-500 text-[10px]">/ {entity.maxHp}</span></span>
                  )}
                </div>
                {entity.hp <= 0 && <span className="text-[10px] font-black text-red-500 animate-pulse">DOWN</span>}
              </div>
              {!shouldHideHp && (
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
                  <div 
                    className={`h-full transition-all duration-500 ${getHpColor()}`}
                    style={{ width: `${hpPercent}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {(canEdit || !isEnemy) && (
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={(e) => { e.stopPropagation(); onUpdateHp(entity.id, entity.hp - 1); }}
                className="flex items-center justify-center gap-1 py-1.5 bg-slate-800 hover:bg-red-900/30 rounded-lg text-[10px] text-red-400 font-black transition-colors"
              >
                <Minus size={12} /> DAMAGE
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onUpdateHp(entity.id, entity.hp + 1); }}
                disabled={entity.hp >= entity.maxHp}
                className="flex items-center justify-center gap-1 py-1.5 bg-slate-800 hover:bg-green-900/30 rounded-lg text-[10px] text-green-400 font-black transition-colors disabled:opacity-20 disabled:hover:bg-slate-800"
              >
                <Plus size={12} /> HEAL
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EntityCard;
