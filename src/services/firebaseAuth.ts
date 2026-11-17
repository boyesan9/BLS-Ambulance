import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile, UserRole } from '../types';

const resolvedFirebaseConfig = {
  ...firebaseConfig,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
};

export const activeFirebaseProjectId = resolvedFirebaseConfig.projectId;
export const activeFirebaseAuthDomain = resolvedFirebaseConfig.authDomain;

const app = getApps().length > 0 ? getApp() : initializeApp(resolvedFirebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.setCustomParameters({ prompt: 'select_account' });

const TOKEN_STORAGE_KEY = 'bls_google_access_token_v1';
const TOKEN_TIME_KEY = 'bls_google_token_time_v1';
const REDIRECT_INTENT_KEY = 'bls_redirect_login_intent_v1';
const LOGGED_OUT_KEY = 'bls_is_logged_out_v1';

export interface RedirectLoginIntent {
  type: 'login_view' | 'admin_auth' | 'sheets_modal' | 'sync';
  role?: UserRole;
  targetUser?: UserProfile;
  redirectStarted?: boolean;
  timestamp: number;
}

export interface GoogleSignInResult {
  user?: User;
  accessToken?: string;
  redirected?: boolean;
}

let cachedAccessToken: string | null = (() => {
  try {
    const saved = localStorage.getItem(TOKEN_STORAGE_KEY) || sessionStorage.getItem(TOKEN_STORAGE_KEY);
    const savedTime = Number(localStorage.getItem(TOKEN_TIME_KEY) || 0);
    if (saved && savedTime && Date.now() - savedTime < 3500 * 1000) {
      return saved;
    }
  } catch (_) {}
  return null;
})();

export const saveToken = (token: string) => {
  cachedAccessToken = token;
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(TOKEN_TIME_KEY, String(Date.now()));
    sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch (_) {}
};

export const clearToken = () => {
  cachedAccessToken = null;
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_TIME_KEY);
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch (_) {}
};

export const saveRedirectIntent = (intent: Omit<RedirectLoginIntent, 'timestamp'>) => {
  try {
    const payload: RedirectLoginIntent = {
      ...intent,
      timestamp: Date.now(),
    };
    const serialized = JSON.stringify(payload);
    sessionStorage.setItem(REDIRECT_INTENT_KEY, serialized);
    localStorage.setItem(REDIRECT_INTENT_KEY, serialized);
  } catch (_) {}
};

export const consumeRedirectIntent = (): RedirectLoginIntent | null => {
  try {
    const raw = sessionStorage.getItem(REDIRECT_INTENT_KEY) || localStorage.getItem(REDIRECT_INTENT_KEY);
    sessionStorage.removeItem(REDIRECT_INTENT_KEY);
    localStorage.removeItem(REDIRECT_INTENT_KEY);
    if (!raw) return null;
    const parsed: RedirectLoginIntent = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > 10 * 60 * 1000) {
      return null;
    }
    return parsed;
  } catch (_) {
    return null;
  }
};

export const setLoggedOutFlag = (loggedOut: boolean) => {
  try {
    if (loggedOut) {
      sessionStorage.setItem(LOGGED_OUT_KEY, '1');
    } else {
      sessionStorage.removeItem(LOGGED_OUT_KEY);
    }
  } catch (_) {}
};

export const getLoggedOutFlag = (): boolean => {
  try {
    return sessionStorage.getItem(LOGGED_OUT_KEY) === '1';
  } catch (_) {
    return false;
  }
};

export type FirebaseAuthFriendlyError = Error & {
  code?: string;
  unauthorizedDomain?: string;
  pendingIntent?: RedirectLoginIntent | null;
};

export const getFirebaseConfigMismatchWarning = (): string | null => {
  const domain = resolvedFirebaseConfig.authDomain || '';
  const pid = resolvedFirebaseConfig.projectId || '';
  if (domain.endsWith('.firebaseapp.com')) {
    const domainProject = domain.replace('.firebaseapp.com', '');
    if (domainProject && pid && domainProject !== pid) {
      return `การตั้งค่า Firebase ยังไม่ตรงกัน: authDomain เป็น "${domain}" แต่ projectId/apiKey ยังเป็น "${pid}" ทำให้หน้าต่าง Google ปิดตัวเองทันที (กรุณาตั้งค่า VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID ให้ตรงกับโปรเจกต์ "${domainProject}")`;
    }
  }
  return null;
};

