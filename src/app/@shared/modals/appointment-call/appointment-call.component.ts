import { AfterViewInit, Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { SpeechRecognitionService } from '../../services/speech-recognition.service';
import { SocketService } from '../../services/socket.service';
import { TranslationService } from '../../services/translate.service';
import { LANGUAGES } from '../../constant/language';

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
  participantName: string = '';
  speakingPersonName: string = '';
  constructor(
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private router: Router,
    private socketService: SocketService,
    private speechRecognitionService: SpeechRecognitionService,
    private translationService: TranslationService
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
    // this.speechRecognitionService.setLanguage(navigator.language || 'en-US');
    api.on('audioMuteStatusChanged', (event) => {
      if (!event.muted) {
        this.speechRecognitionService.unmute();
      } else {
        this.speechRecognitionService.mute();
      }
    });

    //make title mode enabled default
    api.on(`videoConferenceJoined`, (event) => {
      this.participantName = event?.displayName;
      this.speechRecognitionService.start();
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
    // console.log(this.appointmentURLCall);
    this.socketService?.socket?.emit('join', {
      room: this.appointmentURLCall.toString(),
    });
    // console.log(this.socketService?.socket);
    this.configureSpeechRecognition();
    this.socketService.socket?.on('translations', (res) => {
      if (res?.translatedText) {
        console.log(res);
        this.speakingPersonName = res?.participantName;
        this.translateText(res?.translatedText, this.selectedLanguage);
      }
    });
  }

  configureSpeechRecognition() {
    // this.speechRecognitionService.recognition.onresult = (event: any) => {
    //   const currentTranscript = Array.from(event.results).map((result: any) => result[0].transcript).join('');
    //   const transcripts = Array.from(event.results).map(
    //     (result: any) => result[0].transcript
    //   );
    //   // const currentTranscript = transcripts[transcripts.length - 1];
    //   const reqObj = {
    //     callId: this.appointmentURLCall,
    //     translateText: currentTranscript,
    //   };
    //   this.socketService.translationSocketService(reqObj);
    // };
    // this.speechRecognitionService.transcriptedText.subscribe(
    //   transcript => {
    //   },)
    this.speechRecognitionService.transcriptedText$.subscribe(
      (transcripts: string) => {
        const reqObj = {
          callId: this.appointmentURLCall,
          translateText: transcripts,
          participantName: this.participantName,
        };
        this.socketService.translationSocketService(reqObj);
      },
      (error) => {
        console.error('Error:', error);
      }
    );
  }

  translateText(textToTranslate: string, targetLanguage: string) {
    let timeoutId: any;
    this.translationService
      .translate(textToTranslate, targetLanguage)
      .then((res: any) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        this.transcriptText = res.data.data.translations[0].translatedText;
        timeoutId = setTimeout(() => {
          this.transcriptText = '';
          this.speakingPersonName = '';
        }, 15000);
      })
      .catch((error) => {
        console.error('Translation error:', error);
      });
  }

  selectLanguage(event): void {
    this.selectedLanguage = event.target.value;
  }

  toggleTranslation() {
    this.showTranslation = !this.showTranslation;
  }
}
