
import React from 'react';
import { ChevronRight, Sparkles, HelpCircle, MousePointer2 } from 'lucide-react';

interface TutorialOverlayProps {
  role: 'dm' | 'member';
  currentStep: number;
  onFinish: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ role, currentStep, onFinish }) => {
  const dmSteps = [
    { title: "World Forge", description: "Open the Field Editor to start sculpting the land.", actionHint: "Open the Field Editor using the Amber Arrow tab on the left." },
    { title: "Placing Treasure", description: "Select the Chest brush to place a reward for your players.", actionHint: "Select the 'CHEST' brush in the editor panel." },
    { title: "Object Placement", description: "Click the grid to place the chest.", actionHint: "Click a cell on the grid to place the chest." },
    { title: "Inspecting Objects", description: "To link a key or change lock status, you must select the object while the Field Editor is open.", actionHint: "Click the Chest on the grid to open the Object Inspector." },
    { title: "Forging the Key", description: "Look at the Left Panel. It now shows 'Object Inspector'. Click the flashing amber 'FORGE LINKED KEY' button there.", actionHint: "In the LEFT EDITOR panel, click 'FORGE LINKED KEY'." },
    { title: "The Discovery", description: "The key is hidden by default. Reveal it when a player 'finds' it.", actionHint: "Find the 'Key to Chest' in the sidebar (right) and click 'REVEAL TO PLAYERS'." },
    { title: "Locking the Forge", description: "The world is set. Close the editor to return to session management.", actionHint: "Close the Field Editor using the arrow tab." },
    { title: "Heroes Needed", description: "Place slots for your players.", actionHint: "Summon a 'PLAYER' slot from the sidebar summoning panel." },
    { title: "The Threat", description: "An encounter needs a challenge.", actionHint: "Summon an 'ENEMY' from the sidebar summoning panel." },
    { title: "Master of Fate", description: "You are ready. Terrain, items, and actors are yours to command.", actionHint: "Click 'Finish Tutorial'." }
  ];

  const heroSteps = [
    { title: "Claiming Your Hero", description: "First, you must claim a place in the realm.", actionHint: "Click the highlighted 'Hero Slot' on the grid." },
    { title: "Scavenging", description: "Only your hero can be moved by you. To pick up an item, simply move your character onto its square.", actionHint: "Click your hero, then click the SHINY KEY to move onto it." },
    { title: "Interaction", description: "Great! You picked up the key. Now, see that Gate? Selecting interactive objects lets you examine them in the sidebar.", actionHint: "Click the LOCKED GATE on the grid." },
    { title: "Navigating the Field", description: "Interactive objects are often barriers. Move your hero up to the Gate so you can prepare to open it.", actionHint: "Click your Hero, then move to the cell with the LOCKED GATE." },
    { title: "Unlocking Paths", description: "Interactive objects are controlled via the Right Sidebar. Click 'OPEN' on the Gate card.", actionHint: "In the RIGHT SIDEBAR, find the 'Locked Gate' card and click its 'OPEN' button." },
    { title: "Journey Begins", description: "You've mastered exploration and interaction. May the dice be in your favor!", actionHint: "Click 'Finish Tutorial'." }
  ];

  const steps = role === 'dm' ? dmSteps : heroSteps;
  const step = steps[currentStep] || steps[steps.length - 1];
  const isLast = currentStep >= steps.length - 1;

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] w-full max-w-lg animate-in slide-in-from-bottom-10 duration-500">
      <div className="bg-slate-900 border-2 border-amber-500 rounded-[2rem] p-6 shadow-[0_0_50px_rgba(0,0,0,0.6)] relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10"><HelpCircle size={80} className="text-amber-500" /></div>
        <div className="flex items-start gap-4 relative z-10">
          <div className="bg-amber-500 p-3 rounded-2xl shadow-lg shadow-amber-500/30"><Sparkles className="text-white" size={24} /></div>
          <div className="flex-1 space-y-2">
            <h3 className="font-medieval text-xl text-amber-400">{step.title}</h3>
            <p className="text-slate-300 text-sm leading-relaxed">{step.description}</p>
            <div className="flex items-center gap-2 pt-2 text-amber-500 font-black text-[10px] uppercase tracking-widest bg-amber-500/10 p-2 rounded-lg border border-amber-500/30 shadow-inner">
              <MousePointer2 size={12} className="animate-bounce" /> {step.actionHint}
            </div>
          </div>
        </div>
        {isLast && <button onClick={onFinish} className="w-full mt-4 py-3 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-xl uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-2">Finish Tutorial <ChevronRight size={18} /></button>}
      </div>
    </div>
  );
};
