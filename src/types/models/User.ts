import { UserRoleEnum } from '@config/enums/role.enum';

export interface User {
  id?: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: UserRoleEnum[];
  picture: string;
  permissions: string[] | Record<string, string[]>;
  csvPermission?: boolean;
  brokerId?: string;
}
