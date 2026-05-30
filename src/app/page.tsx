"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";
import { collection, query, getDocs } from "firebase/firestore";
import Link from "next/link";
import { COMPANIES } from "@/lib/companies";

type CompanyStats = {
  name: string;
  total: number;
  recent: number;
};

type SortOption = 'TOTAL_DESC' | 'TOTAL_ASC' | 'RECENT_DESC' | 'RECENT_ASC';

export default function Dashboard() {
  const [stats, setStats] = useState<CompanyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");
  const [sortOption, setSortOption] = useState<SortOption>('TOTAL_DESC');

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const savedSort = localStorage.getItem("dashboardSortOption") as SortOption | null;
    if (savedSort) {
      setSortOption(savedSort);
    }
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("dashboardSortOption", sortOption);
    }
  }, [sortOption, isMounted]);

  const fetchStats = async (forceRefresh = false) => {
    setLoading(true);
    
    // Check cache first
    const cached = localStorage.getItem("dashboardStats");
    const cachedTime = localStorage.getItem("dashboardStatsTime");
    
    // Use cache if it exists, is less than 24 hours old, and we didn't force a refresh
    if (!forceRefresh && cached && cachedTime) {
      const timeDiff = Date.now() - parseInt(cachedTime);
      const ONE_DAY = 24 * 60 * 60 * 1000;
      if (timeDiff < ONE_DAY) {
        setStats(JSON.parse(cached));
        setLastRefreshed(new Date(parseInt(cachedTime)).toLocaleString());
        setLoading(false);
        return;
      }
    }

    try {
      const q = query(collection(db, "jobs"));
      const snapshot = await getDocs(q);
      const now = Date.now();

      const rawJobs: any[] = [];
      snapshot.forEach((doc) => {
        rawJobs.push({ id: doc.id, ...doc.data() });
      });
      
      // Sort raw jobs by newest first
      rawJobs.sort((a, b) => (b.firstSeen || 0) - (a.firstSeen || 0));

      const counts: Record<string, { total: number; recent: number }> = {};
      
      // Find the timestamp of the MOST RECENT scrape batch
      const latestBatchTime = rawJobs.length > 0 ? (rawJobs[0].firstSeen || 0) : 0;
      // Define a "recent" window as anything within 24 hours of that latest batch
      const BATCH_WINDOW = 24 * 60 * 60 * 1000; 

      rawJobs.forEach((job) => {
        const comp = job.companyName;
        const seen = job.firstSeen || 0;
        
        if (!counts[comp]) counts[comp] = { total: 0, recent: 0 };
        counts[comp].total += 1;
        
        // A job is "recent" if it was part of the latest scraping run!
        if (latestBatchTime > 0 && (latestBatchTime - seen) < BATCH_WINDOW) {
          counts[comp].recent += 1;
        }
      });

      const statsArray: CompanyStats[] = [];
      COMPANIES.forEach((c) => {
        const data = counts[c.name] || { total: 0, recent: 0 };
        statsArray.push({
          name: c.name,
          total: data.total,
          recent: data.recent
        });
      });

      // Save to cache
      localStorage.setItem("dashboardStats", JSON.stringify(statsArray));
      localStorage.setItem("dashboardStatsTime", now.toString());
      
      // Also cache the raw jobs for the Jobs page
      localStorage.setItem("jobFeedData", JSON.stringify(rawJobs));
      localStorage.setItem("jobFeedTime", now.toString());
      
      setStats(statsArray);
      setLastRefreshed(new Date(now).toLocaleString());
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchStats(false);
  }, []);

  // Sort the stats based on the selected option
  const sortedStats = [...stats].sort((a, b) => {
    switch (sortOption) {
      case 'TOTAL_DESC': return b.total - a.total;
      case 'TOTAL_ASC': return a.total - b.total;
      case 'RECENT_DESC': return (b.recent - a.recent) || (b.total - a.total);
      case 'RECENT_ASC': return (a.recent - b.recent) || (b.total - a.total);
      default: return b.total - a.total;
    }
  });

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-white">Scraper Dashboard</h1>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select 
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            className="bg-[#1e1e1e] border border-[#333] text-sm text-gray-200 rounded px-3 py-2 outline-none focus:border-[#4fa3f7]"
          >
            <option value="TOTAL_DESC">Total Jobs (Max to Min)</option>
            <option value="TOTAL_ASC">Total Jobs (Min to Max)</option>
            <option value="RECENT_DESC">Recently Added (Max to Min)</option>
            <option value="RECENT_ASC">Recently Added (Min to Max)</option>
          </select>
          
          <button 
            onClick={() => fetchStats(true)}
            disabled={loading}
            className="bg-[#4fa3f7] text-[#121212] font-semibold text-sm px-4 py-2 rounded hover:bg-[#3d8ad9] transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? "Syncing..." : "Sync Database"}
          </button>
        </div>
      </div>
      
      {lastRefreshed && (
        <div className="text-xs text-gray-500 mb-4 text-right">
          Last updated: {lastRefreshed} (Cached)
        </div>
      )}

      {loading && stats.length === 0 ? (
        <div className="text-center mt-10 text-gray-400">Loading dashboard...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {sortedStats.map((s) => (
            <Link href={`/company/${encodeURIComponent(s.name)}`} key={s.name}>
              <div className="bg-[#1e1e1e] border border-[#2d2d2d] rounded-xl p-4 hover:border-[#555] transition-all cursor-pointer h-full flex flex-col justify-between group">
                <div className="font-semibold text-white mb-3 group-hover:text-[#4fa3f7] transition-colors">{s.name}</div>
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-[11px] text-gray-500 uppercase tracking-wide">Total</div>
                    <div className="text-2xl font-bold text-gray-200">{s.total}</div>
                  </div>
                  {s.recent > 0 && (
                    <div className="text-right">
                      <div className="text-[10px] text-[#8ae63c] font-medium px-1.5 py-0.5 bg-[#183a0a] rounded-full border border-[#2d5c18]">
                        +{s.recent} new
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
