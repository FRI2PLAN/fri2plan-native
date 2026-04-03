import React, { useRef, useEffect } from 'react';
import { FlatList, View, Dimensions, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CircularPagerProps {
  data: any[];
  renderItem: (item: any, index: number) => React.ReactElement;
  initialIndex?: number;
  onPageChange?: (index: number) => void;
}

/**
 * Circular horizontal pager using FlatList
 * Uses onMomentumScrollEnd for reliable page detection without flash/freeze
 */
export default function CircularPager({
  data,
  renderItem,
  initialIndex = 0,
  onPageChange,
}: CircularPagerProps) {
  const flatListRef = useRef<FlatList>(null);
  const currentIndexRef = useRef(initialIndex);
  const isJumping = useRef(false);

  // Duplicate data for circular effect: [last, ...data, first]
  const circularData = [
    data[data.length - 1], // Last item at the beginning (index 0)
    ...data,               // Original data (index 1..N)
    data[0],               // First item at the end (index N+1)
  ];

  // Initial scroll to correct position
  useEffect(() => {
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToIndex({
        index: initialIndex + 1,
        animated: false,
      });
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Listen to external page changes (from menu, favorites, etc.)
  useEffect(() => {
    if (currentIndexRef.current !== initialIndex) {
      isJumping.current = true;
      flatListRef.current?.scrollToIndex({
        index: initialIndex + 1,
        animated: false,
      });
      currentIndexRef.current = initialIndex;
      setTimeout(() => {
        isJumping.current = false;
      }, 100);
    }
  }, [initialIndex]);

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isJumping.current) return;

    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);

    if (index === 0) {
      // Swiped to the duplicated last item -> jump to real last item instantly
      isJumping.current = true;
      flatListRef.current?.scrollToIndex({
        index: data.length,
        animated: false,
      });
      currentIndexRef.current = data.length - 1;
      onPageChange?.(data.length - 1);
      setTimeout(() => { isJumping.current = false; }, 100);
    } else if (index === circularData.length - 1) {
      // Swiped to the duplicated first item -> jump to real first item instantly
      isJumping.current = true;
      flatListRef.current?.scrollToIndex({
        index: 1,
        animated: false,
      });
      currentIndexRef.current = 0;
      onPageChange?.(0);
      setTimeout(() => { isJumping.current = false; }, 100);
    } else {
      const realIndex = index - 1;
      currentIndexRef.current = realIndex;
      onPageChange?.(realIndex);
    }
  };

  const renderItemWrapper = ({ item, index }: { item: any; index: number }) => {
    let realIndex = index - 1;
    if (index === 0) realIndex = data.length - 1;
    if (index === circularData.length - 1) realIndex = 0;

    return (
      <View style={{ width: SCREEN_WIDTH }}>
        {renderItem(item, realIndex)}
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        ref={flatListRef}
        data={circularData}
        renderItem={renderItemWrapper}
        keyExtractor={(_, index) => `circular-${index}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        initialScrollIndex={initialIndex + 1}
        bounces={false}
        decelerationRate="fast"
        disableIntervalMomentum={true}
      />
    </View>
  );
}
