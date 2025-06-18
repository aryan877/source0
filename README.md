# Source0

Source0 is an advanced AI chat application that pushes the boundaries of conversational AI. Built with enterprise-grade stream management, intelligent multi-provider routing, and sophisticated memory systems, it delivers a seamless chat experience across OpenAI, Anthropic, Google Gemini, XAI Grok, and more. The application features revolutionary stream handling with auto-resume capabilities, comprehensive web search with proper citation pipelines, and persistent cross-session memory that truly understands user context.

## Features

### 🚀 **Advanced Stream Architecture**

- **Bulletproof Stream Management**: Revolutionary handling of interrupted streams with intelligent auto-resume
- **Real-time State Synchronization**: Complex coordination between React Query cache, local state, and database
- **Smart Retry System**: Seamless message retry with perfect state consistency across stream interruptions

### 🔍 **Intelligent Web Search Engine**

- **Multi-Query Generation**: Automatically generates 2-3 optimized search queries for comprehensive results
- **Citation Pipeline**: Robust annotation processing handling multiple data streams (web search, grounding, metadata)
- **Universal Search Support**: Adds web search capabilities to any AI model, regardless of native search support
- **Proper Attribution**: Inline citations [1], [2], [3] with source verification and grounding displays

### 🧠 **Advanced Memory System**

- **Cross-Session Persistence**: Sophisticated user memory using Mem0 with proper isolation and privacy
- **Contextual Understanding**: AI remembers preferences, constraints, and personal details across conversations
- **Semantic Memory Retrieval**: Intelligent memory search for personalized responses and recommendations

### 🎨 **Rich Media & Interaction**

- **Multi-Provider AI**: Seamless switching between OpenAI, Anthropic, Google Gemini, XAI Grok, and more
- **Image Generation & Chat**: Generate images and continue AI-aware conversations about generated content
- **Code Syntax Highlighting**: Beautiful rendering for 100+ programming languages
- **Session Branching**: Explore different conversation paths with advanced session management
- **Pinned Messages**: Save and reference important messages across conversations

### 🔐 **Security & Sharing**

- **BYOK Architecture**: Bring-your-own-keys with client-side encryption, zero server-side key storage
- **Granular Privacy Controls**: Public/private sharing with fine-grained message visibility controls
- **Secure Image Handling**: Private image generation with controlled sharing capabilities

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
