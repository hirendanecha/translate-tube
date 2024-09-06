import { AfterViewInit, Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { SpeechRecognitionService } from '../../services/speech-recognition.service';
import { SocketService } from '../../services/socket.service';

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

  constructor(
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private router: Router,
    private socketService: SocketService,
    private speechRecognitionService: SpeechRecognitionService,
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

    api.on('readyToClose', () => {
      this.speechRecognitionService.stop();
      this.router.navigate(['/home']).then(() => {});
    });
    // api.addToolbarButton(
    //   'translationButton',
    //   'Translate',
    //   () => {
    //     this.onTranslate();
    //   },
    //   'custom-translate-button',
    //   'Click to translate',
    //   true
    // );
  }

  ngAfterViewInit(): void {
    if (this.socketService?.socket && !this.socketService?.socket?.connected) {
      this.socketService?.connect();
    }
    console.log(this.appointmentURLCall);
    this.socketService?.socket?.emit('join', this.appointmentURLCall);
    this.configureSpeechRecognition();
    this.socketService.socket?.on('translations', (res) => {
    let timeoutId: any;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      this.transcriptText = res?.data[0]?.translatedText;
      console.log(this.transcriptText);
      timeoutId = setTimeout(() => {
        this.transcriptText = '';
      }, 1500);
      console.log(res);
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
        translateLanguage: 'en-US',
      };
      console.log(currentTranscript);
      this.socketService.translationSocketService(reqObj, (data) => {
        console.log(data);
      });
    };
  }
}
