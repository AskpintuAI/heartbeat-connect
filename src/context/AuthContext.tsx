import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, signOut as fbSignOut, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export type AppUser = {
  uid: string;
  phone: string;
  displayName: string;
  photoURL: string;
  bio: string;
};

type AuthContextValue = {
  user: AppUser | null;
  firebaseUser: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function loadProfile(fbUser: User): Promise<AppUser> {
  // Try Firestore profile first; fall back to localStorage name set during signup
  let displayName = "";
  let photoURL = "";
  let bio = "";
  try {
    const snap = await getDoc(doc(db, "users", fbUser.uid));
    if (snap.exists()) {
      const data = snap.data();
      displayName = (data.displayName as string) ?? "";
      photoURL = (data.photoURL as string) ?? "";
      bio = (data.bio as string) ?? "";
    }
  } catch {
    /* offline / rules — ignore */
  }
  if (!displayName && typeof window !== "undefined") {
    displayName = localStorage.getItem("pendingDisplayName") ?? "";
  }
  return {
    uid: fbUser.uid,
    phone: fbUser.phoneNumber ?? "",
    displayName: displayName || "नया साथी",
    photoURL,
    bio,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        const profile = await loadProfile(fbUser);
        setUser(profile);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const refreshProfile = async () => {
    if (firebaseUser) {
      const profile = await loadProfile(firebaseUser);
      setUser(profile);
    }
  };

  const signOut = async () => {
    await fbSignOut(auth);
    if (typeof window !== "undefined") {
      localStorage.removeItem("pendingDisplayName");
    }
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
