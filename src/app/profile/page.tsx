"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase/client";
import { collection, query, getDocs, deleteDoc, doc } from "firebase/firestore";
import { Job } from "@/lib/types";

export default function ProfilePage() {
  const [appliedJobs, setAppliedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppliedJobs = async () => {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const q = query(collection(db, "users", user.uid, "appliedJobs"));
        const snapshot = await getDocs(q);
        const jobsData: Job[] = [];
        snapshot.forEach((doc) => {
          jobsData.push({ id: doc.id, ...doc.data() } as Job);
        });
        setAppliedJobs(jobsData);
      } catch (err) {
        console.error("Error fetching applied jobs", err);
      } finally {
        setLoading(false);
      }
    };
    
    // Auth state might take a moment to load, so we use auth listener
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchAppliedJobs();
      } else {
        setLoading(false);
        setAppliedJobs([]);
      }
    });
    
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="text-center mt-10">Loading profile...</div>;

  if (!auth.currentUser) {
    return (
      <div className="text-center mt-10 text-gray-400">
        Please log in to view your profile and tracked applications.
      </div>
    );
  }

  const handleRemove = async (jobId: string) => {
    if (!auth.currentUser || !jobId) return;
    
    try {
      await deleteDoc(doc(db, "users", auth.currentUser.uid, "appliedJobs", jobId));
      setAppliedJobs(prev => prev.filter(job => job.id !== jobId));
    } catch (err) {
      console.error("Error removing job", err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">My Profile</h1>
      <div className="bg-[#1e1e1e] p-6 rounded-xl border border-[#2d2d2d] mb-8">
        <h2 className="text-xl font-semibold mb-2">Account Info</h2>
        <p className="text-gray-400">Email: {auth.currentUser.email}</p>
      </div>
      
      <h2 className="text-2xl font-bold mb-4">Tracked Applications</h2>
      {appliedJobs.length === 0 ? (
        <div className="p-8 text-center bg-[#1e1e1e] border border-[#2d2d2d] rounded-xl text-gray-400">
          You haven't tracked any applications yet.
        </div>
      ) : (
        <div className="grid gap-4">
          {appliedJobs.map((job) => (
            <div key={job.id} className="p-5 bg-[#1e1e1e] border border-[#2d2d2d] rounded-xl flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[#4fa3f7] mb-1">{job.title}</h3>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 mb-2">
                  <span className="font-medium text-gray-200">{job.companyName}</span>
                  {job.location && (
                    <>
                      <span>•</span>
                      <span className="text-gray-300">📍 {job.location}</span>
                    </>
                  )}
                  {job.yoe && (
                    <>
                      <span>•</span>
                      <span className="text-gray-300">⏱️ {job.yoe}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-sm text-[#4fa3f7] bg-[#185fa51f] border border-[#4fa3f740] rounded hover:bg-[#185fa547] transition-colors"
                >
                  View Job
                </a>
                <button
                  onClick={() => handleRemove(job.id!)}
                  className="px-3 py-1.5 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded hover:bg-red-400/20 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
