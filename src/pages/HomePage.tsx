import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, ChevronRight, Clock3, MapPin, Search, Sparkles, Users, Activity, Building2 } from 'lucide-react';
import { storageService } from '../services/storageService';
import { timetableService } from '../services/timetableService';
import { Building } from '../types';

const quickSearches = ['N-204', 'A-101', 'U-204', 'Machine Learning'];

export const HomePage: React.FC = () => {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [metrics, setMetrics] = useState(timetableService.getCampusMetrics());
  const [quickSearch, setQuickSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    setBuildings(storageService.getBuildings());
    const interval = setInterval(() => setMetrics(timetableService.getCampusMetrics()), 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (quickSearch.trim()) navigate(`/availability?search=${encodeURIComponent(quickSearch.trim())}`);
  };

  return (
    <div className="pb-20">
      <section className="cp-hero relative overflow-hidden px-4 pb-16 pt-16 text-white sm:px-8 lg:px-12 lg:pb-24 lg:pt-24">
        <div className="cp-hero-glow" />
        <div className="relative mx-auto grid max-w-7xl items-end gap-12 lg:grid-cols-[1.15fr_.85fr]">
          <div>
            <div className="mb-7 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.2em] text-emerald-200"><span className="h-2 w-2 animate-pulse rounded-full bg-lime-300" /> VFSTR · live campus intelligence</div>
            <h1 className="max-w-3xl text-5xl font-medium leading-[.94] tracking-[-.065em] sm:text-7xl">The campus,<br /><span className="text-lime-300">in your hands.</span></h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">One calm, connected place to discover timetables, available rooms, laboratories, faculty and the spaces that make Vignan feel like home.</p>
            <form onSubmit={handleSearch} className="mt-9 max-w-2xl rounded-2xl border border-white/20 bg-white/10 p-2 backdrop-blur-xl"><div className="flex items-center gap-3 rounded-xl bg-white px-4 py-2 text-slate-900"><Search className="h-5 w-5 shrink-0 text-slate-400" /><input value={quickSearch} onChange={(event) => setQuickSearch(event.target.value)} placeholder="Search room, faculty, lab or subject" className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" /><button className="rounded-lg bg-[#c96f43] px-4 py-3 text-xs font-bold text-white transition hover:bg-[#a95732]">Search</button></div><div className="flex gap-3 overflow-auto px-2 pt-3 text-[11px] text-slate-300"><span className="shrink-0 opacity-60">Try:</span>{quickSearches.map((item) => <button type="button" key={item} onClick={() => setQuickSearch(item)} className="shrink-0 underline decoration-white/25 underline-offset-4 hover:text-white">{item}</button>)}</div></form>
            <div className="mt-6 flex flex-wrap gap-3"><Link to="/campus" className="cp-primary-button"><Building2 className="h-4 w-4" /> Explore campus <ArrowUpRight className="h-4 w-4" /></Link><Link to="/timetable" className="cp-ghost-button"><CalendarDays className="h-4 w-4" /> My timetable</Link></div>
          </div>
          <div className="cp-glass-panel hidden p-6 lg:block"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-emerald-200">Right now</p><h2 className="mt-2 text-2xl font-medium">Campus pulse</h2></div><Activity className="h-5 w-5 text-lime-300" /></div><div className="mt-7 grid grid-cols-2 gap-3"><div className="cp-metric"><span>Available</span><strong>{metrics.availableRoomsCount}</strong><small>rooms & labs</small></div><div className="cp-metric"><span>Occupied</span><strong>{metrics.occupiedRoomsCount}</strong><small>in use now</small></div><div className="cp-metric"><span>Scheduled</span><strong>{metrics.totalScheduledClasses}</strong><small>classes today</small></div><div className="cp-metric"><span>Coverage</span><strong>{metrics.totalRooms}</strong><small>registered spaces</small></div></div><Link to="/availability" className="mt-5 flex items-center justify-between border-t border-white/15 pt-4 text-xs font-semibold text-lime-200">Open live availability <ChevronRight className="h-4 w-4" /></Link></div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 pt-10 sm:grid-cols-3 sm:px-8 lg:px-12"><Link to="/timetable" className="cp-action-card"><CalendarDays /><span><small>Plan your day</small><strong>Find my timetable</strong></span><ChevronRight /></Link><Link to="/availability?resourceType=classrooms" className="cp-action-card"><MapPin /><span><small>Live search</small><strong>Find a free room</strong></span><ChevronRight /></Link><Link to="/availability?resourceType=faculty" className="cp-action-card"><Users /><span><small>People & places</small><strong>Find faculty availability</strong></span><ChevronRight /></Link></section>

      <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-8 lg:px-12"><div className="mb-6 flex items-end justify-between"><div><p className="cp-kicker">Explore VFSTR</p><h2 className="cp-section-title">Spaces worth knowing</h2></div><Link to="/campus" className="cp-text-link">View all buildings <ArrowUpRight className="h-4 w-4" /></Link></div><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{buildings.slice(0, 5).map((building, index) => <Link to={`/campus/${building.slug}`} key={building.id} className="cp-building-card group"><div className="relative h-64 overflow-hidden"><img src={building.imageUrl} alt={building.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" /><span className="absolute left-4 top-4 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">{building.originalCode}</span><div className="absolute bottom-4 left-4 right-4"><p className="text-xs text-emerald-200">{building.totalFloors} floors · {building.departments.slice(0, 2).join(' · ')}</p><h3 className="mt-1 text-2xl font-medium text-white">{building.name}</h3></div></div><div className="flex items-center justify-between p-5"><span className="text-xs text-slate-500">Interactive blueprint active</span><span className="flex items-center gap-1 text-xs font-bold text-[#c96f43]">Explore <ArrowUpRight className="h-4 w-4" /></span></div></Link>)}</div></section>

      <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-8 lg:px-12"><div className="cp-feature-grid"><div><p className="cp-kicker">Built for campus life</p><h2 className="cp-section-title max-w-xl">Less asking around.<br />More getting there.</h2><p className="mt-5 max-w-lg text-sm leading-7 text-slate-500">Campus Pulse turns academic scheduling into useful, spatial answers. Know where your next class is, whether a lab is free, and which spaces are quietly available between lectures.</p><Link to="/about" className="cp-primary-dark mt-7">How Campus Pulse works <ArrowUpRight className="h-4 w-4" /></Link></div><div className="cp-feature-list"><div><Clock3 /><span><strong>See the next available slot</strong><small>Search beyond right now for the time that works for you.</small></span></div><div><Sparkles /><span><strong>Trust the source</strong><small>Timetables, buildings and room details stay connected.</small></span></div><div><Activity /><span><strong>Move with confidence</strong><small>Live status makes the campus feel a little smaller.</small></span></div></div></div></section>
    </div>
  );
};