export const formatFirebaseAuthError = (error: any): FirebaseAuthFriendlyError => {
  const code = error?.code || '';
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const mismatch = getFirebaseConfigMismatchWarning();
  let message = error?.message || 'ไม่สามารถเข้าสู่ระบบด้วย Google ได้';

  if (code === 'auth/unauthorized-domain') {
    message = `โดเมน "${host}" ยังไม่ได้รับอนุญาตใน Firebase Project "${resolvedFirebaseConfig.projectId}" กรุณาเพิ่ม "${host}" (ไม่ต้องมี https://) ใน Firebase Console ของโปรเจกต์ "${resolvedFirebaseConfig.projectId}" > Authentication > Settings > Authorized domains (หรือใช้อีเมลและรหัสผ่าน Admin แทนได้ทันที)`;
  } else if (code === 'auth/popup-blocked') {
    message = 'เบราว์เซอร์บล็อกหน้าต่างป๊อปอัพ กรุณาอนุญาตป๊อปอัพสำหรับเว็บไซต์นี้ หรือเปิดใช้งานแบบเต็มหน้าจอ';
  } else if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    message = mismatch
      ? `${mismatch} [${code}]`
      : `หน้าต่างเข้าสู่ระบบ Google ถูกปิดก่อนเสร็จสมบูรณ์ [${code}] (หากหน้าต่างเด้งขึ้นมาแล้วปิดทันที มักเกิดจาก authDomain/projectId ไม่ตรงกัน หรือยังไม่ได้เพิ่มโดเมน "${host}" ใน Authorized domains)`;
  } else if (code === 'auth/operation-not-allowed') {
    message = `ยังไม่ได้เปิดใช้งาน Google Sign-in ใน Firebase Console (${resolvedFirebaseConfig.projectId}) > Authentication > Sign-in method`;
  } else if (code === 'auth/invalid-api-key' || code === 'auth/app-not-authorized' || code === 'auth/internal-error') {
    message = mismatch ? `${mismatch} [${code}]` : `การตั้งค่า Firebase ไม่ถูกต้อง (${code}) กรุณาตรวจสอบ API Key, Project ID และ Authorized domains`;
  } else if (code === 'auth/network-request-failed') {
    message = 'ไม่สามารถเชื่อมต่อบริการยืนยันตัวตน Google ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
  } else if (mismatch) {
    message = `${mismatch}${code ? ` [${code}]` : ''}`;
  }

  const formatted = new Error(message) as FirebaseAuthFriendlyError;
  formatted.code = code;
  if (code === 'auth/unauthorized-domain' && host) {
    formatted.unauthorizedDomain = host;
  }
  return formatted;
};

let pendingRedirectError: FirebaseAuthFriendlyError | null = null;
let redirectResultConsumed = false;

const redirectResultPromise: Promise<{ user: User; accessToken: string } | null> = (async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken || '';
      if (token) {
        saveToken(token);
      }
      return { user: result.user, accessToken: token };
    }
    return null;
  } catch (error: any) {
    console.warn('Google Sign-in redirect result warning:', error?.code || error?.message);
    pendingRedirectError = formatFirebaseAuthError(error);
    return null;
  }
})();

