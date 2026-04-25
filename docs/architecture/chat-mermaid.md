# Brookes Puppy Plan - Chat Flow

```mermaid
flowchart TD
  U[User] --> CH[Chat Component]
  CH --> CS[ChatService]

  CH -->|attach files/images| STORAGE[Firebase Storage]
  CH -->|send prompt| CS
  CH -->|toggle voice| CS

  CS -->|text/image generation| FAI[Firebase AI / Gemini Models]
  CS -->|persist conversations| DB[Cloud Firestore]
  CS -->|load conversation history| DB

  FAI -->|streamed/complete response| CS
  CS --> CH
  CH --> UI[Render messages, markdown, generated images]

  subgraph Optional Live Voice
    CS --> LIVE[Live Session Controller]
    LIVE <--> FAI
    LIVE --> CH
  end

  subgraph Message Artifacts
    IMG[Generated Images]
    ATT[User Attachments]
    MEM[Memory Facts / Agent Context]
  end

  CS --> IMG
  CS --> ATT
  CS --> MEM
  IMG --> UI
  ATT --> UI
```

## Code Links

- Chat component logic: [src/app/chat/chat.ts](../../src/app/chat/chat.ts)
- Chat template: [src/app/chat/chat.html](../../src/app/chat/chat.html)
- Chat styles: [src/app/chat/chat.css](../../src/app/chat/chat.css)
- Chat service: [src/app/chat/chat.service.ts](../../src/app/chat/chat.service.ts)
- Firebase config used by chat: [src/app/firebase.ts](../../src/app/firebase.ts)
