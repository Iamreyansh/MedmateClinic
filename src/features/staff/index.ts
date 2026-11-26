export { StaffScreen } from "@/features/staff/components/StaffScreen";
export {
  fetchActivity,
  fetchMemberAccess,
  fetchProfiles,
  fetchRoles,
  fetchScreens,
  fetchStaff,
  fetchTeam,
  addMember,
  addProfile,
  removeProfile,
  saveMemberAccess,
  updateMember,
  updateProfile,
} from "@/features/staff/api/staff";
export type {
  ActivityEvent,
  CapabilityScreen,
  ClinicProfileTemplate,
  ClinicRole,
  MemberAccess,
  MemberDraft,
  ProfileDraft,
  StaffMember,
  StaffPayload,
  TeamMember,
  TeamPayload,
} from "@/features/staff/api/staff";
