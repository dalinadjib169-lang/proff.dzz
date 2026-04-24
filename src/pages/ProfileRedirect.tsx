import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProfileRedirect() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && profile?.uid) {
      navigate(`/profile/${profile.uid}`, { replace: true });
    }
  }, [profile, loading, navigate]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center bg-slate-900 rounded-3xl border border-slate-800 p-8">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-purple-500/20 blur-2xl rounded-full animate-pulse"></div>
        <div className="relative animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
      <h2 className="text-xl font-black text-white mb-2">Preparing Profile...</h2>
      <p className="text-slate-500 text-sm text-center max-w-xs font-medium">
        We're fetching your professional data. One moment please.
      </p>
    </div>
  );
}
