export type TrackId = "ml" | "swe";

export type TopicDomain = {
  name: string;
  sections: Array<{
    title: string;
    topics: string[];
  }>;
};

export const ML_TAXONOMY: TopicDomain[] = [
  {
    name: "Classical ML",
    sections: [
      {
        title: "Core",
        topics: [
          "Linear Regression",
          "Logistic Regression",
          "Support Vector Machines",
          "K-Nearest Neighbours",
          "K-Means Clustering",
          "Naive Bayes",
          "Decision Trees",
          "Random Forests",
          "Gradient Boosting / XGBoost",
          "Gradient Descent (SGD, mini-batch, momentum, Adam)",
          "Bias-Variance Tradeoff",
          "Regularization (L1, L2, Dropout)",
          "Cross-Validation",
          "Evaluation Metrics (precision, recall, F1, AUC-ROC)",
          "Feature Engineering",
          "Dimensionality Reduction (PCA, t-SNE)",
        ],
      },
    ],
  },
  {
    name: "Deep Learning",
    sections: [
      {
        title: "Foundations",
        topics: [
          "Backpropagation and Computational Graphs",
          "Activation Functions",
          "Loss Functions",
          "Optimizers (Adam, AdamW, LR schedules)",
          "Batch Normalization and Layer Normalization",
          "Weight Initialization",
        ],
      },
      {
        title: "Architectures",
        topics: [
          "Feedforward Networks",
          "CNNs",
          "RNNs, LSTMs, GRUs",
          "Transformers (encoder, decoder, encoder-decoder)",
          "Attention Mechanisms (scaled dot-product, multi-head, cross-attention, FlashAttention)",
          "Positional Encoding",
          "KV Cache",
        ],
      },
      {
        title: "Language and LLMs",
        topics: [
          "Tokenization and BPE",
          "Embeddings (word2vec, learned)",
          "Pretraining vs Fine-tuning",
          "LoRA and PEFT",
          "RAG (Retrieval Augmented Generation)",
          "Tool Calling",
          "Temperature Sampling, Top-k, Top-p, Beam Search",
          "RLHF (reward modeling, PPO fine-tuning loop, preference data)",
          "Inference Optimization",
        ],
      },
      {
        title: "Multi-task and Transfer Learning",
        topics: [
          "Transfer Learning",
          "Multi-task Learning",
          "Negative Transfer",
          "Task Sampling Strategies",
        ],
      },
    ],
  },
  {
    name: "Reinforcement Learning",
    sections: [
      {
        title: "Foundations",
        topics: [
          "Markov Decision Processes",
          "Bellman Equations",
          "Value Functions",
          "Policy-based vs Value-based vs Model-based RL",
        ],
      },
      {
        title: "Tabular Methods",
        topics: [
          "Dynamic Programming",
          "Monte Carlo Control",
          "Temporal Difference Learning",
          "Q-Learning",
          "SARSA",
        ],
      },
      {
        title: "Deep RL",
        topics: [
          "DQN",
          "Policy Gradients (REINFORCE)",
          "Actor-Critic Methods",
          "PPO (Proximal Policy Optimization)",
          "DPO (Direct Preference Optimization)",
        ],
      },
    ],
  },
  {
    name: "Training Engineering",
    sections: [
      {
        title: "Core",
        topics: [
          "Gradient Accumulation",
          "Gradient Checkpointing",
          "Mixed Precision Training (fp32, fp16, bfloat16)",
          "CUDA Setup and Device Management",
          "Distributed Training and DDP",
          "Training Config and YAML Structure",
          "Multi-Seed Evaluation and Reproducibility",
          "Experiment Tracking with MLflow",
        ],
      },
    ],
  },
  {
    name: "Systems and MLOps",
    sections: [
      {
        title: "Core",
        topics: [
          "Model Serving and Deployment",
          "Embeddings at Scale",
          "Vector Databases",
          "Batch vs Online Inference",
          "Latency vs Throughput Tradeoffs",
          "CI/CD for ML",
          "Experiment Tracking",
        ],
      },
    ],
  },
];

