import { createContext, useContext, useState, type ReactNode } from 'react';

// Which page is open?
//   /?view=stage  -> page loaded into TikTok LIVE Studio (1080x1920); the only page that plays sound
//   /             -> control page, silent, any number of tabs
//   ?mute=1       -> stage page without sound (for previews, avoids two voices)
export interface Role {
  role: 'stage' | 'control';
  muted: boolean;
}

function roleFromUrl(): Role {
  const params = new URLSearchParams(window.location.search);
  const role = params.get('view') === 'stage' ? 'stage' : 'control';
  return {
    role,
    muted: params.get('mute') === '1',
  };
}

const RoleContext = createContext<Role | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [value] = useState(roleFromUrl);
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): Role {
  const value = useContext(RoleContext);
  if (!value) throw new Error('useRole must be used inside RoleProvider');
  return value;
}
