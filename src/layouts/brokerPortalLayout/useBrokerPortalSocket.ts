import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { ConfigEnv } from '@config/configEnv';
import { LocalStorageKeysEnum } from '@config/enums/localStorage.enum';
import { authApi } from '@redux/apis/auth/authApi';
import { brokerPortalApi } from '@redux/apis/broker/brokerPortalApi';
import { useAppDispatch } from '@redux/hooks';
import { getFromLocalStorage } from '@utils/localStorage/storage';

/**
 * The back office already pushes a notification over the same socket when an
 * admin prices a quote or raises an order. This applies that update to the
 * open portal screens instead of polling.
 */
export default function useBrokerPortalSocket() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const token = getFromLocalStorage(LocalStorageKeysEnum.AccessToken);
    if (!token || !ConfigEnv.SOCKET_ENDPOINT) return undefined;

    const socket = io(ConfigEnv.SOCKET_ENDPOINT, {
      reconnection: true,
      withCredentials: true,
      extraHeaders: { Authorization: `Bearer ${token}` },
    });

    const onNotification = () => {
      dispatch(
        brokerPortalApi.util.invalidateTags([
          'PortalLeads',
          'PortalQuotes',
          'PortalNegotiations',
          'PortalOrders',
          'PortalDashboard',
          'PortalDocuments',
        ]),
      );
      dispatch(authApi.util.invalidateTags(['Notifications']));
    };

    socket.on('notification', onNotification);
    return () => {
      socket.off('notification', onNotification);
      socket.disconnect();
    };
  }, [dispatch]);
}
