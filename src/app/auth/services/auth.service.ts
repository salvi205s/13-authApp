import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { environment } from 'src/environments/environments';
import {
  AuthStatus,
  CheckTokenResponse,
  LoginResponse,
  User,
} from '../interfaces';

// Importación de decorador e inyección de dependencias para el servicio
@Injectable({
  providedIn: 'root',
})

// Clase AuthService que maneja la autenticación del usuario
export class AuthService {
  // URL base para las solicitudes HTTP
  private readonly baseUrl: string = environment.baseUrl;

  // Instancia de HttpClient para realizar solicitudes HTTP
  private http = inject(HttpClient);

  // Señales para el usuario actual y el estado de autenticación
  private _currentUser = signal<User | null>(null);
  private _authStatus = signal<AuthStatus>(AuthStatus.checking);

  // ( getters )
  // Propiedades públicas para acceder a las señales desde el exterior
  public currentUser = computed(() => this._currentUser());
  public authStatus = computed(() => this._authStatus());

  // Constructor de la clase AuthService
  constructor() {
    // Llama al método checkAuthStatus al instanciar la clase y suscribe a sus eventos
    this.checkAuthStatus().subscribe();
  }

  //--------------------------------------------------------------------------------------------------------------------------------

  // Método privado que establece la autenticación del usuario
  private setAuthentication(user: User, token: string): boolean {
    // Actualiza la señal del usuario actual con la información del usuario proporcionada
    this._currentUser.set(user);

    // Establece el estado de autenticación como autenticado
    this._authStatus.set(AuthStatus.authenticated);

    // Almacena el token en el almacenamiento local del navegador
    localStorage.setItem('token', token);

    // Retorna true para indicar que la autenticación fue exitosa
    return true;
  }

  //--------------------------------------------------------------------------------------------------------------------------------

  // Método para iniciar sesión, recibe el correo electrónico y la contraseña
  login(email: string, password: string): Observable<boolean> {
    // Construye la URL para la solicitud de inicio de sesión
    const url = `${this.baseUrl}/auth/login`;

    // Cuerpo de la solicitud con el correo electrónico y la contraseña
    const body = { email, password };

    // Realiza la solicitud HTTP de inicio de sesión y maneja la respuesta
    return this.http.post<LoginResponse>(url, body).pipe(
      // Utiliza el operador map para procesar la respuesta del servidor
      map(({ user, token }) => this.setAuthentication(user, token)),

      // Utiliza el operador catchError para manejar cualquier error en la solicitud
      catchError((err) => throwError(() => err.error.message))
    );
  }

  //--------------------------------------------------------------------------------------------------------------------------------

  // Método para verificar el estado de autenticación del usuario
  checkAuthStatus(): Observable<boolean> {
    // Construye la URL para la verificación del token
    const url = `${this.baseUrl}/auth/check-token`;

    // Obtiene el token almacenado en el navegador
    const token = localStorage.getItem('token');

    // Si no hay un token, cierra la sesión y retorna un observable de false
    if (!token) {
      this.logout();
      return of(false);
    }

    // Configura las cabeceras con el token de autorización
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    // Realiza la solicitud HTTP de verificación del token y maneja la respuesta
    return this.http.get<CheckTokenResponse>(url, { headers }).pipe(
      // Utiliza el operador map para procesar la respuesta del servidor
      map(({ user, token }) => this.setAuthentication(user, token)),

      // Utiliza el operador catchError para manejar cualquier error en la solicitud
      catchError(() => {
        // Establece el estado de autenticación como no autenticado
        this._authStatus.set(AuthStatus.notAuthenticated);

        // Retorna un observable de false
        return of(false);
      })
    );
  }

  //--------------------------------------------------------------------------------------------------------------------------------

  // Método para cerrar sesión del usuario
  logout() {
    // Remueve el token del almacenamiento local
    localStorage.removeItem('token');

    // Actualiza la señal del usuario actual como null
    this._currentUser.set(null);

    // Establece el estado de autenticación como no autenticado
    this._authStatus.set(AuthStatus.notAuthenticated);
  }
}
