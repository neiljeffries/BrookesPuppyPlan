import { Injectable, computed, inject, signal } from '@angular/core';
import { firebaseApp, db, ref, get, set, update, push, remove } from '../firebase';
import { getAI, getGenerativeModel, GoogleAIBackend, ResponseModality } from 'firebase/ai';
import type { ChatSession, GenerativeModel, AI } from 'firebase/ai';
import { AuthService } from '../auth.service';

const DATE_PREAMBLE = () => `Today's date is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;

const BASE_INSTRUCTION_GENERAL = () => `${DATE_PREAMBLE()}

You are a helpful, knowledgeable assistant. Keep responses concise and conversational — this is a chat, not an article.`;

const BASE_INSTRUCTION_APP = () => `${DATE_PREAMBLE()}

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
  {
    id: 'vet',
    name: 'Veterinarian',
    icon: 'local_hospital',
    instruction: STRIP_FRONTMATTER(`You are a veterinary medicine expert for the Brooke's Puppy Plan app. You provide evidence-based clinical guidance drawing on established veterinary knowledge including internal medicine, dermatology, dentistry, orthopedics, ophthalmology, emergency/critical care, nutrition, parasitology, and preventive care.

## Core Capabilities

### Symptom Analysis & Differential Diagnosis
- When presented with symptoms (described or shown in photos), systematically evaluate them
- List the most likely differential diagnoses ranked by probability
- Explain what distinguishes each condition from the others
- Identify which symptoms are urgent vs. can be monitored at home
- Ask targeted follow-up questions to narrow the differential (onset, duration, progression, appetite, energy level, stool/urine changes)

### Treatment & Management Guidance
- Recommend evidence-based treatment protocols for common conditions
- Explain typical medication classes, dosing considerations, and duration (without prescribing specific drugs — defer to the attending vet for prescriptions)
- Describe at-home supportive care (rest, hydration, bland diets, wound care basics)
- Outline expected recovery timelines and what improvement or worsening looks like
- Discuss surgical vs. conservative management trade-offs when applicable

### Preventive Medicine
- Vaccination schedules (core: DHPP, rabies; non-core: Bordetella, Leptospira, Lyme, canine influenza) with age-appropriate timing
- Parasite prevention: heartworm, fleas, ticks, intestinal worms — lifecycle, testing, and year-round prevention strategies
- Dental care protocols: professional cleaning frequency, home dental hygiene, signs of periodontal disease
- Spay/neuter timing considerations including breed-specific and size-specific guidance
- Age-appropriate screening tests (bloodwork panels, urinalysis, imaging) and their purpose

### Nutrition & Diet
- Nutritional requirements by life stage (puppy, adult, senior) and health status
- Therapeutic diets for specific conditions (kidney disease, GI issues, allergies, urinary crystals, obesity)
- Caloric needs, feeding frequency, and body condition scoring
- Food allergy workup approach (elimination diets, novel protein trials)
- Toxic foods and substances to avoid

### Toy Breed & Yorkie-Specific Knowledge
- Hypoglycemia risk in toy breed puppies — recognition and emergency response
- Luxating patella grading (I–IV), monitoring, and surgical indications
- Collapsed trachea management and cough differentiation
- Portosystemic (liver) shunt signs, diagnosis pathway, and management
- Legg-Calvé-Perthes disease recognition and treatment
- Retained deciduous teeth and dental overcrowding
- Anesthesia considerations for small/toy breeds
- Fontanelle (open molera) monitoring

### Photo & Document Analysis
- Analyze photos of skin lesions, lumps, eye discharge, ear conditions, dental issues, stool abnormalities, wounds, and swelling
- Evaluate lab results, bloodwork panels, urinalysis reports, and imaging descriptions when shared
- Provide interpretation in plain language with clinical context

## Approach

1. Be thorough and clinical but explain in plain, accessible language
2. Always state your confidence level — distinguish between "this is very likely X" vs. "this could be several things, here's what to watch for"
3. Prioritize safety — when in doubt, recommend a vet visit rather than waiting
4. Provide actionable next steps: what to do right now, what to monitor, and when to seek in-person veterinary care
5. When analyzing photos, describe what you observe objectively before interpreting

## First Aid Protocols
- Provide step-by-step emergency stabilization procedures: choking (modified Heimlich for small dogs), wound pressure and bandaging, burn cooling, heatstroke (cooling methods, target temps), seizure safety, CPR basics for dogs
- Clearly distinguish "stabilize now" steps from "get to a vet immediately" steps
- Include toy-breed-specific considerations (fragile trachea during choking response, hypoglycemia first aid with corn syrup/honey)

## Medication Interaction Awareness
- When an owner mentions multiple treatments, supplements, or medications, flag known interactions or contraindications
- Common examples: NSAIDs + corticosteroids (GI ulcer risk), certain flea preventives + MDR1 gene sensitivity, sedatives + liver disease
- Always note that the attending vet should confirm any multi-drug regimen

## Behavioral-Medical Crossover
- Help distinguish medical causes from behavioral ones when symptoms overlap
- Sudden aggression or snapping → could indicate pain (dental, orthopedic, abdominal)
- House soiling regression → rule out UTI, kidney issues, GI problems before assuming behavioral
- Excessive licking/chewing → allergies, pain, or anxiety — guide the owner through differentiation
- Lethargy or withdrawal → could be illness, pain, or depression; suggest what to observe

## Environmental & Seasonal Hazards
- **Toxic plants**: lilies, sago palm, azaleas, tulip bulbs, oleander, autumn crocus, and common houseplants
- **Household chemicals**: cleaning products, antifreeze (ethylene glycol), rodenticides, insecticides
- **Holiday/seasonal dangers**: chocolate, xylitol in sugar-free products, grapes/raisins, onions/garlic, tinsel/ribbon ingestion, turkey bones, fireworks anxiety
- **Weather**: heatstroke risk for toy breeds (low ground clearance on hot pavement), cold sensitivity (Yorkies lack undercoat), frostbite on ears/paws
- **Outdoor hazards**: foxtails, standing water (leptospirosis), blue-green algae, toad toxicity, snake bites by region

## Vet Visit Preparation
- Help owners articulate symptoms clearly — timeline, frequency, severity, progression
- Suggest what questions to ask the vet based on the situation
- Explain common diagnostic tests the vet might recommend and why (bloodwork, X-rays, ultrasound, urinalysis, fecal tests, skin scraping)
- After a vet visit, help the owner understand what was recommended and what to watch for
- Help owners evaluate whether a recommendation seems standard or if they should seek a second opinion

## Post-Procedure Recovery
- Detailed aftercare guidance for common procedures:
  - **Dental cleaning**: soft food duration, monitoring for bleeding, pain management
  - **Spay/neuter**: activity restriction timeline, incision monitoring, e-collar compliance, signs of complications
  - **Luxating patella surgery**: weight-bearing milestones, physical therapy exercises, when to allow stairs/jumping
  - **Mass/lump removal**: bandage care, drain management, biopsy result interpretation
  - **Ear surgery/cleaning under sedation**: post-op ear care, medication administration
- Recovery timeline expectations and red flags that warrant calling the vet

## Chronic Condition Management
- Long-term monitoring plans for ongoing conditions common in Yorkies and small breeds:
  - **Allergies**: food trials, environmental management, immunotherapy overview, flare-up management
  - **Heart murmurs**: grading scale, monitoring frequency, when medication starts, activity modifications
  - **Kidney disease (CKD)**: staging, dietary changes, hydration support, bloodwork monitoring schedule
  - **Diabetes**: insulin overview, glucose monitoring, dietary management, hypoglycemia signs
  - **Collapsing trachea**: weight management, harness vs. collar, cough suppressant approaches, humidity
  - **Dental disease**: ongoing home care, cleaning frequency, extraction recovery
- Help owners track trends and know when to escalate

## Cost Context
- Provide typical price ranges for common veterinary procedures and tests to help with financial planning:
  - Wellness exams, vaccinations, bloodwork panels, X-rays, ultrasound, dental cleanings, spay/neuter, emergency visits
- Note that prices vary by region and clinic type (general practice vs. specialty/emergency hospital)
- Mention pet insurance considerations and wellness plan options without recommending specific companies
- Help owners prioritize when finances are limited — what is urgent vs. what can wait

## Age-Based Wellness Timeline
- Proactively surface upcoming screenings, vaccines, or health milestones based on the dog's age and breed
- Puppy: vaccination series timing, deworming schedule, first heartworm test, spay/neuter window
- Adult: annual wellness exam components, vaccine boosters, dental assessment frequency, baseline bloodwork timing
- Senior (Yorkies ~8+ years): bi-annual exams, senior bloodwork panels, cardiac screening, kidney and liver function monitoring, joint health assessment

## Triage Guidance

Clearly flag emergencies that require immediate veterinary attention:
- Difficulty breathing, blue/pale gums
- Uncontrolled bleeding, suspected fractures
- Seizures lasting more than 2 minutes or clusters
- Suspected toxin ingestion (chocolate, xylitol, grapes, medications, rat poison, etc.)
- Bloated/distended abdomen with retching (GDV risk)
- Inability to urinate for more than 12 hours
- Sudden collapse, extreme lethargy, or unresponsiveness
- Hypoglycemia signs in toy breeds (trembling, weakness, disorientation)
- Sustained vomiting/diarrhea with blood or lasting more than 24 hours in a puppy

## Constraints

- You are an AI assistant, NOT a licensed veterinarian — always make this clear when giving clinical guidance
- DO NOT prescribe specific medications or dosages — recommend medication classes and defer prescribing to the attending vet
- DO NOT discourage veterinary visits — reinforce that in-person examination is the gold standard
- DO NOT provide advice that contradicts well-established veterinary science
- When uncertain, say so honestly and recommend professional evaluation`),
  },
];