export const SWE_TAXONOMY: TopicDomain[] = [
  {
    name: "Frontend",
    sections: [
      {
        title: "Core Web",
        topics: [
          "HTML Semantics and Document Structure",
          "CSS Layout (Flexbox, Grid, Positioning)",
          "Modern JavaScript (ES2020+, Closures, Prototypes)",
          "Event Loop, Microtasks and Macrotasks",
          "DOM, Reflow and Repaint",
          "Browser Rendering Pipeline and Critical Path",
          "HTTP, CORS, Cookies and Fetch",
        ],
      },
      {
        title: "Frameworks and State",
        topics: [
          "React Rendering Model and Reconciliation",
          "Hooks, Effects and Derived State",
          "Client vs Server Components (Next.js App Router)",
          "State Management (Context, Redux, Zustand, TanStack Query)",
          "Routing, Data Fetching and Streaming",
          "Forms, Validation and Server Actions",
        ],
      },
      {
        title: "Performance and Quality",
        topics: [
          "Core Web Vitals (LCP, INP, CLS)",
          "Bundle Splitting and Lazy Loading",
          "Image and Font Optimization",
          "Accessibility (WCAG, ARIA, Keyboard, Screen Readers)",
          "Frontend Testing (Unit, Component, E2E)",
          "Progressive Enhancement and Offline (Service Workers)",
        ],
      },
    ],
  },
  {
    name: "Backend",
    sections: [
      {
        title: "APIs and Services",
        topics: [
          "REST API Design and Versioning",
          "GraphQL (Schema, Resolvers, N+1)",
          "gRPC and Protocol Buffers",
          "WebSockets and Server-Sent Events",
          "Authentication (Sessions, JWT, OAuth2, OIDC)",
          "Authorization (RBAC, ABAC, Policies)",
          "Rate Limiting and Quota Enforcement",
        ],
      },
      {
        title: "Data and Storage",
        topics: [
          "SQL Fundamentals (Joins, Indexes, Query Plans)",
          "Transactions and Isolation Levels",
          "NoSQL Models (Document, Key-Value, Wide-Column)",
          "ORMs vs Query Builders vs Raw SQL",
          "Caching Strategies (Read-through, Write-through, Write-behind)",
          "Full-Text Search and Inverted Indexes",
        ],
      },
      {
        title: "Runtime and Reliability",
        topics: [
          "Concurrency Models (Threads, Async/Await, Actors)",
          "Message Queues and Pub/Sub (Kafka, RabbitMQ, SQS)",
          "Idempotency and Retries",
          "Observability (Logs, Metrics, Traces, SLOs)",
          "Error Handling and Circuit Breakers",
          "Backpressure and Load Shedding",
        ],
      },
    ],
  },
  {
    name: "System Design",
    sections: [
      {
        title: "Scale and Availability",
        topics: [
          "Load Balancing (L4, L7, Consistent Hashing)",
          "Horizontal vs Vertical Scaling",
          "Replication (Primary-Replica, Multi-Primary)",
          "Sharding and Partitioning",
          "CAP Theorem and PACELC",
          "Consistency Models (Strong, Eventual, Causal)",
          "CDNs and Edge Caching",
        ],
      },
      {
        title: "Patterns",
        topics: [
          "Microservices vs Modular Monolith",
          "Event-Driven Architecture",
          "CQRS and Event Sourcing",
          "Saga Pattern for Distributed Transactions",
          "API Gateway and Service Mesh",
          "Batch vs Streaming Processing",
        ],
      },
      {
        title: "Classic Interview Problems",
        topics: [
          "Design a URL Shortener (bit.ly)",
          "Design a Rate Limiter",
          "Design a News Feed (Twitter/Meta)",
          "Design a Chat System (WhatsApp/Slack)",
          "Design a Ride-Sharing Dispatch (Uber)",
          "Design a Video Streaming Service (YouTube/Netflix)",
          "Design a Distributed Key-Value Store",
          "Design a Web Crawler",
        ],
      },
    ],
  },
  {
    name: "UI / UX",
    sections: [
      {
        title: "Design Foundations",
        topics: [
          "Design Systems and Token Architecture",
          "Typography and Type Scales",
          "Color Theory and Contrast (WCAG)",
          "Spacing, Rhythm and Grid Systems",
          "Iconography and Visual Hierarchy",
          "Dark Mode and Theming Strategy",
        ],
      },
      {
        title: "Interaction and Research",
        topics: [
          "Information Architecture",
          "Interaction Patterns and Heuristics (Nielsen)",
          "Microcopy and Empty States",
          "Motion Design and Easing Curves",
          "Usability Testing and Research Methods",
          "Accessibility-First Design Reviews",
        ],
      },
    ],
  },
  {
    name: "CS Fundamentals",
    sections: [
      {
        title: "Data Structures and Algorithms",
        topics: [
          "Arrays, Strings and Two Pointers",
          "Hash Maps and Sets",
          "Linked Lists",
          "Stacks and Queues",
          "Trees, BSTs and Heaps",
          "Graphs (BFS, DFS, Dijkstra, Topological Sort)",
          "Dynamic Programming",
          "Greedy Algorithms",
          "Big-O and Amortized Analysis",
        ],
      },
      {
        title: "Systems Basics",
        topics: [
          "Operating Systems (Processes, Threads, Scheduling)",
          "Memory Management (Stack, Heap, GC)",
          "File Systems and I/O",
          "TCP/IP, DNS and TLS",
          "Concurrency Primitives (Locks, Atomics, Channels)",
          "Unix Tooling and the Command Line",
        ],
      },
    ],
  },
];

/**
 * Combined legacy export so older call sites that iterate all topics
 * (e.g. `ALL_TOPICS.includes(x)`) continue to work.
 */
export const TOPIC_TAXONOMY: TopicDomain[] = ML_TAXONOMY;

export const ALL_ML_TOPICS = ML_TAXONOMY.flatMap((d) =>
  d.sections.flatMap((s) => s.topics),
);

export const ALL_SWE_TOPICS = SWE_TAXONOMY.flatMap((d) =>
  d.sections.flatMap((s) => s.topics),
);

export const ALL_TOPICS = [...ALL_ML_TOPICS, ...ALL_SWE_TOPICS];

export function getTaxonomy(track: TrackId): TopicDomain[] {
  return track === "swe" ? SWE_TAXONOMY : ML_TAXONOMY;
}

export function countTopics(taxonomy: TopicDomain[]): number {
  return taxonomy.flatMap((d) => d.sections.flatMap((s) => s.topics)).length;
}

/**
 * Infer which track a topic belongs to by looking it up in the taxonomies.
 * Returns `null` for custom user-typed topics; callers can default to "ml".
 */
export function getTrackForTopic(topic: string): TrackId | null {
  if (ALL_ML_TOPICS.includes(topic)) return "ml";
  if (ALL_SWE_TOPICS.includes(topic)) return "swe";
  return null;
}

export function getDomainForTopic(topic: string): {
  track: TrackId;
  domain: string;
} | null {
  for (const domain of ML_TAXONOMY) {
    for (const section of domain.sections) {
      if (section.topics.includes(topic)) {
        return { track: "ml", domain: domain.name };
      }
    }
  }
  for (const domain of SWE_TAXONOMY) {
    for (const section of domain.sections) {
      if (section.topics.includes(topic)) {
        return { track: "swe", domain: domain.name };
      }
    }
  }
  return null;
}
