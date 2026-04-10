import { useAuth } from '../context/AuthContext';

type Role = 'owner' | 'admin' | 'member';

export function useRole(): Role {
  const { me } = useAuth();
  return (me?.user.role ?? 'member') as Role;
}

export function useIsAdmin(): boolean {
  const role = useRole();
  return role === 'owner' || role === 'admin';
}

export function useIsOwner(): boolean {
  const role = useRole();
  return role === 'owner';
}
