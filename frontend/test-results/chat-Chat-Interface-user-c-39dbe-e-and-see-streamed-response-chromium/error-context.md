# Page snapshot

```yaml
- navigation:
  - link "LLM-Bench":
    - /url: /
  - link "Chat":
    - /url: /
  - link "Benchmark":
    - /url: /benchmark
  - link "Test Set":
    - /url: /testset
  - link "Settings":
    - /url: /settings
  - link "Test API":
    - /url: /test-api
- main:
  - heading "LLM Bench" [level=1]
  - paragraph: Chat Interface
  - text: Provider
  - combobox "Provider": OpenAI (No API key)
  - text: Model
  - combobox "Model": GPT-3.5 Turbo
  - text: Conversations
  - button
  - text: Hello, how are you? 2 messages
  - button
  - text: Hello, how are you?
  - paragraph: Hello, how are you?
  - paragraph: Typing...
  - textbox "Type a message..." [disabled]
  - button [disabled]
- alert
- button "Open Next.js Dev Tools":
  - img
```