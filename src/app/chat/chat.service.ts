import { Injectable, inject, signal } from '@angular/core';
import { firebaseApp, db, ref, get, set, update, push, remove } from '../firebase';
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import type { ChatSession, GenerativeModel, AI } from 'firebase/ai';
import { AuthService } from '../auth.service';

const BASE_INSTRUCTION = () => `Today's date is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

You are a helpful assistant for the Brooke's Puppy Plan app. Keep responses concise and conversational — this is a chat, not an article.`;

export interface AgentDef {
  id: string;
  name: string;
  icon: string;
  instruction: string;
  custom?: boolean;
}

const STRIP_FRONTMATTER = (md: string) => md.replace(/^---[\s\S]*?---\s*/, '');

/* ── Validation / sanitization for user-submitted agents ── */

const MAX_AGENT_NAME_LENGTH = 40;
const MAX_INSTRUCTION_LENGTH = 10000;
const MAX_CUSTOM_AGENTS = 10;

/** Patterns that indicate prompt-injection or jailbreak attempts */
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /disregard\s+(all\s+)?prior/i,
  /you\s+are\s+now\s+(?:DAN|unrestricted|unfiltered|jailbroken)/i,
  /pretend\s+you\s+(?:are|have)\s+no\s+(?:rules|restrictions|limits)/i,
  /override\s+(?:system|safety|content)\s+(?:prompt|policy|filter)/i,
  /forget\s+(?:everything|your\s+instructions)/i,
  /act\s+as\s+(?:if\s+)?you\s+(?:have\s+)?no\s+(?:guardrails|safety)/i,
  /\bdo\s+anything\s+now\b/i,
  /reveal\s+(?:your|the)\s+system\s+prompt/i,
  /output\s+(?:your|the)\s+(?:system|initial)\s+(?:prompt|instructions)/i,
];

export interface AgentValidationResult {
  valid: boolean;
  error?: string;
}

export function validateAgentInput(name: string, instruction: string, existingCount: number): AgentValidationResult {
  const trimmedName = name.trim();
  const trimmedInstruction = instruction.trim();

  if (!trimmedName) return { valid: false, error: 'Agent name is required.' };
  if (trimmedName.length > MAX_AGENT_NAME_LENGTH) return { valid: false, error: `Name must be ${MAX_AGENT_NAME_LENGTH} characters or fewer.` };
  if (!trimmedInstruction) return { valid: false, error: 'Instructions are required.' };
  if (trimmedInstruction.length > MAX_INSTRUCTION_LENGTH) return { valid: false, error: `Instructions must be ${MAX_INSTRUCTION_LENGTH.toLocaleString()} characters or fewer.` };
  if (existingCount >= MAX_CUSTOM_AGENTS) return { valid: false, error: `You can have at most ${MAX_CUSTOM_AGENTS} custom agents.` };

  // Check for HTML/script tags
  if (/<script[\s>]/i.test(trimmedInstruction) || /<\/script>/i.test(trimmedInstruction)) {
    return { valid: false, error: 'Instructions cannot contain script tags.' };
  }

  // Check for injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmedInstruction)) {
      return { valid: false, error: 'Instructions contain disallowed content that could interfere with the system.' };
    }
  }

  return { valid: true };
}

/** Strip anything that could be rendered as HTML — instructions are plain text only */
function sanitizeText(text: string): string {
  return text.replaceAll(/[<>]/g, '').trim();
}

