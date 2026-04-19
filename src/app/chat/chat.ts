import { Component, ElementRef, OnInit, ViewChild, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ChatService, AVAILABLE_AGENTS, ChatAttachment } from './chat.service';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

@Component({
  selector: 'app-chat',
  imports: [
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
})
export class Chat implements OnInit {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef<HTMLElement>;
  @ViewChild('fileInput') private fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('chatAttachInput') private readonly chatAttachInput!: ElementRef<HTMLInputElement>;
  readonly chatService = inject(ChatService);
  private readonly sanitizer = inject(DomSanitizer);
  readonly agents = AVAILABLE_AGENTS;
  userInput = '';
  loading = signal(false);
  error = signal('');
  sidebarOpen = signal(false);
  importOpen = signal(false);
  importText = '';
  importName = '';
  importError = signal('');
  editingAgentId = signal<string | null>(null);
  editingConvId = signal<string | null>(null);
  editingConvTitle = '';
  taggingConvId = signal<string | null>(null);
  taggingConvValue = '';
  editingTag = signal<string | null>(null);
  editingTagValue = '';
  expandedTags = signal<Set<string>>(new Set());
  pendingAttachments = signal<ChatAttachment[]>([]);
  memoryInput = '';
  memoryPanelOpen = signal(false);
  showPinnedOnly = signal(false);
  isListening = signal(false);
  private recognition: any = null;

  readonly ACCEPTED_TYPES = 'image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,text/csv,text/html';
  private readonly MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB

  get messages() {
    return this.chatService.messages();
  }

  get customAgents() {
    return this.chatService.customAgents();
  }

  conversations = this.chatService.conversations;
  groupedConversations = this.chatService.filteredGroupedConversations;
  customInstruction = this.chatService.customInstruction;
  searchQuery = this.chatService.searchQuery;

  readonly streamingHtml = computed<SafeHtml>(() => {
    const text = this.chatService.streamingText();
    if (!text) return '';
    return this.renderMarkdown(text);
  });

  ngOnInit() {
    this.chatService.loadConversations();
    this.chatService.loadCustomInstruction();
    this.chatService.loadCustomAgents();
    this.chatService.loadMemory();
  }

  async send() {
    const text = this.userInput.trim();
    const attachments = this.pendingAttachments();
    if ((!text && !attachments.length) || this.loading()) return;

    // Route to image generation if in image mode
    if (this.chatService.imageMode() && text) {
      this.userInput = '';
      this.pendingAttachments.set([]);
      this.error.set('');
      this.loading.set(true);
      this.scrollToBottom();
      try {
        await this.chatService.generateImage(text, attachments.length ? attachments : undefined);
      } catch (e: any) {
        console.error('Image generation error:', e);
        this.error.set(e.message || 'Image generation failed. Please try again.');
      } finally {
        this.loading.set(false);
        this.scrollToBottom();
      }
      return;
    }

    this.userInput = '';
    this.pendingAttachments.set([]);
    this.error.set('');
    this.loading.set(true);
    this.scrollToBottom();

    // Auto-scroll during streaming
    const scrollInterval = setInterval(() => {
      if (this.chatService.isStreaming()) this.scrollToBottom();
    }, 300);

    try {
      await this.chatService.send(text, attachments.length ? attachments : undefined);
    } catch (e: any) {
      console.error('Chat error:', e);
      this.error.set(e.message || 'Something went wrong. Please try again.');
    } finally {
      clearInterval(scrollInterval);
      // Revoke preview URLs to free memory
      for (const att of attachments) {
        if (att.previewUrl) URL.revokeObjectURL(att.previewUrl);
      }
      this.loading.set(false);
      this.scrollToBottom();
    }
  }

  clear() {
    this.chatService.clearHistory();
    this.error.set('');
  }

  newChat() {
    this.chatService.newConversation();
    this.error.set('');
    this.sidebarOpen.set(false);
  }

  async switchChat(id: string) {
    this.error.set('');
    this.loading.set(true);
    try {
      await this.chatService.switchConversation(id);
    } catch (e: any) {
      console.error('Switch error:', e);
      this.error.set('Failed to load conversation.');
    } finally {
      this.loading.set(false);
      this.sidebarOpen.set(false);
      this.scrollToBottom();
    }
  }

  deleteChat(event: Event, id: string) {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this conversation?')) {
      this.chatService.deleteConversation(id);
    }
  }

  startEditConv(event: Event, conv: { id: string; title: string }) {
    event.stopPropagation();
    this.editingConvId.set(conv.id);
    this.editingConvTitle = conv.title;
  }

  saveConvTitle(event: Event) {
    event.stopPropagation();
    const id = this.editingConvId();
    if (id && this.editingConvTitle.trim()) {
      this.chatService.renameConversation(id, this.editingConvTitle);
    }
    this.editingConvId.set(null);
  }

  cancelEditConv(event: Event) {
    event.stopPropagation();
    this.editingConvId.set(null);
  }

  onConvTitleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.saveConvTitle(event);
    } else if (event.key === 'Escape') {
      this.cancelEditConv(event);
    }
  }

  startTagConv(event: Event, conv: { id: string; tag?: string }) {
    event.stopPropagation();
    this.taggingConvId.set(conv.id);
    this.taggingConvValue = conv.tag || '';
  }

  saveConvTag(event: Event) {
    event.stopPropagation();
    const id = this.taggingConvId();
    if (id) {
      this.chatService.tagConversation(id, this.taggingConvValue);
    }
    this.taggingConvId.set(null);
  }

  cancelTagConv(event: Event) {
    event.stopPropagation();
    this.taggingConvId.set(null);
  }

  onConvTagKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.saveConvTag(event);
    } else if (event.key === 'Escape') {
      this.cancelTagConv(event);
    }
  }

  startEditTag(tag: string) {
    this.editingTag.set(tag);
    this.editingTagValue = tag;
  }

  toggleTagCollapse(tag: string) {
    this.expandedTags.update(set => {
      const next = new Set(set);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  isTagCollapsed(tag: string): boolean {
    if (this.groupedConversations().length <= 1) return false;
    return !this.expandedTags().has(tag);
  }

  // ── Drag & Drop ──

  private draggingConvId: string | null = null;

  onDragStart(event: DragEvent, convId: string) {
    this.draggingConvId = convId;
    event.dataTransfer?.setData('text/plain', convId);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    (event.target as HTMLElement).classList.add('dragging');
  }

  onDragEnd(event: DragEvent) {
    this.draggingConvId = null;
    (event.target as HTMLElement).classList.remove('dragging');
    document.querySelectorAll('.tag-group.drag-over').forEach(el => el.classList.remove('drag-over'));
  }

  onDragOver(event: DragEvent) {
    if (!this.draggingConvId) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    const group = (event.currentTarget as HTMLElement);
    group.classList.add('drag-over');
  }

  onDragLeave(event: DragEvent) {
    const group = event.currentTarget as HTMLElement;
    if (!group.contains(event.relatedTarget as Node)) {
      group.classList.remove('drag-over');
    }
  }

  onDrop(event: DragEvent, tag: string) {
    event.preventDefault();
    const group = event.currentTarget as HTMLElement;
    group.classList.remove('drag-over');
    const convId = event.dataTransfer?.getData('text/plain') || this.draggingConvId;
    if (convId) {
      this.chatService.tagConversation(convId, tag);
      // Expand the target group so the moved item is visible
      this.expandedTags.update(set => { const next = new Set(set); next.add(tag); return next; });
    }
    this.draggingConvId = null;
  }

  saveEditTag() {
    const oldTag = this.editingTag();
    if (oldTag !== null) {
      this.chatService.renameTag(oldTag, this.editingTagValue);
    }
    this.editingTag.set(null);
  }

  cancelEditTag() {
    this.editingTag.set(null);
  }

  onEditTagKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.saveEditTag();
    } else if (event.key === 'Escape') {
      this.cancelEditTag();
    }
  }

  applyImport() {
    const text = this.importText.trim();
    const name = this.importName.trim();
    if (!text || !name) {
      this.importError.set('Both a name and instructions are required.');
      return;
    }
    const editId = this.editingAgentId();
    const result = editId
      ? this.chatService.editCustomAgent(editId, name, text)
      : this.chatService.addCustomAgent(name, text);
    if (!result.valid) {
      this.importError.set(result.error!);
      return;
    }
    this.importText = '';
    this.importName = '';
    this.importError.set('');
    this.editingAgentId.set(null);
    this.importOpen.set(false);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      this.importText = reader.result as string;
    };
    reader.readAsText(file);
    input.value = '';
  }

  removeInstruction() {
    this.chatService.removeCustomInstruction();
  }

  removeCustomAgent(event: Event, agentId: string) {
    event.stopPropagation();
    const agent = this.customAgents.find(a => a.id === agentId);
    const name = agent?.name ?? 'this agent';
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    this.chatService.removeCustomAgent(agentId);
    if (this.editingAgentId() === agentId) {
      this.cancelEdit();
    }
  }

  startEditAgent(event: Event, agent: { id: string; name: string; instruction: string }) {
    event.stopPropagation();
    this.editingAgentId.set(agent.id);
    this.importName = agent.name;
    this.importText = agent.instruction;
    this.importError.set('');
    this.importOpen.set(true);
  }

  cancelEdit() {
    this.editingAgentId.set(null);
    this.importName = '';
    this.importText = '';
    this.importError.set('');
    this.importOpen.set(false);
  }

  toggleAgent(agentId: string) {
    this.chatService.toggleAgent(agentId);
  }

  isAgentActive(agentId: string): boolean {
    return this.chatService.activeAgentIds().includes(agentId);
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  openAttachPicker() {
    this.chatAttachInput?.nativeElement?.click();
  }

  onAttachFiles(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (file.size > this.MAX_FILE_SIZE) {
        this.error.set(`"${file.name}" exceeds the 4 MB limit.`);
        continue;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        const att: ChatAttachment = {
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          data: base64,
        };
        if (file.type.startsWith('image/')) {
          att.previewUrl = URL.createObjectURL(file);
        }
        this.pendingAttachments.update(list => [...list, att]);
      };
      reader.readAsDataURL(file);
    }
    input.value = '';
  }

  removeAttachment(index: number) {
    this.pendingAttachments.update(list => {
      const att = list[index];
      if (att.previewUrl) URL.revokeObjectURL(att.previewUrl);
      return list.filter((_, i) => i !== index);
    });
  }

  isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  renderMarkdown(text: string): SafeHtml {
    const raw = marked.parse(text, { async: false }) as string;
    const clean = DOMPurify.sanitize(raw);
    return this.sanitizer.bypassSecurityTrustHtml(clean);
  }

  extractUrls(text: string): { url: string; hostname: string; favicon: string }[] {
    const urlRegex = /https?:\/\/[^\s)\]>"']+/gi;
    const matches = text.match(urlRegex);
    if (!matches) return [];
    const seen = new Set<string>();
    return matches
      .filter(url => { if (seen.has(url)) return false; seen.add(url); return true; })
      .slice(0, 5)
      .map(url => {
        try {
          const u = new URL(url);
          return {
            url,
            hostname: u.hostname,
            favicon: `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`,
          };
        } catch {
          return null;
        }
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);
  }

  async copyMessage(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch { /* clipboard not available */ }
  }

  exportChat() {
    this.chatService.downloadExport();
  }

  async summarizeChat() {
    const id = this.chatService.currentConversationId();
    if (!id) return;
    this.loading.set(true);
    try {
      await this.chatService.summarizeConversation(id);
    } catch (e: any) {
      this.error.set('Failed to summarize conversation.');
    } finally {
      this.loading.set(false);
    }
  }

  togglePin(index: number) {
    this.chatService.togglePin(index);
  }

  togglePinnedView() {
    this.showPinnedOnly.update(v => !v);
  }

  get displayMessages() {
    const msgs = this.messages;
    if (this.showPinnedOnly()) {
      return msgs.filter(m => m.pinned);
    }
    return msgs;
  }

  async addMemoryFact() {
    const text = this.memoryInput.trim();
    if (!text) return;
    this.memoryInput = '';
    await this.chatService.addMemoryFact(text);
  }

  removeMemoryFact(id: string) {
    this.chatService.removeMemoryFact(id);
  }

  downloadGeneratedImage(base64: string, mimeType: string) {
    const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
    const blob = this.base64ToBlob(base64, mimeType);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `generated-image-${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  editImage() {
    if (!this.chatService.imageMode()) this.chatService.toggleImageMode();
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>('.chat-input-row input, .chat-input-row textarea');
      input?.focus();
    });
  }

  toggleVoiceInput() {
    if (this.isListening()) {
      this.stopListening();
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.error.set('Speech recognition is not supported in this browser.');
      return;
    }
    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'en-US';
    this.recognition.interimResults = true;
    this.recognition.continuous = false;

    const startText = this.userInput;
    this.recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      this.userInput = startText + (startText ? ' ' : '') + (final || interim);
    };
    this.recognition.onend = () => {
      this.isListening.set(false);
      this.recognition = null;
    };
    this.recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        this.error.set('Microphone access denied. Please allow microphone permission in your browser settings and try again.');
      } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
        this.error.set(`Voice input error: ${event.error}`);
      }
      this.isListening.set(false);
      this.recognition = null;
    };

    this.recognition.start();
    this.isListening.set(true);
  }

  private stopListening() {
    if (this.recognition) {
      this.recognition.stop();
    }
    this.isListening.set(false);
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const bytes = atob(base64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      arr[i] = bytes.charCodeAt(i);
    }
    return new Blob([arr], { type: mimeType });
  }

  private scrollToBottom() {
    setTimeout(() => {
      const el = this.scrollContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
}
