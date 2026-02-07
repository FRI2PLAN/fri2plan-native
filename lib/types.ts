// Types simplifiés pour l'AppRouter
// Ces types seront affinés au fur et à mesure de l'implémentation

export interface User {
  id: number;
  name: string;
  email: string;
  role?: string;
  avatar?: string;
}

export interface Family {
  id: number;
  name: string;
  inviteCode: string;
  createdAt: string;
}

export interface Event {
  id: number;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  isPrivate: boolean;
  createdBy: number;
  familyId: number;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  assignedTo?: number;
  familyId: number;
  points?: number;
}

export interface ShoppingList {
  id: number;
  name: string;
  familyId: number;
  createdAt: string;
}

export interface ShoppingItem {
  id: number;
  name: string;
  quantity?: number;
  checked: boolean;
  listId: number;
}

export interface Message {
  id: number;
  content: string;
  senderId: number;
  familyId: number;
  createdAt: string;
}

export interface Note {
  id: number;
  title: string;
  content: string;
  isPrivate: boolean;
  userId: number;
  familyId: number;
  createdAt: string;
}

export interface Budget {
  id: number;
  month: string;
  familyId: number;
  totalIncome: number;
  totalExpenses: number;
}

export interface Transaction {
  id: number;
  amount: number;
  category: string;
  description?: string;
  date: string;
  type: 'income' | 'expense';
  familyId: number;
}

export interface Reward {
  id: number;
  title: string;
  description?: string;
  pointsCost: number;
  familyId: number;
}

export interface Request {
  id: number;
  title: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedBy: number;
  familyId: number;
  createdAt: string;
}

// Type AppRouter simplifié
export type AppRouter = {
  auth: {
    login: {
      mutate: (input: { email: string; password: string }) => Promise<{ user: User; token: string }>;
    };
    logout: {
      mutate: () => Promise<void>;
    };
    register: {
      mutate: (input: { name: string; email: string; password: string }) => Promise<{ user: User; token: string }>;
    };
  };
  user: {
    me: {
      query: () => Promise<User>;
    };
  };
  family: {
    list: {
      query: () => Promise<Family[]>;
    };
    create: {
      mutate: (input: { name: string }) => Promise<Family>;
    };
  };
  events: {
    list: {
      query: () => Promise<Event[]>;
    };
    create: {
      mutate: (input: Partial<Event>) => Promise<Event>;
    };
    update: {
      mutate: (input: { id: number } & Partial<Event>) => Promise<Event>;
    };
    delete: {
      mutate: (input: { id: number }) => Promise<void>;
    };
  };
  tasks: {
    list: {
      query: () => Promise<Task[]>;
    };
    create: {
      mutate: (input: Partial<Task>) => Promise<Task>;
    };
    update: {
      mutate: (input: { id: number } & Partial<Task>) => Promise<Task>;
    };
    delete: {
      mutate: (input: { id: number }) => Promise<void>;
    };
    complete: {
      mutate: (input: { id: number }) => Promise<Task>;
    };
  };
  shopping: {
    lists: {
      query: () => Promise<ShoppingList[]>;
    };
    items: {
      query: (input: { listId: number }) => Promise<ShoppingItem[]>;
    };
    createList: {
      mutate: (input: { name: string }) => Promise<ShoppingList>;
    };
    addItem: {
      mutate: (input: { listId: number; name: string; quantity?: number }) => Promise<ShoppingItem>;
    };
    toggleItem: {
      mutate: (input: { id: number }) => Promise<ShoppingItem>;
    };
  };
  messages: {
    list: {
      query: () => Promise<Message[]>;
    };
    send: {
      mutate: (input: { content: string }) => Promise<Message>;
    };
  };
  notes: {
    list: {
      query: () => Promise<Note[]>;
    };
    create: {
      mutate: (input: Partial<Note>) => Promise<Note>;
    };
    update: {
      mutate: (input: { id: number } & Partial<Note>) => Promise<Note>;
    };
    delete: {
      mutate: (input: { id: number }) => Promise<void>;
    };
  };
  budget: {
    get: {
      query: (input: { month: string }) => Promise<Budget>;
    };
    transactions: {
      query: () => Promise<Transaction[]>;
    };
    addTransaction: {
      mutate: (input: Partial<Transaction>) => Promise<Transaction>;
    };
  };
  rewards: {
    list: {
      query: () => Promise<Reward[]>;
    };
    redeem: {
      mutate: (input: { id: number }) => Promise<void>;
    };
  };
  requests: {
    list: {
      query: () => Promise<Request[]>;
    };
    create: {
      mutate: (input: Partial<Request>) => Promise<Request>;
    };
    review: {
      mutate: (input: { id: number; status: 'approved' | 'rejected' }) => Promise<Request>;
    };
  };
};
