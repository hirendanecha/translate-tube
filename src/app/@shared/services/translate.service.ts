// import { HttpClient, HttpHeaders } from '@angular/common/http';
// import { Injectable } from '@angular/core';
// import { BehaviorSubject, Observable } from 'rxjs';
// import { environment } from 'src/environments/environment';

// declare const gapi: any;
// declare const google: any;

// @Injectable({
//   providedIn: 'root',
// })
// export class GoogleAuthService {
//   public apiKey = environment.apiKey; // Replace with your API key

//   constructor(private http: HttpClient) {}
//   public translate(body: any): Observable<any> {
//     return this.http.post(
//       'https://translation.googleapis.com/language/translate/v2?key=' +
//         environment.apiKey,
//       {
//         q: [body.q],
//         target: body.target,
//       }
//     );
//   }
// }

import { Injectable } from '@angular/core';
import axios from 'axios';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TranslationService {
  translate(textToTranslate: string, targetLanguage: string): Promise<any> {
    const apiUrl = `https://translation.googleapis.com/language/translate/v2?key=${environment.apiKey}`;

    return axios
      .post(apiUrl, {
        q: [textToTranslate],
        target: targetLanguage,
      })
      .then((response) => {
        return response;
      })
      .catch((error) => {
        console.error('Error:', error);
        throw error;
      });
  }
}
