"use client";

import { useEffect, useState, use } from "react";
import { db } from "@/lib/firebase/client";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Job } from "@/lib/types";
import JobCard from "@/components/JobCard";
import Link from "next/link";

export default function CompanyJobsPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params);
  const companyName = decodeURIComponent(name);
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(20);

  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        // Query only jobs for this specific company to reduce DB reads
        const q = query(
          collection(db, "jobs"),
          where("companyName", "==", companyName)
        );
        const snapshot = await getDocs(q);
        
        const jobsData: Job[] = [];
        snapshot.forEach((doc) => {
          jobsData.push({ id: doc.id, ...doc.data() } as Job);
        });
        
        // Sort locally to avoid Firebase Composite Index requirement (which would be needed if we combined where() + orderBy())
        jobsData.sort((a, b) => (b.firstSeen as number) - (a.firstSeen as number));
        setJobs(jobsData);
      } catch (err: any) {
        console.error("Error fetching jobs:", err);
        setErrorMsg(err.message || "Unknown error fetching jobs");
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [companyName]);

  const [search, setSearch] = useState("");

  const filteredJobs = jobs.filter(job => 
    job.title.toLowerCase().includes(search.toLowerCase()) || 
    (job.location && job.location.toLowerCase().includes(search.toLowerCase())) ||
    (job.skills && job.skills.some(s => s.toLowerCase().includes(search.toLowerCase())))
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/companies" className="text-sm text-gray-400 hover:text-white mb-2 inline-block">
            ← Back to Companies
          </Link>
          <h1 className="text-3xl font-bold">{companyName} - Scraped Jobs</h1>
        </div>
        
        {jobs.length > 0 && (
          <div className="relative">
            <input
              type="text"
              placeholder="Search jobs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 px-4 py-2 bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg text-white focus:outline-none focus:border-[#555] text-sm"
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-gray-400">Loading jobs...</div>
      ) : errorMsg ? (
        <div className="p-8 text-center bg-red-900 border border-red-700 rounded-xl text-white">
          DEBUG ERROR: {errorMsg}
        </div>
      ) : jobs.length === 0 ? (
        <div className="p-8 text-center bg-[#1e1e1e] border border-[#2d2d2d] rounded-xl text-gray-400">
          No jobs scraped for {companyName} yet.
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="p-8 text-center bg-[#1e1e1e] border border-[#2d2d2d] rounded-xl text-gray-400">
          No jobs match your search "{search}".
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredJobs.slice(0, visibleCount).map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
          {filteredJobs.length > visibleCount && (
            <button
              onClick={() => setVisibleCount((prev) => prev + 20)}
              className="mt-4 px-4 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-white font-medium rounded-lg transition-colors mx-auto block"
            >
              View More Jobs
            </button>
          )}
        </div>
      )}
    </div>
  );
}
