// import { Injectable } from '@angular/core';

// @Injectable({
//   providedIn: 'root'
// })
// export class SpeechRecognitionService {
//   public recognition: any;
//   private isListening = false;
//   private isRestarting = false;
//   private language = 'en-US';

//   constructor() {
//     const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
//     if (SpeechRecognition) {
//       this.recognition = new SpeechRecognition();
//       this.recognition.continuous = true;
//       this.recognition.interimResults = true;

//       this.recognition.onerror = async (event: any) => {
//         console.error('Speech recognition error:', event.error);
//         if (this.isListening && !this.isRestarting) {
//           await this.restart();
//         }
//       };

//       this.recognition.onend = async () => {
//         if (this.isListening && !this.isRestarting) {
//           await this.restart();
//         }
//       };
//       this.setLanguage(navigator.language || this.language);
//     }
//   }

//   start() {
//     if (!this.isListening) {
//       this.isListening = true;
//       this.recognition.start();
//       console.log('Speech recognition started');
//     }
//   }

//   stop() {
//     if (this.isListening) {
//       this.isListening = false;
//       this.recognition.stop();
//       console.log('Speech recognition stopped');
//     }
//   }

//   setLanguage(lang: string) {
//     this.language = lang;
//     this.recognition.lang = lang;
//     console.log(`Speech recognition language set to ${lang}`);
//   }

//   private async restart() {
//     if (this.isRestarting) return;
//     this.isRestarting = true;

//     console.log('Restarting speech recognition...');
//     this.recognition.stop();
//     await new Promise(resolve => setTimeout(resolve, 100));

//     if (this.isListening) {
//       try {
//         this.recognition.start();
//         console.log('Speech recognition restarted');
//       } catch (error) {
//         console.error('Failed to restart speech recognition:', error);
//       }
//     }

//     this.isRestarting = false;
//   }
// }

// import { Injectable } from '@angular/core';
// import { environment } from 'src/environments/environment';

// @Injectable({
//   providedIn: 'root'
// })
// export class SpeechRecognitionService {
//   private mediaRecorder: MediaRecorder | null = null;
//   private audioChunks: Blob[] = [];
//   private stream: MediaStream | null = null;

//   constructor() {}

//   async start() {
//     try {
//       this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//       this.mediaRecorder = new MediaRecorder(this.stream);
//       this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
//         if (event.data.size > 0) {
//           this.audioChunks.push(event.data);
//         }
//       };
//       this.mediaRecorder.start();
//       console.log('Audio capture started');
//     } catch (err) {
//       console.error('Error accessing microphone:', err);
//     }
//   }

//   stop() {
//     if (this.mediaRecorder) {
//       this.mediaRecorder.stop();
//       this.mediaRecorder.onstop = async () => {
//         const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
//         this.audioChunks = [];
//         const transcript = await this.getTranscription(audioBlob);
//         console.log('Transcript:', transcript);
//         // const translatedText = await this.translate(transcript, 'es');
//         // console.log('Translated text:', translatedText);
//       };
//       console.log('Audio capture stopped');
//     }
//   }

//   private async getTranscription(audioBlob: Blob): Promise<string> {
//     const reader = new FileReader();
//     return new Promise((resolve, reject) => {
//       reader.onloadend = async () => {
//         const audioArrayBuffer = reader.result as ArrayBuffer;
//         try {
//           const response = await fetch(
//             `https://speech.googleapis.com/v1/speech:recognize?key=${environment.apiKey}`, {
//               method: 'POST',
//               headers: {
//                 'Content-Type': 'application/json',
//               },
//               body: JSON.stringify({
//                 config: {
//                   encoding: 'LINEAR16',
//                   sampleRateHertz: 48000,
//                   languageCode: 'en-US',
//                 },
//                 audio: {
//                   content: btoa(
//                     new Uint8Array(audioArrayBuffer)
//                       .reduce((data, byte) => data + String.fromCharCode(byte), '')
//                   ),
//                 },
//               }),
//             }
//           );
//           const result = await response.json();
//           if (!response.ok) {
//             console.error('API error:', result);
//           }
//           const transcript = result.results?.[0]?.alternatives?.[0]?.transcript || '';
//           resolve(transcript);
//         } catch (error) {
//           console.error('Error transcribing audio:', error);
//           reject(error);
//         }
//       };
//       reader.readAsArrayBuffer(audioBlob);
//     });
//   }

