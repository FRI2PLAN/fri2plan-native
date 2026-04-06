import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Modal,
  TextInput, KeyboardAvoidingView, Platform, Pressable
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { trpc } from '../lib/trpc';

interface RewardsScreenProps {
  onNavigate?: (screen: string) => void;
  onPrevious?: () => void;
  onNext?: () => void;
}

const BADGE_METADATA: Record<string, { name: string; description: string; emoji: string; color: string }> = {
  first_task:      { name: "Première tâche",    description: "Complétez votre première tâche",                  emoji: "🏅", color: "#3b82f6" },
  tasks_10:        { name: "10 tâches",          description: "Complétez 10 tâches",                             emoji: "🎯", color: "#10b981" },
  tasks_50:        { name: "50 tâches",          description: "Complétez 50 tâches",                             emoji: "🏆", color: "#f59e0b" },
  tasks_100:       { name: "100 tâches",         description: "Complétez 100 tâches",                            emoji: "⭐", color: "#7c3aed" },
  member_of_month: { name: "Membre du mois",     description: "Ayez le plus de points ce mois-ci",              emoji: "👑", color: "#f97316" },
  perfect_week:    { name: "Semaine parfaite",   description: "Complétez toutes vos tâches 7 jours de suite",   emoji: "🌟", color: "#ec4899" },
  early_bird:      { name: "Lève-tôt",           description: "Complétez une tâche avant 8h du matin",          emoji: "🌅", color: "#f59e0b" },
  team_player:     { name: "Joueur d'équipe",    description: "Aidez 5 membres différents de votre famille",    emoji: "🤝", color: "#14b8a6" },
};

const ICON_EMOJIS: Record<string, string> = { gift: "🎁", trophy: "🏆", star: "⭐", sparkles: "✨" };

