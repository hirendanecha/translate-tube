import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

declare const gapi: any;

@Injectable({
  providedIn: 'root',
})
export class GoogleAuthService {
  private clientId = '116706381724602797735.apps.googleusercontent.com'; // Replace with your OAuth Client ID
  public apiKey = 'AIzaSyAJb02qsvIN1AFpQm-e4tFvI5iVrJ6-FWQ'; // Replace with your API key
  private discoveryDocs = [
    'https://www.googleapis.com/discovery/v1/apis/translate/v2/rest',
  ];
  private scopes = 'https://www.googleapis.com/auth/cloud-translation';

  private gapiLoaded = new BehaviorSubject<boolean>(false);
  private authInstance: any;

  constructor(private http: HttpClient) {
    this.loadGapiScript()
      .then(() => this.initializeGapi())
      .catch((error) => console.error('Error loading GAPI:', error));
  }

  private loadGapiScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => resolve();
      script.onerror = () => reject('Google API script could not be loaded.');
      document.body.appendChild(script);
    });
  }

  private initializeGapi(): Promise<void> {
    return new Promise((resolve, reject) => {
      gapi.load('client:auth2', () => {
        gapi.client
          .init({
            apiKey: this.apiKey,
            clientId: this.clientId,
            discoveryDocs: this.discoveryDocs,
            scope: this.scopes,
          })
          .then(() => {
            this.authInstance = gapi.auth2.getAuthInstance();
            this.gapiLoaded.next(true);
            resolve(); // Resolves the promise once the authInstance is ready
          })
          .catch((err: any) => {
            console.error('Error during GAPI initialization', err);
            reject(err);
          });
      });
    });
  }

  public signIn(): Promise<any> {
    return new Promise((resolve, reject) => {
      // Ensure authInstance is initialized first
      this.initializeGapi()
        .then(() => {
          if (this.authInstance.isSignedIn.get()) {
            resolve(
              this.authInstance.currentUser.get().getAuthResponse().access_token
            );
          } else {
            this.authInstance
              .signIn()
              .then(() => {
                resolve(
                  this.authInstance.currentUser.get().getAuthResponse()
                    .access_token
                );
              })
              .catch((err: any) => reject(err));
          }
        })
        .catch((err: any) => reject(err));
    });
  }

  public translate(body: any, headers): Observable<any> {
    const url = `https://translation.googleapis.com/language/translate/v2?key=${this.apiKey}`;
    return this.http.post(url, body, {
      headers,
    });
  }
}
