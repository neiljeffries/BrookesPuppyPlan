import { Component, ElementRef, OnDestroy, OnInit, ViewChild, WritableSignal, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firebaseApp } from '../firebase';
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import type { GenerativeModel } from 'firebase/ai';

@Component({
  selector: 'app-home',
  imports: [MatCardModule, MatListModule, MatIconModule, MatDividerModule, MatProgressSpinnerModule, MatButtonModule, MatTooltipModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit, OnDestroy {
  readonly winstonReplies = signal<string[]>([]);
  readonly quoteLoading = signal(false);
  readonly conversationRunning = signal(false);

  @ViewChild('winstonLog') private winstonLog?: ElementRef<HTMLDivElement>;

  private conversationRunId = 0;
  private nextPrompt = 'Say something funny about dog life in one short sentence.';

  private readonly ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });
  private readonly winstonModel = getGenerativeModel(this.ai, {
    model: 'gemini-2.5-flash',
    systemInstruction: 'You are Winston, a sassy Yorkie who delivers short, hilarious, playful observations about dog life. Keep responses to one short sentence, no emojis.',
  });

  ngOnInit(): void {
    void this.startConversation();
  }

  ngOnDestroy(): void {
    this.stopConversation();
  }

  stopConversation(): void {
    this.conversationRunId += 1;
    this.conversationRunning.set(false);
    this.quoteLoading.set(false);
  }

  refreshWinstonQuote(): void {
    this.stopConversation();
    void this.startConversation();
  }

  async startConversation(): Promise<void> {
    if (this.conversationRunning()) {
      return;
    }

    const runId = ++this.conversationRunId;
    this.conversationRunning.set(true);
    this.quoteLoading.set(true);

    const lastWinstonReply = this.winstonReplies().at(-1);
    if (lastWinstonReply) {
      this.nextPrompt = lastWinstonReply;
    }

    try {
      while (runId === this.conversationRunId) {
        this.quoteLoading.set(true);
        const winstonReply = await this.generateDogReply(this.winstonModel, this.nextPrompt);
        if (runId !== this.conversationRunId) {
          return;
        }

        this.appendReply(this.winstonReplies, winstonReply, 'winston');
        this.nextPrompt = winstonReply;
        this.quoteLoading.set(false);

        const continueLoop = await this.pauseForNextTurn(runId);
        if (!continueLoop) {
          return;
        }
      }
    } catch (e) {
      console.error('Failed to generate Winston quote:', e);
      if (!this.winstonReplies().length) {
        this.appendReply(this.winstonReplies, 'I was about to roast you, but I saw a squirrel and lost the plot.', 'winston');
      }
      this.quoteLoading.set(false);
    } finally {
      if (runId === this.conversationRunId) {
        this.conversationRunning.set(false);
      }
    }
  }

  private async generateDogReply(model: GenerativeModel, incomingText: string): Promise<string> {
    const result = await model.generateContent(
      `Say something funny about dog life based on this: "${incomingText}". Keep it to one short, witty line (under 18 words).`
    );

    const reply = result.response.text().replace(/\s+/g, ' ').trim();
    return reply || '...';
  }

  private pause(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private appendReply(target: WritableSignal<string[]>, reply: string, speaker: 'winston'): void {
    target.update(existing => [...existing, reply]);
    this.scheduleAutoScroll();
  }

  private scheduleAutoScroll(): void {
    requestAnimationFrame(() => {
      const logElement = this.winstonLog?.nativeElement;

      if (logElement) {
        logElement.scrollTop = logElement.scrollHeight;
      }
    });
  }

  private async pauseForNextTurn(runId: number): Promise<boolean> {
    await this.pause(600000); // 10 minutes
    return runId === this.conversationRunId;
  }
}