export default function RewardsScreen({ onNavigate, onPrevious, onNext }: RewardsScreenProps) {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const styles = getStyles(isDark);
  const isAdmin = user?.role === "admin";

  const [activeTab, setActiveTab] = useState<"catalog" | "badges" | "history" | "admin">("catalog");
  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPoints, setFormPoints] = useState("10");
  const [formIcon, setFormIcon] = useState("gift");

  const { data: families } = trpc.family.list.useQuery();
  const activeFamilyId = (families as any[])?.[0]?.id || 0;

  const { data: myPoints } = trpc.rewards.myPoints.useQuery(
    { familyId: activeFamilyId }, { enabled: !!activeFamilyId }
  );
  const { data: familyPointsRaw = [] } = trpc.rewards.familyPoints.useQuery(
    { familyId: activeFamilyId }, { enabled: !!activeFamilyId }
  );
  // Toujours trier par points décroissants côté client (sécurité en cas de backend non trié)
  const familyPoints = [...(familyPointsRaw as any[])].sort((a: any, b: any) => (b.totalPoints || 0) - (a.totalPoints || 0));
  const { data: rewards = [], isLoading: rewardsLoading } = trpc.rewards.list.useQuery(
    { familyId: activeFamilyId }, { enabled: !!activeFamilyId }
  );
  const { data: myBadges = [] } = trpc.badges.myBadges.useQuery();
  const { data: earnedRewards = [] } = trpc.rewards.myEarnedRewards.useQuery();
  const { data: myClaims = [] } = trpc.rewardClaims.listByUser.useQuery();
  const { data: pendingClaims = [] } = trpc.rewardClaims.listPending.useQuery(
    { familyId: activeFamilyId }, { enabled: !!activeFamilyId && isAdmin }
  );
  const { data: userStats } = trpc.tasks.statistics.useQuery();

  const utils = trpc.useUtils();

  const claimMutation = trpc.rewardClaims.claim.useMutation({
    onSuccess: () => {
      utils.rewardClaims.listByUser.invalidate();
      utils.rewards.list.invalidate();
      Alert.alert("✅", "Réclamation envoyée ! En attente d'approbation.");
    },
    onError: (e: any) => Alert.alert("Erreur", e.message || "Erreur lors de la réclamation")
  });
  const approveMutation = trpc.rewardClaims.approve.useMutation({
    onSuccess: () => {
      utils.rewardClaims.listPending.invalidate();
      utils.badges.myBadges.invalidate();
      utils.rewards.familyPoints.invalidate();
      utils.rewards.myEarnedRewards.invalidate();
      Alert.alert("🎉", "Réclamation approuvée !");
    },
    onError: (e: any) => Alert.alert("Erreur", e.message || "Erreur")
  });
  const rejectMutation = trpc.rewardClaims.reject.useMutation({
    onSuccess: () => { utils.rewardClaims.listPending.invalidate(); Alert.alert("✅", "Réclamation rejetée."); },
    onError: (e: any) => Alert.alert("Erreur", e.message || "Erreur")
  });
  const createMutation = trpc.rewards.create.useMutation({
    onSuccess: () => {
      utils.rewards.list.invalidate();
      setCreateOpen(false);
      setFormName(""); setFormDesc(""); setFormPoints("10"); setFormIcon("gift");
      Alert.alert("✅", "Récompense créée !");
    },
    onError: (e: any) => Alert.alert("Erreur", e.message || "Erreur")
  });
  const deleteMutation = trpc.rewards.delete.useMutation({
    onSuccess: () => { utils.rewards.list.invalidate(); Alert.alert("✅", "Récompense supprimée."); },
    onError: (e: any) => Alert.alert("Erreur", e.message || "Erreur")
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      utils.rewards.list.invalidate(),
      utils.badges.myBadges.invalidate(),
      utils.rewards.myEarnedRewards.invalidate(),
      utils.rewards.myPoints.invalidate(),
      utils.rewardClaims.listByUser.invalidate(),
    ]);
    setRefreshing(false);
  };

  const handleClaim = (rewardId: number, rewardName: string) => {
    Alert.alert("Réclamer", `Réclamer "${rewardName}" ?`, [
      { text: "Annuler", style: "cancel" },
      { text: "Réclamer", onPress: () => claimMutation.mutate({ rewardId, familyId: activeFamilyId }) }
    ]);
  };

  const handleDelete = (rewardId: number) => {
    Alert.alert("Supprimer", "Supprimer cette récompense ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: () => deleteMutation.mutate({ rewardId }) }
    ]);
  };

  const handleCreate = () => {
    if (!formName.trim()) { Alert.alert("Erreur", "Le nom est requis"); return; }
    createMutation.mutate({
      name: formName.trim(),
      description: formDesc.trim() || undefined,
      pointsCost: parseInt(formPoints) || 10,
      icon: formIcon,
    });
  };

  const getTaskProgress = (badgeType: string) => {
    const completed = (userStats as any)?.totalCompleted ?? 0;
    switch (badgeType) {
      case "first_task": return { current: Math.min(completed, 1), target: 1 };
      case "tasks_10":   return { current: Math.min(completed, 10), target: 10 };
      case "tasks_50":   return { current: Math.min(completed, 50), target: 50 };
      case "tasks_100":  return { current: Math.min(completed, 100), target: 100 };
      default: return null;
    }
  };

  const systemBadges = (myBadges as any[]).filter(b => b.badgeType !== "reward");
  const earnedBadgeTypes = new Set(systemBadges.map((b: any) => b.badgeType));
  const allBadgeTypes = Object.keys(BADGE_METADATA);
  const sortedBadgeTypes = [
    ...allBadgeTypes.filter(t => earnedBadgeTypes.has(t)),
    ...allBadgeTypes.filter(t => !earnedBadgeTypes.has(t)),
  ];
  const claimedRewardIds = new Set((myClaims as any[]).filter((c: any) => c.status === "pending").map((c: any) => c.rewardId));

  const tabs = [
    { key: "catalog", label: "🎁 Catalogue" },
    { key: "badges",  label: "🏅 Badges" },
    { key: "history", label: "📜 Historique" },
    ...(isAdmin ? [{ key: "admin", label: "⚙️ Admin" }] : []),
  ] as const;

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Titre centré */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>🎁 Récompenses</Text>
      </View>

      {/* Carte points + classement */}
      <View style={styles.pointsCard}>
        <View style={styles.pointsRow}>
          <View>
            <Text style={styles.pointsLabel}>Mes points</Text>
            <Text style={styles.pointsValue}>⭐ {(myPoints as any)?.totalPoints ?? 0} pts</Text>
          </View>
          <View style={styles.rankBadge}>
            <Text style={styles.rankText}>
              #{(() => {
                const idx = (familyPoints as any[]).findIndex((m: any) => m.userId === user?.id);
                return idx >= 0 ? idx + 1 : "—";
              })()}
            </Text>
            <Text style={styles.rankLabel}>classement</Text>
          </View>
        </View>
        {(familyPoints as any[]).length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(familyPoints as any[]).slice(0, 5).map((m: any, i: number) => (
                <View key={m.userId} style={[styles.familyRankItem, m.userId === user?.id && styles.familyRankItemMe]}>
                  <Text style={styles.familyRankPos}>{i + 1}</Text>
                  <Text style={styles.familyRankName} numberOfLines={1}>{m.userName || "?"}</Text>
                  <Text style={styles.familyRankPts}>{m.totalPoints} pts</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </View>

      {/* Onglets */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRow} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
        {tabs.map(tab => (
          <TouchableOpacity key={tab.key} style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]} onPress={() => setActiveTab(tab.key as any)}>
            <Text style={[styles.tabBtnText, activeTab === tab.key && styles.tabBtnTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Contenu */}
      <ScrollView style={styles.content} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>

        {/* CATALOGUE */}
        {activeTab === "catalog" && (
          <>
            {isAdmin && (
              <TouchableOpacity style={styles.createBtn} onPress={() => setCreateOpen(true)}>
                <Text style={styles.createBtnText}>+ Nouvelle récompense</Text>
              </TouchableOpacity>
            )}
            {rewardsLoading ? (
              <ActivityIndicator size="large" color="#7c3aed" style={{ marginTop: 40 }} />
            ) : (rewards as any[]).length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🎁</Text>
                <Text style={styles.emptyText}>Aucune récompense disponible</Text>
                <Text style={styles.emptySubtext}>Les récompenses sont créées par les parents</Text>
              </View>
            ) : (
              (rewards as any[]).map((reward: any) => {
                const canAfford = ((myPoints as any)?.totalPoints ?? 0) >= reward.pointsCost;
                const alreadyClaimed = claimedRewardIds.has(reward.id);
                return (
                  <View key={reward.id} style={styles.rewardCard}>
                    <View style={styles.rewardIconBox}>
                      <Text style={styles.rewardIconText}>{ICON_EMOJIS[reward.icon || "gift"] || "🎁"}</Text>
                    </View>
                    <View style={styles.rewardBody}>
                      <Text style={styles.rewardName}>{reward.name || reward.title}</Text>
                      {reward.description ? <Text style={styles.rewardDesc}>{reward.description}</Text> : null}
                      <View style={styles.rewardFooter}>
                        <View style={styles.rewardPtsBadge}>
                          <Text style={styles.rewardPtsText}>⭐ {reward.pointsCost} pts</Text>
                        </View>
                        {isAdmin ? (
                          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(reward.id)}>
                            <Text style={styles.deleteBtnText}>🗑️</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={[styles.claimBtn, (!canAfford || alreadyClaimed) && styles.claimBtnDisabled]}
                            onPress={() => handleClaim(reward.id, reward.name || reward.title)}
                            disabled={!canAfford || alreadyClaimed || claimMutation.isLoading}
                          >
                            <Text style={styles.claimBtnText}>
                              {alreadyClaimed ? "En attente" : canAfford ? "Réclamer" : "Insuffisant"}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}

        {/* BADGES */}
        {activeTab === "badges" && (
          <>
            <Text style={styles.sectionTitle}>{earnedBadgeTypes.size} / {allBadgeTypes.length} badges obtenus</Text>
            {sortedBadgeTypes.map(badgeType => {
              const meta = BADGE_METADATA[badgeType];
              const earned = earnedBadgeTypes.has(badgeType);
              const progress = getTaskProgress(badgeType);
              return (
                <View key={badgeType} style={[styles.badgeCard, !earned && styles.badgeCardLocked]}>
                  <View style={[styles.badgeIconBox, { backgroundColor: earned ? meta.color + "22" : isDark ? "#374151" : "#f3f4f6" }]}>
                    <Text style={[styles.badgeEmoji, !earned && styles.badgeEmojiLocked]}>{meta.emoji}</Text>
                  </View>
                  <View style={styles.badgeBody}>
                    <Text style={[styles.badgeName, !earned && styles.badgeNameLocked]}>{meta.name}</Text>
                    <Text style={styles.badgeDesc}>{meta.description}</Text>
                    {progress && !earned && (
                      <View style={styles.progressRow}>
                        <View style={styles.progressBar}>
                          <View style={[styles.progressFill, { width: `${(progress.current / progress.target) * 100}%` as any, backgroundColor: meta.color }]} />
                        </View>
                        <Text style={styles.progressText}>{progress.current}/{progress.target}</Text>
                      </View>
                    )}
                    {earned && <Text style={[styles.earnedLabel, { color: meta.color }]}>✓ Obtenu</Text>}
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* HISTORIQUE */}
        {activeTab === "history" && (
          <>
            <Text style={styles.sectionTitle}>Mes récompenses obtenues</Text>
            {(earnedRewards as any[]).filter((er: any) => er.pointsEarned < 0).length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>📜</Text>
                <Text style={styles.emptyText}>Aucune récompense obtenue</Text>
              </View>
            ) : (
              (earnedRewards as any[]).filter((er: any) => er.pointsEarned < 0).map((earned: any) => (
                <View key={earned.id} style={styles.historyCard}>
                  <View style={styles.historyIconBox}>
                    <Text style={styles.historyIcon}>{ICON_EMOJIS[earned.rewardIcon || "gift"] || "🎁"}</Text>
                  </View>
                  <View style={styles.historyBody}>
                    <Text style={styles.historyName}>{earned.rewardName}</Text>
                    <Text style={styles.historyDate}>
                      {new Date(earned.earnedAt).toLocaleDateString("fr-FR")}
                      {earned.approvedByName ? ` · Approuvé par ${earned.approvedByName}` : ""}
                    </Text>
                  </View>
                  <Text style={styles.historyPts}>{earned.pointsEarned} pts</Text>
                </View>
              ))
            )}
          </>
        )}

        {/* ADMIN */}
        {activeTab === "admin" && isAdmin && (
          <>
            <Text style={styles.sectionTitle}>Réclamations en attente ({(pendingClaims as any[]).length})</Text>
            {(pendingClaims as any[]).length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>✅</Text>
                <Text style={styles.emptyText}>Aucune réclamation en attente</Text>
              </View>
            ) : (
              (pendingClaims as any[]).map((claim: any) => (
                <View key={claim.id} style={styles.claimCard}>
                  <View style={styles.claimBody}>
                    <Text style={styles.claimUser}>👤 {claim.userName || "Membre"}</Text>
                    <Text style={styles.claimReward}>🎁 {claim.rewardName}</Text>
                    <Text style={styles.claimDate}>{new Date(claim.createdAt).toLocaleDateString("fr-FR")}</Text>
                  </View>
                  <View style={styles.claimActions}>
                    <TouchableOpacity style={styles.approveBtn} onPress={() => approveMutation.mutate({ claimId: claim.id })} disabled={approveMutation.isLoading}>
                      <Text style={styles.approveBtnText}>✅</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectMutation.mutate({ claimId: claim.id })} disabled={rejectMutation.isLoading}>
                      <Text style={styles.rejectBtnText}>❌</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Modal création récompense */}
      <Modal visible={createOpen} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setCreateOpen(false)} />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nouvelle récompense</Text>
            <Text style={styles.fieldLabel}>Nom *</Text>
            <TextInput style={styles.input} value={formName} onChangeText={setFormName} placeholder="Ex: Sortie cinéma" placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"} />
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput style={[styles.input, { height: 80, textAlignVertical: "top" }]} value={formDesc} onChangeText={setFormDesc} placeholder="Détails..." placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"} multiline />
            <Text style={styles.fieldLabel}>Coût en points *</Text>
            <TextInput style={styles.input} value={formPoints} onChangeText={setFormPoints} keyboardType="numeric" placeholder="10" placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"} />
            <Text style={styles.fieldLabel}>Icône</Text>
            <View style={styles.iconRow}>
              {Object.entries(ICON_EMOJIS).map(([key, emoji]) => (
                <TouchableOpacity key={key} style={[styles.iconBtn, formIcon === key && styles.iconBtnActive]} onPress={() => setFormIcon(key)}>
                  <Text style={styles.iconBtnText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setCreateOpen(false)}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreate} disabled={createMutation.isLoading}>
                <Text style={styles.saveBtnText}>{createMutation.isLoading ? "..." : "Créer"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const getStyles = (isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? "#111827" : "#f9fafb" },
  header: { alignItems: "center", paddingTop: 16, paddingBottom: 8 },
  pageTitle: { fontSize: 26, fontWeight: "800", color: isDark ? "#fff" : "#111827", textAlign: "center" },
  pointsCard: { backgroundColor: "#7c3aed", marginHorizontal: 16, marginBottom: 8, borderRadius: 16, padding: 16 },
  pointsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  pointsLabel: { fontSize: 13, color: "#e9d5ff", marginBottom: 2 },
  pointsValue: { fontSize: 22, fontWeight: "800", color: "#fff" },
  rankBadge: { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 12, padding: 10, alignItems: "center" },
  rankText: { fontSize: 20, fontWeight: "800", color: "#fff" },
  rankLabel: { fontSize: 11, color: "#e9d5ff" },
  familyRankItem: { backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10, padding: 8, alignItems: "center", minWidth: 70 },
  familyRankItemMe: { backgroundColor: "rgba(255,255,255,0.35)" },
  familyRankPos: { fontSize: 16, fontWeight: "700", color: "#fff" },
  familyRankName: { fontSize: 11, color: "#e9d5ff", maxWidth: 60 },
  familyRankPts: { fontSize: 11, fontWeight: "600", color: "#fff" },
  tabsRow: { maxHeight: 52 },
  tabBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: isDark ? "#1f2937" : "#fff", borderWidth: 1, borderColor: isDark ? "#374151" : "#e5e7eb" },
  tabBtnActive: { backgroundColor: "#7c3aed", borderColor: "#7c3aed" },
  tabBtnText: { fontSize: 13, fontWeight: "600", color: isDark ? "#d1d5db" : "#374151" },
  tabBtnTextActive: { color: "#fff" },
  content: { flex: 1 },
  createBtn: { backgroundColor: "#7c3aed", borderRadius: 12, padding: 14, alignItems: "center", marginBottom: 16 },
  createBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: isDark ? "#d1d5db" : "#374151", marginBottom: 12 },
  rewardCard: { flexDirection: "row", backgroundColor: isDark ? "#1f2937" : "#fff", borderRadius: 16, padding: 14, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  rewardIconBox: { width: 52, height: 52, borderRadius: 26, backgroundColor: isDark ? "#374151" : "#f3f4f6", alignItems: "center", justifyContent: "center", marginRight: 12 },
  rewardIconText: { fontSize: 28 },
  rewardBody: { flex: 1 },
  rewardName: { fontSize: 16, fontWeight: "700", color: isDark ? "#fff" : "#111827", marginBottom: 2 },
  rewardDesc: { fontSize: 13, color: isDark ? "#9ca3af" : "#6b7280", marginBottom: 8 },
  rewardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rewardPtsBadge: { backgroundColor: isDark ? "#374151" : "#fef3c7", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  rewardPtsText: { fontSize: 13, fontWeight: "600", color: isDark ? "#fbbf24" : "#92400e" },
  claimBtn: { backgroundColor: "#7c3aed", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  claimBtnDisabled: { backgroundColor: isDark ? "#374151" : "#d1d5db" },
  claimBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  deleteBtn: { padding: 8 },
  deleteBtnText: { fontSize: 18 },
  badgeCard: { flexDirection: "row", backgroundColor: isDark ? "#1f2937" : "#fff", borderRadius: 14, padding: 14, marginBottom: 10, alignItems: "center" },
  badgeCardLocked: { opacity: 0.6 },
  badgeIconBox: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginRight: 12 },
  badgeEmoji: { fontSize: 26 },
  badgeEmojiLocked: { opacity: 0.4 },
  badgeBody: { flex: 1 },
  badgeName: { fontSize: 15, fontWeight: "700", color: isDark ? "#fff" : "#111827" },
  badgeNameLocked: { color: isDark ? "#6b7280" : "#9ca3af" },
  badgeDesc: { fontSize: 12, color: isDark ? "#9ca3af" : "#6b7280", marginTop: 2 },
  earnedLabel: { fontSize: 12, fontWeight: "700", marginTop: 4 },
  progressRow: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 8 },
  progressBar: { flex: 1, height: 6, backgroundColor: isDark ? "#374151" : "#e5e7eb", borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3 },
  progressText: { fontSize: 11, color: isDark ? "#9ca3af" : "#6b7280", minWidth: 36 },
  historyCard: { flexDirection: "row", backgroundColor: isDark ? "#1f2937" : "#fff", borderRadius: 14, padding: 12, marginBottom: 10, alignItems: "center" },
  historyIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? "#374151" : "#d1fae5", alignItems: "center", justifyContent: "center", marginRight: 12 },
  historyIcon: { fontSize: 20 },
  historyBody: { flex: 1 },
  historyName: { fontSize: 14, fontWeight: "700", color: isDark ? "#fff" : "#111827" },
  historyDate: { fontSize: 12, color: isDark ? "#9ca3af" : "#6b7280", marginTop: 2 },
  historyPts: { fontSize: 13, fontWeight: "700", color: "#ef4444" },
  claimCard: { flexDirection: "row", backgroundColor: isDark ? "#1f2937" : "#fff", borderRadius: 14, padding: 14, marginBottom: 10, alignItems: "center" },
  claimBody: { flex: 1 },
  claimUser: { fontSize: 14, fontWeight: "700", color: isDark ? "#fff" : "#111827" },
  claimReward: { fontSize: 13, color: isDark ? "#d1d5db" : "#374151", marginTop: 2 },
  claimDate: { fontSize: 11, color: isDark ? "#9ca3af" : "#6b7280", marginTop: 2 },
  claimActions: { flexDirection: "row", gap: 8 },
  approveBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#d1fae5", alignItems: "center", justifyContent: "center" },
  approveBtnText: { fontSize: 18 },
  rejectBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#fee2e2", alignItems: "center", justifyContent: "center" },
  rejectBtnText: { fontSize: 18 },
  empty: { alignItems: "center", paddingVertical: 48 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: "600", color: isDark ? "#d1d5db" : "#374151", marginBottom: 6 },
  emptySubtext: { fontSize: 13, color: isDark ? "#9ca3af" : "#6b7280", textAlign: "center" },
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { backgroundColor: isDark ? "#1f2937" : "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: isDark ? "#fff" : "#111827", marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: isDark ? "#d1d5db" : "#374151", marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: isDark ? "#374151" : "#f9fafb", borderRadius: 10, padding: 12, fontSize: 15, color: isDark ? "#fff" : "#111827", borderWidth: 1, borderColor: isDark ? "#4b5563" : "#e5e7eb" },
  iconRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  iconBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: isDark ? "#374151" : "#f3f4f6", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "transparent" },
  iconBtnActive: { borderColor: "#7c3aed" },
  iconBtnText: { fontSize: 24 },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: isDark ? "#374151" : "#f3f4f6", alignItems: "center" },
  cancelBtnText: { fontSize: 15, fontWeight: "600", color: isDark ? "#d1d5db" : "#374151" },
  saveBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "#7c3aed", alignItems: "center" },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
