import React, { useRef, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import PagerView from 'react-native-pager-view';
import { useNavigation, useNavigationState } from '@react-navigation/native';

interface PagerNavigatorProps {
  children: React.ReactNode[];
  screens: string[];
}

export default function PagerNavigator({ children, screens }: PagerNavigatorProps) {
  const pagerRef = useRef<PagerView>(null);
  const navigation = useNavigation();
  
  // Get current route name from navigation state
  const currentRouteName = useNavigationState(state => 
    state.routes[state.index]?.name
  );

  // Sync PagerView with navigation
  useEffect(() => {
    const currentIndex = screens.indexOf(currentRouteName);
    if (currentIndex !== -1 && pagerRef.current) {
      pagerRef.current.setPage(currentIndex);
    }
  }, [currentRouteName, screens]);

  // Handle page change from swipe
  const handlePageSelected = (e: any) => {
    const newIndex = e.nativeEvent.position;
    const newScreen = screens[newIndex];
    
    // Only navigate if different from current
    if (newScreen && newScreen !== currentRouteName) {
      navigation.navigate(newScreen as never);
    }
  };

  return (
    <PagerView
      ref={pagerRef}
      style={styles.pager}
      initialPage={screens.indexOf(currentRouteName) || 0}
      onPageSelected={handlePageSelected}
      overdrag={true}
      offscreenPageLimit={1} // Keep adjacent pages in memory for smooth swipe
    >
      {children}
    </PagerView>
  );
}

const styles = StyleSheet.create({
  pager: {
    flex: 1,
  },
});
