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

  get messages() {
    return this.chatService.messages();
  }

  get customAgents() {
    return this.chatService.customAgents();
  }

  conversations = this.chatService.conversations;
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
    this.chatService.deleteConversation(id);
  }

  applyImport() {
    const text = this.importText.trim();
    const name = this.importName.trim();
    if (!text || !name) {
      this.importError.set('Both a name and instructions are required.');
      return;
    }
    const result = this.chatService.addCustomAgent(name, text);
    if (!result.valid) {
      this.importError.set(result.error!);
      return;
    }
    this.importText = '';
    this.importName = '';
    this.importError.set('');
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
    this.chatService.removeCustomAgent(agentId);
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
