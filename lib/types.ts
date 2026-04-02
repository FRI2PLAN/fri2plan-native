// Types simplifiés pour l'AppRouter
// Ces types seront affinés au fur et à mesure de l'implémentation

export interface User {
  id: number;
  name: string;
  email: string;
  role?: string;
  avatar?: string;
  familyId?: number;
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
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'inProgress' | 'completed';
  assignedTo?: number;
  familyId: number;
  points?: number;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  isFavorite?: number; // 0 or 1
  isPrivate?: number;  // 0 or 1
  postponeCount?: number;
  createdBy?: number;
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
  senderId?: number;
  userId?: number;
  userName?: string;
  familyId: number;
  createdAt: string;
  attachmentUrl?: string;
  attachmentType?: string;
  attachmentName?: string;
  attachmentSize?: number;
  reactions?: Record<string, { userId: number; userName: string }[]>;
}

export interface DiscussionGroup {
  id: number;
  name: string;
  description?: string;
  familyId: number;
  creatorId: number;
  creatorName?: string;
  createdAt: string;
}

export interface GroupMessage {
  id: number;
  groupId: number;
  userId: number;
  userName?: string;
  content: string;
  createdAt: string;
  attachmentUrl?: string;
  attachmentType?: string;
  attachmentName?: string;
  attachmentSize?: number;
  reactions?: Record<string, { userId: number; userName: string }[]>;
}

export interface Note {
  id: number;
  title: string;
  content?: string;
  isPrivate: number | boolean;
  isPinned?: number | boolean;
  attachments?: string;
  userId: number;
  familyId: number;
  authorName?: string;
  createdAt: string;
  updatedAt?: string;
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
  type: 'outing' | 'purchase' | 'permission' | 'other';
  status: 'pending' | 'approved' | 'rejected';
  requestedBy?: number;
  userId: number;
  familyId: number;
  requesterName?: string;
  requestedDate?: string;
  reviewComment?: string;
  targetAdminId?: number | null;
  isFavorite?: number;
  createdAt: string;
}

