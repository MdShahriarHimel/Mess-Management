/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Bell, Plus, Pin, Archive, Trash2, X, Check } from "lucide-react";
import { Member, Notice, UserRole } from "../types.js";

interface NoticesProps {
  currentUser: Member;
  isDarkMode: boolean;
}

export default function Notices({ currentUser, isDarkMode }: NoticesProps) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pinned, setPinned] = useState(false);
  const [isDirectToManager, setIsDirectToManager] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchNotices = async () => {
    try {
      const response = await fetch("/api/notices", {
        headers: { "Authorization": `Bearer ${currentUser.id}` }
      });
      if (response.ok) {
        const data = await response.json();
        setNotices(data.notices || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;
    setLoading(true);

    try {
      const response = await fetch("/api/notices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser.id}`
        },
        body: JSON.stringify({ title, content, pinned, isDirectToManager })
      });

      if (response.ok) {
        setShowAddModal(false);
        setTitle("");
        setContent("");
        setPinned(false);
        fetchNotices();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePin = async (id: string, currentPin: boolean) => {
    try {
      const response = await fetch(`/api/notices/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser.id}`
        },
        body: JSON.stringify({ pinned: !currentPin })
      });
      if (response.ok) {
        fetchNotices();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleArchive = async (id: string, currentArchive: boolean) => {
    try {
      const response = await fetch(`/api/notices/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser.id}`
        },
        body: JSON.stringify({ archived: !currentArchive })
      });
      if (response.ok) {
        fetchNotices();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Permanently delete this notice?")) return;
    try {
      const response = await fetch(`/api/notices/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${currentUser.id}` }
      });
      if (response.ok) {
        fetchNotices();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const isManagerOrAdmin = currentUser.role !== UserRole.MEMBER;

  const filteredNotices = notices.filter(n => {
    if (n.isDirectToManager) {
      return isManagerOrAdmin || n.authorId === currentUser.id;
    }
    return true;
  });

  return (
    <div className="space-y-6" id="notices-mgmt-wrapper">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <Bell className="text-cyan-400" />
            Notice Board & Bulletins Manager
          </h2>
          <p className="text-xs text-slate-400">
            Publish, pin, and archive announcements across the hostel.
          </p>
        </div>

        <button
          onClick={() => { 
            setIsDirectToManager(currentUser.role === UserRole.MEMBER);
            setShowAddModal(true); 
          }}
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
        >
          <Plus size={15} />
          {currentUser.role === UserRole.MEMBER ? "SEND NOTICE TO MANAGER" : "CREATE BULLETIN"}
        </button>
      </div>

      {/* Bulletins lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredNotices.map((notice) => (
          <div 
            key={notice.id} 
            className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
              notice.archived ? "opacity-60 border-slate-800 bg-slate-900/10 text-slate-500" :
              notice.pinned ? "border-cyan-500/30 bg-cyan-950/10 text-white" :
              isDarkMode ? "bg-slate-900/40 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800 shadow-sm"
            }`}
          >
            <div>
              <div className="flex justify-between items-start">
                <span className={`text-[9px] font-bold tracking-widest uppercase ${
                  notice.isDirectToManager ? "text-rose-400" : notice.pinned ? "text-orange-500" : "text-slate-500"
                }`}>
                  {notice.isDirectToManager ? "DIRECT NOTICE TO MANAGER ✉" : notice.pinned ? "PINNED BULLETIN" : "GENERAL BULLETIN"}
                </span>
                {notice.archived && (
                  <span className="text-[9px] font-bold tracking-widest text-slate-500 uppercase bg-slate-800 px-1.5 py-0.5 rounded">
                    ARCHIVED
                  </span>
                )}
              </div>
              <h3 className="font-extrabold text-sm mt-1.5">{notice.title}</h3>
              <p className={`text-xs mt-2.5 leading-relaxed ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                {notice.content}
              </p>
            </div>

            <div className="flex items-center gap-2 justify-between mt-5 pt-4 border-t border-cyan-500/10 text-[10px] text-slate-500">
              <div>
                <span>By {notice.authorName}</span>
                <span className="mx-1.5">•</span>
                <span>{notice.date}</span>
              </div>

              {(isManagerOrAdmin || notice.authorId === currentUser.id) && (
                <div className="flex gap-1.5">
                  {isManagerOrAdmin && (
                    <>
                      <button
                        onClick={() => handleTogglePin(notice.id, notice.pinned)}
                        className="p-1 rounded hover:bg-cyan-500/10 text-cyan-400 cursor-pointer"
                        title={notice.pinned ? "Unpin notice" : "Pin notice"}
                      >
                        <Pin size={12} className={notice.pinned ? "fill-cyan-400" : ""} />
                      </button>

                      <button
                        onClick={() => handleToggleArchive(notice.id, notice.archived)}
                        className="p-1 rounded hover:bg-orange-500/10 text-orange-400 cursor-pointer"
                        title={notice.archived ? "Restore notice" : "Archive notice"}
                      >
                        <Archive size={12} />
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => handleDelete(notice.id)}
                    className="p-1 rounded hover:bg-rose-500/10 text-rose-400 cursor-pointer"
                    title="Permanently Delete Notice"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* CREATE BULLETIN MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm p-6 rounded-2xl bg-slate-900 border border-slate-800 text-white shadow-2xl">
            <div className="flex justify-between items-center mb-5 border-b border-slate-850 pb-3">
              <h3 className="text-base font-bold font-display flex items-center gap-1.5">
                <Bell size={18} className="text-cyan-400 animate-pulse" />
                {isDirectToManager ? "Send Notice to Manager" : "Publish Bulletin"}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">
                  {isDirectToManager ? "Subject" : "Bulletin Title"}
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={isDirectToManager ? "e.g., Need Oil for night" : "Grocery rates update..."}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">
                  {isDirectToManager ? "Request Details" : "Content Message"}
                </label>
                <textarea
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={isDirectToManager ? "Say what you need..." : "Starting from tomorrow, we will have fish..."}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 text-white"
                />
              </div>

              {isManagerOrAdmin && (
                <div className="flex items-center gap-4 py-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="pinCheck"
                      checked={pinned}
                      onChange={(e) => setPinned(e.target.checked)}
                      className="rounded border-slate-850 bg-slate-950 text-cyan-500 focus:ring-0"
                    />
                    <label htmlFor="pinCheck" className="text-xs font-semibold text-slate-300 cursor-pointer">
                      Pin bulletin.
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="directCheck"
                      checked={isDirectToManager}
                      onChange={(e) => setIsDirectToManager(e.target.checked)}
                      className="rounded border-slate-850 bg-slate-950 text-cyan-500 focus:ring-0"
                    />
                    <label htmlFor="directCheck" className="text-xs font-semibold text-slate-300 cursor-pointer">
                      Direct Notice to Manager.
                    </label>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-3 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 rounded-lg bg-slate-850 hover:bg-slate-800 text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs cursor-pointer"
                >
                  {loading ? "PUBLISHING..." : "PUBLISH"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
