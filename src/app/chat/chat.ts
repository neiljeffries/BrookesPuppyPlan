import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ChatService, AVAILABLE_AGENTS } from './chat.service';

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
  readonly chatService = inject(ChatService);
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

  get messages() {
    return this.chatService.messages();
  }

  get customAgents() {
    return this.chatService.customAgents();
  }

  conversations = this.chatService.conversations;
  groupedConversations = this.chatService.groupedConversations;
  customInstruction = this.chatService.customInstruction;

  ngOnInit() {
    this.chatService.loadConversations();
    this.chatService.loadCustomInstruction();
    this.chatService.loadCustomAgents();
  }

  async send() {
    const text = this.userInput.trim();
    if (!text || this.loading()) return;

    this.userInput = '';
    this.error.set('');
    this.loading.set(true);
    this.scrollToBottom();

    try {
      await this.chatService.send(text);
    } catch (e: any) {
      console.error('Chat error:', e);
      this.error.set(e.message || 'Something went wrong. Please try again.');
    } finally {
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

  private scrollToBottom() {
    setTimeout(() => {
      const el = this.scrollContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
}