export interface RequestComment {
  id: number;
  requestId: number;
  userId: number;
  userName?: string;
  message: string;
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
    me: {
      query: () => Promise<User>;
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
    members: {
      query: (input: { familyId: number }) => Promise<Array<{ id: number; name: string; status: string; role?: string }>>;
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
      mutate: (input: {
        title: string;
        description?: string;
        assignedTo?: number;
        dueDate?: Date;
        recurrence?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
        points?: number;
        priority?: 'low' | 'medium' | 'high' | 'urgent';
        isPrivate?: number;
      }) => Promise<Task>;
    };
    update: {
      mutate: (input: {
        taskId: number;
        title?: string;
        description?: string;
        assignedTo?: number;
        dueDate?: Date;
        recurrence?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
        points?: number;
        priority?: 'low' | 'medium' | 'high' | 'urgent';
        isPrivate?: number;
        status?: 'todo' | 'inProgress' | 'completed';
        isFavorite?: number;
      }) => Promise<Task>;
    };
    delete: {
      mutate: (input: { taskId: number }) => Promise<void>;
    };
    complete: {
      mutate: (input: { taskId: number }) => Promise<{ points: number }>;
    };
    postpone: {
      mutate: (input: { taskId: number; days: number }) => Promise<{ newDueDate: string; postponeCount: number }>;
    };
    toggleFavorite: {
      mutate: (input: { taskId: number }) => Promise<{ isFavorite: number }>;
    };
    updatePriorities: {
      mutate: (input: Array<{ taskId: number; priority: 'low' | 'medium' | 'high' | 'urgent' }>) => Promise<void>;
    };
  };
  shopping: {
    lists: {
      query: () => Promise<ShoppingList[]>;
    };
    listsByFamily: {
      useQuery: (input: { familyId: number }) => any;
      query: (input: { familyId: number }) => Promise<ShoppingList[]>;
    };
    itemsByList: {
      useQuery: (input: { listId: number }, opts?: any) => any;
      query: (input: { listId: number }) => Promise<ShoppingItem[]>;
    };
    itemsHistory: {
      useQuery: (input: { familyId: number }) => any;
      query: (input: { familyId: number }) => Promise<ShoppingItem[]>;
    };
    items: {
      query: (input: { listId: number }) => Promise<ShoppingItem[]>;
    };
    createList: {
      mutate: (input: { name: string; description?: string; targetDate?: string; isPrivate?: number }) => Promise<ShoppingList>;
    };
    updateList: {
      mutate: (input: { listId: number; name: string; description?: string; targetDate?: string; isPrivate?: number }) => Promise<ShoppingList>;
    };
    deleteList: {
      mutate: (input: { listId: number }) => Promise<void>;
    };
    archiveList: {
      mutate: (input: { listId: number }) => Promise<void>;
    };
    unarchiveList: {
      mutate: (input: { listId: number }) => Promise<void>;
    };
    duplicateList: {
      mutate: (input: { listId: number }) => Promise<{ listId: number }>;
    };
    addItem: {
      mutate: (input: { listId: number; name: string; quantity?: string }) => Promise<ShoppingItem>;
    };
    updateItem: {
      mutate: (input: { itemId: number; name: string; quantity?: string }) => Promise<ShoppingItem>;
    };
    toggleItem: {
      mutate: (input: { itemId: number }) => Promise<ShoppingItem>;
    };
    deleteItem: {
      mutate: (input: { itemId: number }) => Promise<void>;
    };
    deleteCheckedItems: {
      mutate: (input: { listId: number }) => Promise<void>;
    };
    deduplicateItems: {
      mutate: (input: { listId: number }) => Promise<{ removed: number }>;
    };
    addItemsMerged: {
      useMutation: () => any;
      mutate: (input: { listId: number; items: { name: string; quantity?: string }[] }) => Promise<void>;
    };
  };
  meals: {
    list: {
      useQuery: (input: { familyId: number; startDate: string; endDate: string }) => any;
      query: (input: { familyId: number; startDate: string; endDate: string }) => Promise<any[]>;
    };
    history: {
      useQuery: (input: { familyId: number; limit: number }) => any;
      query: (input: { familyId: number; limit: number }) => Promise<any[]>;
    };
    create: {
      mutate: (input: { familyId: number; name: string; mealType: string; date: string; servings?: number; notes?: string; ingredients?: string }) => Promise<any>;
    };
    update: {
      mutate: (input: { mealId: number; name?: string; mealType?: string; date?: string; servings?: number; notes?: string; ingredients?: string }) => Promise<any>;
    };
    delete: {
      mutate: (input: { mealId: number }) => Promise<void>;
    };
    toggleFavorite: {
      useMutation: () => any;
      mutate: (input: { mealId: number; isFavorite: boolean }) => Promise<any>;
    };
    importFromUrl: {
      useMutation: () => any;
      mutateAsync: (input: { url: string }) => Promise<any>;
    };
  };
  messages: {
    list: {
      query: (input?: { familyId?: number; limit?: number; offset?: number }) => Promise<{ messages: Message[]; hasMore: boolean }>;
      useQuery: (input: { familyId: number; limit: number; offset: number }, opts?: any) => any;
    };
    create: {
      mutate: (input: { content: string; attachmentUrl?: string; attachmentType?: string; attachmentName?: string; attachmentSize?: number }) => Promise<Message>;
      useMutation: (opts?: any) => any;
    };
    delete: {
      mutate: (input: { messageId: number }) => Promise<void>;
      useMutation: (opts?: any) => any;
    };
    deleteAll: {
      mutate: (input: { familyId: number }) => Promise<void>;
      useMutation: (opts?: any) => any;
    };
    addReaction: {
      mutate: (input: { messageId: number; emoji: string }) => Promise<void>;
      useMutation: (opts?: any) => any;
    };
    markAsRead: {
      mutate: (input: { familyId: number }) => Promise<void>;
      useMutation: (opts?: any) => any;
    };
    getUnreadCount: {
      useQuery: (input: { familyId: number }, opts?: any) => any;
      query: (input: { familyId: number }) => Promise<number>;
    };
    uploadFile: {
      mutateAsync: (input: { fileName: string; fileType: string; fileSize: number; fileData: string }) => Promise<{ url: string }>;
      useMutation: (opts?: any) => any;
    };
    send: {
      mutate: (input: { content: string }) => Promise<Message>;
    };
  };
  discussionGroups: {
    list: {
      useQuery: (input: { familyId: number }, opts?: any) => any;
      query: (input: { familyId: number }) => Promise<DiscussionGroup[]>;
    };
    create: {
      mutate: (input: { name: string; description?: string; familyId: number; memberIds?: number[] }) => Promise<DiscussionGroup>;
      useMutation: (opts?: any) => any;
    };
    update: {
      mutate: (input: { groupId: number; name: string; description?: string }) => Promise<DiscussionGroup>;
      useMutation: (opts?: any) => any;
    };
    delete: {
      mutate: (input: { groupId: number }) => Promise<void>;
      useMutation: (opts?: any) => any;
    };
    messages: {
      useQuery: (input: { groupId: number }, opts?: any) => any;
      query: (input: { groupId: number }) => Promise<GroupMessage[]>;
    };
    sendMessage: {
      mutate: (input: { groupId: number; message: string; attachmentUrl?: string; attachmentType?: string; attachmentName?: string; attachmentSize?: number }) => Promise<GroupMessage>;
      useMutation: (opts?: any) => any;
    };
    deleteMessage: {
      mutate: (input: { messageId: number }) => Promise<void>;
      useMutation: (opts?: any) => any;
    };
    addReaction: {
      mutate: (input: { messageId: number; emoji: string }) => Promise<void>;
      useMutation: (opts?: any) => any;
    };
    markAsRead: {
      mutate: (input: { groupId: number }) => Promise<void>;
      useMutation: (opts?: any) => any;
    };
    unreadCount: {
      useQuery: (input: { familyId: number }, opts?: any) => any;
      query: (input: { familyId: number }) => Promise<number>;
    };
    unreadCountPerGroup: {
      useQuery: (input: { familyId: number }, opts?: any) => any;
      query: (input: { familyId: number }) => Promise<Record<number, number>>;
    };
    getMembers: {
      useQuery: (input: { groupId: number }, opts?: any) => any;
      query: (input: { groupId: number }) => Promise<Array<{ id: number; name: string }>>;
    };
    addMember: {
      mutate: (input: { groupId: number; userId: number }) => Promise<void>;
      useMutation: (opts?: any) => any;
    };
    removeMember: {
      mutate: (input: { groupId: number; userId: number }) => Promise<void>;
      useMutation: (opts?: any) => any;
    };
    leaveGroup: {
      mutate: (input: { groupId: number }) => Promise<void>;
      useMutation: (opts?: any) => any;
    };
  };
  notes: {
    list: {
      query: () => Promise<Note[]>;
    };
    create: {
      mutate: (input: {
        title: string;
        content?: string;
        isPrivate?: boolean;
        attachments?: string;
      }) => Promise<Note>;
    };
    update: {
      mutate: (input: {
        noteId: number;
        title?: string;
        content?: string;
        isPinned?: number;
        isPrivate?: number;
        attachments?: string;
      }) => Promise<Note>;
    };
    delete: {
      mutate: (input: { noteId: number }) => Promise<void>;
    };
    uploadFile: {
      mutate: (input: { fileName: string; fileData: string; fileType: string }) => Promise<{ url: string; fileName: string; fileType: string }>;
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
    myPoints: {
      query: () => Promise<{ points: number }>;
    };
    redeem: {
      mutate: (input: { id: number }) => Promise<void>;
    };
  };
  requests: {
    list: {
      query: (input: { familyId: number }) => Promise<Request[]>;
    };
    create: {
      mutate: (input: {
        type: 'outing' | 'purchase' | 'permission' | 'other';
        title: string;
        description?: string;
        requestedDate?: Date;
        targetAdminId?: number | null;
      }) => Promise<{ requestId: number }>;
    };
    review: {
      mutate: (input: { requestId: number; status: 'approved' | 'rejected'; reviewComment?: string }) => Promise<{ success: boolean }>;
    };
    delete: {
      mutate: (input: { requestId: number }) => Promise<{ success: boolean }>;
    };
    addComment: {
      mutate: (input: { requestId: number; message: string }) => Promise<{ success: boolean }>;
    };
    listComments: {
      query: (input: { requestId: number }) => Promise<RequestComment[]>;
    };
    getUnreadCommentsCounts: {
      query: (input: { familyId: number }) => Promise<Record<number, number>>;
    };
    markCommentsRead: {
      mutate: (input: { requestId: number }) => Promise<{ success: boolean }>;
    };
  };
  settings: {
    get: {
      query: () => Promise<{ tasksSelectedList?: string; [key: string]: any }>;
    };
    update: {
      mutate: (input: Record<string, any>) => Promise<void>;
    };
  };
};
