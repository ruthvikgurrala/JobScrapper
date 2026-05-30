"use client";

import { COMPANIES } from "@/lib/companies";

type CompanyConfig = typeof COMPANIES[0];
import { useState, useEffect } from "react";
import Link from "next/link";

const DC: Record<string, { badgeClass: string; barColor: string; bg: string; border: string; text: string }> = {
  "Easy": { badgeClass: "be", barColor: "#8ae63c", bg: "rgba(59, 109, 17, 0.2)", border: "rgba(138, 230, 60, 0.3)", text: "#8ae63c" },
  "Medium": { badgeClass: "bm", barColor: "#f2aa42", bg: "rgba(133, 79, 11, 0.2)", border: "rgba(242, 170, 66, 0.3)", text: "#f2aa42" },
  "Hard": { badgeClass: "bh", barColor: "#ff764a", bg: "rgba(153, 60, 29, 0.2)", border: "rgba(255, 118, 74, 0.3)", text: "#ff764a" },
  "Very Hard": { badgeClass: "bv", barColor: "#ff6b6b", bg: "rgba(163, 45, 45, 0.2)", border: "rgba(255, 107, 107, 0.3)", text: "#ff6b6b" }
};

const getStorageKey = (name: string) => `applied_${name.replace(/\s+/g, '_')}`;

