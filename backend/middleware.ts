
import { UserRole, ResourceType, Action } from '../types';

/**
 * ACL Matrix (Requirement 2)
 */
const ACL_MATRIX: Record<UserRole, Partial<Record<ResourceType, Action[]>>> = {
  [UserRole.STUDENT]: {
    [ResourceType.ASSIGNMENT]: [Action.CREATE, Action.READ],
    [ResourceType.GRADE]: [Action.READ],
  },
  [UserRole.FACULTY]: {
    [ResourceType.ASSIGNMENT]: [Action.READ, Action.UPDATE],
    [ResourceType.GRADE]: [Action.CREATE, Action.READ, Action.UPDATE],
  },
  [UserRole.ADMIN]: {
    [ResourceType.ASSIGNMENT]: [Action.READ, Action.DELETE],
    [ResourceType.GRADE]: [Action.READ],
    [ResourceType.AUDIT_LOG]: [Action.READ, Action.AUDIT],
  }
};

export const authorize = (role: UserRole, resource: ResourceType, action: Action): boolean => {
  const permissions = ACL_MATRIX[role][resource];
  return permissions?.includes(action) || false;
};
