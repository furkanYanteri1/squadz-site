"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import AcceptInviteDialog from "./AcceptInviteDialog";
import InviteDialog from "./InviteDialog";
import LoginDialog from './LoginDialog'

export default function Navbar() {
  const { user, logout, refreshUser, refreshing } = useUser();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [acceptInviteOpen, setAcceptInviteOpen] = useState(false);
  const [inviteId, setInviteId] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    // URL'den invite_id parametresini kontrol et
    const urlParams = new URLSearchParams(window.location.search);
    const inviteIdParam = urlParams.get("invite_id");
    
    if (inviteIdParam && !user) {
      setInviteId(inviteIdParam);
      setAcceptInviteOpen(true);
    }
  }, [user]);

  const handleAcceptInviteSuccess = async () => {
    console.log('✅ Invite accepted, refreshing user context...')
    
    setAcceptInviteOpen(false);
    
    // URL'den parametreyi temizle
    const url = new URL(window.location.href);
    url.searchParams.delete('invite_id');
    window.history.replaceState({}, '', url.toString());
    
    // User context'i refresh et (reload yerine)
    if (refreshUser) {
      await refreshUser();
      console.log('✅ User context refreshed')
    } else {
      console.log('⚠️ No refreshUser function, doing hard reload')
      window.location.reload();
    }
  }

  return (
    <>
      <nav className="flex justify-between items-center p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <div className="font-bold text-xl text-white">Squadz</div>
          {user?.team_name && (
            <span className="text-gray-300 text-sm px-3 py-1 bg-gray-700 rounded-full">
              {user.team_name}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {!user && (
            <button
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              onClick={() => setLoginOpen(true)}
            >
              Login
            </button>
          )}

          {user && (
            <>
              <button
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setInviteOpen(true)}
                disabled={refreshing}
              >
                Invite
              </button>
              <button
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={logout}
                disabled={refreshing}
              >
                {refreshing ? 'Loading...' : 'Logout'}
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Dialogs */}
      <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
      
      {user && (
        <InviteDialog
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          invitedById={user.id}
        />
      )}

      {acceptInviteOpen && inviteId && (
        <AcceptInviteDialog
          open={acceptInviteOpen}
          inviteId={inviteId}
          onClose={() => setAcceptInviteOpen(false)}
          onSuccess={handleAcceptInviteSuccess}
        />
      )}
    </>
  );
}