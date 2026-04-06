import { Component } from '@angular/core';

@Component({
  selector: 'app-winston',
  templateUrl: './winston.html',
  styleUrl: './winston.css',
})
export class Winston {
  onVideoEnded(event: Event) {
    const video = event.target as HTMLVideoElement;
    video.currentTime = video.duration;
    video.pause();
  }
}
