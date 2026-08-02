import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface MemberAvatarProps {
  member: {
    name?: string;
    userColor?: string;
    avatarType?: string;
    avatarUrl?: string;
    avatarValue?: string;
  } | null | undefined;
  size?: number;
}

/**
 * Affiche l'avatar d'un membre de la famille.
 * - avatarType === 'upload' : affiche avatarUrl (image)
 * - avatarType === 'emoji' | 'icon' : affiche avatarValue (emoji/icône)
 * - avatarType === 'initials' (défaut) : affiche la première lettre du nom
 */
const MemberAvatar: React.FC<MemberAvatarProps> = ({ member, size = 18 }) => {
  if (!member) return null;

  const color = member.userColor || '#8B5CF6';
  const fontSize = Math.round(size * 0.5);

  if (member.avatarType === 'upload' && member.avatarUrl) {
    return (
      <Image
        source={{ uri: member.avatarUrl }}
        style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, borderColor: color }]}
      />
    );
  }

  const isEmoji = member.avatarType === 'emoji' || member.avatarType === 'icon';
  const display = isEmoji
    ? (member.avatarValue || '👤')
    : (member.name?.charAt(0).toUpperCase() || '?');

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: isEmoji ? 'transparent' : color,
          borderColor: color,
        },
      ]}
    >
      <Text style={[styles.text, { fontSize, color: isEmoji ? undefined : '#fff' }]}>
        {display}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  text: {
    fontWeight: '700',
    lineHeight: undefined,
  },
});

export default MemberAvatar;
