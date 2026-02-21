'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { callAIAgent, AIAgentResponse } from '@/lib/aiAgent'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  FiSearch, FiSend, FiPlus, FiMenu, FiX, FiExternalLink,
  FiChevronDown, FiChevronUp, FiFileText, FiBookOpen,
  FiLayers, FiTool, FiSettings, FiBarChart2, FiMessageCircle,
  FiAlertTriangle, FiCheckCircle, FiArrowRight, FiStar,
  FiClock, FiTrash2, FiLoader, FiCpu
} from 'react-icons/fi'

// ─── Constants ───────────────────────────────────────────────────────────────

const AGENT_ID = '699960670ab3a50ca248548a'

const LOADING_PHASES = [
  'Searching papers...',
  'Analyzing paper...',
  'Preparing breakdown...',
]

const SUGGESTION_CHIPS = [
  'Graph neural networks for drug discovery',
  'LLM reasoning benchmarks 2024',
  'Transformer architectures for low-resource NLP',
  'Reinforcement learning in robotics',
  'Federated learning for privacy-preserving AI',
]

const SAMPLE_PAPER: PaperAnalysis = {
  paper_title: 'Attention Is All You Need',
  authors: 'Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Lukasz Kaiser, Illia Polosukhin',
  publication_date: '2017-06-12',
  arxiv_link: 'https://arxiv.org/abs/1706.03762',
  categories: 'cs.CL, cs.LG',
  selection_reasoning: 'This paper introduced the Transformer architecture, which has become the foundation for modern NLP and beyond. It remains one of the most cited and influential papers in deep learning.',
  abstract_summary: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.',
  introduction: 'Recurrent neural networks, long short-term memory and gated recurrent neural networks in particular, have been firmly established as state of the art approaches in sequence modeling and transduction problems such as language modeling and machine translation. The Transformer allows for significantly more parallelization and can reach a new state of the art in translation quality after being trained for as little as twelve hours on eight P100 GPUs.',
  literature_review: 'The goal of reducing sequential computation also forms the foundation of the Extended Neural GPU, ByteNet, and ConvS2S, all of which use convolutional neural networks as basic building block. In these models, the number of operations required to relate signals from two arbitrary input or output positions grows in the distance between positions, linearly for ConvS2S and logarithmically for ByteNet.',
  methodology: 'The Transformer follows an encoder-decoder structure using stacked self-attention and point-wise, fully connected layers for both the encoder and decoder. The encoder maps an input sequence of symbol representations to a sequence of continuous representations. Given z, the decoder then generates an output sequence of symbols one element at a time. Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions.',
  experimental_setup: 'We trained on the standard WMT 2014 English-German dataset consisting of about 4.5 million sentence pairs. For English-French, we used the significantly larger WMT 2014 English-French dataset consisting of 36M sentences. We used beam search with a beam size of 4 and length penalty alpha = 0.6. Training took 3.5 days on 8 NVIDIA P100 GPUs.',
  results: 'On the WMT 2014 English-to-German translation task, the big transformer model outperforms the best previously reported models including ensembles by more than 2.0 BLEU, establishing a new state-of-the-art BLEU score of 28.4. On the WMT 2014 English-to-French translation task, our model achieves a BLEU score of 41.0, outperforming all previously published single models, at less than 1/4 the training cost.',
  discussion: 'The Transformer is the first transduction model relying entirely on self-attention to compute representations of its input and output without using sequence-aligned RNNs or convolution. The attention mechanism provides a direct path between any two positions in the sequence, making it easier for the model to learn long-range dependencies.',
  limitations: 'For very long sequences, self-attention could be restricted to considering only a neighborhood of size r in the input sequence centered around the respective output position. This would increase the maximum path length to O(n/r). The computational cost of self-attention grows quadratically with sequence length.',
  conclusion: 'In this work, we presented the Transformer, the first sequence transduction model based entirely on attention, replacing the recurrent layers most commonly used in encoder-decoder architectures with multi-headed self-attention. The Transformer can be trained significantly faster than architectures based on recurrent or convolutional layers.',
  future_work: 'We plan to extend the Transformer to problems involving input and output modalities other than text and to investigate local, restricted attention mechanisms to efficiently handle large inputs and outputs such as images, audio and video. Making generation less sequential is another research goal.',
  key_contributions: '1. Introduced the Transformer architecture based entirely on self-attention\n2. Multi-head attention mechanism for attending to different representation subspaces\n3. Positional encoding to inject sequence order information\n4. Achieved state-of-the-art results on English-German and English-French translation\n5. Demonstrated significant training speed improvements over recurrent architectures',
  follow_up_response: '',
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface PaperAnalysis {
  paper_title: string
  authors: string
  publication_date: string
  arxiv_link: string
  categories: string
  selection_reasoning: string
  abstract_summary: string
  introduction: string
  literature_review: string
  methodology: string
  experimental_setup: string
  results: string
  discussion: string
  limitations: string
  conclusion: string
  future_work: string
  key_contributions: string
  follow_up_response: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  paperData?: PaperAnalysis | null
  isLoading?: boolean
  loadingPhase?: string
  isError?: boolean
}

interface Conversation {
  id: string
  title: string
  timestamp: number
  messages: Message[]
  sessionId: string
}

// ─── Section Config ──────────────────────────────────────────────────────────

interface SectionConfig {
  key: keyof PaperAnalysis
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const ANALYSIS_SECTIONS: SectionConfig[] = [
  { key: 'abstract_summary', label: 'Abstract', icon: FiFileText },
  { key: 'introduction', label: 'Introduction', icon: FiBookOpen },
  { key: 'literature_review', label: 'Literature Review', icon: FiLayers },
  { key: 'methodology', label: 'Methodology', icon: FiTool },
  { key: 'experimental_setup', label: 'Experimental Setup', icon: FiSettings },
  { key: 'results', label: 'Results', icon: FiBarChart2 },
  { key: 'discussion', label: 'Discussion', icon: FiMessageCircle },
  { key: 'limitations', label: 'Limitations', icon: FiAlertTriangle },
  { key: 'conclusion', label: 'Conclusion', icon: FiCheckCircle },
  { key: 'future_work', label: 'Future Work', icon: FiArrowRight },
  { key: 'key_contributions', label: 'Key Contributions', icon: FiStar },
]

// ─── Utility: unique ID ─────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
}

// ─── ErrorBoundary ───────────────────────────────────────────────────────────

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2 font-serif">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-[hsl(0,70%,55%)] text-white rounded-none text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Markdown Renderer ──────────────────────────────────────────────────────

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">
        {part}
      </strong>
    ) : (
      part
    )
  )
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return (
            <h4 key={i} className="font-semibold text-sm mt-3 mb-1 font-serif">
              {line.slice(4)}
            </h4>
          )
        if (line.startsWith('## '))
          return (
            <h3 key={i} className="font-semibold text-base mt-3 mb-1 font-serif">
              {line.slice(3)}
            </h3>
          )
        if (line.startsWith('# '))
          return (
            <h2 key={i} className="font-bold text-lg mt-4 mb-2 font-serif">
              {line.slice(2)}
            </h2>
          )
        if (line.startsWith('- ') || line.startsWith('* '))
          return (
            <li key={i} className="ml-4 list-disc text-sm leading-relaxed">
              {formatInline(line.slice(2))}
            </li>
          )
        if (/^\d+\.\s/.test(line))
          return (
            <li key={i} className="ml-4 list-decimal text-sm leading-relaxed">
              {formatInline(line.replace(/^\d+\.\s/, ''))}
            </li>
          )
        if (!line.trim()) return <div key={i} className="h-1" />
        return (
          <p key={i} className="text-sm leading-relaxed">
            {formatInline(line)}
          </p>
        )
      })}
    </div>
  )
}

