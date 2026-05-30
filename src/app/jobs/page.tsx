"use client";

import { useEffect, useState, useMemo } from "react";
import { db, auth } from "@/lib/firebase/client";
import { collection, query, getDocs } from "firebase/firestore";
import { Job } from "@/lib/types";
import JobCard from "@/components/JobCard";
import { doc, setDoc } from "firebase/firestore";

export default function JobFeed() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  
  // Custom YOE Range Filters
  const [minYoe, setMinYoe] = useState<number | "">("");
  const [maxYoe, setMaxYoe] = useState<number | "">("");
  const [includeUnspecified, setIncludeUnspecified] = useState(true);
  
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  useEffect(() => {
    const fetchCachedJobs = async () => {
      setLoading(true);
      const cached = localStorage.getItem("jobFeedData");
      const cachedTime = localStorage.getItem("jobFeedTime");
      
      if (cached && cachedTime) {
        const timeDiff = Date.now() - parseInt(cachedTime);
        if (timeDiff < 24 * 60 * 60 * 1000) {
          setJobs(JSON.parse(cached));
          setLastRefreshed(new Date(parseInt(cachedTime)).toLocaleString());
          setLoading(false);
          return;
        }
      }

      // If no valid cache, fetch once to populate
      try {
        const q = query(collection(db, "jobs"));
        const snapshot = await getDocs(q);
        const jobsData: Job[] = [];
        snapshot.forEach((doc) => {
          jobsData.push({ id: doc.id, ...doc.data() } as Job);
        });

        jobsData.sort((a, b) => (b.firstSeen || 0) - (a.firstSeen || 0));

        localStorage.setItem("jobFeedData", JSON.stringify(jobsData));
        localStorage.setItem("jobFeedTime", Date.now().toString());
        
        setJobs(jobsData);
        setLastRefreshed(new Date().toLocaleString());
      } catch (err) {
        console.error("Error fetching jobs:", err);
      }
      setLoading(false);
    };

    fetchCachedJobs();
  }, []);

  const handleScrape = async () => {
    setScraping(true);
    try {
      const res = await fetch("/api/scrape", { method: "POST" });
      const data = await res.json();
      alert(data.message || "Scraping complete!");
    } catch (err) {
      alert("Error starting scrape");
    } finally {
      setScraping(false);
    }
  };

  const handleApply = async (job: Job) => {
    const user = auth.currentUser;
    if (user && job.id) {
      try {
        await setDoc(doc(db, "users", user.uid, "appliedJobs", job.id), job);
      } catch (err) {
        console.error("Error tracking application:", err);
      }
    }
    window.open(job.url, "_blank", "noopener,noreferrer");
  };

  const parseYoe = (yoeValue: string | number | undefined): number | null => {
    if (typeof yoeValue === 'number') return yoeValue;
    const yoeStr = yoeValue;
    if (!yoeStr || yoeStr.toLowerCase() === "not specified") return null;
    const match = yoeStr.match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const yoeNum = parseYoe(job.yoe);
      const isUnspecified = yoeNum === null;

      // Handle Unspecified Jobs
      if (isUnspecified) return includeUnspecified;

      // Range filtering
      if (minYoe !== "" && yoeNum < Number(minYoe)) return false;
      if (maxYoe !== "" && yoeNum > Number(maxYoe)) return false;

      return true;
    });
  }, [jobs, minYoe, maxYoe, includeUnspecified]);

  const displayedJobs = filteredJobs.slice(0, visibleCount);

  if (loading && jobs.length === 0) return <div className="text-center mt-10">Loading cached jobs...</div>;

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
        <h1 className="text-3xl font-bold text-white">Latest Job Postings</h1>
        <div className="flex gap-3 items-center">
          <span className="text-xs text-gray-500 hidden md:block">
            (Sync DB from Dashboard)
          </span>
          <button
            onClick={handleScrape}
            disabled={scraping}
            className="px-4 py-2 bg-[#4fa3f7] hover:bg-[#3d8ad9] text-[#121212] font-semibold rounded-lg disabled:opacity-50 transition-colors"
          >
            {scraping ? "Scraping..." : "Scrape Now"}
          </button>
        </div>
      </div>

      <div className="bg-[#1e1e1e] border border-[#2d2d2d] rounded-xl p-4 mb-6 flex flex-col md:flex-row gap-6 md:items-center justify-between">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <label className="text-sm font-medium text-gray-400 whitespace-nowrap">Experience Range:</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              placeholder="Min YOE"
              value={minYoe}
              onChange={(e) => {
                setMinYoe(e.target.value === "" ? "" : Number(e.target.value));
                setVisibleCount(20);
              }}
              className="bg-[#2d2d2d] border border-[#444] text-gray-200 text-sm rounded-lg w-24 px-3 py-2 outline-none focus:border-[#4fa3f7]"
            />
            <span className="text-gray-500">-</span>
            <input
              type="number"
              min="0"
              placeholder="Max YOE"
              value={maxYoe}
              onChange={(e) => {
                setMaxYoe(e.target.value === "" ? "" : Number(e.target.value));
                setVisibleCount(20);
              }}
              className="bg-[#2d2d2d] border border-[#444] text-gray-200 text-sm rounded-lg w-24 px-3 py-2 outline-none focus:border-[#4fa3f7]"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setMinYoe(0); setMaxYoe(1); setIncludeUnspecified(true); setVisibleCount(20); }}
              className="text-xs px-3 py-1.5 bg-[#1a2f1c] text-[#8ae63c] border border-[#2d5c18] font-medium rounded hover:bg-[#203c23] transition-colors"
            >
              🚀 Fresher Jobs
            </button>
            <button
              onClick={() => { setMinYoe(""); setMaxYoe(""); setIncludeUnspecified(true); setVisibleCount(20); }}
              className="text-xs px-3 py-1.5 bg-[#252525] text-gray-400 border border-[#3a3a3a] font-medium rounded hover:text-white transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer border-t md:border-t-0 md:border-l border-[#333] pt-4 md:pt-0 md:pl-6">
          <input
            type="checkbox"
            checked={includeUnspecified}
            onChange={(e) => setIncludeUnspecified(e.target.checked)}
            className="w-4 h-4 rounded bg-[#2d2d2d] border-[#444] text-[#4fa3f7] focus:ring-[#4fa3f7] focus:ring-offset-[#1e1e1e]"
          />
          <span className="text-sm text-gray-300 select-none">Include jobs with unspecified experience</span>
        </label>
      </div>

      <div className="text-xs text-gray-500 mb-4 text-right">
        Showing {filteredJobs.length} matching jobs {lastRefreshed && `(Last synced: ${lastRefreshed})`}
      </div>

      <div className="grid gap-4">
        {filteredJobs.length === 0 ? (
          <div className="p-8 text-center bg-[#1e1e1e] border border-[#2d2d2d] rounded-xl text-gray-400">
            No jobs found matching these experience filters.
          </div>
        ) : (
          <>
            {displayedJobs.map((job) => (
              <JobCard key={job.id} job={job} onApply={handleApply} />
            ))}
            {filteredJobs.length > visibleCount && (
              <button
                onClick={() => setVisibleCount((prev) => prev + 20)}
                className="mt-6 px-6 py-2.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-white font-medium rounded-lg transition-colors mx-auto block"
              >
                View More Jobs
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
