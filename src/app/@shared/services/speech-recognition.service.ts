import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SpeechRecognitionService {
  public recognition: any;
  private isListening = false;
  private isRestarting = false;
  private language = 'en-US';

  constructor() {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
  
      this.recognition.onerror = async (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (this.isListening && !this.isRestarting) {
          await this.restart();
        }
      };
  
      this.recognition.onend = async () => {
        if (this.isListening && !this.isRestarting) {
          await this.restart();
        }
      };
      this.setLanguage(navigator.language || this.language);
    }
  }

  start() {
    if (!this.isListening) {
      this.isListening = true;
      this.recognition.start();
      console.log('Speech recognition started');
    }
  }

  stop() {
    if (this.isListening) {
      this.isListening = false;
      this.recognition.stop();
      console.log('Speech recognition stopped');
    }
  }

  setLanguage(lang: string) {
    this.language = lang;
    this.recognition.lang = lang;
    console.log(`Speech recognition language set to ${lang}`);
  }

  private async restart() {
    if (this.isRestarting) return;
    this.isRestarting = true;

    console.log('Restarting speech recognition...');
    this.recognition.stop();
    await new Promise(resolve => setTimeout(resolve, 100));

    if (this.isListening) {
      try {
        this.recognition.start();
        console.log('Speech recognition restarted');
      } catch (error) {
        console.error('Failed to restart speech recognition:', error);
      }
    }

    this.isRestarting = false;
  }
}
