import React, { useState } from 'react';
import { Event, RSVPStatus, EventType, Role, Game } from '../types';
import { EVENT_COLORS, EVENT_LABELS, getEventIcon } from '../constants';
import { ChevronLeft, MapPin, Clock, Users, DollarSign, Check, X, HelpCircle, Swords, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface EventDetailViewProps {
  event: Event;
  currentUserRole: Role;
  onBack: () => void;
  onRsvp: (id: string, status: RSVPStatus) => void;
  onAddGame: (eventId: string, game: Omit<Game, 'id'>) => void;
}

export const EventDetailView: React.FC<EventDetailViewProps> = ({ event, currentUserRole, onBack, onRsvp, onAddGame }) => {
  const Icon = getEventIcon(event.type);
  const color = EVENT_COLORS[event.type];
  
  const [isAddingGame, setIsAddingGame] = useState(false);
  const [newGameTime, setNewGameTime] = useState('');
  const [newGameOpponent, setNewGameOpponent] = useState('');

  const isAdminOrCaptain = currentUserRole === Role.ADMIN || currentUserRole === Role.CAPTAIN;
  const isTournament = event.type === EventType.TOURNAMENT || event.type === EventType.CHAMPIONSHIP;

  const handleStatusChange = (status: RSVPStatus) => {
    onRsvp(event.id, status);
  };

  const handleAddGameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newGameTime && newGameOpponent) {
      onAddGame(event.id, {
        time: newGameTime,
        opponent: newGameOpponent
      });
      setNewGameTime('');
      setNewGameOpponent('');
      setIsAddingGame(false);
    }
  };

  return (
    <div className="min-h-screen bg-pb-background flex flex-col pb-safe animate-fade-in relative z-50">
      {/* Navbar */}
      <div className="sticky top-0 z-10 bg-pb-background/80 backdrop-blur-md px-4 py-3 flex items-center border-b border-white/5">
        <button onClick={onBack} className="p-2 -ml-2 text-white hover:bg-white/10 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <span className="ml-2 font-bold text-lg text-white">Событие</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Header Color Strip */}
        <div className="h-32 relative overflow-hidden flex items-end p-6" style={{ backgroundColor: `${color}20` }}>
          <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: color }}></div>
          <Icon size={120} className="absolute -right-6 -top-6 opacity-10" color={color} />
          
          <span 
             className="inline-block px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-black/40 backdrop-blur-md text-white border border-white/10 shadow-lg"
             style={{ borderColor: `${color}50`, color: color }}
          >
            {EVENT_LABELS[event.type]}
          </span>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Title & Time */}
          <div>
            <h1 className="text-2xl font-black text-white leading-tight mb-2">{event.title}</h1>
            <div className="flex items-center text-pb-subtext">
               <Clock size={16} className="mr-2 text-pb-primary" />
               <span className="text-lg">
                 {format(event.startDate, 'd MMMM yyyy, HH:mm', { locale: ru })}
               </span>
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div className="bg-pb-surface rounded-2xl p-4 border border-white/5">
              <p className="text-gray-300 leading-relaxed text-sm whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          )}

          {/* --- SCHEDULE SECTION (For Tournaments/Championships) --- */}
          {isTournament && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                 <div className="flex items-center text-white font-bold uppercase text-sm tracking-wider">
                    <Swords size={16} className="mr-2 text-pb-primary" /> Расписание игр
                 </div>
                 {isAdminOrCaptain && (
                   <button 
                     onClick={() => setIsAddingGame(true)}
                     className="text-xs bg-white/10 hover:bg-white/20 text-pb-primary px-3 py-1.5 rounded-lg transition-colors flex items-center"
                   >
                     <Plus size={12} className="mr-1" /> Добавить
                   </button>
                 )}
              </div>

              <div className="bg-pb-surface rounded-2xl p-4 border border-white/5 relative overflow-hidden">
                 
                 {/* Timeline Line */}
                 <div className="absolute top-4 bottom-4 left-[5.5rem] w-px bg-white/10"></div>

                 <div className="space-y-6 relative">
                    {(!event.schedule || event.schedule.length === 0) && (
                      <div className="text-center py-4 text-pb-subtext text-sm italic">
                        Расписание пока не добавлено
                      </div>
                    )}

                    {event.schedule?.sort((a,b) => a.time.localeCompare(b.time)).map((game) => (
                      <div key={game.id} className="flex items-center relative z-0 group">
                         {/* Time */}
                         <div className="w-16 font-mono font-bold text-pb-primary text-lg text-right pr-4 shrink-0">
                           {game.time}
                         </div>
                         
                         {/* Dot */}
                         <div className="w-2.5 h-2.5 rounded-full bg-pb-background border-2 border-pb-primary shrink-0 mr-4 z-10 shadow-[0_0_10px_rgba(0,230,118,0.5)]"></div>

                         {/* Opponent Card */}
                         <div className="flex-1 bg-white/5 p-3 rounded-xl border border-white/5 flex justify-between items-center">
                           <span className="font-bold text-white text-sm">{game.opponent}</span>
                           {game.score && <span className="text-pb-warning font-mono font-bold ml-2">{game.score}</span>}
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-pb-surface rounded-2xl p-4 border border-white/5">
               <div className="flex items-center text-pb-subtext mb-1">
                 <MapPin size={14} className="mr-1.5" /> Место
               </div>
               <div className="font-semibold text-white">{event.location || 'Не указано'}</div>
             </div>
             
             <div className="bg-pb-surface rounded-2xl p-4 border border-white/5">
               <div className="flex items-center text-pb-subtext mb-1">
                 <DollarSign size={14} className="mr-1.5" /> Стоимость
               </div>
               <div className="font-semibold text-white">{event.cost ? `${event.cost} ₽` : 'Бесплатно'}</div>
             </div>
          </div>

          {/* Attendees Preview */}
          <div className="bg-pb-surface rounded-2xl p-4 border border-white/5">
             <div className="flex justify-between items-center mb-4">
                <div className="flex items-center text-white font-bold">
                   <Users size={18} className="mr-2 text-pb-primary" />
                   Участники ({event.attendeesCount})
                </div>
                {event.maxAttendees && <span className="text-xs text-pb-subtext">из {event.maxAttendees}</span>}
             </div>
             {/* Mock avatars */}
             <div className="flex -space-x-2 overflow-hidden py-1">
               {[1,2,3,4,5].map(i => (
                 <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-pb-surface bg-white/10 flex items-center justify-center text-[10px] font-bold text-white">
                    P{i}
                 </div>
               ))}
               <div className="inline-block h-8 w-8 rounded-full ring-2 ring-pb-surface bg-pb-surface border border-white/10 flex items-center justify-center text-[10px] text-white">
                 +{event.attendeesCount - 5}
               </div>
             </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="bg-pb-surface border-t border-white/5 p-4 pb-safe space-y-3 shadow-[0_-5px_20px_rgba(0,0,0,0.3)]">
        <div className="text-center text-xs text-pb-subtext mb-1 uppercase font-bold tracking-widest">Ваше решение</div>
        <div className="flex gap-2">
           <button 
             onClick={() => handleStatusChange(RSVPStatus.CONFIRMED)}
             className={`flex-1 py-3 rounded-xl font-bold flex flex-col items-center justify-center transition-all ${
               event.rsvpStatus === RSVPStatus.CONFIRMED 
               ? 'bg-pb-primary text-pb-background shadow-[0_0_15px_rgba(0,230,118,0.4)]' 
               : 'bg-white/5 text-gray-400 hover:bg-white/10'
             }`}
           >
             <Check size={20} className="mb-0.5" />
             <span className="text-xs">Иду</span>
           </button>
           
           <button 
             onClick={() => handleStatusChange(RSVPStatus.DECLINED)}
             className={`flex-1 py-3 rounded-xl font-bold flex flex-col items-center justify-center transition-all ${
               event.rsvpStatus === RSVPStatus.DECLINED 
               ? 'bg-pb-danger text-white shadow-[0_0_15px_rgba(255,23,68,0.4)]' 
               : 'bg-white/5 text-gray-400 hover:bg-white/10'
             }`}
           >
             <X size={20} className="mb-0.5" />
             <span className="text-xs">Не иду</span>
           </button>
           
           <button 
             onClick={() => handleStatusChange(RSVPStatus.PENDING)}
             className={`flex-1 py-3 rounded-xl font-bold flex flex-col items-center justify-center transition-all ${
               event.rsvpStatus === RSVPStatus.PENDING 
               ? 'bg-pb-warning text-white shadow-[0_0_15px_rgba(255,109,0,0.4)]' 
               : 'bg-white/5 text-gray-400 hover:bg-white/10'
             }`}
           >
             <HelpCircle size={20} className="mb-0.5" />
             <span className="text-xs">Думаю</span>
           </button>
        </div>
      </div>

      {/* Add Game Modal Overlay */}
      {isAddingGame && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsAddingGame(false)}></div>
          <div className="relative w-full max-w-sm bg-pb-surface rounded-2xl border border-white/10 shadow-2xl p-6 animate-fade-in">
             <h3 className="text-lg font-bold text-white mb-4">Добавить игру</h3>
             <form onSubmit={handleAddGameSubmit} className="space-y-4">
               <div>
                  <label className="text-pb-subtext text-xs uppercase font-bold mb-1 block">Время начала</label>
                  <input 
                    type="time" 
                    value={newGameTime}
                    onChange={(e) => setNewGameTime(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white focus:border-pb-primary focus:outline-none [color-scheme:dark]"
                    required
                  />
               </div>
               <div>
                  <label className="text-pb-subtext text-xs uppercase font-bold mb-1 block">Соперник</label>
                  <input 
                    type="text" 
                    placeholder="Название команды"
                    value={newGameOpponent}
                    onChange={(e) => setNewGameOpponent(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white focus:border-pb-primary focus:outline-none"
                    required
                  />
               </div>
               <div className="flex gap-2 pt-2">
                 <button 
                   type="button" 
                   onClick={() => setIsAddingGame(false)}
                   className="flex-1 py-3 rounded-xl bg-white/5 text-pb-subtext hover:text-white transition-colors"
                 >
                   Отмена
                 </button>
                 <button 
                   type="submit" 
                   className="flex-1 py-3 rounded-xl bg-pb-primary text-pb-background font-bold hover:bg-opacity-90 transition-colors"
                 >
                   Сохранить
                 </button>
               </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};