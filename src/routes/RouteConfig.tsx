import { lazy } from 'react';
import { Navigate, useParams, type RouteObject } from 'react-router-dom';
import { GuestGuard } from '@guards/GuestGuard';
import { RoleGuard } from '@guards/RoleGuard';
import { UserRoleEnum } from '@config/enums/role.enum';
import { PATHS } from '@config/constants/paths';
import AuthLayout from '@layouts/authLayout/AuthLayout';

const BrokerLoginPage = lazy(() => import('@pages/auth/login/BrokerLoginPage'));
const BrokerPortalLayout = lazy(() => import('@layouts/brokerPortalLayout/BrokerPortalLayout'));
const BrokerPortalDashboardPage = lazy(
  () => import('@pages/brokerPortal/BrokerPortalDashboardPage'),
);
const BrokerPortalLeadsPage = lazy(() => import('@pages/brokerPortal/BrokerPortalLeadsPage'));
const BrokerPortalCreateLeadPage = lazy(
  () => import('@pages/brokerPortal/BrokerPortalCreateLeadPage'),
);
const BrokerPortalCommissionsPage = lazy(
  () => import('@pages/brokerPortal/BrokerPortalCommissionsPage'),
);
const BrokerPortalAccountPage = lazy(
  () => import('@pages/brokerPortal/BrokerPortalAccountPage'),
);

/** Old `/leads/:id` bookmarks open the list with that card expanded. */
function LeadDeepLinkRedirect() {
  const { leadId } = useParams();
  return (
    <Navigate
      to={`${PATHS.BROKER_PORTAL.LEADS}${leadId ? `?leadId=${leadId}` : ''}`}
      replace
    />
  );
}

export const ROUTE_CONFIG: RouteObject[] = [
  {
    path: PATHS.AUTH.ROOT,
    element: (
      <GuestGuard>
        <AuthLayout />
      </GuestGuard>
    ),
    children: [{ path: PATHS.AUTH.LOGIN, element: <BrokerLoginPage /> }],
  },
  {
    path: PATHS.BROKER_PORTAL.ROOT,
    element: (
      <RoleGuard allow={[UserRoleEnum.Broker]}>
        <BrokerPortalLayout />
      </RoleGuard>
    ),
    children: [
      { index: true, element: <BrokerPortalDashboardPage /> },
      { path: 'leads', element: <BrokerPortalLeadsPage /> },
      { path: 'commissions', element: <BrokerPortalCommissionsPage /> },
      { path: 'submit-lead', element: <BrokerPortalCreateLeadPage /> },
      { path: 'account', element: <BrokerPortalAccountPage /> },

      // Preserve old bookmarks while exposing only the five Figma modules.
      { path: 'leads/new', element: <Navigate to={PATHS.BROKER_PORTAL.SUBMIT_LEAD} replace /> },
      { path: 'leads/scan', element: <Navigate to={PATHS.BROKER_PORTAL.SUBMIT_LEAD} replace /> },
      { path: 'leads/:leadId', element: <LeadDeepLinkRedirect /> },
      { path: 'contacts', element: <Navigate to={PATHS.BROKER_PORTAL.LEADS} replace /> },
      { path: 'quote-requests', element: <Navigate to={PATHS.BROKER_PORTAL.LEADS} replace /> },
      { path: 'negotiations', element: <Navigate to={PATHS.BROKER_PORTAL.LEADS} replace /> },
      { path: 'orders', element: <Navigate to={PATHS.BROKER_PORTAL.COMMISSIONS} replace /> },
      { path: 'tasks', element: <Navigate to={PATHS.BROKER_PORTAL.LEADS} replace /> },
      { path: 'documents', element: <Navigate to={PATHS.BROKER_PORTAL.LEADS} replace /> },
      { path: 'reports', element: <Navigate to={PATHS.BROKER_PORTAL.DASHBOARD} replace /> },
      { path: 'notifications', element: <Navigate to={PATHS.BROKER_PORTAL.DASHBOARD} replace /> },
      { path: 'help-support', element: <Navigate to={PATHS.BROKER_PORTAL.ACCOUNT} replace /> },
      { path: 'settings', element: <Navigate to={PATHS.BROKER_PORTAL.ACCOUNT} replace /> },
    ],
  },
  { path: PATHS.ANY, element: <Navigate to={PATHS.BROKER_PORTAL.ROOT} replace /> },
];
