import { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export type StaffRole = "admin" | "teacher" | "super_admin";

export type UserProfile = {
  email: string;
  fullName: string;
  phone: string;
  role: StaffRole;
  madrassahId: string | null;
  madrassahName: string;
  isActive: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type CurrentUserContext = {
  firebaseUser: User;
  profile: UserProfile;
};

function normalizeUserProfile(data: any): UserProfile {
  return {
    email: typeof data?.email === "string" ? data.email : "",
    fullName: typeof data?.fullName === "string" ? data.fullName : "",
    phone: typeof data?.phone === "string" ? data.phone : "",
    role:
      data?.role === "admin" || data?.role === "teacher" || data?.role === "super_admin"
        ? data.role
        : "teacher",
    madrassahId: typeof data?.madrassahId === "string" ? data.madrassahId : null,
    madrassahName: typeof data?.madrassahName === "string" ? data.madrassahName : "",
    isActive: data?.isActive !== false,
    createdAt: data?.createdAt,
    updatedAt: data?.updatedAt,
  };
}

export async function getUserProfileByUid(uid: string): Promise<UserProfile | null> {
  if (!uid) return null;

  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;

  return normalizeUserProfile(snap.data());
}

export async function getCurrentUserContext(): Promise<CurrentUserContext | null> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return null;

  const profile = await getUserProfileByUid(firebaseUser.uid);
  if (!profile) return null;

  return {
    firebaseUser,
    profile,
  };
}

export async function getCurrentUserRole(): Promise<StaffRole | null> {
  const ctx = await getCurrentUserContext();
  return ctx?.profile.role ?? null;
}

export async function getCurrentMadrassahId(): Promise<string | null> {
  const ctx = await getCurrentUserContext();
  return ctx?.profile.madrassahId ?? null;
}

export function isStaffRole(role: string | null | undefined): role is StaffRole {
  return role === "admin" || role === "teacher" || role === "super_admin";
}

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "admin" || role === "super_admin";
}

export function isTeacherRole(role: string | null | undefined): boolean {
  return role === "teacher";
}

export function isSuperAdminRole(role: string | null | undefined): boolean {
  return role === "super_admin";
}