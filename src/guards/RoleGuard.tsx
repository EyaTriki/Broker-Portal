import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectAuth } from '@redux/slices/authSlice';
import { PATHS } from '@config/constants/paths';
import { UserRoleEnum } from '@config/enums/role.enum';
import { getFromLocalStorage } from '@utils/localStorage/storage';
import { LocalStorageKeysEnum } from '@config/enums/localStorage.enum';

interface Props {
  children: ReactNode;
  allow: UserRoleEnum[];
  fallback?: string;
}

function hasAnyRole(role: unknown, allowed: UserRoleEnum[]): boolean {
  if (Array.isArray(role)) {
    return allowed.some((r) => role.includes(r));
  }
  return allowed.includes(role as UserRoleEnum);
}

export function RoleGuard({ children, allow, fallback }: Props) {
  const token = getFromLocalStorage(LocalStorageKeysEnum.AccessToken);
  const { user } = useSelector(selectAuth);

  if (!token) {
    return <Navigate to={`/${PATHS.AUTH.ROOT}/${PATHS.AUTH.LOGIN}`} replace />;
  }

  if (!hasAnyRole(user?.role, allow)) {
    return <Navigate to={fallback || PATHS.MAIN.ERROR.P_403} replace />;
  }

  return <>{children}</>;
}
