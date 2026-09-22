import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import PercentOutlinedIcon from '@mui/icons-material/PercentOutlined';
import { PATHS } from '@config/constants/paths';
import { resolveIcon, type MuiIconComponent } from '@utils/resolveMuiIcon';

export interface BrokerPortalNavItem {
  label: string;
  shortLabel: string;
  path: string;
  icon: MuiIconComponent;
}

export const BROKER_PORTAL_NAV: BrokerPortalNavItem[] = [
  {
    label: 'Dashboard',
    shortLabel: 'Dashboard',
    path: PATHS.BROKER_PORTAL.DASHBOARD,
    icon: resolveIcon(DashboardOutlinedIcon),
  },
  {
    label: 'My Leads',
    shortLabel: 'My Leads',
    path: PATHS.BROKER_PORTAL.LEADS,
    icon: resolveIcon(GroupsOutlinedIcon),
  },
  {
    label: 'Commissions',
    shortLabel: 'Commissions',
    path: PATHS.BROKER_PORTAL.COMMISSIONS,
    icon: resolveIcon(PercentOutlinedIcon),
  },
  {
    label: 'Submit Lead',
    shortLabel: 'Submit Lead',
    path: PATHS.BROKER_PORTAL.SUBMIT_LEAD,
    icon: resolveIcon(AddOutlinedIcon),
  },
  {
    label: 'My Account',
    shortLabel: 'My Account',
    path: PATHS.BROKER_PORTAL.ACCOUNT,
    icon: resolveIcon(AccountCircleOutlinedIcon),
  },
];

export function isBrokerPortalNavSelected(pathname: string, item: BrokerPortalNavItem) {
  if (item.path === PATHS.BROKER_PORTAL.DASHBOARD) return pathname === '/';
  if (item.path === PATHS.BROKER_PORTAL.LEADS) return pathname.startsWith('/leads');
  return pathname.startsWith(item.path);
}
