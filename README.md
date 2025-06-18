# Source0

Advanced AI chat application with multi-provider support, intelligent web search, and memory-enabled conversations.

## Features

- **Multi-Provider AI**: OpenAI, Anthropic, Google Gemini, XAI Grok
- **Smart Web Search**: Automatic multi-query generation with citations
- **Memory System**: Persistent user memory across sessions
- **Stream Management**: Robust stopping/resuming with auto-resume
- **Code Highlighting**: Beautiful syntax highlighting for all languages
- **Message Retry**: Intelligent retry with state synchronization
- **BYOK Security**: Client-side key storage, never stored on servers
- **Sharing**: Public/private message sharing with granular controls
- **Image Generation**: Generate and chat about AI-created images
- **Session Branching**: Explore different conversation paths
- **Pinned Messages**: Save important messages across conversations

## Quick Start

1. **Clone and install**

   ```bash
   git clone https://github.com/aryan877/source0
   cd source0
   pnpm install
   ```

2. **Set up environment**

   ```bash
   cp .env.example .env.local
   # Add your database URL and other required variables
   ```

3. **Run development server**

   ```bash
   pnpm dev
   ```

4. **Configure API keys**
   - Visit `/settings/api-keys` in the app
   - Add your AI provider API keys (stored locally, never on servers)

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Database**: Supabase (PostgreSQL)
- **AI SDK**: Vercel AI SDK
- **Memory**: Mem0
- **Search**: Tavily API
- **Styling**: Tailwind CSS
- **State**: React Query + Zustand

## Environment Variables

```bash
# Database
DATABASE_URL=your_supabase_url

# AI Providers (optional - can be set in app)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
XAI_API_KEY=

# Services
TAVILY_API_KEY=your_tavily_key
MEM0_API_KEY=your_mem0_key
REDIS_URL=your_redis_url
```

## License

MIT
