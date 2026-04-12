// Types simplifiés pour l'AppRouter
// Ces types seront affinés au fur et à mesure de l'implémentation

export interface User {
  id: number;
  name: string;
  email: string;
  role?: string;
  avatar?: string;
  familyId?: number;
  // Champs avatar enrichis (retournés par user.me)
  avatarType?: 'upload' | 'emoji' | 'icon' | 'initials';
  avatarValue?: string;   // emoji ou initiales
  avatarUrl?: string | null; // URL photo uploadée
  userColor?: string;     // couleur de fond de l'avatar
  points?: number;        // points de récompenses
}

export interface Family {
  id: number;
  name: string;
  inviteCode: string;
  createdAt: string;
  familyColor?: string;
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
  amount: number; // en centimes
  category: string;
  description?: string;
  date: string;
  type: 'income' | 'expense';
  familyId: number;
  userId?: number;
  userName?: string;
  isPrivate?: number;
  projectId?: number;
  currency?: string;
  createdAt?: string;
}

export interface BudgetCategory {
  id: number;
  name: string;
  icon?: string;
  color?: string;
  familyId: number;
  isDefault?: number;
}

export interface CategoryBudget {
  id: number;
  familyId: number;
  categoryId: number;
  categoryName?: string;
  budgetAmount: number; // en centimes
  period: 'weekly' | 'monthly' | 'yearly';
  alertThreshold: number;
  spent?: number;
}

export interface SavingsProject {
  id: number;
  familyId: number;
  name: string;
  targetAmount: number; // en centimes
  currentAmount: number; // en centimes
  deadline?: string;
  isCompleted: number;
  period?: string;
  alertThreshold?: number;
  createdAt: string;
  currency?: string; // CHF, EUR, USD — stocké dans le nom ou description
}

