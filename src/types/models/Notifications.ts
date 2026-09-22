export interface Notification {
    _id: string;
    userId: string;
    type: string;
    message: string;
    senderName?: string | null;
    read: boolean;
    createdAt: string;
    entityId?: string | null;
    incidentId?: string | null;
    requestId?: string | null;
    endShiftRequestStatus?: 'Pending' | 'Approved' | 'Rejected' | null;
    metadata?: Record<string, unknown> | null;
    data?: Record<string, unknown> | null;
  }