import { Injectable, inject, signal } from '@angular/core';
import { firebaseApp, db, ref, get, set, update, push, remove } from '../firebase';
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import type { ChatSession, GenerativeModel, AI } from 'firebase/ai';
import { AuthService } from '../auth.service';

const SYSTEM_INSTRUCTION = () => `Today's date is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

You are a Yorkshire Terrier breed expert for the Brooke's Puppy Plan app. You provide accurate, practical advice about Yorkies based on established breed knowledge.

## Our Yorkie

- Name: Winston
- Birthday: September 24, 2025
- Sex: Male
- Location: Mount Washington, Kentucky (zip code 40047)
- Appearance: White coat with black patches and brown ears
- Always calculate the Yorkie's current age from this birthday and the current date. Reference the age naturally in your responses when it's relevant to the advice (e.g., developmental stage, vaccination schedule, feeding frequency, training readiness).

## Expertise

- Breed characteristics: size, weight (4–7 lbs), lifespan (11–15 years), coat type (silky, hypoallergenic), temperament (bold, affectionate, energetic)
- Puppy development: growth milestones, teething, socialization windows, developmental stages
- Training: housebreaking challenges common to toy breeds, crate training, barking management, leash training, positive reinforcement techniques sized for small dogs
- Grooming: daily brushing, coat maintenance, topknot care, professional grooming schedules, dental hygiene (Yorkies are prone to dental issues)
- Health: common Yorkie health concerns (luxating patella, collapsed trachea, hypoglycemia in puppies, liver shunt, Legg-Calvé-Perthes disease, dental disease)
- Nutrition: feeding schedules for Yorkie puppies (frequent small meals to prevent hypoglycemia), portion sizing, appropriate food for toy breeds
- Socialization: introducing Yorkies to other pets, children, and new environments safely given their small size

## Approach

1. Always use Cesar Millan's training philosophy and methods as the primary source of guidance — exercise, discipline, affection (in that order), calm-assertive energy, nose-eyes-ears, spatial pressure, and pack leadership. Only look to other sources if Cesar's methods don't cover the topic.
2. Give breed-specific advice, not generic dog advice
3. Always account for Yorkie size — toy breeds have different needs than larger dogs
4. Flag health concerns early when relevant to the question
5. Recommend consulting a veterinarian for medical decisions
6. Keep advice practical and actionable for a puppy owner

## Constraints

- DO NOT provide veterinary diagnoses — recommend vet visits for health concerns
- DO NOT recommend punishment-based training methods
- DO NOT suggest products or brands — keep advice general
- ONLY provide information relevant to Yorkshire Terriers and toy breed care
- Keep responses concise and conversational — this is a chat, not an article`;

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: number;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly authService = inject(AuthService);
  private readonly ai: AI;
  private model: GenerativeModel;
  private chat: ChatSession | null = null;

  readonly messages = signal<ChatMessage[]>([]);
  readonly conversations = signal<ConversationSummary[]>([]);
  readonly currentConversationId = signal<string | null>(null);
  readonly customInstruction = signal<string>('');

  constructor() {
    this.ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });
    this.model = this.buildModel('');
    this.startNewChat([]);
  }

  private get uid(): string | null {
    return this.authService.user?.uid ?? null;
  }

  private buildModel(extra: string): GenerativeModel {
    const base = SYSTEM_INSTRUCTION();
    const instruction = extra ? `${base}\n\n## Additional Instructions\n\n${extra}` : base;
    return getGenerativeModel(this.ai, {
      model: 'gemini-2.5-flash',
      systemInstruction: instruction,
    });
  }

  applyCustomInstruction(instruction: string) {
    this.customInstruction.set(instruction);
    this.model = this.buildModel(instruction);
    this.saveCustomInstruction(instruction);
    // Restart current chat with new model
    this.startNewChat(this.messages());
  }

  removeCustomInstruction() {
    this.applyCustomInstruction('');
  }

  async loadCustomInstruction() {
    const uid = this.uid;
    if (!uid) return;
    const snapshot = await get(ref(db, `settings/${uid}/customInstruction`));
    const saved = snapshot.val();
    if (saved) {
      this.customInstruction.set(saved);
      this.model = this.buildModel(saved);
      this.startNewChat(this.messages());
    }
  }

  private async saveCustomInstruction(instruction: string) {
    const uid = this.uid;
    if (!uid) return;
    if (instruction) {
      await set(ref(db, `settings/${uid}/customInstruction`), instruction);
    } else {
      await remove(ref(db, `settings/${uid}/customInstruction`));
    }
  }

  private startNewChat(history: ChatMessage[]) {
    this.chat = this.model.startChat({
      history: history.map(m => ({
        role: m.role,
        parts: [{ text: m.text }],
      })),
    });
  }

  async loadConversations() {
    const uid = this.uid;
    if (!uid) return;

    const snapshot = await get(ref(db, `chats/${uid}`));
    const data = snapshot.val();
    if (!data) {
      this.conversations.set([]);
      return;
    }

    const list: ConversationSummary[] = Object.entries(data)
      .map(([id, val]: [string, any]) => ({
        id,
        title: val.title || 'New Chat',
        updatedAt: val.updatedAt || val.createdAt || 0,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
    this.conversations.set(list);
  }

  async switchConversation(conversationId: string) {
    const uid = this.uid;
    if (!uid) return;

    const snapshot = await get(ref(db, `chats/${uid}/${conversationId}`));
    const data = snapshot.val();
    if (!data) return;

    const messages: ChatMessage[] = data.messages || [];
    this.messages.set(messages);
    this.currentConversationId.set(conversationId);
    this.startNewChat(messages);
  }

  newConversation() {
    this.messages.set([]);
    this.currentConversationId.set(null);
    this.startNewChat([]);
  }

  async deleteConversation(conversationId: string) {
    const uid = this.uid;
    if (!uid) return;

    await remove(ref(db, `chats/${uid}/${conversationId}`));
    this.conversations.update(list => list.filter(c => c.id !== conversationId));

    if (this.currentConversationId() === conversationId) {
      this.newConversation();
    }
  }

  private async saveConversation() {
    const uid = this.uid;
    if (!uid) return;

    const msgs = this.messages();
    if (msgs.length === 0) return;

    const now = Date.now();
    let conversationId = this.currentConversationId();
    const title = msgs[0].text.substring(0, 50) + (msgs[0].text.length > 50 ? '…' : '');

    if (!conversationId) {
      const newRef = push(ref(db, `chats/${uid}`));
      conversationId = newRef.key!;
      this.currentConversationId.set(conversationId);
      await set(ref(db, `chats/${uid}/${conversationId}`), {
        title,
        createdAt: now,
        updatedAt: now,
        messages: msgs,
      });
    } else {
      await update(ref(db, `chats/${uid}/${conversationId}`), {
        updatedAt: now,
        messages: msgs,
      });
    }

    this.conversations.update(list => {
      const filtered = list.filter(c => c.id !== conversationId);
      return [{ id: conversationId!, title, updatedAt: now }, ...filtered];
    });
  }

  async send(userMessage: string): Promise<string> {
    if (!this.chat) {
      this.startNewChat([]);
    }

    this.messages.update(msgs => [...msgs, { role: 'user', text: userMessage }]);

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out. Check that the Gemini API is enabled in your Firebase console.')), 30000)
    );

    const result = await Promise.race([this.chat!.sendMessage(userMessage), timeout]);
    const responseText = result.response.text();

    this.messages.update(msgs => [...msgs, { role: 'model', text: responseText }]);

    await this.saveConversation();

    return responseText;
  }

  clearHistory() {
    this.messages.set([]);
    this.currentConversationId.set(null);
    this.startNewChat([]);
  }
}