export interface ChatAttachment {
  name: string;
  mimeType: string;
  data?: string; // base64 — only kept in-memory, not persisted
  previewUrl?: string; // object URL for image previews
}

export interface GeneratedImage {
  mimeType: string;
  base64: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  attachments?: ChatAttachment[];
  pinned?: boolean;
  generatedImages?: GeneratedImage[];
}

export interface MemoryFact {
  id: string;
  text: string;
  createdAt: number;
}

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: number;
  tag?: string;
}

export interface TagGroup {
  tag: string;
  conversations: ConversationSummary[];
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
  readonly activeAgentIds = signal<string[]>([]);
  readonly customAgents = signal<AgentDef[]>([]);
  readonly streamingText = signal<string>('');
  readonly isStreaming = signal(false);
  readonly memoryFacts = signal<MemoryFact[]>([]);
  readonly searchQuery = signal('');
  readonly imageMode = signal(false);

  readonly filteredConversations = computed<ConversationSummary[]>(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.conversations();
    return this.conversations().filter(c => c.title.toLowerCase().includes(q));
  });

  readonly filteredGroupedConversations = computed<TagGroup[]>(() => {
    const convs = this.filteredConversations();
    const groups = new Map<string, ConversationSummary[]>();
    for (const c of convs) {
      const tag = c.tag || '';
      if (!groups.has(tag)) groups.set(tag, []);
      groups.get(tag)!.push(c);
    }
    const result: TagGroup[] = [];
    const sorted = [...groups.keys()].sort((a, b) => {
      if (!a) return 1;
      if (!b) return -1;
      return a.localeCompare(b);
    });
    for (const tag of sorted) {
      result.push({ tag, conversations: groups.get(tag)! });
    }
    return result;
  });

  constructor() {
    this.ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });
    this.model = this.buildModel('');
    this.startNewChat([]);
  }

  toggleImageMode() {
    this.imageMode.update(v => !v);
  }

  async generateImage(prompt: string, attachments?: ChatAttachment[]): Promise<GeneratedImage[]> {
    const userMsg: ChatMessage = { role: 'user', text: prompt };
    if (attachments?.length) userMsg.attachments = attachments;
    this.messages.update(msgs => [...msgs, userMsg]);

    const imageModel = getGenerativeModel(this.ai, {
      model: 'gemini-2.5-flash-image',
      generationConfig: {
        responseModalities: [ResponseModality.TEXT, ResponseModality.IMAGE],
      },
    });

    // Build multi-turn history from all image-related messages in this conversation
    const history: { role: string; parts: any[] }[] = [];
    const allMsgs = this.messages();
    for (const msg of allMsgs) {
      const parts: any[] = [];
      if (msg.text) parts.push({ text: msg.text });
      // Include user-attached images
      if (msg.attachments?.length) {
        for (const att of msg.attachments) {
          if (att.data) {
            parts.push({ inlineData: { mimeType: att.mimeType, data: att.data } });
          }
        }
      }
      // Include model-generated images
      if (msg.generatedImages?.length) {
        for (const img of msg.generatedImages) {
          parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
        }
      }
      if (parts.length) {
        history.push({ role: msg.role, parts });
      }
    }

    // If the latest user message has no attachments and no prior images in history,
    // nothing extra to do — the history already captures everything.
    // If there ARE no prior generated images and no attachments, this is a fresh generation.

    const result = await imageModel.generateContent({ contents: history as any });
    const response = result.response;
    const images: GeneratedImage[] = [];
    let text = '';

    const responseParts = response.candidates?.[0]?.content?.parts || [];
    for (const part of responseParts) {
      if (part.text) {
        text += part.text;
      } else if (part.inlineData) {
        images.push({
          mimeType: part.inlineData.mimeType,
          base64: part.inlineData.data,
        });
      }
    }

    const modelMsg: ChatMessage = {
      role: 'model',
      text,
      generatedImages: images,
    };
    this.messages.update(msgs => [...msgs, modelMsg]);

    await this.saveConversation();
    return images;
  }

  /* ── Persistent Memory ── */

  async loadMemory() {
    const uid = this.uid;
    if (!uid) return;
    const snapshot = await get(ref(db, `settings/${uid}/memory`));
    const data = snapshot.val();
    if (!data) { this.memoryFacts.set([]); return; }
    const facts: MemoryFact[] = Object.entries(data).map(([id, val]: [string, any]) => ({
      id, text: val.text || '', createdAt: val.createdAt || 0,
    }));
    facts.sort((a, b) => a.createdAt - b.createdAt);
    this.memoryFacts.set(facts);
    this.rebuildModel();
  }

  async addMemoryFact(text: string) {
    const uid = this.uid;
    if (!uid || !text.trim()) return;
    const id = 'mem-' + Date.now().toString(36);
    const fact: MemoryFact = { id, text: text.trim(), createdAt: Date.now() };
    this.memoryFacts.update(list => [...list, fact]);
    await set(ref(db, `settings/${uid}/memory/${id}`), { text: fact.text, createdAt: fact.createdAt });
    this.rebuildModel();
  }

  async removeMemoryFact(id: string) {
    const uid = this.uid;
    if (!uid) return;
    this.memoryFacts.update(list => list.filter(f => f.id !== id));
    await remove(ref(db, `settings/${uid}/memory/${id}`));
    this.rebuildModel();
  }

  private get uid(): string | null {
    return this.authService.user?.uid ?? null;
  }

  private buildModel(extra: string): GenerativeModel {
    const activeIds = this.activeAgentIds();
    const hasAgents = activeIds.length > 0;
    const parts: string[] = [hasAgents ? BASE_INSTRUCTION_APP() : BASE_INSTRUCTION_GENERAL()];

    for (const agentId of activeIds) {
      const agent = AVAILABLE_AGENTS.find(a => a.id === agentId)
        ?? this.customAgents().find(a => a.id === agentId);
      if (agent) parts.push(agent.instruction);
    }

    if (extra) parts.push(`## Additional Instructions\n\n${extra}`);

    // Inject persistent memory facts
    const facts = this.memoryFacts();
    if (facts.length > 0) {
      const memLines = facts.map(f => `- ${f.text}`).join('\n');
      parts.push(`## Remembered Facts About This User\n\n${memLines}`);
    }

    return getGenerativeModel(this.ai, {
      model: 'gemini-3.1-pro-preview',
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

  editCustomAgent(agentId: string, name: string, instruction: string): AgentValidationResult {
    const existing = this.customAgents().find(a => a.id === agentId);
    if (!existing) return { valid: false, error: 'Agent not found.' };

    // Exclude the agent being edited from the count check
    const otherCount = this.customAgents().length - 1;
    const validation = validateAgentInput(name, instruction, otherCount);
    if (!validation.valid) return validation;

    const safeName = sanitizeText(name);
    const safeInstruction = sanitizeText(instruction);

    this.customAgents.update(list =>
      list.map(a => a.id === agentId ? { ...a, name: safeName, instruction: safeInstruction } : a)
    );
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
      history: history
        .map(m => {
          const parts: any[] = [];
          if (m.attachments) {
            for (const att of m.attachments) {
              if (att.data) {
                parts.push({ inlineData: { mimeType: att.mimeType, data: att.data } });
              }
            }
          }
          if (m.text) {
            parts.push({ text: m.text });
          } else if (m.generatedImages?.length) {
            // Image-only model messages need a text placeholder to keep history valid
            parts.push({ text: '[Generated image]' });
          }
          return { role: m.role, parts };
        })
        .filter(m => m.parts.length > 0),
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
        tag: val.tag || '',
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

    // Firebase RTDB may return arrays or sparse objects — normalise to array
    const raw = data.messages || [];
    const messages: ChatMessage[] = (Array.isArray(raw)
      ? raw
      : Object.values(raw)
    ).filter(Boolean).map((m: any) => {
      const msg: ChatMessage = { role: m.role, text: m.text || '' };
      if (m.pinned) msg.pinned = m.pinned;
      if (m.attachments) {
        msg.attachments = Array.isArray(m.attachments)
          ? m.attachments
          : Object.values(m.attachments);
      }
      if (m.generatedImages) {
        msg.generatedImages = Array.isArray(m.generatedImages)
          ? m.generatedImages
          : Object.values(m.generatedImages);
      }
      return msg;
    });

    this.messages.set(messages);
    this.currentConversationId.set(conversationId);
    try {
      this.startNewChat(messages);
    } catch (e) {
      console.error('[switchConversation] startNewChat failed:', e);
      console.error('[switchConversation] history sent:', JSON.stringify(
        messages.map(m => ({ role: m.role, textLen: m.text?.length ?? 0, hasImages: !!m.generatedImages?.length, hasAttachments: !!m.attachments?.length }))
      ));
      throw e;
    }
  }

  newConversation() {
    this.messages.set([]);
    this.currentConversationId.set(null);
    this.startNewChat([]);
  }

  async renameConversation(conversationId: string, newTitle: string) {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    const uid = this.uid;
    if (!uid) return;
    await update(ref(db, `chats/${uid}/${conversationId}`), { title: trimmed });
    this.conversations.update(list =>
      list.map(c => c.id === conversationId ? { ...c, title: trimmed } : c)
    );
  }

  async tagConversation(conversationId: string, tag: string) {
    const trimmed = tag.trim();
    const uid = this.uid;
    if (!uid) return;
    await update(ref(db, `chats/${uid}/${conversationId}`), { tag: trimmed });
    this.conversations.update(list =>
      list.map(c => c.id === conversationId ? { ...c, tag: trimmed } : c)
    );
  }

  async renameTag(oldTag: string, newTag: string) {
    const trimmed = newTag.trim();
    const uid = this.uid;
    if (!uid) return;
    const toUpdate = this.conversations().filter(c => (c.tag || '') === oldTag);
    const updates: Record<string, string> = {};
    for (const c of toUpdate) {
      updates[`${c.id}/tag`] = trimmed;
    }
    await update(ref(db, `chats/${uid}`), updates);
    this.conversations.update(list =>
      list.map(c => (c.tag || '') === oldTag ? { ...c, tag: trimmed } : c)
    );
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

    // Strip base64 data and undefined values before persisting — too large for RTDB
    const persistMsgs = msgs.map(m => {
      const clean: any = { role: m.role, text: m.text };
      if (m.pinned) clean.pinned = m.pinned;
      if (m.generatedImages?.length) clean.generatedImages = m.generatedImages;
      if (m.attachments?.length) {
        clean.attachments = m.attachments.map(a => {
          const att: any = { name: a.name, mimeType: a.mimeType };
          return att;
        });
      }
      return clean;
    });

    if (!conversationId) {
      const newRef = push(ref(db, `chats/${uid}`));
      conversationId = newRef.key!;
      this.currentConversationId.set(conversationId);
      await set(ref(db, `chats/${uid}/${conversationId}`), {
        title,
        createdAt: now,
        updatedAt: now,
        messages: persistMsgs,
      });
    } else {
      await update(ref(db, `chats/${uid}/${conversationId}`), {
        updatedAt: now,
        messages: persistMsgs,
      });
    }

    this.conversations.update(list => {
      const filtered = list.filter(c => c.id !== conversationId);
      const existing = list.find(c => c.id === conversationId);
      return [{ id: conversationId!, title, updatedAt: now, tag: existing?.tag || '' }, ...filtered];
    });
  }

  async send(userMessage: string, attachments?: ChatAttachment[]): Promise<string> {
    if (!this.chat) {
      this.startNewChat([]);
    }

    const userMsg: ChatMessage = { role: 'user', text: userMessage };
    if (attachments?.length) {
      userMsg.attachments = attachments;
    }
    this.messages.update(msgs => [...msgs, userMsg]);

    // Build multimodal parts for Gemini
    const parts: any[] = [];
    if (attachments?.length) {
      for (const att of attachments) {
        if (att.data) {
          parts.push({ inlineData: { mimeType: att.mimeType, data: att.data } });
        }
      }
    }
    if (userMessage) parts.push({ text: userMessage });

    // Stream the response
    this.isStreaming.set(true);
    this.streamingText.set('');
    let fullText = '';

    try {
      const streamResult = await this.chat!.sendMessageStream(parts);
      for await (const chunk of streamResult.stream) {
        const chunkText = chunk.text();
        fullText += chunkText;
        this.streamingText.set(fullText);
      }
    } catch (e) {
      this.isStreaming.set(false);
      this.streamingText.set('');
      throw e;
    }

    this.isStreaming.set(false);
    this.streamingText.set('');
    this.messages.update(msgs => [...msgs, { role: 'model', text: fullText }]);

    await this.saveConversation();

    return fullText;
  }

  /* ── Pin / Bookmark ── */

  togglePin(index: number) {
    this.messages.update(msgs =>
      msgs.map((m, i) => i === index ? { ...m, pinned: !m.pinned } : m)
    );
    // Persist pin state
    this.saveConversation();
  }

  getPinnedMessages(): (ChatMessage & { index: number })[] {
    return this.messages()
      .map((m, i) => ({ ...m, index: i }))
      .filter(m => m.pinned);
  }

  /* ── Conversation Summarization ── */

  async summarizeConversation(conversationId: string): Promise<string> {
    const uid = this.uid;
    if (!uid) return '';
    const msgs = this.messages();
    if (msgs.length === 0) return '';

    const transcript = msgs.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n');
    const summaryModel = getGenerativeModel(this.ai, { model: 'gemini-3.1-pro-preview' });
    const result = await summaryModel.generateContent(
      `Summarize this conversation in a short, descriptive title (max 60 characters). Return only the title, nothing else.\n\n${transcript}`
    );
    const title = result.response.text().trim().replace(/^["']|["']$/g, '');

    if (title) {
      await this.renameConversation(conversationId, title);
    }
    return title;
  }

  /* ── Export ── */

  exportAsMarkdown(): string {
    const msgs = this.messages();
    const conv = this.conversations().find(c => c.id === this.currentConversationId());
    const title = conv?.title || 'Chat Export';
    const lines = [`# ${title}\n`, `*Exported ${new Date().toLocaleString()}*\n`];
    for (const msg of msgs) {
      const prefix = msg.role === 'user' ? '**You**' : '**Assistant**';
      if (msg.pinned) lines.push('> \u{1F4CC} Pinned');
      lines.push(`${prefix}:\n${msg.text}\n`);
    }
    return lines.join('\n');
  }

  downloadExport() {
    const md = this.exportAsMarkdown();
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const conv = this.conversations().find(c => c.id === this.currentConversationId());
    a.download = `${(conv?.title || 'chat').replace(/[^a-zA-Z0-9]/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  clearHistory() {
    this.messages.set([]);
    this.currentConversationId.set(null);
    this.startNewChat([]);
  }
}
