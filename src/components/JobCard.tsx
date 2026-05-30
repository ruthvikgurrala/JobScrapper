"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Job } from "@/lib/types";

interface JobCardProps {
  job: Job;
  onApply?: (job: Job) => void;
  hideApplyButton?: boolean;
}

export default function JobCard({ job, onApply, hideApplyButton = false }: JobCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Local state for editing
  const [editLocation, setEditLocation] = useState(job.location || "");
  const [editYoe, setEditYoe] = useState(job.yoe || "");
  const [saving, setSaving] = useState(false);
  
  // Local state to show immediately after save
  const [currentLocation, setCurrentLocation] = useState(job.location || "");
  const [currentYoe, setCurrentYoe] = useState(job.yoe || "");

  const handleSave = async () => {
    if (!job.id) return;
    setSaving(true);
    
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          location: editLocation,
          yoe: editYoe
        })
      });
      
      if (!res.ok) throw new Error("Failed to update job via API");
      
      setCurrentLocation(editLocation);
      setCurrentYoe(editYoe);
      
      // Try to update cache if possible so it persists across navigations before a full sync
      try {
        const cachedStr = localStorage.getItem("jobFeedData");
        if (cachedStr) {
          const cachedJobs: Job[] = JSON.parse(cachedStr);
          const index = cachedJobs.findIndex(j => j.id === job.id);
          if (index !== -1) {
            cachedJobs[index].location = editLocation;
            cachedJobs[index].yoe = editYoe;
            localStorage.setItem("jobFeedData", JSON.stringify(cachedJobs));
          }
        }
      } catch (e) {}

      setIsEditing(false);
    } catch (err) {
      console.error("Error updating job:", err);
      alert("Failed to update job details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-5 bg-[#1e1e1e] border border-[#2d2d2d] rounded-xl flex items-start justify-between relative group">
      <div className="flex-1 mr-4">
        <h3 className="text-lg font-semibold text-[#4fa3f7] mb-1 pr-10">
          <a href={job.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
            {job.title}
          </a>
        </h3>
        
        {isEditing ? (
          <div className="flex flex-wrap items-center gap-3 mb-3 p-3 bg-[#252525] rounded-lg border border-[#3a3a3a]">
            <div className="flex flex-col gap-1 w-full md:w-auto">
              <label className="text-[10px] text-gray-400 uppercase tracking-wide">Location</label>
              <input 
                type="text" 
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                placeholder="e.g. Bangalore"
                className="bg-[#1e1e1e] border border-[#444] text-sm text-gray-200 rounded px-2 py-1 outline-none focus:border-[#4fa3f7]"
              />
            </div>
            <div className="flex flex-col gap-1 w-full md:w-auto">
              <label className="text-[10px] text-gray-400 uppercase tracking-wide">Experience</label>
              <input 
                type="text" 
                value={editYoe}
                onChange={(e) => setEditYoe(e.target.value)}
                placeholder="e.g. 2-4 Years"
                className="bg-[#1e1e1e] border border-[#444] text-sm text-gray-200 rounded px-2 py-1 outline-none focus:border-[#4fa3f7]"
              />
            </div>
            <div className="flex items-end gap-2 mt-4 md:mt-0 ml-auto">
              <button 
                onClick={() => setIsEditing(false)}
                className="text-xs px-3 py-1.5 text-gray-400 hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="text-xs px-3 py-1.5 bg-[#4fa3f7] text-[#121212] font-semibold rounded hover:bg-[#3d8ad9] transition-colors"
              >
                {saving ? "Saving..." : "Save Details"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 mb-2">
            <span className="font-medium text-gray-200">{job.companyName}</span>
            {currentLocation && (
              <>
                <span>•</span>
                <span className="text-gray-300">📍 {currentLocation}</span>
              </>
            )}
            {currentYoe && (
              <>
                <span>•</span>
                <span className="text-gray-300">⏱️ {currentYoe}</span>
              </>
            )}
            <span>•</span>
            <span>Seen {formatDistanceToNow(job.firstSeen, { addSuffix: true })}</span>
          </div>
        )}
        
        {job.jd && !isEditing && (
          <div className="mb-3">
            <p className={`text-xs text-gray-500 whitespace-pre-wrap ${!isExpanded ? 'line-clamp-2' : ''}`}>
              {job.jd}
            </p>
            {job.jd.length > 150 && (
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs text-[#4fa3f7] hover:underline mt-1 focus:outline-none"
              >
                {isExpanded ? "Minimize" : "Read More..."}
              </button>
            )}
          </div>
        )}
        
        {job.skills && job.skills.length > 0 && !isEditing && (
          <div className="flex flex-wrap gap-2 mt-2">
            {job.skills.map((skill, i) => (
              <span key={i} className="px-2 py-0.5 bg-[#2a2a2a] border border-[#3a3a3a] rounded text-[11px] text-[#aaa]">
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>
      
      {!hideApplyButton && (
        <div className="flex flex-col gap-2 shrink-0">
          {!isEditing && (
            <button
              onClick={() => {
                setEditLocation(currentLocation);
                setEditYoe(currentYoe);
                setIsEditing(true);
              }}
              className="px-3 py-1 bg-transparent border border-transparent rounded text-xs text-gray-500 hover:text-gray-300 hover:border-[#3a3a3a] transition-all self-end absolute top-3 right-3 opacity-0 group-hover:opacity-100"
              title="Edit Job Details"
            >
              ✏️ Edit
            </button>
          )}

          {onApply ? (
            <button
              onClick={() => onApply(job)}
              className="mt-6 px-4 py-2 bg-[#252525] border border-[#3a3a3a] rounded-lg hover:bg-[#2d2d2d] text-sm font-medium transition-colors text-center"
            >
              Track / Apply
            </button>
          ) : (
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 px-4 py-2 bg-[#252525] border border-[#3a3a3a] rounded-lg hover:bg-[#2d2d2d] text-sm font-medium transition-colors text-center inline-block"
            >
              Apply
            </a>
          )}
        </div>
      )}
    </div>
  );
}
