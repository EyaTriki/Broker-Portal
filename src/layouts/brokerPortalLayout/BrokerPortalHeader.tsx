import { useState } from 'react';
import {
  Avatar,
  Badge,
  Box,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@redux/hooks';
import { logout, selectAuth } from '@redux/slices/authSlice';
import {
  useGetUserNotificationsQuery,
  useLogoutMutation,
  useMarkNotificationsReadMutation,
} from '@redux/apis/auth/authApi';
import type { Notification } from 'types/models/Notifications';
import { PATHS } from '@config/constants/paths';
import { brokerPortalTheme } from '@pages/brokerPortal/brokerPortalTheme';
import { formatPortalDate } from '@pages/brokerPortal/brokerPortalFigma';
import { resolveIcon } from '@utils/resolveMuiIcon';

const LogoutIcon = resolveIcon(LogoutOutlinedIcon);
const MenuIcon = resolveIcon(MenuRoundedIcon);
const NotificationsIcon = resolveIcon(NotificationsNoneRoundedIcon);

function initials(firstName?: string, lastName?: string, username?: string) {
  const value = `${firstName?.[0] || ''}${lastName?.[0] || ''}`;
  return (value || username?.slice(0, 2) || 'BR').toUpperCase();
}

export default function BrokerPortalHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(selectAuth);
  const [logoutApi] = useLogoutMutation();
  const { data: notifications = [] } = useGetUserNotificationsQuery();
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const [markNotificationsRead] = useMarkNotificationsReadMutation();
  const [profileAnchor, setProfileAnchor] = useState<HTMLElement | null>(null);
  const [notificationAnchor, setNotificationAnchor] = useState<HTMLElement | null>(null);
  /**
   * Opening the panel clears the unread badge, so remember which entries were
   * new to keep highlighting them while the broker is still reading.
   */
  const [newlySeenIds, setNewlySeenIds] = useState<Set<string>>(new Set());

  const openNotificationPanel = async (element: HTMLElement) => {
    setNewlySeenIds(
      new Set(notifications.filter((item) => !item.read).map((item) => item._id)),
    );
    setNotificationAnchor(element);
    if (unreadCount === 0) return;
    try {
      await markNotificationsRead().unwrap();
    } catch {
      // A failed read receipt should not stop the broker seeing the list.
    }
  };

  /** Quote pricing and order updates carry the lead they belong to. */
  const openNotification = (notification: Notification) => {
    setNotificationAnchor(null);
    const leadId = notification.metadata?.leadId;
    if (typeof leadId === 'string' && leadId) {
      navigate(`${PATHS.BROKER_PORTAL.LEADS}?leadId=${leadId}`);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutApi().unwrap();
    } catch {
      // Local logout still needs to complete if the API is unavailable.
    }
    dispatch(logout());
    navigate(`/${PATHS.AUTH.ROOT}/${PATHS.AUTH.BROKER_LOGIN}`);
  };

  return (
    <Box component="header" sx={{ pt: { xs: 1.5, sm: 2.5 }, pb: 1.5 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <IconButton
          onClick={onMenuClick}
          aria-label="Open navigation"
          sx={{
            width: 44,
            height: 44,
            borderRadius: 3,
            bgcolor: '#fff',
            border: `1px solid ${brokerPortalTheme.cardBorder}`,
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)',
          }}
        >
          <MenuIcon />
        </IconButton>

        <Typography
          fontWeight={800}
          color={brokerPortalTheme.textPrimary}
          sx={{ display: { xs: 'none', sm: 'block' }, letterSpacing: '-0.02em' }}
        >
          London Waste Management
        </Typography>

        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton
            aria-label="Notifications"
            onClick={(event) => void openNotificationPanel(event.currentTarget)}
            sx={{ width: 42, height: 42, borderRadius: 3, bgcolor: '#fff' }}
          >
            <Badge
              variant="dot"
              invisible={unreadCount === 0}
              sx={{ '& .MuiBadge-badge': { bgcolor: brokerPortalTheme.accentGreen } }}
            >
              <NotificationsIcon sx={{ color: brokerPortalTheme.textPrimary }} />
            </Badge>
          </IconButton>
          <IconButton
            onClick={(event) => setProfileAnchor(event.currentTarget)}
            aria-label="Open profile menu"
            sx={{ p: 0 }}
          >
            <Avatar
              sx={{
                width: 42,
                height: 42,
                bgcolor: brokerPortalTheme.accentGreen,
                color: '#fff',
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              {initials(user?.firstName, user?.lastName, user?.username)}
            </Avatar>
          </IconButton>
        </Stack>
      </Stack>

      <Menu
        anchorEl={notificationAnchor}
        open={Boolean(notificationAnchor)}
        onClose={() => setNotificationAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { width: 340, maxHeight: 420, mt: 1, borderRadius: 3 } }}
      >
        <Box px={2} py={1.25}>
          <Typography variant="body2" fontWeight={800}>
            Notifications
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {newlySeenIds.size > 0 ? `${newlySeenIds.size} new` : 'You are up to date'}
          </Typography>
        </Box>
        <Divider />
        {notifications.length === 0 ? (
          <Box px={2} py={2.5}>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Nothing yet. Updates on your quotes and orders will appear here.
            </Typography>
          </Box>
        ) : (
          notifications.slice(0, 15).map((notification) => (
            <MenuItem
              key={notification._id}
              onClick={() => openNotification(notification)}
              sx={{
                alignItems: 'flex-start',
                whiteSpace: 'normal',
                py: 1.25,
                bgcolor: newlySeenIds.has(notification._id)
                  ? brokerPortalTheme.accentGreenTint
                  : 'transparent',
              }}
            >
              <Box minWidth={0}>
                <Typography
                  variant="body2"
                  fontWeight={newlySeenIds.has(notification._id) ? 800 : 500}
                >
                  {notification.message}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {[notification.senderName, formatPortalDate(notification.createdAt)]
                    .filter(Boolean)
                    .join(' · ')}
                </Typography>
              </Box>
            </MenuItem>
          ))
        )}
      </Menu>

      <Menu
        anchorEl={profileAnchor}
        open={Boolean(profileAnchor)}
        onClose={() => setProfileAnchor(null)}
        PaperProps={{ sx: { minWidth: 220, mt: 1, borderRadius: 3 } }}
      >
        <Box px={2} py={1.5}>
          <Typography variant="body2" fontWeight={800}>
            {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || 'Broker'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {user?.email}
          </Typography>
        </Box>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Logout</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}
