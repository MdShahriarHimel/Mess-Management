/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Bell, Plus, Pin, Archive, Trash2, X, Check, AlertTriangle } from "lucide-react";
import { Member, Notice, UserRole } from "../types.js";
import { RefreshButton } from "./RefreshButton.tsx";
import { useAutoRefresh } from "../utils/AutoRefreshContext.tsx";
import { getAuthToken } from "../lib/authHeader.ts";

interface NoticesProps {
  currentUser: Member;
  isDarkMode: boolean;
}

export default function Notices({ currentUser, isDarkMode }: NoticesProps) {
  const authToken = getAuthToken(currentUser);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pinned, setPinned] = useState(false);
  const [isDirectToManager, setIsDirectToManager] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [hasLoadedAll, setHasLoadedAll] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchNotices = async (loadAll = false) => {
    try {
      const url = (loadAll || hasLoadedAll) ? "/api/notices" : "/api/notices?limit=5";
      const response = await fetch(url, {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        const validNotices = (data.notices || []).filter((n: Notice) => {
          const titleLower = (n.title || "").toLowerCase();
          const contentLower = (n.content || "").toLowerCase();
          if (titleLower.startsWith("profile updated by") || titleLower.includes("profile updated")) return false;
          if (contentLower.includes("updated your profile")) return false;
          return true;
        });
        setNotices(validNotices);
        setHasMore(data.hasMore || false);
        if (loadAll) {
          setHasLoadedAll(true);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLoadRemaining = async () => {
    if (loadingMore || hasLoadedAll) return;
    setLoadingMore(true);
    await fetchNotices(true);
    setLoadingMore(false);
  };

  const { refreshTriggers } = useAutoRefresh();

  useEffect(() => {
    fetchNotices(false);
  }, [refreshTriggers.notification]);

  useEffect(() => {
    const handleGlobalRefresh = () => {
      fetchNotices(true);
    };
    window.addEventListener("app-global-refresh", handleGlobalRefresh);
    return () => window.removeEventListener("app-global-refresh", handleGlobalRefresh);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (hasLoadedAll || loadingMore || !hasMore) return;
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      const clientHeight = document.documentElement.clientHeight;
      if (scrollTop + clientHeight >= scrollHeight - 300) {
        handleLoadRemaining();
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasLoadedAll, loadingMore, hasMore]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;
    setLoading(true);

    try {
      const response = await fetch("/api/notices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
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
          "Authorization": `Bearer ${authToken}`
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
          "Authorization": `Bearer ${authToken}`
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
        headers: { "Authorization": `Bearer ${authToken}` }
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

  const unpinnedNotices = filteredNotices.filter(n => !n.pinned && !n.isGlobal);
  const unpinnedCount = unpinnedNotices.length;

  const handleBulkDelete = async () => {
    setDeletingAll(true);
    try {
      const response = await fetch("/api/notices/bulk-delete", {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        setShowDeleteAllModal(false);
        setToastMessage(`Successfully deleted ${data.count || 0} unpinned notice(s). Pinned messages of Manager & Super User were safely preserved.`);
        setTimeout(() => setToastMessage(null), 5000);
        await fetchNotices(true);
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.error || "Failed to delete notices");
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred during bulk deletion");
    } finally {
      setDeletingAll(false);
    }
  };

  return (
    <div className="space-y-6" id="notices-mgmt-wrapper">
      
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-cyan-950/90 border border-cyan-500/40 text-cyan-200 text-xs flex items-center justify-between shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2">
            <Check size={16} className="text-cyan-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-cyan-400 hover:text-white cursor-pointer ml-2">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Title */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <Bell className="text-cyan-400" />
            Notice Board & Bulletins Manager
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <RefreshButton 
            module="notification" 
            onRefresh={async () => {
              await fetchNotices(true);
            }} 
          />

          {isManagerOrAdmin && (
            <button
              onClick={() => setShowDeleteAllModal(true)}
              disabled={unpinnedCount === 0}
              className={`px-3 py-2 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-sm active:scale-95 ${
                unpinnedCount > 0 
                  ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:border-rose-500/50" 
                  : "bg-slate-800/50 text-slate-500 border border-slate-800 cursor-not-allowed opacity-60"
              }`}
              title={unpinnedCount > 0 ? "Delete all unpinned notices (Pinned messages are preserved)" : "No unpinned notices to delete"}
            >
              <Trash2 size={15} />
              ALL DELETE ({unpinnedCount})
            </button>
          )}

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
                  notice.isDirectToManager ? "text-rose-400 bg-rose-950/30 px-1.5 py-0.5 rounded" : 
                  (notice.isGlobal || notice.pinned) ? "text-orange-400 bg-orange-950/30 px-1.5 py-0.5 rounded" : 
                  "text-cyan-400 bg-cyan-950/30 px-1.5 py-0.5 rounded"
                }`}>
                  {notice.isDirectToManager ? "DIRECT NOTICE TO MANAGER ✉" : 
                   (notice.isGlobal || notice.pinned) ? "GLOBAL PINNED BULLETIN 📌" : 
                   "MESS BULLETIN 🏠"}
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

      {hasMore && !hasLoadedAll && (
        <div className="flex justify-center pt-2">
          <button
            onClick={handleLoadRemaining}
            disabled={loadingMore}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-400 hover:text-cyan-300 font-bold text-xs rounded-xl cursor-pointer transition-all flex items-center gap-2 shadow-sm"
          >
            {loadingMore ? "Loading remaining notices..." : "View More Notices"}
          </button>
        </div>
      )}

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

      {/* BULK DELETE CONFIRMATION MODAL */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 text-white shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3">
              <h3 className="text-base font-bold font-display flex items-center gap-2 text-rose-400">
                <Trash2 size={18} />
                Delete All Unpinned Notices?
              </h3>
              <button onClick={() => setShowDeleteAllModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              <p>
                This will permanently delete all <strong className="text-rose-400 font-bold">{unpinnedCount}</strong> unpinned notice(s) currently on the board.
              </p>
              
              <div className="p-3.5 bg-cyan-950/40 border border-cyan-500/30 rounded-xl text-cyan-200 flex items-start gap-2.5">
                <Pin size={16} className="text-cyan-400 fill-cyan-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <strong className="block text-cyan-300 font-bold">Pinned Message Protection</strong>
                  <span>
                    Pinned messages created by Manager and Super User will <span className="text-cyan-300 font-bold underline">NOT</span> be deleted during bulk deletion unless unpinned or deleted individually by themselves.
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-850">
              <button
                type="button"
                onClick={() => setShowDeleteAllModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-850 hover:bg-slate-800 text-xs font-semibold text-slate-300 cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={deletingAll || unpinnedCount === 0}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md"
              >
                {deletingAll ? "DELETING..." : `DELETE ${unpinnedCount} UNPINNED`}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
