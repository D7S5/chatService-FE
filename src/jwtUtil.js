import { jwtDecode } from "jwt-decode";

export function isTokenExpired(token) {
  if (!token) return true;

  try {
    const { exp } = jwtDecode(token);
    return exp * 1000 < Date.now();
  } catch (e) {
    return true;
  }
}