export default function CompaniesPage() {
  const [filter, setFilter] = useState("all");
  const [diffFilter, setDiffFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<keyof CompanyConfig>("score");
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [appliedStore, setAppliedStore] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const store: Record<string, boolean> = {};
    COMPANIES.forEach(c => {
      if (localStorage.getItem(getStorageKey(c.name)) === 'true') {
        store[c.name] = true;
      }
    });
    setAppliedStore(store);
  }, []);

  const handleCheckbox = (name: string, checked: boolean) => {
    if (checked) {
      localStorage.setItem(getStorageKey(name), 'true');
    } else {
      localStorage.removeItem(getStorageKey(name));
    }
    setAppliedStore(prev => ({ ...prev, [name]: checked }));
  };

  const handleSort = (key: keyof CompanyConfig) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 1 ? -1 : 1);
    } else {
      setSortKey(key);
      setSortDir(1);
    }
  };

  const filteredCompanies = COMPANIES.filter((c) => {
    if (filter !== "all" && c.category !== filter) return false;
    if (diffFilter !== "all" && c.diff !== diffFilter) return false;
    if (
      search &&
      !c.name.toLowerCase().includes(search.toLowerCase()) &&
      !c.sector.toLowerCase().includes(search.toLowerCase()) &&
      !c.roles.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  }).sort((a: any, b: any) => {
    let va = a[sortKey as keyof typeof a];
    let vb = b[sortKey as keyof typeof b];
    if (typeof va === "string" && typeof vb === "string") {
      va = va.toLowerCase();
      vb = vb.toLowerCase();
    }
    // @ts-ignore
    return sortDir * (va < vb ? -1 : va > vb ? 1 : 0);
  });

  return (
    <div className="max-w-7xl mx-auto text-[13px]">
      <div className="mb-4 space-y-4">
        <input
          type="text"
          placeholder="🔍 Search company, sector, or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-4 py-2.5 bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg text-white focus:outline-none focus:border-[#555]"
        />
        <div className="flex gap-2 flex-wrap">
          {["all", "Irrelevant", "Global MNC", "Indian Unicorn", "Indian SaaS", "Funded Startup"].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3.5 py-1.5 rounded-full text-[13px] border transition-all ${
                filter === cat
                  ? "bg-[#333] border-[#666] text-white font-medium"
                  : "bg-[#1e1e1e] border-[#2d2d2d] text-gray-400 hover:border-[#555] hover:text-white"
              }`}
            >
              {cat === "all" ? "All Categories" : cat}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { id: "all", label: "Any difficulty" },
            { id: "Easy", label: "🟢 Easy" },
            { id: "Medium", label: "🟡 Medium" },
            { id: "Hard", label: "🟠 Hard" },
            { id: "Very Hard", label: "🔴 Very Hard" },
          ].map((diff) => (
            <button
              key={diff.id}
              onClick={() => setDiffFilter(diff.id)}
              className={`px-3.5 py-1.5 rounded-full text-[13px] border transition-all ${
                diffFilter === diff.id
                  ? "bg-[#333] border-[#666] text-white font-medium"
                  : "bg-[#1e1e1e] border-[#2d2d2d] text-gray-400 hover:border-[#555] hover:text-white"
              }`}
            >
              {diff.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 flex-wrap mb-6">
        <div className="bg-[#1e1e1e] border border-[#2d2d2d] rounded-md p-3 flex-1 min-w-[100px]">
          <div className="text-[12px] text-[#666] uppercase tracking-wide mb-1">Showing</div>
          <div className="text-[22px] font-semibold text-white">{filteredCompanies.length}</div>
        </div>
        <div className="bg-[#1e1e1e] border border-[#2d2d2d] rounded-md p-3 flex-1 min-w-[100px]">
          <div className="text-[12px] text-[#666] uppercase tracking-wide mb-1">Easy / Medium</div>
          <div className="text-[22px] font-semibold text-white">
            {filteredCompanies.filter(c => c.diff === "Easy" || c.diff === "Medium").length}
          </div>
        </div>
        <div className="bg-[#1e1e1e] border border-[#2d2d2d] rounded-md p-3 flex-1 min-w-[100px]">
          <div className="text-[12px] text-[#666] uppercase tracking-wide mb-1">Hard / Very Hard</div>
          <div className="text-[22px] font-semibold text-white">
            {filteredCompanies.filter(c => c.diff === "Hard" || c.diff === "Very Hard").length}
          </div>
        </div>
        <div className="bg-[#1e1e1e] border border-[#2d2d2d] rounded-md p-3 flex-1 min-w-[100px]">
          <div className="text-[12px] text-[#666] uppercase tracking-wide mb-1">New additions</div>
          <div className="text-[22px] font-semibold text-white">
            {filteredCompanies.filter(c => c.isnew).length}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#2d2d2d] bg-[#1e1e1e]">
        <table className="w-full text-left text-[13px] table-fixed min-w-[900px]">
          <thead className="bg-[#1a1a1a] text-gray-400 border-b border-[#2d2d2d]">
            <tr>
              <th className="p-3 w-[4%] text-center select-none font-medium">✓</th>
              <th className="p-3 w-[15%] cursor-pointer hover:bg-[#222] hover:text-white font-medium select-none" onClick={() => handleSort("name")}>Company ↕</th>
              <th className="p-3 w-[11%] cursor-pointer hover:bg-[#222] hover:text-white font-medium select-none" onClick={() => handleSort("category")}>Category ↕</th>
              <th className="p-3 w-[12%] cursor-pointer hover:bg-[#222] hover:text-white font-medium select-none" onClick={() => handleSort("sector")}>Sector ↕</th>
              <th className="p-3 w-[18%] cursor-pointer hover:bg-[#222] hover:text-white font-medium select-none" onClick={() => handleSort("roles")}>Fresher Roles</th>
              <th className="p-3 w-[10%] cursor-pointer hover:bg-[#222] hover:text-white font-medium select-none" onClick={() => handleSort("ctc")}>CTC Range ↕</th>
              <th className="p-3 w-[17%] cursor-pointer hover:bg-[#222] hover:text-white font-medium select-none" onClick={() => handleSort("score")}>Difficulty ↕</th>
              <th className="p-3 w-[13%] font-medium">Careers</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2d2d2d]">
            {filteredCompanies.map((c) => {
              const isApplied = appliedStore[c.name] || false;
              const dc = DC[c.diff];
              const pct = Math.round((c.score / 5) * 100);
              return (
                <tr key={c.name} className={`transition-colors ${isApplied ? 'bg-[#161a14] opacity-85' : 'hover:bg-[#252525]'}`}>
                  <td className="p-3 text-center align-middle">
                    <input
                      type="checkbox"
                      checked={isApplied}
                      onChange={(e) => handleCheckbox(c.name, e.target.checked)}
                      className="w-4 h-4 cursor-pointer accent-[#8ae63c] bg-[#121212] border-[#3a3a3a] rounded"
                    />
                  </td>
                  <td className="p-3 font-semibold overflow-hidden text-ellipsis whitespace-nowrap">
                    <Link href={`/company/${encodeURIComponent(c.name)}`} className="text-white hover:underline">
                      {c.name}
                    </Link>
                    {c.isnew && <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold text-[#4fa3f7] bg-[#185fa533] rounded">NEW</span>}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-1 text-[11px] font-semibold text-[#aaa] bg-[#2d2d2d] border border-[#3d3d3d] rounded-xl whitespace-nowrap">
                      {c.category.replace("Indian ", "")}
                    </span>
                  </td>
                  <td className="p-3 text-[12px] text-[#aaa] overflow-hidden text-ellipsis whitespace-nowrap">{c.sector}</td>
                  <td className="p-3 text-[12px] text-[#aaa] overflow-hidden text-ellipsis whitespace-nowrap">{c.roles}</td>
                  <td className="p-3 text-[12px] text-[#aaa] font-medium overflow-hidden text-ellipsis whitespace-nowrap">{c.ctc}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[11px] font-semibold rounded-xl whitespace-nowrap border" style={{ color: dc.text, backgroundColor: dc.bg, borderColor: dc.border }}>
                        {c.diff}
                      </span>
                      <div className="flex-1 h-1 bg-[#2d2d2d] rounded-full overflow-hidden min-w-[40px]">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: dc.barColor }}></div>
                      </div>
                      <span className="text-[11px] font-semibold text-[#aaa] min-w-[26px] text-right">{c.score.toFixed(1)}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    {c.careers ? (
                      <a
                        href={c.careers}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#4fa3f7] bg-[#185fa51f] border border-[#4fa3f740] rounded-full hover:bg-[#185fa547] hover:text-[#7ec3ff] hover:border-[#4fa3f780] transition-colors whitespace-nowrap"
                      >
                        🔗 Careers
                      </a>
                    ) : (
                      <span className="text-[11px] text-[#666]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredCompanies.length === 0 && (
          <div className="p-12 text-center text-[14px] text-[#aaa]">No companies match your filters</div>
        )}
      </div>

      <p className="text-[11px] text-[#aaa] mt-3 leading-relaxed px-1">
        Difficulty: Easy ≤2.5 · Medium 2.6–3.2 · Hard 3.3–3.9 · Very Hard ≥4.0 (Glassdoor 1–5 scale). Checkboxes save locally to track applications automatically. Click column headers to sort.
      </p>
    </div>
  );
}
