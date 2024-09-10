import { AfterViewInit, Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { SpeechRecognitionService } from '../../services/speech-recognition.service';
import { SocketService } from '../../services/socket.service';
import { GoogleAuthService } from '../../services/translate.service';
import { HttpClient } from '@angular/common/http';
import { LANGUAGES } from '../../constant/language';
import axios from 'axios';
import { environment } from 'src/environments/environment';

declare var JitsiMeetExternalAPI: any;

@Component({
  selector: 'app-appointment-call',
  templateUrl: './appointment-call.component.html',
  styleUrls: ['./appointment-call.component.scss'],
})
export class AppointmentCallComponent implements OnInit, AfterViewInit {
  appointmentCall: SafeResourceUrl;
  domain: string = 'meet.facetime.tube';
  options: any;
  api: any;
  transcriptionLog: any[] = [];
  transcriptText: string = '';
  appointmentURLCall: string;
  languages = LANGUAGES;
  selectedLanguage: string = 'en-US';
  showTranslation: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private router: Router,
    private socketService: SocketService,
    private speechRecognitionService: SpeechRecognitionService,
    private googleAuthService: GoogleAuthService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.appointmentURLCall =
      this.route.snapshot['_routerState'].url.split('/appointment-call/')[1];
    // console.log(this.appointmentURLCall);
    this.appointmentCall = this.sanitizer.bypassSecurityTrustResourceUrl(
      'https://meet.facetime.tube/' + this.appointmentURLCall
    );

    this.options = {
      roomName: this.appointmentURLCall,
      parentNode: document.querySelector('#meet'),
      configOverwrite: {
        prejoinPageEnabled: false,
      },
      interfaceConfigOverwrite: {
        filmStripOnly: false,
        SHOW_JITSI_WATERMARK: false,
      },
      disableModeratorIndicator: true,
      lang: 'en',
    };

    const api = new JitsiMeetExternalAPI(this.domain, this.options);
    this.speechRecognitionService.start();
    // this.speechRecognitionService.setLanguage(navigator.language || 'en-US');

    api.on('audioMuteStatusChanged', (event) => {
      if (!event.muted) {
        this.speechRecognitionService.start();
      } else {
        this.speechRecognitionService.stop();
      }
    });
    api.on('participantJoined', (event) => {
      console.log('participantJoined', event);
    });

    //make title mode enabled default
    api.on(`videoConferenceJoined`, () => {
      const listener = ({ enabled }) => {
        api.removeEventListener(`tileViewChanged`, listener);
        if (!enabled) {
          api.executeCommand(`toggleTileView`);
        }
      };
      api.on(`tileViewChanged`, listener);
      api.executeCommand(`toggleTileView`);
    });

    api.on('readyToClose', () => {
      this.speechRecognitionService.stop();
      this.router.navigate(['/home']).then(() => {});
    });
  }

  ngAfterViewInit(): void {
    if (this.socketService?.socket && !this.socketService?.socket?.connected) {
      this.socketService?.connect();
    }
    console.log(this.appointmentURLCall);
    const room = this.appointmentURLCall.toString();
    this.socketService?.socket?.emit('join', {
      room: this.appointmentURLCall.toString(),
    });
    console.log(this.socketService?.socket);
    this.configureSpeechRecognition();
    this.socketService.socket?.on('translations', (res) => {
      let timeoutId: any;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      console.log(res);
      this.translate(res?.translatedText, this.selectedLanguage);
      console.log(this.transcriptText);
      timeoutId = setTimeout(() => {
        this.transcriptText = '';
      }, 5000);
    });
  }

  configureSpeechRecognition() {
    this.speechRecognitionService.recognition.onresult = (event: any) => {
      const transcripts = Array.from(event.results).map(
        (result: any) => result[0].transcript
      );
      const currentTranscript = transcripts[transcripts.length - 1];
      const reqObj = {
        callId: this.appointmentURLCall,
        translateText: currentTranscript,
      };
      this.socketService.translationSocketService(reqObj);
    };
  }

  translate(textToTranslate: string, targetLanguage: string) {
    // const body = {
    //   q: textToTranslate,
    //   target: targetLanguage || 'fr',
    // };
    // this.googleAuthService.translate(body).subscribe({
    //   next: (response: any) => {
    //     this.transcriptText = response.data.translations[0].translatedText;
    //   },
    //   error: (error) => {
    //     console.error('Translation error:', error);
    //   },
    // });

    return axios
      .post(
        `https://translation.googleapis.com/language/translate/v2?key=${environment.apiKey}`,
        {
          q: [textToTranslate],
          target: targetLanguage,
        }
      )
      .then((response) => {
        console.log(response.data.data.translations[0].translatedText);
        return (this.transcriptText =
          response.data.data.translations[0].translatedText);
      })
      .catch((error) => {
        console.error('Error:', error);
        throw error;
      });
  }

  selectLanguage(event): void {
    this.selectedLanguage = event.target.value;
  }

  toggleTranslation() {
    this.showTranslation = !this.showTranslation;
  }
}