// ─── LoadingSkeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton({ phase }: { phase: string }) {
  return (
    <div className="w-full max-w-3xl space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <FiLoader className="w-4 h-4 text-[hsl(0,70%,55%)] animate-spin" />
        <span className="text-sm text-muted-foreground font-sans tracking-tight">{phase}</span>
      </div>
      <div className="border border-border bg-card p-6 space-y-4">
        <Skeleton className="h-6 w-3/4 rounded-none" />
        <Skeleton className="h-4 w-1/2 rounded-none" />
        <Skeleton className="h-4 w-1/3 rounded-none" />
        <div className="pt-4 space-y-3">
          <Skeleton className="h-4 w-full rounded-none" />
          <Skeleton className="h-4 w-full rounded-none" />
          <Skeleton className="h-4 w-5/6 rounded-none" />
        </div>
      </div>
      <div className="border border-border bg-card p-6 space-y-3">
        <Skeleton className="h-5 w-1/4 rounded-none" />
        <Skeleton className="h-4 w-full rounded-none" />
        <Skeleton className="h-4 w-full rounded-none" />
        <Skeleton className="h-4 w-3/4 rounded-none" />
      </div>
      <div className="border border-border bg-card p-6 space-y-3">
        <Skeleton className="h-5 w-1/3 rounded-none" />
        <Skeleton className="h-4 w-full rounded-none" />
        <Skeleton className="h-4 w-5/6 rounded-none" />
      </div>
    </div>
  )
}

