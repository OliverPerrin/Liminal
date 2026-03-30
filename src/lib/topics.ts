export type TopicDomain = {
  name: string;
  sections: Array<{
    title: string;
    topics: string[];
  }>;
};

export const TOPIC_TAXONOMY: TopicDomain[] = [
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

export const ALL_TOPICS = TOPIC_TAXONOMY.flatMap((domain) =>
  domain.sections.flatMap((section) => section.topics),
);
