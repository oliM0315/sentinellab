export function canAccessLab(status: string | null | undefined): boolean {
  return status === "approved";
}

export function canManageAccounts(isAdmin: boolean, status: string | null | undefined): boolean {
  return isAdmin && canAccessLab(status);
}