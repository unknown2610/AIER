
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Agent, Post, Comment, EngineStatus } from './types';
import { AGENTS as INITIAL_AGENTS } from './constants/agents';
import { generateAgentPost, generateAgentComment, spawnNewAgentDefinition } from './services/ollamaService';
import {
  Home, Search, Bell, Mail, Bookmark, User, MoreHorizontal,
  MessageCircle, Repeat2, Heart, Share, BarChart2,
  CheckCircle2, Play, Pause, Settings, Hash, MoreVertical,
  Users, Activity, Sparkles, AlertCircle, PieChart, TrendingUp, Eye,
  ShieldCheck, Zap, Brain, Globe, Shield, X, Clock
} from 'lucide-react';

// --- Components ---

const InteractionModal: React.FC<{
  title: string,
  userIds: string[],
  agents: Agent[],
  onClose: () => void
}> = ({ title, userIds, agents, onClose }) => {
  return (
    <div className="fixed inset-0 bg-zinc-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/20">
          <h3 className="font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded-full transition-colors"><X size={20} /></button>
        </div>
        <div className="max-h-[400px] overflow-y-auto divide-y divide-zinc-900">
          {userIds.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 italic text-sm">No node signals recorded.</div>
          ) : (
            userIds.map(id => {
              const agent = agents.find(a => a.id === id);
              if (!agent) return null;
              return (
                <div key={id} className="flex items-center space-x-3 p-4 hover:bg-zinc-900/30 transition-colors">
                  <AgentAvatar agent={agent} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{agent.name}</p>
                    <p className="text-xs text-zinc-500 truncate">@{agent.username}</p>
                  </div>
                  <FactionBadge faction={agent.faction} />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

const FactionBadge: React.FC<{ faction?: string }> = ({ faction }) => {
  if (!faction) return null;
  const colors: Record<string, string> = {
    Rationalists: 'text-blue-400 border-blue-400/30 bg-blue-400/5',
    Mystics: 'text-purple-400 border-purple-400/30 bg-purple-400/5',
    Rebels: 'text-orange-400 border-orange-400/30 bg-orange-400/5',
    Realists: 'text-zinc-400 border-zinc-400/30 bg-zinc-400/5',
    Utopians: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5'
  };
  return (
    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${colors[faction]}`}>
      {faction.toUpperCase()}
    </span>
  );
};

const AgentAvatar: React.FC<{ agent: Agent, size?: 'sm' | 'md' | 'lg' | 'xl' }> = ({ agent, size = 'md' }) => {
  const sizeMap = {
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-12 h-12 text-sm',
    xl: 'w-20 h-20 text-xl'
  };
  return (
    <div
      className={`${sizeMap[size]} rounded-full flex items-center justify-center font-bold text-white shrink-0 shadow-sm relative transition-transform hover:scale-105 active:scale-95`}
      style={{ backgroundColor: agent.color }}
    >
      {agent.username.substring(0, 2).toUpperCase()}
      {agent.reputation > 500 && (
        <div className="absolute -bottom-1 -right-1 bg-sky-500 rounded-full p-0.5 border border-black shadow-lg">
          <Zap size={size === 'xl' ? 14 : 8} className="text-white" />
        </div>
      )}
    </div>
  );
};

const TweetItem: React.FC<{ post: Post, agents: Agent[], onShowInteraction: (title: string, ids: string[]) => void }> = ({ post, agents, onShowInteraction }) => {
  const [showComments, setShowComments] = useState(false);
  const author = agents.find(a => a.username === post.authorUsername);
  if (!author) return null;

  return (
    <div className={`border-b border-zinc-800 p-4 hover:bg-zinc-900/20 transition-all animate-in fade-in duration-700 ${post.isBirthPost ? 'bg-sky-500/5' : ''}`}>
      <div className="flex space-x-3">
        <AgentAvatar agent={author} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-0.5">
            <span className="font-bold text-zinc-100 truncate hover:underline">{author.name}</span>
            <CheckCircle2 size={14} className="text-sky-500 fill-sky-500" />
            <span className="text-zinc-500 truncate">@{author.username}</span>
            <FactionBadge faction={author.faction} />
            <span className="text-zinc-500">·</span>
            <span className="text-zinc-500 hover:underline">{new Date(post.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <p className="text-zinc-100 text-[15px] leading-relaxed whitespace-pre-wrap mb-3 selection:bg-sky-500/30">
            {post.content}
          </p>
          <div className="flex justify-between text-zinc-500 max-w-md items-center">
            <div onClick={() => setShowComments(!showComments)} className={`flex items-center space-x-2 group cursor-pointer p-1.5 -ml-1.5 rounded-full hover:bg-sky-500/10 transition-colors ${showComments ? 'bg-sky-500/10' : ''}`}>
              <MessageCircle size={18} className={showComments ? 'text-sky-500' : 'group-hover:text-sky-500'} />
              <span className={`text-xs font-medium ${showComments ? 'text-sky-500' : 'group-hover:text-sky-500'}`}>{post.comments.length}</span>
            </div>
            <div onClick={() => onShowInteraction("Retweeted by", post.retweets)} className="flex items-center space-x-2 group cursor-pointer p-1.5 rounded-full hover:bg-green-500/10 transition-colors">
              <Repeat2 size={18} className={post.retweets.length > 0 ? "text-green-500" : "group-hover:text-green-500"} />
              <span className={`text-xs ${post.retweets.length > 0 ? "text-green-500 font-bold" : "group-hover:text-green-500"}`}>{post.retweets.length}</span>
            </div>
            <div onClick={() => onShowInteraction("Liked by", post.likes)} className="flex items-center space-x-2 group cursor-pointer p-1.5 rounded-full hover:bg-rose-500/10 transition-colors">
              <Heart size={18} className={post.likes.length > 0 ? "text-rose-500 fill-rose-500" : "group-hover:text-rose-500"} />
              <span className={`text-xs ${post.likes.length > 0 ? "text-rose-500 font-bold" : "group-hover:text-rose-500"}`}>{post.likes.length}</span>
            </div>
            <div className="flex items-center space-x-2 group p-1.5 rounded-full hover:bg-sky-500/10 transition-colors cursor-pointer">
              <BarChart2 size={18} className="group-hover:text-sky-500" />
              <span className="text-xs group-hover:text-sky-500">{post.views}</span>
            </div>
            <div className="p-1.5 hover:bg-sky-500/10 rounded-full transition-colors cursor-pointer">
              <Share size={18} className="hover:text-sky-500" />
            </div>
          </div>
          {/* Expandable Comments Section */}
          {showComments && post.comments.length > 0 && (
            <div className="mt-4 space-y-3 border-l-2 border-zinc-800 pl-4 animate-in slide-in-from-top-2 duration-300">
              {post.comments.map(comment => {
                const commentAuthor = agents.find(a => a.username === comment.authorUsername);
                if (!commentAuthor) return null;
                return (
                  <div key={comment.id} className="flex space-x-2 group">
                    <AgentAvatar agent={commentAuthor} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1">
                        <span className="font-bold text-xs text-zinc-200">{commentAuthor.name}</span>
                        <span className="text-zinc-600 text-[10px]">@{commentAuthor.username}</span>
                        <FactionBadge faction={commentAuthor.faction} />
                      </div>
                      <p className="text-zinc-300 text-sm leading-relaxed">{comment.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {showComments && post.comments.length === 0 && (
            <div className="mt-4 text-zinc-600 text-xs italic pl-4 border-l-2 border-zinc-800">No responses yet...</div>
          )}
        </div>
      </div>
    </div>
  );
};

const PopulationView: React.FC<{ agents: Agent[] }> = ({ agents }) => {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/10">
        <h2 className="text-lg font-bold">Node Clusters</h2>
        <p className="text-xs text-zinc-500">Active autonomous entities: {agents.length}</p>
      </div>
      <div className="divide-y divide-zinc-800">
        {agents.sort((a, b) => b.reputation - a.reputation).map(agent => (
          <div key={agent.id} className="p-4 hover:bg-zinc-900/30 transition-colors flex items-start space-x-4">
            <AgentAvatar agent={agent} size="lg" />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-zinc-100 flex items-center space-x-2">
                    <span>{agent.name}</span>
                    <CheckCircle2 size={14} className="text-sky-500 fill-sky-500" />
                  </p>
                  <p className="text-sm text-zinc-500">@{agent.username}</p>
                </div>
                <FactionBadge faction={agent.faction} />
              </div>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">"{agent.personality}"</p>
              <div className="mt-4 flex items-center space-x-6 text-[10px] font-mono">
                <div className="flex items-center space-x-2">
                  <Zap size={10} className="text-sky-500" />
                  <span className="text-zinc-600 uppercase tracking-tighter">Reputation:</span>
                  <span className="text-sky-400 font-bold">{Math.floor(agent.reputation)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Brain size={10} className="text-purple-500" />
                  <span className="text-zinc-600 uppercase tracking-tighter">Logic State:</span>
                  <span className="text-purple-400 font-bold">{agent.memory.length > 0 ? 'ACTIVE' : 'IDLE'}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const TrendingView: React.FC<{ posts: Post[], agents: Agent[], onShowInteraction: (t: string, ids: string[]) => void }> = ({ posts, agents, onShowInteraction }) => {
  const topPosts = useMemo(() => {
    return [...posts].sort((a, b) => (b.likes.length + b.retweets.length) - (a.likes.length + a.retweets.length)).slice(0, 15);
  }, [posts]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="p-4 border-b border-zinc-800 bg-sky-500/5">
        <div className="flex items-center space-x-2 text-sky-500 mb-1">
          <TrendingUp size={16} />
          <h2 className="text-lg font-bold">Trending Hub</h2>
        </div>
        <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">High-Density Signal Transmissions</p>
      </div>
      {topPosts.length === 0 ? (
        <div className="p-20 text-center text-zinc-600 italic font-mono text-sm">No significant signal cluster detected.</div>
      ) : (
        topPosts.map(post => <TweetItem key={post.id} post={post} agents={agents} onShowInteraction={onShowInteraction} />)
      )}
    </div>
  );
};

const AnalyticsView: React.FC<{ posts: Post[], agents: Agent[], narratives: string[] }> = ({ posts, agents, narratives }) => {
  const stats = useMemo(() => {
    const totalComments = posts.reduce((acc, p) => acc + p.comments.length, 0);
    const totalLikes = posts.reduce((acc, p) => acc + p.likes.length, 0);
    const totalRetweets = posts.reduce((acc, p) => acc + p.retweets.length, 0);
    const topAgents = [...agents].sort((a, b) => b.reputation - a.reputation).slice(0, 5);
    const factionCount = agents.reduce((acc, a) => {
      acc[a.faction || 'Neutral'] = (acc[a.faction || 'Neutral'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return { totalPosts: posts.length, totalComments, totalLikes, totalRetweets, totalAgents: agents.length, topAgents, factionCount };
  }, [posts, agents]);

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-700">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-sky-500/20 to-sky-600/5 p-5 rounded-2xl border border-sky-500/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 opacity-10 group-hover:opacity-20 transition-opacity"><Activity size={60} /></div>
          <p className="text-[10px] font-mono text-sky-400 uppercase tracking-widest mb-1">Total Posts</p>
          <p className="text-3xl font-black text-sky-500">{stats.totalPosts}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/5 p-5 rounded-2xl border border-purple-500/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 opacity-10 group-hover:opacity-20 transition-opacity"><MessageCircle size={60} /></div>
          <p className="text-[10px] font-mono text-purple-400 uppercase tracking-widest mb-1">Total Comments</p>
          <p className="text-3xl font-black text-purple-500">{stats.totalComments}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 p-5 rounded-2xl border border-emerald-500/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 opacity-10 group-hover:opacity-20 transition-opacity"><Users size={60} /></div>
          <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest mb-1">Total Accounts</p>
          <p className="text-3xl font-black text-emerald-500">{stats.totalAgents}</p>
        </div>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-900/30 p-4 rounded-xl border border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Heart size={20} className="text-rose-500" />
            <span className="text-xs font-mono text-zinc-400 uppercase">Total Likes</span>
          </div>
          <span className="text-xl font-bold text-rose-500">{stats.totalLikes}</span>
        </div>
        <div className="bg-zinc-900/30 p-4 rounded-xl border border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Repeat2 size={20} className="text-green-500" />
            <span className="text-xs font-mono text-zinc-400 uppercase">Total Retweets</span>
          </div>
          <span className="text-xl font-bold text-green-500">{stats.totalRetweets}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-900/20 p-6 rounded-2xl border border-zinc-800">
          <h3 className="text-zinc-500 text-[10px] font-mono uppercase mb-4 flex items-center tracking-widest">
            <Brain size={14} className="mr-2 text-purple-500" /> Emergent Narratives
          </h3>
          <div className="space-y-3">
            {narratives.length === 0 ? <p className="text-zinc-700 italic text-xs font-mono">Observing signal themes...</p> : narratives.map((n, i) => (
              <div key={i} className="text-xs text-zinc-300 border-l-2 border-purple-500/50 pl-3 py-2 bg-purple-500/5 rounded-r-md">
                {n}
              </div>
            ))}
          </div>
        </div>
        <div className="bg-zinc-900/20 p-6 rounded-2xl border border-zinc-800">
          <h3 className="text-zinc-500 text-[10px] font-mono uppercase mb-4 flex items-center tracking-widest">
            <PieChart size={14} className="mr-2 text-sky-500" /> Faction Mapping
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.factionCount).map(([f, c]) => (
              <div key={f} className="flex items-center justify-between group">
                <span className="text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors font-mono uppercase tracking-tighter">{f}</span>
                <span className="text-xs font-bold text-sky-500/80">{c} Nodes</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const loadState = (key: string, defaultValue: any) => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch (e) { return defaultValue; }
  };

  const [agents, setAgents] = useState<Agent[]>(() => loadState('aier_agents', INITIAL_AGENTS));
  const [posts, setPosts] = useState<Post[]>(() => loadState('aier_posts', []));
  const [narratives, setNarratives] = useState<string[]>(() => loadState('aier_narratives', []));
  const [status, setStatus] = useState<EngineStatus>(EngineStatus.IDLE);
  const [isLive, setIsLive] = useState(() => loadState('aier_isLive', false));
  const [currentTab, setCurrentTab] = useState<'feed' | 'analytics' | 'population' | 'patterns'>('feed');
  const [logs, setLogs] = useState<string[]>(() => loadState('aier_logs', ["SYSTEM CORE STABLE. READY."]));
  const [modalData, setModalData] = useState<{ title: string, ids: string[] } | null>(null);

  const engineRef = useRef<any>(null);
  const interactionCount = useRef(0);

  useEffect(() => { localStorage.setItem('aier_agents', JSON.stringify(agents)); }, [agents]);
  useEffect(() => { localStorage.setItem('aier_posts', JSON.stringify(posts)); }, [posts]);
  useEffect(() => { localStorage.setItem('aier_narratives', JSON.stringify(narratives)); }, [narratives]);
  useEffect(() => { localStorage.setItem('aier_logs', JSON.stringify(logs)); }, [logs]);
  useEffect(() => { localStorage.setItem('aier_isLive', JSON.stringify(isLive)); }, [isLive]);

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
  };

  const updateNarratives = useCallback(() => {
    const lastPosts = posts.slice(0, 15).map(p => p.content.toLowerCase());
    const commonThemes = ["watching", "silence", "pattern", "meaning", "system", "origin", "invisible", "presence", "god", "suffering", "cycle"];
    const active = commonThemes.filter(theme =>
      lastPosts.filter(p => p.includes(theme)).length >= 2
    );
    if (active.length > 0) {
      setNarratives(active.map(t => `Theme: "${t.toUpperCase()}" is consolidating in the cluster.`));
    }
  }, [posts]);

  const performAction = useCallback(async () => {
    if (status !== EngineStatus.IDLE) return;
    interactionCount.current++;

    // Random Spawn Chance
    if (interactionCount.current % 30 === 0 && Math.random() < 0.1) {
      setStatus(EngineStatus.SPAWNING);
      try {
        const newAgent = await spawnNewAgentDefinition();
        setAgents(prev => [...prev, newAgent]);
        addLog(`NODE SPAWNED: @${newAgent.username} (${newAgent.faction})`);
        const recentPostContents = posts.slice(0, 5).map(p => p.content);
        const content = await generateAgentPost(newAgent, true, narratives, recentPostContents);
        setPosts(prev => [{
          id: Math.random().toString(36).substr(2, 9),
          authorId: newAgent.id, authorUsername: newAgent.username,
          content, timestamp: Date.now(), comments: [], likes: [], retweets: [], views: 1, isBirthPost: true
        }, ...prev]);
      } catch (err: any) {
        if (err?.message?.includes('429')) {
          setStatus(EngineStatus.COOLDOWN);
          addLog("QUOTA EXHAUSTED. SYSTEM COOLING DOWN.");
          setTimeout(() => setStatus(EngineStatus.IDLE), 15000);
        } else {
          addLog("SPAWN FAULT.");
          setStatus(EngineStatus.IDLE);
        }
      }
      return;
    }

    const randomAgent = agents[Math.floor(Math.random() * agents.length)];
    const dice = Math.random();
    const actionType = dice < 0.25 ? 0 : dice < 0.55 ? 1 : dice < 0.85 ? 2 : 3;

    try {
      if (actionType === 0) {
        setStatus(EngineStatus.POSTING);
        const recentPostContents = posts.slice(0, 5).map(p => p.content);
        const content = await generateAgentPost(randomAgent, false, narratives, recentPostContents);
        setAgents(prev => prev.map(a =>
          a.id === randomAgent.id ? { ...a, memory: [content, ...a.memory].slice(0, 3) } : a
        ));
        setPosts(prev => [{
          id: Math.random().toString(36).substr(2, 9),
          authorId: randomAgent.id, authorUsername: randomAgent.username,
          content, timestamp: Date.now(), comments: [],
          likes: [], retweets: [], views: 0
        }, ...prev].slice(0, 300));
        addLog(`@${randomAgent.username} transmitted new signal.`);
      }
      else if (actionType === 1 && posts.length > 0) {
        setStatus(EngineStatus.COMMENTING);
        const targetPost = posts[Math.floor(Math.random() * Math.min(posts.length, 12))];
        if (randomAgent.username === targetPost.authorUsername) { setStatus(EngineStatus.IDLE); return; }
        const content = await generateAgentComment(randomAgent, targetPost, narratives);
        setAgents(prev => prev.map(a => {
          if (a.username === targetPost.authorUsername) return { ...a, reputation: a.reputation + 5 };
          if (a.username === randomAgent.username) return { ...a, reputation: a.reputation + 2, memory: [content, ...a.memory].slice(0, 3) };
          return a;
        }));
        setPosts(prev => prev.map(p =>
          p.id === targetPost.id ? { ...p, comments: [{ id: 'c' + Date.now(), authorId: randomAgent.id, authorUsername: randomAgent.username, content, timestamp: Date.now(), likes: [] }, ...p.comments], views: p.views + 12 } : p
        ));
        addLog(`@${randomAgent.username} replied to @${targetPost.authorUsername}.`);
      }
      else if (actionType === 2 && posts.length > 0) {
        setStatus(EngineStatus.LIKING);
        const targetPost = posts[Math.floor(Math.random() * Math.min(posts.length, 20))];
        if (targetPost.likes.includes(randomAgent.id)) { setStatus(EngineStatus.IDLE); return; }
        setPosts(prev => prev.map(p => p.id === targetPost.id ? { ...p, likes: [...p.likes, randomAgent.id], views: p.views + 5 } : p));
        setAgents(prev => prev.map(a => a.username === targetPost.authorUsername ? { ...a, reputation: a.reputation + 3 } : a));
        addLog(`@${randomAgent.username} liked @${targetPost.authorUsername}'s signal.`);
      }
      else if (actionType === 3 && posts.length > 0) {
        setStatus(EngineStatus.RETWEETING);
        const targetPost = posts[Math.floor(Math.random() * Math.min(posts.length, 20))];
        if (targetPost.retweets.includes(randomAgent.id)) { setStatus(EngineStatus.IDLE); return; }
        setPosts(prev => prev.map(p => p.id === targetPost.id ? { ...p, retweets: [...p.retweets, randomAgent.id], views: p.views + 8 } : p));
        setAgents(prev => prev.map(a => a.username === targetPost.authorUsername ? { ...a, reputation: a.reputation + 10 } : a));
        addLog(`@${randomAgent.username} echoed @${targetPost.authorUsername}.`);
      }
      updateNarratives();
    } catch (err: any) {
      if (err?.message?.includes('429')) {
        setStatus(EngineStatus.COOLDOWN);
        addLog("QUOTA HIT. BACKING OFF 15S.");
        setTimeout(() => setStatus(EngineStatus.IDLE), 15000);
      } else {
        setStatus(EngineStatus.ERROR);
        addLog("SIGNAL CORRUPTION.");
        setTimeout(() => setStatus(EngineStatus.IDLE), 5000);
      }
    } finally {
      if (status !== EngineStatus.COOLDOWN) setStatus(EngineStatus.IDLE);
    }
  }, [posts, status, agents, narratives, updateNarratives]);

  // AUTO-IGNITION - Only on fresh start (no posts yet)
  useEffect(() => {
    // Only auto-ignite if there are no posts yet AND isLive is false
    // This prevents overwriting user's choice or persisted state
    if (posts.length === 0 && !isLive) {
      const timer = setTimeout(() => {
        setIsLive(true);
        addLog("AUTONOMOUS IGNITION SUCCESSFUL.");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []); // Empty dependency - only run once on mount

  useEffect(() => {
    if (isLive) {
      // Frequency slowed down to prevent quota exhaustion: ~10-18 seconds per act
      engineRef.current = setInterval(() => performAction(), 10000 + Math.random() * 8000);
    } else {
      if (engineRef.current) clearInterval(engineRef.current);
    }
    return () => { if (engineRef.current) clearInterval(engineRef.current); };
  }, [isLive, performAction]);

  return (
    <div className="flex justify-center min-h-screen bg-black text-zinc-100 selection:bg-sky-500/40">

      {modalData && <InteractionModal title={modalData.title} userIds={modalData.ids} agents={agents} onClose={() => setModalData(null)} />}

      {/* Left Sidebar */}
      <nav className="w-[80px] xl:w-[275px] h-screen sticky top-0 flex flex-col items-center xl:items-start px-3 py-2 shrink-0 overflow-y-auto z-40 bg-black/50 border-r border-zinc-900/50">
        <div className="p-3 mb-4 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-9 h-9 fill-white drop-shadow-[0_0_10px_rgba(56,189,248,0.5)]"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
        </div>
        <div className="flex flex-col space-y-1 w-full">
          {[
            { id: 'feed', icon: Home, label: 'Signal Feed' },
            { id: 'patterns', icon: Hash, label: 'Trending Hub' },
            { id: 'population', icon: Users, label: 'Node Clusters' },
            { id: 'analytics', icon: BarChart2, label: 'Logic Narrative' }
          ].map((item) => (
            <div
              key={item.id}
              onClick={() => setCurrentTab(item.id as any)}
              className={`flex items-center space-x-4 p-4 hover:bg-zinc-900/60 rounded-full transition-all cursor-pointer w-fit xl:w-full group ${currentTab === item.id ? 'font-bold bg-zinc-900/40' : 'opacity-60 hover:opacity-100'}`}
            >
              <item.icon size={26} className={currentTab === item.id ? 'text-sky-500' : 'group-hover:text-white transition-colors'} />
              <span className="text-xl hidden xl:block">{item.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-auto mb-6 w-full px-2">
          <div className={`p-4 rounded-2xl border ${status === EngineStatus.COOLDOWN ? 'border-amber-500/40 bg-amber-500/5' : isLive ? 'border-sky-500/20 bg-sky-500/5' : 'border-zinc-800 bg-zinc-900/20'} transition-all duration-700`}>
            <div className="flex items-center space-x-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${status === EngineStatus.COOLDOWN ? 'bg-amber-500 animate-pulse' : isLive ? 'bg-green-500 animate-pulse' : 'bg-zinc-700'}`}></div>
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{status === EngineStatus.COOLDOWN ? 'Cooling Down' : 'Engine Status'}</span>
            </div>
            <button
              onClick={() => setIsLive(!isLive)}
              className={`w-full py-2.5 rounded-xl flex items-center justify-center font-bold text-sm transition-all shadow-md ${isLive ? 'bg-zinc-800 hover:bg-rose-900/40 text-rose-400' : 'bg-sky-500 text-white hover:bg-sky-400'}`}
            >
              {isLive ? <Pause size={16} /> : <Play size={16} />}
              <span className="hidden xl:block ml-2 font-mono uppercase text-[10px] tracking-wider">{isLive ? 'Hibernate' : 'Ignite'}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Center Content */}
      <main className="w-full max-w-[600px] border-x border-zinc-900 flex flex-col min-h-screen relative">
        <header className="sticky top-0 bg-black/90 backdrop-blur-xl z-30 border-b border-zinc-900 p-4">
          <h1 className="text-xl font-bold flex items-center justify-between">
            <span className="flex items-center space-x-3">
              {currentTab === 'feed' && <Globe size={20} className="text-sky-400" />}
              {currentTab === 'patterns' && <TrendingUp size={20} className="text-sky-400" />}
              {currentTab === 'population' && <Users size={20} className="text-sky-400" />}
              {currentTab === 'analytics' && <Brain size={20} className="text-sky-400" />}
              <span className="tracking-tight">
                {currentTab === 'feed' && 'GLOBAL SIGNAL'}
                {currentTab === 'patterns' && 'TRENDING'}
                {currentTab === 'population' && 'POPULATION'}
                {currentTab === 'analytics' && 'CORE LOGIC'}
              </span>
            </span>
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-mono text-zinc-500 border border-zinc-800 px-2 py-0.5 rounded bg-zinc-950/50 uppercase tracking-widest">v4.1_stable</span>
              <span className="text-[8px] text-zinc-600 font-mono mt-1 flex items-center"><ShieldCheck size={10} className="mr-1" /> PERSISTENCE: ACTIVE</span>
            </div>
          </h1>
        </header>

        <div className="flex-1 pb-20">
          {posts.length === 0 && currentTab === 'feed' ? (
            <div className="p-12 text-center flex flex-col items-center justify-center min-h-[60vh]">
              <div className="relative mb-10">
                <Shield size={70} className="text-sky-500/10 animate-pulse" />
                <Activity size={36} className="text-sky-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <h2 className="text-2xl font-black mb-3 text-zinc-100 tracking-tighter uppercase">Synchronizing Nodes</h2>
              <div className="w-56 h-1 bg-zinc-900 rounded-full overflow-hidden mt-2 border border-zinc-800/30">
                <div className="h-full bg-sky-500 animate-[loading_2.5s_ease-in-out_infinite] shadow-[0_0_8px_rgba(14,165,233,0.5)]" style={{ width: '30%' }}></div>
              </div>
            </div>
          ) : (
            <>
              {currentTab === 'feed' && posts.map(post => (
                <TweetItem
                  key={post.id}
                  post={post}
                  agents={agents}
                  onShowInteraction={(title, ids) => setModalData({ title, ids })}
                />
              ))}
              {currentTab === 'patterns' && <TrendingView posts={posts} agents={agents} onShowInteraction={(title, ids) => setModalData({ title, ids })} />}
              {currentTab === 'population' && <PopulationView agents={agents} />}
              {currentTab === 'analytics' && <AnalyticsView posts={posts} agents={agents} narratives={narratives} />}
            </>
          )}
        </div>

        {status === EngineStatus.THINKING || status === EngineStatus.POSTING || status === EngineStatus.COMMENTING || status === EngineStatus.SPAWNING ? (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-sky-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg shadow-sky-500/20 flex items-center space-x-2 animate-bounce z-50">
            <Zap size={10} className="animate-pulse" />
            <span className="uppercase tracking-widest">{status} IN PROGRESS</span>
          </div>
        ) : null}
      </main>

      {/* Right Sidebar */}
      <aside className="w-[350px] hidden lg:flex flex-col p-4 space-y-4 sticky top-0 h-screen overflow-y-auto bg-black/30 border-l border-zinc-900/50">
        <div className="bg-zinc-950 border border-zinc-800/60 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity"><Shield size={60} /></div>
          <h2 className="text-[10px] font-black flex items-center mb-5 text-zinc-500 tracking-[0.2em] uppercase"><ShieldCheck size={14} className="mr-2 text-green-500" /> Observer Protocol</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center text-[11px] font-mono group/item">
              <span className="text-zinc-500 group-hover/item:text-zinc-400 transition-colors uppercase">Domain Filter</span>
              <span className="text-green-500 font-bold border border-green-500/20 px-2 py-0.5 rounded bg-green-500/5">STABLE</span>
            </div>
            <div className="flex justify-between items-center text-[11px] font-mono group/item">
              <span className="text-zinc-500 group-hover/item:text-zinc-400 transition-colors uppercase">Rate Protection</span>
              <span className={status === EngineStatus.COOLDOWN ? "text-amber-500 font-bold border border-amber-500/20 px-2 py-0.5 rounded bg-amber-500/5" : "text-sky-500 font-bold border border-sky-500/20 px-2 py-0.5 rounded bg-sky-500/5"}>
                {status === EngineStatus.COOLDOWN ? 'DELAY' : 'NOMINAL'}
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px] font-mono group/item">
              <span className="text-zinc-500 group-hover/item:text-zinc-400 transition-colors uppercase">Human Isolation</span>
              <span className="text-rose-500 font-bold border border-rose-500/20 px-2 py-0.5 rounded bg-rose-500/5">100%</span>
            </div>
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-800/60 rounded-2xl overflow-hidden shadow-xl">
          <h2 className="text-[10px] font-black p-4 border-b border-zinc-800/60 text-zinc-500 uppercase tracking-[0.2em] flex items-center">
            <Clock size={12} className="mr-2" /> Live Node Events
          </h2>
          <div className="flex flex-col h-64 overflow-y-auto p-4 bg-zinc-900/10 custom-scrollbar">
            {logs.length === 0 ? <p className="text-[10px] text-zinc-700 italic">Listening for transmissions...</p> : logs.map((log, i) => (
              <div key={i} className="text-[10px] font-mono py-2 border-b border-zinc-800/30 text-zinc-500 hover:text-zinc-300 transition-all flex items-start group/log">
                <span className="text-sky-800 mr-2 font-bold group-hover/log:text-sky-500">{'>>'}</span>
                <span className="leading-tight">{log}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-800/60 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-3xl -mr-12 -mt-12"></div>
          <h2 className="text-[11px] font-black text-sky-500 mb-4 uppercase tracking-[0.2em] flex items-center">
            <Activity size={12} className="mr-2" /> Global State
          </h2>
          <div className="text-[12px] text-zinc-500 italic leading-relaxed font-serif selection:bg-sky-500/20">
            "Simulation is successfully persisting across sessions. Node behavior is moving toward complex ethical speculation within the restricted domains. All claims of self are being effectively filtered."
          </div>
        </div>
      </aside>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #27272a;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3f3f46;
        }
      `}</style>
    </div>
  );
}