export const consumeRedirectError = (): FirebaseAuthFriendlyError | null => {
  const err = pendingRedirectError;
  pendingRedirectError = null;
  return err;
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string, isFromRedirect?: boolean) => void,
  onAuthFailure?: (error?: FirebaseAuthFriendlyError | null) => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    const redirectRes = await redirectResultPromise;
    const redirectErr = consumeRedirectError();
    if (redirectErr) {
      consumeRedirectIntent();
      if (onAuthFailure) {
        onAuthFailure(redirectErr);
      }
    }

    if (user) {
      const isFromRedirect = Boolean(
        !redirectResultConsumed && redirectRes && redirectRes.user.uid === user.uid
      );
      if (isFromRedirect) {
        redirectResultConsumed = true;
      }
      const token = redirectRes?.accessToken || (await getAccessToken()) || '';
      if (onAuthSuccess) onAuthSuccess(user, token, isFromRedirect);
    } else {
      // หาก getRedirectResult เพิ่งสำเร็จและกำลังอัปเดต auth state เป็น user อย่าเพิ่งล้าง token/intent ในรอบ null แรก
      if (redirectRes?.user) {
        return;
      }
      clearToken();
      if (!redirectErr) {
        const pendingIntent = consumeRedirectIntent();
        if (pendingIntent?.redirectStarted && onAuthFailure) {
          const host = typeof window !== 'undefined' ? window.location.hostname : '';
          const storageBlockedErr = new Error(
            `ไม่สามารถรับสถานะการล็อกอินกลับจาก Google Redirect ได้ (เบราว์เซอร์อาจบล็อก Third-Party Cookies ของ ${resolvedFirebaseConfig.authDomain} บนโดเมน "${host}") กรุณากด "ลองเข้าสู่ระบบด้วย Popup" ด้านล่าง หรือเปิดรับคุกกี้ชั่วคราว`
          ) as FirebaseAuthFriendlyError;
          storageBlockedErr.code = 'auth/redirect-state-lost';
          storageBlockedErr.pendingIntent = pendingIntent;
          onAuthFailure(storageBlockedErr);
          return;
        }
      }
      if (onAuthFailure) onAuthFailure(null);
    }
  });
};

export const isEmbeddedInIframe = (): boolean => {
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch (_) {
    return true;
  }
};

export const googleSignIn = async (options?: {
  intent?: Omit<RedirectLoginIntent, 'timestamp'>;
  forcePopup?: boolean;
}): Promise<GoogleSignInResult | null> => {
  try {
    const inIframe = isEmbeddedInIframe();

    // บนเบราว์เซอร์ปกติ (เช่น bls-ambulance.vercel.app) สั่งเปลี่ยนหน้าไปยังหน้าล็อกอินของ Google ทันทีด้วย signInWithRedirect (เลี่ยงปัญหาป๊อปอัพ) ยกเว้นเมื่อสั่ง forcePopup
    if (!inIframe && !options?.forcePopup) {
      saveRedirectIntent({
        ...(options?.intent || { type: 'login_view' }),
        redirectStarted: true,
      });
      await signInWithRedirect(auth, provider);
      return { redirected: true };
    }

    // กรณีเปิดใช้งานภายใน iframe (เช่น AI Studio Preview) ใช้ signInWithPopup เนื่องจากหน้า Google ปฏิเสธการโหลดแบบ Redirect ใน iframe
    if (options?.intent) {
      saveRedirectIntent(options.intent);
    }

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('ไม่สามารถรับ Access Token จากการเข้าสู่ระบบ Google ได้ กรุณาลองใหม่อีกครั้ง');
    }

    saveToken(credential.accessToken);
    consumeRedirectIntent();
    return { user: result.user, accessToken: credential.accessToken, redirected: false };
  } catch (error: any) {
    consumeRedirectIntent();
    console.warn('Google Sign-in warning:', error?.code || error?.message);
    throw formatFirebaseAuthError(error);
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  await redirectResultPromise;
  if (cachedAccessToken) {
    try {
      const savedTime = Number(localStorage.getItem(TOKEN_TIME_KEY) || 0);
      if (savedTime && Date.now() - savedTime > 3500 * 1000) {
        clearToken();
        return null;
      }
    } catch (_) {}
    return cachedAccessToken;
  }
  try {
    const saved = localStorage.getItem(TOKEN_STORAGE_KEY) || sessionStorage.getItem(TOKEN_STORAGE_KEY);
    const savedTime = Number(localStorage.getItem(TOKEN_TIME_KEY) || 0);
    if (saved && savedTime && Date.now() - savedTime < 3500 * 1000) {
      cachedAccessToken = saved;
      return saved;
    }
  } catch (_) {}
  return null;
};

export const logoutGoogle = async () => {
  await signOut(auth);
  clearToken();
};

