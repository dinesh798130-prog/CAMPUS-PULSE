import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { MapPin, Phone, Mail, Globe, ExternalLink, Award, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#142B4A] text-slate-300 border-t border-slate-700/80">
      {/* Upper Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">
          {/* Column 1: University & System Info */}
          <div className="lg:col-span-2 space-y-4">
            <Logo size="lg" lightMode={true} showSubtitle={false} />
            <p className="text-xs text-blue-200/90 font-medium tracking-wide uppercase">
              One Campus. Every Schedule. Smarter Availability.
            </p>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              An intelligent university scheduling and resource availability platform engineered for Vignan's Foundation for Science, Technology & Research (Deemed to be University).
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/10 text-white rounded text-xs font-semibold border border-white/10">
                <Award className="w-3.5 h-3.5 text-yellow-400" /> NAAC 'A+' Accredited
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/10 text-white rounded text-xs font-semibold border border-white/10">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" /> NIRF Top 100
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/10 text-white rounded text-xs font-semibold border border-white/10">
                Deemed University
              </span>
            </div>
          </div>

          {/* Column 2: Campus Navigation */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-white/10 pb-2">
              Campus Explorer
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/campus/vignan-bhavan" className="hover:text-white transition-colors">
                  Vignan Bhavan (A Block)
                </Link>
              </li>
              <li>
                <Link to="/campus/aryabhata-bhavan" className="hover:text-white transition-colors">
                  Aryabhata Bhavan (U Block)
                </Link>
              </li>
              <li>
                <Link to="/campus/nagarjuna-block" className="hover:text-white transition-colors">
                  Nagarjuna Block (N Block)
                </Link>
              </li>
              <li>
                <Link to="/campus/h-block" className="hover:text-white transition-colors">
                  H Block (ECE & EEE)
                </Link>
              </li>
              <li>
                <Link to="/campus/library" className="hover:text-white transition-colors">
                  NTR Central Library
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Schedules & Availability */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-white/10 pb-2">
              Smart Scheduling
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/timetable" className="hover:text-white transition-colors">
                  Public Timetable Search
                </Link>
              </li>
              <li>
                <Link to="/availability" className="hover:text-white transition-colors">
                  Classroom Availability
                </Link>
              </li>
              <li>
                <Link to="/availability?resourceType=laboratories" className="hover:text-white transition-colors">
                  Laboratory Availability
                </Link>
              </li>
              <li>
                <Link to="/availability?resourceType=faculty" className="hover:text-white transition-colors">
                  Faculty Free Slots
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition-colors">
                  Platform Architecture
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Institutional Contact */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-white/10 pb-2">
              VFSTR Campus
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>Vadlamudi, Guntur - 522213, Andhra Pradesh, India</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-400 shrink-0" />
                <span>+91 863 2344700 / 701</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                <span>info@vignan.ac.in</span>
              </li>
              <li className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-400 shrink-0" />
                <a
                  href="https://www.vignan.ac.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-300 inline-flex items-center gap-1"
                >
                  www.vignan.ac.in <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>

            <div className="mt-5 pt-3 border-t border-white/10">
              <Link
                to="/login"
                className="inline-flex items-center gap-1 text-xs text-blue-300 hover:text-white font-medium"
              >
                Access Institutional Portal &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-[#0b1728] border-t border-slate-800 py-4 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p>
            © {new Date().getFullYear()} Vignan's Foundation for Science, Technology and Research (VFSTR). All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-slate-400 text-[11px]">
            <span>Campus Pulse v1.0.0 (Hackathon Edition)</span>
            <span>•</span>
            <span className="text-amber-400">DEMO MODE ACTIVE</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

