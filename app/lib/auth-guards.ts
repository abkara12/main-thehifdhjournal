import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../lib/firebase";
import {
  getUserProfileByUid,
  isAdminRole,
  isStaffRole,
  isSuperAdminRole,
  type UserProfile,
} from "./current-user";

type GuardState = {
  loading: boolean;
  firebaseUser: User | null;
  profile: UserProfile | null;
  error: string | null;
};

const initialState: GuardState = {
  loading: true,
  firebaseUser: null,
  profile: null,
  error: null,
};

export function useRequireStaff(redirectTo = "/login") {
  const router = useRouter();
  const [state, setState] = useState<GuardState>(initialState);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({
          loading: false,
          firebaseUser: null,
          profile: null,
          error: "Please log in to continue.",
        });
        router.replace(redirectTo);
        return;
      }

      try {
        const profile = await getUserProfileByUid(user.uid);

        if (!profile) {
          setState({
            loading: false,
            firebaseUser: user,
            profile: null,
            error: "Your account record could not be found.",
          });
          router.replace("/login");
          return;
        }

        if (!profile.isActive) {
          setState({
            loading: false,
            firebaseUser: user,
            profile,
            error: "This account is inactive.",
          });
          router.replace("/login");
          return;
        }

        if (!isStaffRole(profile.role)) {
          setState({
            loading: false,
            firebaseUser: user,
            profile,
            error: "You do not have access to this page.",
          });
          router.replace("/login");
          return;
        }

        setState({
          loading: false,
          firebaseUser: user,
          profile,
          error: null,
        });
      } catch (error: any) {
        setState({
          loading: false,
          firebaseUser: user,
          profile: null,
          error: error?.message ?? "Could not verify your account.",
        });
      }
    });

    return () => unsub();
  }, [router, redirectTo]);

  return state;
}

export function useRequireAdmin(redirectTo = "/dashboard") {
  const router = useRouter();
  const [state, setState] = useState<GuardState>(initialState);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({
          loading: false,
          firebaseUser: null,
          profile: null,
          error: "Please log in to continue.",
        });
        router.replace("/login");
        return;
      }

      try {
        const profile = await getUserProfileByUid(user.uid);

        if (!profile) {
          setState({
            loading: false,
            firebaseUser: user,
            profile: null,
            error: "Your account record could not be found.",
          });
          router.replace("/login");
          return;
        }

        if (!profile.isActive) {
          setState({
            loading: false,
            firebaseUser: user,
            profile,
            error: "This account is inactive.",
          });
          router.replace("/login");
          return;
        }

        if (!isAdminRole(profile.role)) {
          setState({
            loading: false,
            firebaseUser: user,
            profile,
            error: "Only admins can access this page.",
          });
          router.replace(redirectTo);
          return;
        }

        setState({
          loading: false,
          firebaseUser: user,
          profile,
          error: null,
        });
      } catch (error: any) {
        setState({
          loading: false,
          firebaseUser: user,
          profile: null,
          error: error?.message ?? "Could not verify your account.",
        });
      }
    });

    return () => unsub();
  }, [router, redirectTo]);

  return state;
}

export function useRequireSuperAdmin(redirectTo = "/dashboard") {
  const router = useRouter();
  const [state, setState] = useState<GuardState>(initialState);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({
          loading: false,
          firebaseUser: null,
          profile: null,
          error: "Please log in to continue.",
        });
        router.replace("/login");
        return;
      }

      try {
        const profile = await getUserProfileByUid(user.uid);

        if (!profile) {
          setState({
            loading: false,
            firebaseUser: user,
            profile: null,
            error: "Your account record could not be found.",
          });
          router.replace("/login");
          return;
        }

        if (!profile.isActive) {
          setState({
            loading: false,
            firebaseUser: user,
            profile,
            error: "This account is inactive.",
          });
          router.replace("/login");
          return;
        }

        if (!isSuperAdminRole(profile.role)) {
          setState({
            loading: false,
            firebaseUser: user,
            profile,
            error: "Only super admins can access this page.",
          });
          router.replace(redirectTo);
          return;
        }

        setState({
          loading: false,
          firebaseUser: user,
          profile,
          error: null,
        });
      } catch (error: any) {
        setState({
          loading: false,
          firebaseUser: user,
          profile: null,
          error: error?.message ?? "Could not verify your account.",
        });
      }
    });

    return () => unsub();
  }, [router, redirectTo]);

  return state;
}