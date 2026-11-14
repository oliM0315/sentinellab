import { describe, expect, it } from "vitest";
import { canAccessLab, canManageAccounts } from "./account-access";

describe("account approval", () => {
  it("blocks pending registrations", () => expect(canAccessLab("pending")).toBe(false));
  it("allows approved accounts", () => expect(canAccessLab("approved")).toBe(true));
  it("blocks rejected accounts", () => expect(canAccessLab("rejected")).toBe(false));
  it("fails closed without an approval record", () => expect(canAccessLab(undefined)).toBe(false));
  it("allows account management only for approved admins", () => {
    expect(canManageAccounts(true, "approved")).toBe(true);
    expect(canManageAccounts(false, "approved")).toBe(false);
    expect(canManageAccounts(true, "pending")).toBe(false);
  });
});