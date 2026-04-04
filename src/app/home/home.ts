import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';
import { AuthService } from '../auth.service';
import { firebaseApp, db, ref, get, set } from '../firebase';
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';

@Component({
  selector: 'app-home',
  imports: [MatCardModule, MatListModule, MatIconModule, MatDividerModule, MatProgressSpinnerModule, MatButtonModule, MatTooltipModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private barkSub?: Subscription;

  readonly barkBubbles = signal<number[]>([]);
  readonly dailyQuote = signal<string>('');
  readonly quoteLoading = signal(false);

  ngOnInit(): void {
    this.barkSub = this.auth.bark$.subscribe(() => this.showBarkBubbles());
    this.loadQuote();
  }

  ngOnDestroy(): void {
    this.barkSub?.unsubscribe();
  }

  async loadQuote(): Promise<void> {
    this.quoteLoading.set(true);
    try {
      // Load previously used quotes to build avoid list
      let usedQuotes: string[] = [];
      try {
        const usedSnap = await get(ref(db, `dailyQuote/used`));
        const usedData = usedSnap.val();
        if (usedData) usedQuotes = Object.values(usedData) as string[];
      } catch { /* proceed without history */ }

      const avoidList = usedQuotes.length
        ? '\n\nDo NOT repeat any of these previously used quotes:\n' + usedQuotes.map(q => '- "' + q + '"').join('\n')
        : '';

      const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });
      const model = getGenerativeModel(ai, {
        model: 'gemini-2.5-flash',
        systemInstruction: 'You generate a single short, funny dog life quote. Reply with ONLY the quote text — no quotation marks, no attribution, no extra commentary.',
      });

      const result = await model.generateContent(
        `Give me one funny, witty quote about dog life from a dog's perspective. Keep it to 1-2 sentences max. Make it humorous and relatable for dog owners.${avoidList}`
      );
      const quote = result.response.text().trim();
      this.dailyQuote.set(quote);

      // Persist to used list (best-effort)
      const usedKey = Date.now().toString(36);
      set(ref(db, `dailyQuote/used/${usedKey}`), quote)
        .catch(e => console.warn('Could not persist quote to DB:', e));
    } catch (e) {
      console.error('Failed to load quote:', e);
      this.dailyQuote.set('Every day is a good day when you have a dog! 🐾');
    } finally {
      this.quoteLoading.set(false);
    }
  }

  onPuppyClick(): void {
    if (this.barkBubbles().length) return;
    this.auth.playBark();
  }

  private showBarkBubbles(): void {
    const ids: number[] = [];
    const delays = [800, 1400, 2300];
    for (let i = 0; i < 3; i++) {
      const id = Date.now() + i;
      setTimeout(() => {
        ids.push(id);
        this.barkBubbles.set([...ids]);
      }, delays[i]);
    }
    // Remove all bubbles after last one has had time to animate
    setTimeout(() => {
      this.barkBubbles.set([]);
    }, delays[2] + 800);
  }
}