//   async translate(textToTranslate: string, targetLanguage: string): Promise<string> {
//     try {
//       const response = await fetch(
//         `https://translation.googleapis.com/language/translate/v2?key=${environment.apiKey}`, {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//           },
//           body: JSON.stringify({
//             q: textToTranslate,
//             target: targetLanguage,
//           }),
//         }
//       );

//       const result = await response.json();
//       return result.data.translations[0].translatedText;

//     } catch (error) {
//       console.error('Translation error:', error);
//       throw error;
//     }
//   }
// }

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SpeechRecognitionService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  public stream: MediaStream | null = null;
  private transcriptedTextSubject = new BehaviorSubject<string>('');
  transcriptedText$: Observable<string> =
    this.transcriptedTextSubject.asObservable();
  isMuted = false;
  private restartTimeout: any;
  private restartDelayTimeout: any;

  constructor() {}

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 48000 },
      });
      this.mediaRecorder = new MediaRecorder(this.stream);

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.audioChunks = [];
        const transcript = await this.getTranscription(audioBlob);
        this.transcriptedTextSubject.next(transcript);
      };

      this.mediaRecorder.start();
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
    this.restartTimeout = setTimeout(() => {
      this.restart();
    }, 3000);
  }

  restart() {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      if (!this.isMuted) {
        this.restartDelayTimeout = setTimeout(() => {
          this.start();
        }, 200);
      }
    }
  }

  stop() {
    if (this.mediaRecorder || this.stream) {
      clearTimeout(this.restartTimeout);
      clearTimeout(this.restartDelayTimeout);
      this.isMuted = true;
      this.mediaRecorder.stop();
      this.stream.getTracks().forEach((track) => track.stop());
    }
  }

  mute() {
    this.isMuted = true;
    this.restart();
  }

  unmute() {
    this.isMuted = false;
    this.mediaRecorder.start();
    this.restart();
  }

  private async getTranscription(audioBlob: Blob): Promise<string> {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onloadend = async () => {
        const audioArrayBuffer = reader.result as ArrayBuffer;
        try {
          const response = await fetch(
            `https://speech.googleapis.com/v1/speech:recognize?key=${environment.apiKey}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                config: {
                  encoding: 'WEBM_OPUS',
                  sampleRateHertz: 48000,
                  languageCode: 'en-US',
                },
                audio: {
                  content: btoa(
                    new Uint8Array(audioArrayBuffer).reduce(
                      (data, byte) => data + String.fromCharCode(byte),
                      ''
                    )
                  ),
                },
              }),
            }
          );
          const result = await response.json();
          if (!response.ok) {
            console.error('API error:', result);
            return resolve('');
          }
          // const transcript = result.results?.[0]?.alternatives?.[0]?.transcript || '';
          const transcript =
            result.results?.[result.results.length - 1]?.alternatives?.[0]
              ?.transcript || '';
          resolve(transcript);
        } catch (error) {
          console.error('Error transcribing audio:', error);
          reject(error);
        }
      };
      reader.readAsArrayBuffer(audioBlob);
    });
  }

  // async translate(textToTranslate: string, targetLanguage: string): Promise<string> {
  //   try {
  //     const response = await fetch(
  //       `https://translation.googleapis.com/language/translate/v2?key=${environment.apiKey}`, {
  //         method: 'POST',
  //         headers: {
  //           'Content-Type': 'application/json',
  //         },
  //         body: JSON.stringify({
  //           q: textToTranslate,
  //           target: targetLanguage,
  //         }),
  //       }
  //     );

  //     const result = await response.json();
  //     return result.data.translations[0].translatedText;

  //   } catch (error) {
  //     console.error('Translation error:', error);
  //     throw error;
  //   }
  // }
}
