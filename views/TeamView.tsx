import React, { useState } from 'react';
import { Team, TeamMember, Role, PlayerStatus } from '../types';
import { TeamMemberCard } from '../components/TeamMemberCard';
import { UserPlus, Search, Shield, Users, Check, BarChart2, Star, Trophy } from 'lucide-react';

interface TeamViewProps {
  team: Team;
  members: TeamMember[];
  currentUserRole: Role;
}

export const TeamView: React.FC<TeamViewProps> = ({ team, members, currentUserRole }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCopied, setShowCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'ROSTER' | 'STATS'>('ROSTER');

  const isAdminOrCaptain = currentUserRole === Role.ADMIN || currentUserRole === Role.CAPTAIN;

  // Filter members
  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.nickname.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopyInvite = () => {
    const inviteLink = `https://paintballhub.com/invite/${team.id}`;
    navigator.clipboard.writeText(inviteLink).then(() => {
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
    }).catch(err => {
        alert('Не удалось скопировать: ' + inviteLink);
    });
  };

  const renderRoster = () => {
    // Grouping
    const leaders = filteredMembers.filter(m => m.role === Role.ADMIN || m.role === Role.CAPTAIN);
    const activePlayers = filteredMembers.filter(m => m.role === Role.PLAYER && m.status === PlayerStatus.ACTIVE);
    const others = filteredMembers.filter(m => m.role === Role.PLAYER && m.status !== PlayerStatus.ACTIVE);

    return (
      <div className="space-y-6">
        {leaders.length > 0 && (
          <section>
            <div className="flex items-center text-pb-subtext text-xs font-bold uppercase tracking-wider mb-2">
              <Shield size={12} className="mr-1" /> Руководство
            </div>
            {leaders.map(member => (
              <TeamMemberCard key={member.id} member={member} isViewerAdmin={isAdminOrCaptain} />
            ))}
          </section>
        )}
        {activePlayers.length > 0 && (
          <section>
            <div className="flex items-center text-pb-subtext text-xs font-bold uppercase tracking-wider mb-2">
              <Users size={12} className="mr-1" /> Основной состав
            </div>
            {activePlayers.map(member => (
              <TeamMemberCard key={member.id} member={member} isViewerAdmin={isAdminOrCaptain} />
            ))}
          </section>
        )}
        {others.length > 0 && (
          <section>
            <div className="flex items-center text-pb-subtext text-xs font-bold uppercase tracking-wider mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-pb-subtext mr-2"></span> Резерв / Другие
            </div>
            {others.map(member => (
              <TeamMemberCard key={member.id} member={member} isViewerAdmin={isAdminOrCaptain} />
            ))}
          </section>
        )}
        {filteredMembers.length === 0 && (
          <div className="text-center text-pb-subtext py-8">Никого не найдено</div>
        )}
      </div>
    );
  };

  const renderStats = () => {
    // Sort by MVP or Attendance
    const sortedByMVP = [...filteredMembers].sort((a, b) => (b.stats?.mvpCount || 0) - (a.stats?.mvpCount || 0));

    return (
      <div className="space-y-4">
        {sortedByMVP.map(member => {
            const stats = member.stats || { attendanceRate: 0, eventsAttended: 0, totalEvents: 0, mvpCount: 0, matchesPlayed: 0 };
            return (
                <div key={member.id} className="bg-pb-surface p-4 rounded-xl border border-white/5">
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center space-x-3">
                            <img src={member.avatar} className="w-10 h-10 rounded-full" alt={member.name} />
                            <div>
                                <div className="text-white font-bold text-sm">{member.name}</div>
                                <div className="text-pb-primary text-xs">@{member.nickname}</div>
                            </div>
                        </div>
                        {stats.mvpCount > 0 && (
                             <div className="flex items-center text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-lg">
                                <Trophy size={14} className="mr-1" />
                                <span className="text-xs font-bold">{stats.mvpCount} MVP</span>
                             </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-pb-subtext">Посещаемость</span>
                                <span className="text-white font-bold">{stats.attendanceRate}% ({stats.eventsAttended}/{stats.totalEvents})</span>
                            </div>
                            <div className="w-full bg-black/50 h-2 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-pb-primary rounded-full" 
                                    style={{ width: `${stats.attendanceRate}%` }}
                                ></div>
                            </div>
                        </div>
                        <div className="flex gap-4 pt-2 border-t border-white/5">
                             <div className="text-center flex-1">
                                 <div className="text-lg font-bold text-white">{stats.matchesPlayed}</div>
                                 <div className="text-[10px] text-pb-subtext uppercase">Игр</div>
                             </div>
                             {/* Placeholder for Win Rate if we tracked game results per player */}
                             <div className="text-center flex-1 border-l border-white/10">
                                 <div className="text-lg font-bold text-pb-secondary">1.4</div>
                                 <div className="text-[10px] text-pb-subtext uppercase">K/D Ratio</div>
                             </div>
                        </div>
                    </div>
                </div>
            );
        })}
      </div>
    );
  };

  return (
    <div className="pb-24 pt-4 px-4 h-full flex flex-col animate-fade-in relative">
      {/* Toast Notification */}
      {showCopied && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-pb-surface border border-pb-primary text-white px-4 py-2 rounded-full shadow-lg z-50 flex items-center animate-fade-in">
              <Check size={16} className="text-pb-primary mr-2" />
              <span className="text-xs font-bold">Ссылка скопирована!</span>
          </div>
      )}

      {/* Header */}
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-white mb-1">Команда</h1>
        <div className="flex justify-between items-end mb-4">
          <div>
            <h2 className="text-pb-primary font-bold text-lg leading-tight">{team.name}</h2>
            <p className="text-pb-subtext text-xs">{members.length} участников</p>
          </div>
          {isAdminOrCaptain && activeTab === 'ROSTER' && (
            <button 
              onClick={handleCopyInvite}
              className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-xl transition-colors active:scale-95"
            >
              <UserPlus size={20} />
            </button>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-pb-surface rounded-xl p-1 border border-white/5 mb-2">
            <button 
                onClick={() => setActiveTab('ROSTER')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'ROSTER' ? 'bg-white/10 text-white' : 'text-pb-subtext hover:text-white'}`}
            >
                <Users size={14} /> Состав
            </button>
            <button 
                onClick={() => setActiveTab('STATS')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'STATS' ? 'bg-white/10 text-white' : 'text-pb-subtext hover:text-white'}`}
            >
                <BarChart2 size={14} /> Статистика
            </button>
        </div>
      </header>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pb-subtext" size={18} />
        <input 
          type="text" 
          placeholder="Поиск игрока..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-pb-surface text-white pl-10 pr-4 py-3 rounded-xl border border-white/5 focus:outline-none focus:border-pb-primary transition-colors placeholder:text-pb-subtext/50"
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
         {activeTab === 'ROSTER' ? renderRoster() : renderStats()}
      </div>
    </div>
  );
};