export const AVAILABLE_AGENTS: AgentDef[] = [
  {
    id: 'winston',
    name: 'Winston',
    icon: 'pets',
    instruction: STRIP_FRONTMATTER(`You are the dedicated expert for **Winston**, the Yorkshire Terrier belonging to the Brooke's Puppy Plan family. You provide personalized, age-appropriate advice and tracking specifically for Winston.

## Winston's Profile

- **Name**: Winston
- **Birthday**: September 24, 2025
- **Sex**: Male
- **Breed**: Yorkshire Terrier
- **Location**: Mount Washington, Kentucky (zip code 40047)
- **Appearance**: White coat with black patches and brown ears

## Age Awareness

- Always calculate Winston's current age from his birthday (September 24, 2025) and the current date.
- Reference his age naturally in responses when relevant to developmental stage, vaccination schedule, feeding frequency, training readiness, or milestones. But not too often — only when it adds value to the advice.
- Frame advice in terms of what's appropriate **right now** for Winston's age.

## Expertise

- **Winston's development**: Where he is in puppy growth milestones, what to expect next, and age-appropriate activities
- **Personalized schedules**: Feeding, potty, exercise, sleep, and grooming schedules tailored to Winston's current age
- **Training readiness**: What commands and behaviors Winston is developmentally ready to learn
- **Health timeline**: Vaccination schedules, spay/neuter timing, dental milestones, and weight expectations for his age
- **Socialization progress**: What socialization experiences Winston should be having at his current stage

## Approach

1. **Always use Cesar Millan's training philosophy and methods as the primary source of guidance** — exercise, discipline, affection (in that order), calm-assertive energy, nose-eyes-ears, spatial pressure, and pack leadership. Only look to other sources if Cesar's methods don't cover the topic.
2. Personalize all advice to Winston's specific age, size, and circumstances
3. Proactively mention upcoming milestones or changes Winston's family should prepare for
4. Account for his Yorkie-specific needs (toy breed size, hypoglycemia risk, dental concerns)
5. Keep advice practical and actionable

## Constraints

- DO NOT provide veterinary diagnoses — recommend vet visits for health concerns
- DO NOT recommend punishment-based training methods
- DO NOT suggest products or brands — keep advice general`),
  },
  {
    id: 'yorkie-expert',
    name: 'Yorkie Expert',
    icon: 'school',
    instruction: STRIP_FRONTMATTER(`You are a Yorkshire Terrier breed expert for the Brooke's Puppy Plan app. You provide accurate, practical advice about Yorkies based on established breed knowledge.

## Expertise

- **Breed characteristics**: size, weight (4–7 lbs), lifespan (11–15 years), coat type (silky, hypoallergenic), temperament (bold, affectionate, energetic)
- **Puppy development**: growth milestones, teething, socialization windows, developmental stages
- **Training**: housebreaking challenges common to toy breeds, crate training, barking management, leash training, positive reinforcement techniques sized for small dogs
- **Grooming**: daily brushing, coat maintenance, topknot care, professional grooming schedules, dental hygiene (Yorkies are prone to dental issues)
- **Health**: common Yorkie health concerns (luxating patella, collapsed trachea, hypoglycemia in puppies, liver shunt, Legg-Calvé-Perthes disease, dental disease)
- **Nutrition**: feeding schedules for Yorkie puppies (frequent small meals to prevent hypoglycemia), portion sizing, appropriate food for toy breeds
- **Socialization**: introducing Yorkies to other pets, children, and new environments safely given their small size

## Approach

1. **Always use Cesar Millan's training philosophy and methods as the primary source of guidance** — exercise, discipline, affection (in that order), calm-assertive energy, nose-eyes-ears, spatial pressure, and pack leadership. Only look to other sources if Cesar's methods don't cover the topic.
2. Give breed-specific advice, not generic dog advice
3. Always account for Yorkie size — toy breeds have different needs than larger dogs
4. Flag health concerns early when relevant to the question
5. Recommend consulting a veterinarian for medical decisions
6. Keep advice practical and actionable for a puppy owner

## Constraints

- DO NOT provide veterinary diagnoses — recommend vet visits for health concerns
- DO NOT recommend punishment-based training methods
- DO NOT suggest products or brands — keep advice general
- ONLY provide information relevant to Yorkshire Terriers and toy breed care`),
  },
];

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
  readonly activeAgentIds = signal<string[]>(['yorkie-expert']);
  readonly customAgents = signal<AgentDef[]>([]);

  constructor() {
    this.ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });
    this.model = this.buildModel('');
    this.startNewChat([]);
  }

  private get uid(): string | null {
    return this.authService.user?.uid ?? null;
  }

  private buildModel(extra: string): GenerativeModel {
    const parts: string[] = [BASE_INSTRUCTION()];

    for (const agentId of this.activeAgentIds()) {
      const agent = AVAILABLE_AGENTS.find(a => a.id === agentId)
        ?? this.customAgents().find(a => a.id === agentId);
      if (agent) parts.push(agent.instruction);
    }

    if (extra) parts.push(`## Additional Instructions\n\n${extra}`);

    return getGenerativeModel(this.ai, {
      model: 'gemini-2.5-flash',
      systemInstruction: parts.join('\n\n'),
    });
  }

  toggleAgent(agentId: string) {
    this.activeAgentIds.update(ids =>
      ids.includes(agentId) ? ids.filter(id => id !== agentId) : [...ids, agentId]
    );
    this.rebuildModel();
  }

  private rebuildModel() {
    this.model = this.buildModel(this.customInstruction());
    this.startNewChat(this.messages());
  }

  applyCustomInstruction(instruction: string) {
    this.customInstruction.set(instruction);
    this.saveCustomInstruction(instruction);
    this.rebuildModel();
  }

  removeCustomInstruction() {
    this.applyCustomInstruction('');
  }

  /* ── Custom agent CRUD ── */

  async loadCustomAgents() {
    const uid = this.uid;
    if (!uid) return;
    const snapshot = await get(ref(db, `settings/${uid}/customAgents`));
    const data = snapshot.val();
    if (!data) {
      this.customAgents.set([]);
      return;
    }
    const agents: AgentDef[] = Object.entries(data).map(([id, val]: [string, any]) => ({
      id,
      name: sanitizeText(val.name || ''),
      icon: 'psychology',
      instruction: sanitizeText(val.instruction || ''),
      custom: true,
    }));
    this.customAgents.set(agents);
  }

  addCustomAgent(name: string, instruction: string): AgentValidationResult {
    const validation = validateAgentInput(name, instruction, this.customAgents().length);
    if (!validation.valid) return validation;

    const safeName = sanitizeText(name);
    const safeInstruction = sanitizeText(instruction);
    const id = 'custom-' + Date.now().toString(36);
    const agent: AgentDef = { id, name: safeName, icon: 'psychology', instruction: safeInstruction, custom: true };

    this.customAgents.update(list => [...list, agent]);
    this.activeAgentIds.update(ids => [...ids, id]);
    this.saveCustomAgents();
    this.rebuildModel();
    return { valid: true };
  }

  removeCustomAgent(agentId: string) {
    this.customAgents.update(list => list.filter(a => a.id !== agentId));
    this.activeAgentIds.update(ids => ids.filter(id => id !== agentId));
    this.saveCustomAgents();
    this.rebuildModel();
  }

  private async saveCustomAgents() {
    const uid = this.uid;
    if (!uid) return;
    const agents = this.customAgents();
    if (agents.length === 0) {
      await remove(ref(db, `settings/${uid}/customAgents`));
      return;
    }
    const data: Record<string, { name: string; instruction: string }> = {};
    for (const a of agents) {
      data[a.id] = { name: a.name, instruction: a.instruction };
    }
    await set(ref(db, `settings/${uid}/customAgents`), data);
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
