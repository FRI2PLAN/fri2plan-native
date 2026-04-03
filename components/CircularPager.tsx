import React, { useRef, useEffect, useCallback } from 'react';
import { View, Dimensions } from 'react-native';
import PagerView from 'react-native-pager-view';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CircularPagerProps {
  data: any[];
  renderItem: (item: any, index: number) => React.ReactElement;
  initialIndex?: number;
  onPageChange?: (index: number) => void;
}

/**
 * Circular horizontal pager using react-native-pager-view (100% native)
 * Layout: [last, page0, page1, ..., pageN, first]
 * When user lands on index 0 (clone of last) -> jump to real last (data.length)
 * When user lands on index N+1 (clone of first) -> jump to real first (1)
 */
export default function CircularPager({
  data,
  renderItem,
  initialIndex = 0,
  onPageChange,
}: CircularPagerProps) {
  const pagerRef = useRef<PagerView>(null);
  const currentRealIndex = useRef(initialIndex);
  const isJumping = useRef(false);

  // Build circular pages: [clone_last, ...data, clone_first]
  const circularPages = [
    data[data.length - 1], // index 0 — clone of last
    ...data,               // index 1..N — real pages
    data[0],               // index N+1 — clone of first
  ];

  // Set initial position (real page = initialIndex + 1)
  useEffect(() => {
    const timer = setTimeout(() => {
      pagerRef.current?.setPageWithoutAnimation(initialIndex + 1);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // React to external navigation (menu, favorites, shortcuts)
  useEffect(() => {
    if (currentRealIndex.current !== initialIndex) {
      isJumping.current = true;
      pagerRef.current?.setPageWithoutAnimation(initialIndex + 1);
      currentRealIndex.current = initialIndex;
      setTimeout(() => { isJumping.current = false; }, 100);
    }
  }, [initialIndex]);

  const handlePageSelected = useCallback((e: any) => {
    if (isJumping.current) return;

    const pos = e.nativeEvent.position;
    const lastCloneIndex = circularPages.length - 1; // N+1

    if (pos === 0) {
      // Landed on clone of last -> jump to real last
      isJumping.current = true;
      const realLast = data.length; // position in circularPages
      pagerRef.current?.setPageWithoutAnimation(realLast);
      currentRealIndex.current = data.length - 1;
      onPageChange?.(data.length - 1);
      setTimeout(() => { isJumping.current = false; }, 100);
    } else if (pos === lastCloneIndex) {
      // Landed on clone of first -> jump to real first
      isJumping.current = true;
      pagerRef.current?.setPageWithoutAnimation(1);
      currentRealIndex.current = 0;
      onPageChange?.(0);
      setTimeout(() => { isJumping.current = false; }, 100);
    } else {
      const realIndex = pos - 1;
      currentRealIndex.current = realIndex;
      onPageChange?.(realIndex);
    }
  }, [data.length, onPageChange]);

  return (
    <PagerView
      ref={pagerRef}
      style={{ flex: 1 }}
      initialPage={initialIndex + 1}
      onPageSelected={handlePageSelected}
      overdrag={false}
    >
      {circularPages.map((item, index) => {
        // Compute real data index for rendering
        let realIndex = index - 1;
        if (index === 0) realIndex = data.length - 1;
        if (index === circularPages.length - 1) realIndex = 0;

        return (
          <View key={`pager-${index}`} style={{ flex: 1, width: SCREEN_WIDTH }}>
            {renderItem(item, realIndex)}
          </View>
        );
      })}
    </PagerView>
  );
}
