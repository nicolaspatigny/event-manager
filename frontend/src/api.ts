import { Injectable, signal, inject } from "@angular/core";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { catchError, throwError, tap } from "rxjs";
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "USER" | "ORGANIZER" | "ADMIN";
  disabled?: boolean;
}
export interface EventItem {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  location: string;
  categoryId: string;
  organizerId: string;
  capacity: number;
  status: string;
  registeredCount: number;
  availablePlaces: number;
  registered: boolean;
  revision: number;
}
export interface Category {
  id: string;
  name: string;
  active: boolean;
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}
@Injectable({ providedIn: "root" })
export class Api {
  private http = inject(HttpClient);
  private token: string | null = null;
  user = signal<User | null>(null);
  error = signal("");
  notice = signal("");
  request<T>(method: string, path: string, body?: unknown) {
    this.error.set("");
    return this.http
      .request<T>(method, "/api" + path, {
        body,
        headers: this.token ? { Authorization: "Bearer " + this.token } : {},
      })
      .pipe(
        catchError((e: HttpErrorResponse) => {
          const fields = e.error?.errors
            ? Object.entries(e.error.errors)
                .map(([k, v]) => k + ": " + v)
                .join(" · ")
            : "";
          this.error.set(
            fields ||
              e.error?.detail ||
              "Connexion impossible. Réessayez dans un instant.",
          );
          if (e.status === 401 && !path.startsWith("/auth/")) this.clear();
          return throwError(() => e);
        }),
      );
  }
  login(email: string, password: string) {
    return this.request<{ token: string; user: User }>("POST", "/auth/login", {
      email,
      password,
    }).pipe(
      tap((result) => {
        this.token = result.token;
        this.user.set(result.user);
      }),
    );
  }
  clear() {
    this.token = null;
    this.user.set(null);
  }
  logout() {
    return this.request<void>("POST", "/auth/logout").pipe(
      tap(() => this.clear()),
    );
  }
  isOrganizer() {
    return this.user()?.role === "ORGANIZER" || this.user()?.role === "ADMIN";
  }
  message(text: string) {
    this.notice.set(text);
  }
}