// ─── CollapsibleSection ──────────────────────────────────────────────────────

function CollapsibleSection({
  section,
  content,
  isExpanded,
  onToggle,
}: {
  section: SectionConfig
  content: string
  isExpanded: boolean
  onToggle: () => void
}) {
  if (!content || content.trim() === '') return null

  const IconComp = section.icon
  const preview = content.length > 150 ? content.slice(0, 150) + '...' : content

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-all duration-200 text-left"
      >
        <div className="flex items-center gap-3">
          <IconComp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="font-serif font-semibold text-sm tracking-tight text-foreground">
            {section.label}
          </span>
        </div>
        {isExpanded ? (
          <FiChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <FiChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="px-4 pb-4 pl-11">
          <div className="text-foreground font-sans leading-relaxed tracking-tight">
            {renderMarkdown(content)}
          </div>
        </div>
      </div>
      {!isExpanded && (
        <div className="px-4 pb-3 pl-11">
          <p className="text-xs text-muted-foreground leading-relaxed tracking-tight line-clamp-2">
            {preview}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── PaperAnalysisCard ───────────────────────────────────────────────────────

function PaperAnalysisCard({ data }: { data: PaperAnalysis }) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {}
    ANALYSIS_SECTIONS.forEach((s) => {
      if (data[s.key] && (data[s.key] as string).trim() !== '') {
        allExpanded[s.key] = true
      }
    })
    setExpandedSections(allExpanded)
  }

  const collapseAll = () => {
    setExpandedSections({})
  }

  const hasAnySections = ANALYSIS_SECTIONS.some(
    (s) => data[s.key] && (data[s.key] as string).trim() !== ''
  )

  const categoriesList = data.categories
    ? data.categories.split(',').map((c) => c.trim()).filter(Boolean)
    : []

  return (
    <div className="w-full max-w-3xl space-y-4">
      {/* Paper Metadata Card */}
      <div className="border border-border bg-card p-6">
        <h2 className="font-serif font-bold text-xl tracking-tight leading-relaxed text-foreground mb-3">
          {data.paper_title || 'Untitled Paper'}
        </h2>

        {data.authors && (
          <p className="text-sm text-muted-foreground font-sans tracking-tight leading-relaxed mb-2">
            {data.authors}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 mb-3">
          {data.publication_date && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FiClock className="w-3 h-3" />
              <span>{data.publication_date}</span>
            </div>
          )}
          {data.arxiv_link && data.arxiv_link.trim() !== '' && (
            <a
              href={data.arxiv_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-[hsl(0,70%,55%)] hover:text-[hsl(0,70%,45%)] transition-all duration-200"
            >
              <FiExternalLink className="w-3 h-3" />
              <span>arXiv</span>
            </a>
          )}
        </div>

        {categoriesList.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {categoriesList.map((cat, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="rounded-none text-xs font-sans tracking-tight"
              >
                {cat}
              </Badge>
            ))}
          </div>
        )}

        {data.selection_reasoning && data.selection_reasoning.trim() !== '' && (
          <div className="border-t border-border pt-3 mt-3">
            <p className="text-xs text-muted-foreground font-sans leading-relaxed tracking-tight italic">
              {data.selection_reasoning}
            </p>
          </div>
        )}
      </div>

      {/* Sections Accordion */}
      {hasAnySections && (
        <div className="border border-border bg-card">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-serif font-semibold text-sm tracking-tight text-foreground">
              Paper Breakdown
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={expandAll}
                className="text-xs text-muted-foreground hover:text-foreground transition-all duration-200 font-sans tracking-tight"
              >
                Expand all
              </button>
              <span className="text-muted-foreground text-xs">/</span>
              <button
                onClick={collapseAll}
                className="text-xs text-muted-foreground hover:text-foreground transition-all duration-200 font-sans tracking-tight"
              >
                Collapse all
              </button>
            </div>
          </div>
          {ANALYSIS_SECTIONS.map((section) => (
            <CollapsibleSection
              key={section.key}
              section={section}
              content={(data[section.key] as string) || ''}
              isExpanded={!!expandedSections[section.key]}
              onToggle={() => toggleSection(section.key)}
            />
          ))}
        </div>
      )}

      {/* Follow-up response if present alongside paper */}
      {data.follow_up_response && data.follow_up_response.trim() !== '' && (
        <div className="border border-border bg-card p-6">
          <div className="text-foreground font-sans leading-relaxed tracking-tight">
            {renderMarkdown(data.follow_up_response)}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── WelcomeView ─────────────────────────────────────────────────────────────

function WelcomeView({
  onSuggestionClick,
}: {
  onSuggestionClick: (text: string) => void
}) {
  return (
    <div className="flex-1 flex items-center justify-center px-6">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-4">
          <h1 className="font-serif font-bold text-4xl md:text-5xl tracking-tight leading-tight text-foreground">
            Explore the Frontier of Research
          </h1>
          <p className="text-muted-foreground font-sans text-base leading-relaxed tracking-tight max-w-lg mx-auto">
            Describe a research topic, and ResearchLens will discover a relevant paper on arXiv and produce a comprehensive section-by-section analysis.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-muted-foreground font-sans uppercase tracking-widest">
            Try a topic
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {SUGGESTION_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => onSuggestionClick(chip)}
                className="border border-border bg-card hover:bg-secondary px-4 py-2.5 text-sm font-sans tracking-tight text-foreground transition-all duration-200 rounded-none"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── SidebarConversationItem ─────────────────────────────────────────────────

function SidebarConversationItem({
  conversation,
  isActive,
  onClick,
  onDelete,
}: {
  conversation: Conversation
  isActive: boolean
  onClick: () => void
  onDelete: (e: React.MouseEvent) => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-border transition-all duration-200 group flex items-start justify-between gap-2 ${isActive ? 'bg-secondary' : 'hover:bg-secondary/50'}`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-sans tracking-tight text-foreground truncate">
          {conversation.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 font-sans tracking-tight">
          {new Date(conversation.timestamp).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}
        </p>
      </div>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 transition-all duration-200 p-1 text-muted-foreground hover:text-foreground flex-shrink-0 mt-0.5"
        aria-label="Delete conversation"
      >
        <FiTrash2 className="w-3 h-3" />
      </button>
    </button>
  )
}

// ─── AgentStatusBar ──────────────────────────────────────────────────────────

function AgentStatusBar({ isActive }: { isActive: boolean }) {
  return (
    <div className="border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <FiCpu className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-sans tracking-tight text-foreground font-medium">
            Research Coordinator
          </p>
          <p className="text-xs text-muted-foreground font-sans tracking-tight">
            Manager agent -- orchestrates Paper Discovery and Paper Analysis sub-agents
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-[hsl(0,70%,55%)] animate-pulse' : 'bg-muted-foreground/30'}`} />
          <span className="text-xs text-muted-foreground font-sans tracking-tight">
            {isActive ? 'Processing' : 'Idle'}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Page() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingPhase, setLoadingPhase] = useState(LOADING_PHASES[0])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sampleDataOn, setSampleDataOn] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const loadingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Get active conversation
  const activeConversation = conversations.find((c) => c.id === activeConversationId) ?? null

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConversation?.messages?.length, isLoading])

  // Loading phase cycling
  useEffect(() => {
    if (isLoading) {
      let phaseIndex = 0
      setLoadingPhase(LOADING_PHASES[0])
      loadingIntervalRef.current = setInterval(() => {
        phaseIndex = (phaseIndex + 1) % LOADING_PHASES.length
        setLoadingPhase(LOADING_PHASES[phaseIndex])
      }, 3000)
    } else {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current)
        loadingIntervalRef.current = null
      }
    }
    return () => {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current)
      }
    }
  }, [isLoading])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px'
    }
  }, [inputValue])

  // Create new conversation
  const createNewConversation = useCallback((): Conversation => {
    const newConv: Conversation = {
      id: generateId(),
      title: 'New Search',
      timestamp: Date.now(),
      messages: [],
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }
    setConversations((prev) => [newConv, ...prev])
    setActiveConversationId(newConv.id)
    return newConv
  }, [])

  // Delete conversation
  const deleteConversation = useCallback(
    (e: React.MouseEvent, convId: string) => {
      e.stopPropagation()
      setConversations((prev) => prev.filter((c) => c.id !== convId))
      if (activeConversationId === convId) {
        setActiveConversationId(null)
      }
    },
    [activeConversationId]
  )

  // Add message to conversation
  const addMessage = useCallback(
    (convId: string, message: Message) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId ? { ...c, messages: [...c.messages, message] } : c
        )
      )
    },
    []
  )

  // Update last assistant message
  const updateLastAssistantMessage = useCallback(
    (convId: string, updates: Partial<Message>) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== convId) return c
          const msgs = [...c.messages]
          for (let i = msgs.length - 1; i >= 0; i--) {
            if (msgs[i].role === 'assistant') {
              msgs[i] = { ...msgs[i], ...updates }
              break
            }
          }
          return { ...c, messages: msgs }
        })
      )
    },
    []
  )

  // Handle submit
  const handleSubmit = useCallback(
    async (overrideMessage?: string) => {
      const messageText = overrideMessage ?? inputValue.trim()
      if (!messageText || isLoading) return

      setInputValue('')

      // Get or create conversation
      let conv = activeConversation
      let convId = activeConversationId

      if (!conv) {
        conv = createNewConversation()
        convId = conv.id
      }

      if (!convId) return

      // Update title if first message
      if (conv.messages.length === 0) {
        const title = messageText.length > 50 ? messageText.slice(0, 50) + '...' : messageText
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, title } : c))
        )
      }

      // Add user message
      const userMsg: Message = {
        id: generateId(),
        role: 'user',
        content: messageText,
      }
      addMessage(convId, userMsg)

      // Add loading assistant message
      const assistantMsgId = generateId()
      const loadingMsg: Message = {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        isLoading: true,
      }
      addMessage(convId, loadingMsg)

      setIsLoading(true)

      try {
        const result: AIAgentResponse = await callAIAgent(messageText, AGENT_ID, {
          session_id: conv.sessionId,
        })

        if (result.success && result.response?.result) {
          const data = result.response.result
          let parsed: Record<string, unknown> = {}

          if (typeof data === 'string') {
            try {
              parsed = JSON.parse(data)
            } catch {
              parsed = { follow_up_response: data }
            }
          } else if (typeof data === 'object' && data !== null) {
            parsed = data as Record<string, unknown>
          } else {
            parsed = { follow_up_response: String(data ?? '') }
          }

          const isPaperAnalysis =
            typeof parsed.paper_title === 'string' && parsed.paper_title.trim() !== ''

          if (isPaperAnalysis) {
            const paperData: PaperAnalysis = {
              paper_title: String(parsed.paper_title ?? ''),
              authors: String(parsed.authors ?? ''),
              publication_date: String(parsed.publication_date ?? ''),
              arxiv_link: String(parsed.arxiv_link ?? ''),
              categories: String(parsed.categories ?? ''),
              selection_reasoning: String(parsed.selection_reasoning ?? ''),
              abstract_summary: String(parsed.abstract_summary ?? ''),
              introduction: String(parsed.introduction ?? ''),
              literature_review: String(parsed.literature_review ?? ''),
              methodology: String(parsed.methodology ?? ''),
              experimental_setup: String(parsed.experimental_setup ?? ''),
              results: String(parsed.results ?? ''),
              discussion: String(parsed.discussion ?? ''),
              limitations: String(parsed.limitations ?? ''),
              conclusion: String(parsed.conclusion ?? ''),
              future_work: String(parsed.future_work ?? ''),
              key_contributions: String(parsed.key_contributions ?? ''),
              follow_up_response: String(parsed.follow_up_response ?? ''),
            }
            updateLastAssistantMessage(convId, {
              content: '',
              paperData,
              isLoading: false,
            })
          } else {
            const textContent =
              String(parsed.follow_up_response ?? '') ||
              String(parsed.message ?? '') ||
              result.response?.message ||
              (typeof data === 'string' ? data : JSON.stringify(parsed))
            updateLastAssistantMessage(convId, {
              content: textContent,
              isLoading: false,
            })
          }
        } else {
          const errorMsg =
            result.error || result.response?.message || 'Something went wrong. Please try again.'
          updateLastAssistantMessage(convId, {
            content: errorMsg,
            isLoading: false,
            isError: true,
          })
        }
      } catch (err) {
        updateLastAssistantMessage(convId!, {
          content: 'A network error occurred. Please check your connection and try again.',
          isLoading: false,
          isError: true,
        })
      } finally {
        setIsLoading(false)
      }
    },
    [
      inputValue,
      isLoading,
      activeConversation,
      activeConversationId,
      createNewConversation,
      addMessage,
      updateLastAssistantMessage,
    ]
  )

  // Handle suggestion click
  const handleSuggestionClick = useCallback(
    (text: string) => {
      const newConv = createNewConversation()
      // slight delay to let state settle
      setTimeout(() => {
        handleSubmit(text)
      }, 50)
    },
    [createNewConversation, handleSubmit]
  )

  // Handle enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Sample data toggle effect
  useEffect(() => {
    if (sampleDataOn) {
      // Create a sample conversation with data
      const sampleConv: Conversation = {
        id: 'sample_conv',
        title: 'Transformer architectures for NLP',
        timestamp: Date.now(),
        sessionId: 'sample_session',
        messages: [
          {
            id: 'sample_user_1',
            role: 'user',
            content: 'Transformer architectures for NLP',
          },
          {
            id: 'sample_assistant_1',
            role: 'assistant',
            content: '',
            paperData: SAMPLE_PAPER,
          },
          {
            id: 'sample_user_2',
            role: 'user',
            content: 'What makes multi-head attention more effective than single-head attention?',
          },
          {
            id: 'sample_assistant_2',
            role: 'assistant',
            content:
              'Multi-head attention is more effective because it allows the model to jointly attend to information from **different representation subspaces** at different positions. With single-head attention, averaging inhibits this capability.\n\nSpecifically, each attention head can learn to focus on different aspects of the input:\n\n1. **Syntactic patterns** -- one head might learn subject-verb relationships\n2. **Semantic similarity** -- another head captures meaning-based connections\n3. **Positional patterns** -- some heads learn relative position attention\n4. **Long-range dependencies** -- certain heads specialize in distant token relationships\n\nThe paper uses h=8 parallel attention heads, each with reduced dimensionality (d_k = d_model/h = 64), so the total computational cost is similar to single-head attention with full dimensionality, but the representational power is substantially greater.',
          },
        ],
      }
      setConversations((prev) => {
        const filtered = prev.filter((c) => c.id !== 'sample_conv')
        return [sampleConv, ...filtered]
      })
      setActiveConversationId('sample_conv')
    } else {
      setConversations((prev) => prev.filter((c) => c.id !== 'sample_conv'))
      if (activeConversationId === 'sample_conv') {
        setActiveConversationId(null)
      }
    }
  }, [sampleDataOn])

  // Determine if we have messages
  const hasMessages = (activeConversation?.messages?.length ?? 0) > 0

  return (
    <ErrorBoundary>
      <div className="min-h-screen h-screen bg-background text-foreground flex overflow-hidden">
        {/* ─── Sidebar overlay on mobile ─── */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ─── Sidebar ─── */}
        <aside
          className={`fixed md:relative z-40 h-full flex flex-col border-r border-border bg-[hsl(0,0%,7%)] transition-all duration-200 ${sidebarOpen ? 'w-[280px] translate-x-0' : 'w-0 -translate-x-[280px] md:translate-x-0 md:w-0'}`}
        >
          {sidebarOpen && (
            <>
              {/* Sidebar header */}
              <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
                <h2 className="font-serif font-bold text-sm tracking-tight text-foreground">
                  History
                </h2>
                <button
                  onClick={() => {
                    createNewConversation()
                    if (window.innerWidth < 768) setSidebarOpen(false)
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[hsl(0,70%,55%)] text-white text-xs font-sans tracking-tight rounded-none hover:bg-[hsl(0,70%,45%)] transition-all duration-200"
                >
                  <FiPlus className="w-3 h-3" />
                  New Search
                </button>
              </div>

              {/* Sidebar conversation list */}
              <ScrollArea className="flex-1">
                {conversations.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-xs text-muted-foreground font-sans tracking-tight">
                      No conversations yet. Start by entering a research topic.
                    </p>
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <SidebarConversationItem
                      key={conv.id}
                      conversation={conv}
                      isActive={conv.id === activeConversationId}
                      onClick={() => {
                        setActiveConversationId(conv.id)
                        if (window.innerWidth < 768) setSidebarOpen(false)
                      }}
                      onDelete={(e) => deleteConversation(e, conv.id)}
                    />
                  ))
                )}
              </ScrollArea>

              {/* Agent status in sidebar footer */}
              <div className="border-t border-border p-3 flex-shrink-0">
                <AgentStatusBar isActive={isLoading} />
              </div>
            </>
          )}
        </aside>

        {/* ─── Main content ─── */}
        <main className="flex-1 flex flex-col min-w-0 h-full">
          {/* ─── Header ─── */}
          <header className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border flex-shrink-0 bg-background">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 text-muted-foreground hover:text-foreground transition-all duration-200"
                aria-label="Toggle sidebar"
              >
                {sidebarOpen ? <FiX className="w-5 h-5" /> : <FiMenu className="w-5 h-5" />}
              </button>
              <div>
                <h1 className="font-serif font-bold text-lg tracking-tight text-foreground leading-none">
                  ResearchLens
                </h1>
                <p className="text-xs text-muted-foreground font-sans tracking-tight mt-0.5">
                  AI Research Paper Discovery & Analysis
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Sample Data Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-sans tracking-tight">
                  Sample Data
                </span>
                <button
                  onClick={() => setSampleDataOn(!sampleDataOn)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-200 ${sampleDataOn ? 'bg-[hsl(0,70%,55%)]' : 'bg-muted'}`}
                  role="switch"
                  aria-checked={sampleDataOn}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform bg-white rounded-full transition-all duration-200 ${sampleDataOn ? 'translate-x-[18px]' : 'translate-x-[3px]'}`}
                  />
                </button>
              </div>
              <button
                onClick={() => createNewConversation()}
                className="flex items-center gap-1.5 px-3 py-2 border border-border bg-card hover:bg-secondary text-foreground text-sm font-sans tracking-tight rounded-none transition-all duration-200"
              >
                <FiPlus className="w-4 h-4" />
                <span className="hidden sm:inline">New Search</span>
              </button>
            </div>
          </header>

          {/* ─── Messages / Welcome ─── */}
          <div className="flex-1 overflow-y-auto">
            {!hasMessages ? (
              <WelcomeView
                onSuggestionClick={(text) => {
                  if (!activeConversation) {
                    createNewConversation()
                  }
                  setInputValue(text)
                  setTimeout(() => handleSubmit(text), 100)
                }}
              />
            ) : (
              <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 space-y-6">
                {Array.isArray(activeConversation?.messages) &&
                  activeConversation.messages.map((msg) => (
                    <div key={msg.id}>
                      {msg.role === 'user' ? (
                        /* User message */
                        <div className="flex justify-end">
                          <div className="max-w-[80%] bg-secondary border border-border px-4 py-3 rounded-none">
                            <p className="text-sm font-sans tracking-tight leading-relaxed text-foreground whitespace-pre-wrap">
                              {msg.content}
                            </p>
                          </div>
                        </div>
                      ) : (
                        /* Assistant message */
                        <div className="flex justify-start">
                          <div className="w-full">
                            {msg.isLoading ? (
                              <LoadingSkeleton phase={loadingPhase} />
                            ) : msg.paperData ? (
                              <PaperAnalysisCard data={msg.paperData} />
                            ) : (
                              <div className={`max-w-3xl border border-border bg-card p-6 rounded-none ${msg.isError ? 'border-[hsl(0,70%,55%)]/30' : ''}`}>
                                {msg.isError && (
                                  <div className="flex items-center gap-2 mb-3">
                                    <FiAlertTriangle className="w-4 h-4 text-[hsl(0,70%,55%)]" />
                                    <span className="text-xs text-[hsl(0,70%,55%)] font-sans tracking-tight font-medium">
                                      Error
                                    </span>
                                  </div>
                                )}
                                <div className="text-foreground font-sans leading-relaxed tracking-tight">
                                  {renderMarkdown(msg.content)}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* ─── Input Bar ─── */}
          <div className="flex-shrink-0 border-t border-border bg-background px-4 md:px-6 py-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-end gap-3">
                <div className="flex-1 border border-border bg-card rounded-none">
                  <textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter your research interest or ask a follow-up..."
                    className="w-full bg-transparent px-4 py-3 text-sm font-sans tracking-tight leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none resize-none min-h-[44px] max-h-[160px]"
                    rows={1}
                    disabled={isLoading}
                  />
                </div>
                <button
                  onClick={() => handleSubmit()}
                  disabled={isLoading || !inputValue.trim()}
                  className="flex items-center gap-2 px-5 py-3 bg-[hsl(0,70%,55%)] text-white text-sm font-sans tracking-tight rounded-none hover:bg-[hsl(0,70%,45%)] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                >
                  {isLoading ? (
                    <>
                      <FiLoader className="w-4 h-4 animate-spin" />
                      <span className="hidden sm:inline">Working...</span>
                    </>
                  ) : hasMessages ? (
                    <>
                      <FiSend className="w-4 h-4" />
                      <span className="hidden sm:inline">Ask</span>
                    </>
                  ) : (
                    <>
                      <FiSearch className="w-4 h-4" />
                      <span className="hidden sm:inline">Explore Research</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-sans tracking-tight text-center">
                Shift+Enter for new line. ResearchLens discovers and analyzes papers from arXiv.
              </p>
            </div>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  )
}