export interface BudgetBalance {
  balance: number;
  totalIncome: number;
  totalExpenses: number;
  initialBalance?: number;
  regularIncome?: number;
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
      useQuery: (opts?: any) => any;
    };
  };
  user: {
    me: {
      query: () => Promise<User>;
      useQuery: (opts?: any) => any;
    };
  };
  family: {
    list: {
      query: () => Promise<Family[]>;
      useQuery: (opts?: any) => any;
    };
    create: {
      mutate: (input: { name: string }) => Promise<Family>;
      useMutation: (opts?: any) => any;
    };
    join: {
      mutate: (input: { inviteCode: string }) => Promise<{ familyId: number }>;
      useMutation: (opts?: any) => any;
    };
    update: {
      mutate: (input: { familyId: number; name: string; familyColor?: string }) => Promise<{ success: boolean }>;
      useMutation: (opts?: any) => any;
    };
    delete: {
      mutate: (input: { familyId: number }) => Promise<{ success: boolean }>;
      useMutation: (opts?: any) => any;
    };
    members: {
      query: (input: { familyId: number }) => Promise<Array<{ id: number; name: string; email?: string; status: string; role?: string; familyRole?: string; userColor?: string; avatarType?: string; avatarValue?: string; avatarUrl?: string | null }>>;
      useQuery: (input: { familyId: number }, opts?: any) => any;
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
      useQuery: (input?: any, opts?: any) => { data: Task[]; isLoading: boolean; refetch: () => void };
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
      useQuery: (input?: any, opts?: any) => { data: Note[]; isLoading: boolean; refetch: () => void };
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
    // Ancien endpoint simple (compatibilité)
    get: {
      query: (input: { month: string }) => Promise<Budget>;
      useQuery: (input: { month: string }, opts?: any) => any;
    };
    transactions: {
      query: () => Promise<Transaction[]>;
      useQuery: (opts?: any) => any;
    };
    addTransaction: {
      mutate: (input: Partial<Transaction>) => Promise<Transaction>;
      useMutation: (opts?: any) => any;
    };
    // Endpoints enrichis
    listTransactions: {
      useQuery: (input: { familyId: number }, opts?: any) => any;
      query: (input: { familyId: number }) => Promise<Transaction[]>;
    };
    createTransaction: {
      useMutation: (opts?: any) => any;
      mutate: (input: {
        familyId: number;
        type: 'income' | 'expense';
        amount: number;
        category: string;
        description?: string;
        date: Date;
        isPrivate?: number;
        projectId?: number;
        payerId?: number; // Pour les dépenses de projet partagé
        userId?: number;  // Attribuer la dépense à un autre membre
      }) => Promise<{ transactionId: number }>;
    };
    updateTransaction: {
      useMutation: (opts?: any) => any;
      mutate: (input: {
        transactionId: number;
        type?: 'income' | 'expense';
        amount?: number;
        category?: string;
        description?: string;
        date?: Date;
        isPrivate?: number;
        projectId?: number;
        userId?: number;  // Changer le membre attribué
      }) => Promise<void>;
    };
    deleteTransaction: {
      useMutation: (opts?: any) => any;
      mutate: (input: { transactionId: number }) => Promise<void>;
    };
    getBudgetBalance: {
      useQuery: (input: { familyId: number }, opts?: any) => any;
      query: (input: { familyId: number }) => Promise<BudgetBalance>;
    };
    getBalanceHistory: {
      useQuery: (input: { familyId: number; days: number }, opts?: any) => any;
      query: (input: { familyId: number; days: number }) => Promise<{ date: string; balance: number }[]>;
    };
    listCategories: {
      useQuery: (input: { familyId: number }, opts?: any) => any;
      query: (input: { familyId: number }) => Promise<BudgetCategory[]>;
    };
    createCategory: {
      useMutation: (opts?: any) => any;
      mutate: (input: { familyId: number; name: string; icon?: string; color?: string }) => Promise<{ categoryId: number }>;
    };
    updateCategory: {
      useMutation: (opts?: any) => any;
      mutate: (input: { categoryId: number; name?: string; icon?: string; color?: string }) => Promise<void>;
    };
    deleteCategory: {
      useMutation: (opts?: any) => any;
      mutate: (input: { categoryId: number }) => Promise<void>;
    };
    listCategoryBudgets: {
      useQuery: (input: { familyId: number }, opts?: any) => any;
      query: (input: { familyId: number }) => Promise<CategoryBudget[]>;
    };
    createCategoryBudget: {
      useMutation: (opts?: any) => any;
      mutate: (input: { familyId: number; categoryId: number; budgetAmount: number; period: 'weekly' | 'monthly' | 'yearly'; alertThreshold: number }) => Promise<void>;
    };
    updateCategoryBudget: {
      useMutation: (opts?: any) => any;
      mutate: (input: { budgetId: number; budgetAmount?: number; period?: string; alertThreshold?: number }) => Promise<void>;
    };
    deleteCategoryBudget: {
      useMutation: (opts?: any) => any;
      mutate: (input: { budgetId: number }) => Promise<void>;
    };
    getCategoryBudgetAlerts: {
      useQuery: (input: { familyId: number }, opts?: any) => any;
      query: (input: { familyId: number }) => Promise<any[]>;
    };
    listSavingsProjects: {
      useQuery: (input: { familyId: number }, opts?: any) => any;
      query: (input: { familyId: number }) => Promise<SavingsProject[]>;
    };
    createSavingsProject: {
      useMutation: (opts?: any) => any;
      mutate: (input: { familyId: number; name: string; targetAmount: number; deadline?: Date }) => Promise<{ projectId: number }>;
    };
    updateSavingsProject: {
      useMutation: (opts?: any) => any;
      mutate: (input: { budgetConfigId: number; name?: string; targetAmount?: number; deadline?: Date; isCompleted?: number }) => Promise<void>;
    };
    deleteSavingsProject: {
      useMutation: (opts?: any) => any;
      mutate: (input: { budgetConfigId: number }) => Promise<void>;
    };
  };
  rewards: {
    list: {
      query: () => Promise<Reward[]>;
      useQuery: (opts?: any) => any;
    };
    myPoints: {
      query: () => Promise<{ points: number }>;
      useQuery: (opts?: any) => any;
    };
    familyPoints: {
      useQuery: (input: { familyId: number }, opts?: any) => any;
      query: (input: { familyId: number }) => Promise<Array<{ userId: number; name: string; totalPoints: number }>>;
    };
    myEarnedRewards: {
      useQuery: (opts?: any) => any;
      query: () => Promise<Array<{ id: number; rewardId: number; rewardName: string; pointsCost: number; status: string; claimedAt: string }>>;
    };
    create: {
      useMutation: (opts?: any) => any;
      mutate: (input: { name: string; description?: string; pointsCost: number; emoji?: string; familyId: number }) => Promise<{ id: number }>;
    };
    update: {
      useMutation: (opts?: any) => any;
      mutate: (input: { rewardId: number; name?: string; description?: string; pointsCost?: number; emoji?: string; isActive?: number }) => Promise<void>;
    };
    delete: {
      useMutation: (opts?: any) => any;
      mutate: (input: { rewardId: number }) => Promise<void>;
    };
    redeem: {
      mutate: (input: { id: number }) => Promise<void>;
      useMutation: (opts?: any) => any;
    };
    claimReward: {
      useMutation: (opts?: any) => any;
      mutate: (input: { rewardId: number }) => Promise<{ claimId: number }>;
    };
    pendingClaims: {
      useQuery: (input: { familyId: number }, opts?: any) => any;
      query: (input: { familyId: number }) => Promise<Array<{ id: number; userId: number; userName: string; rewardId: number; rewardName: string; pointsCost: number; status: string; claimedAt: string }>>;
    };
    approveClaim: {
      useMutation: (opts?: any) => any;
      mutate: (input: { claimId: number }) => Promise<void>;
    };
    rejectClaim: {
      useMutation: (opts?: any) => any;
      mutate: (input: { claimId: number }) => Promise<void>;
    };
    statistics: {
      useQuery: (opts?: any) => any;
      query: () => Promise<{ totalPoints: number; rank: number; totalMembers: number; badgesEarned: number }>;
    };
  };
  members: {
    invite: {
      useMutation: (opts?: any) => any;
      mutate: (input: { email: string; familyId: number; role?: 'admin' | 'member' }) => Promise<{ success: boolean; invitationCode: string; expiresAt: string }>;
    };
    updateColor: {
      useMutation: (opts?: any) => any;
      mutate: (input: { userId: number; color: string }) => Promise<{ success: boolean }>;
    };
    updateRole: {
      useMutation: (opts?: any) => any;
      mutate: (input: { userId: number; familyId: number; role: 'admin' | 'member' }) => Promise<{ success: boolean }>;
    };
    remove: {
      useMutation: (opts?: any) => any;
      mutate: (input: { userId: number }) => Promise<{ success: boolean }>;
    };
    updateName: {
      useMutation: (opts?: any) => any;
      mutate: (input: { userId: number; name: string }) => Promise<{ success: boolean }>;
    };
    transferAdminRole: {
      useMutation: (opts?: any) => any;
      mutate: (input: { newAdminUserId: number; familyId: number }) => Promise<{ success: boolean }>;
    };
  };
  invitations: {
    list: {
      useQuery: (opts?: any) => any;
      query: () => Promise<Array<{ id: number; email: string; role: string; status: string; invitationCode: string; expiresAt: string }>>;
    };
    delete: {
      useMutation: (opts?: any) => any;
      mutate: (input: { invitationId: number }) => Promise<{ success: boolean }>;
    };
    update: {
      useMutation: (opts?: any) => any;
      mutate: (input: { invitationId: number; email: string; role?: 'admin' | 'member' }) => Promise<{ success: boolean }>;
    };
  };
  requests: {
    list: {
      query: (input: { familyId: number }) => Promise<Request[]>;
      useQuery: (input?: any, opts?: any) => { data: Request[]; isLoading: boolean; refetch: () => void };
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
  user: {
    me: {
      query: () => Promise<User>;
      useQuery: (opts?: any) => any;
    };
    updateName: {
      mutate: (input: { userId: number; name: string }) => Promise<{ success: boolean }>;
      useMutation: (opts?: any) => any;
    };
  };
  avatar: {
    getMyAvatar: {
      query: () => Promise<{ avatarType: string; avatarUrl: string | null; avatarValue: string | null }>;
      useQuery: (opts?: any) => any;
    };
    updateAvatar: {
      mutate: (input: { type: 'emoji' | 'icon' | 'initials'; value?: string }) => Promise<{ success: boolean }>;
      useMutation: (opts?: any) => any;
    };
    uploadAvatar: {
      mutate: (input: { imageData: string; mimeType: string }) => Promise<{ success: boolean; url: string }>;
      useMutation: (opts?: any) => any;
    };
    deleteAvatar: {
      mutate: () => Promise<{ success: boolean }>;
      useMutation: (opts?: any) => any;
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
  menstrual: {
    getSettings: {
      useQuery: (opts?: any) => any;
      query: () => Promise<MenstrualSettings | null>;
    };
    toggleFeature: {
      useMutation: (opts?: any) => any;
      mutate: (input: { enabled: boolean }) => Promise<void>;
    };
    updateSettings: {
      useMutation: (opts?: any) => any;
      mutate: (input: Partial<MenstrualSettings>) => Promise<void>;
    };
    createCycle: {
      useMutation: (opts?: any) => any;
      mutate: (input: {
        startDate: Date;
        endDate?: Date;
        notes?: string;
        symptoms?: string;
        mood?: 'great' | 'good' | 'neutral' | 'bad' | 'terrible';
        flowIntensity?: 'light' | 'medium' | 'heavy';
      }) => Promise<MenstrualCycle>;
    };
    getCycles: {
      useQuery: (input: { limit: number }, opts?: any) => any;
      query: (input: { limit: number }) => Promise<MenstrualCycle[]>;
    };
    updateCycle: {
      useMutation: (opts?: any) => any;
      mutate: (input: {
        cycleId: number;
        endDate?: Date;
        periodLength?: number;
        notes?: string;
        symptoms?: string;
        mood?: 'great' | 'good' | 'neutral' | 'bad' | 'terrible';
        flowIntensity?: 'light' | 'medium' | 'heavy';
      }) => Promise<void>;
    };
    deleteCycle: {
      useMutation: (opts?: any) => any;
      mutate: (input: { cycleId: number }) => Promise<void>;
    };
  };
  subscription: {
    checkAccess: {
      useQuery: (input: { familyId: number }, opts?: any) => {
        data: { hasPremium: boolean; isTrialActive: boolean; trialDaysRemaining: number; subscriptionType: string } | null | undefined;
        isLoading: boolean;
        refetch: () => void;
      };
    };
    createCheckout: {
      useMutation: (opts?: any) => {
        mutate: (input: { familyId: number; plan: 'MONTHLY' | 'YEARLY' }) => void;
        isLoading: boolean;
      };
    };
    createPortal: {
      useMutation: (opts?: any) => {
        mutate: (input: { familyId: number }) => void;
        isLoading: boolean;
      };
    };
    syncSubscription: {
      useMutation: (opts?: any) => {
        mutate: (input: { familyId: number }) => void;
        isLoading: boolean;
      };
    };
  };
  supportTickets: {
    createTicket: {
      useMutation: (opts?: any) => any;
      mutate: (input: {
        category: 'technique' | 'facturation' | 'fonctionnalite' | 'autre';
        subject: string;
        message: string;
      }) => Promise<{ id: number; ticketNumber: string }>;
      isPending: boolean;
    };
    listMyTickets: {
      useQuery: (input?: undefined, opts?: any) => {
        data: Array<{
          id: number;
          ticketNumber: string;
          subject: string;
          category: string;
          status: 'nouveau' | 'en_cours' | 'resolu' | 'ferme';
          createdAt: string;
        }>;
        isLoading: boolean;
        refetch: () => void;
      };
    };
  };
};

export interface MenstrualSettings {
  userId: number;
  isEnabled: number; // 0 or 1
  cycleDuration: number;
  periodDuration: number;
  lastPeriodDate?: string;
  notifyByEmail?: number;
  notifyByPush?: number;
  autoCreateEvents?: number;
}

export interface MenstrualCycle {
  id: number;
  userId: number;
  startDate: string;
  endDate?: string;
  cycleLength?: number;
  periodLength?: number;
  notes?: string;
  symptoms?: string;
  mood?: 'great' | 'good' | 'neutral' | 'bad' | 'terrible';
  flowIntensity?: 'light' | 'medium' | 'heavy';
  status?: 'early' | 'regular' | 'late';
  createdAt: string;
}
