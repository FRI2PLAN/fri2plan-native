import React, { useRef, useEffect, useState } from 'react';
import { FlatList, View, Dimensions, NativeScrollEvent, NativeSyntheticEvent, Animated } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CircularPagerProps {
  data: any[];
  renderItem: (item: any, index: number) => React.ReactElement;
  initialIndex?: number;
  onPageChange?: (index: number) => void;
}

/**
 * Circular horizontal pager using FlatList
 * Supports infinite circular scrolling with vertical scroll compatibility
 */
export default function CircularPager({
  data,
  renderItem,
  initialIndex = 0,
  onPageChange,
}: CircularPagerProps) {
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const isScrolling = useRef(false);
  const fadeAnim = useRef(new Animated.Value(0)).current; // 0 = transparent, 1 = opaque

  // Duplicate data for circular effect: [last, ...data, first]
  // Example: [A, B, C] becomes [C, A, B, C, A]
  const circularData = [
    data[data.length - 1], // Last item at the beginning
    ...data,               // Original data
    data[0],               // First item at the end
  ];

  // Initial scroll to correct position (skip the duplicated last item)
  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({
        index: initialIndex + 1, // +1 because of the duplicated last item
        animated: false,
      });
    }, 100);
  }, []);

  // Listen to external page changes (from menu, favorites, widgets, etc.)
  useEffect(() => {
    if (currentIndex !== initialIndex) {
      // Fade out (masquer le défilement)
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        // Scroll pendant que c'est masqué
        flatListRef.current?.scrollToIndex({
          index: initialIndex + 1,
          animated: false, // Pas d'animation car masqué
        });
        setCurrentIndex(initialIndex);
        
        // Fade in (révéler la nouvelle page)
        setTimeout(() => {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }).start();
        }, 50);
      });
    }
  }, [initialIndex]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!isScrolling.current) return;

    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);

    // Handle circular logic
    if (index === 0) {
      // Scrolled to the duplicated last item → Jump to real last item
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: data.length, // Real last item position
          animated: false,
        });
      }, 50);
      setCurrentIndex(data.length - 1);
      onPageChange?.(data.length - 1);
    } else if (index === circularData.length - 1) {
      // Scrolled to the duplicated first item → Jump to real first item
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: 1, // Real first item position
          animated: false,
        });
      }, 50);
      setCurrentIndex(0);
      onPageChange?.(0);
    } else {
      // Normal scroll
      const realIndex = index - 1; // -1 because of the duplicated last item at the beginning
      setCurrentIndex(realIndex);
      onPageChange?.(realIndex);
    }
  };

  const handleScrollBeginDrag = () => {
    isScrolling.current = true;
  };

  const handleScrollEndDrag = () => {
    isScrolling.current = false;
  };

  const renderItemWrapper = ({ item, index }: { item: any; index: number }) => {
    // Calculate real index (accounting for duplicated items)
    let realIndex = index - 1;
    if (index === 0) realIndex = data.length - 1; // Duplicated last item
    if (index === circularData.length - 1) realIndex = 0; // Duplicated first item

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
        keyExtractor={(item, index) => `circular-${index}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={16}
        getItemLayout={(data, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        initialScrollIndex={initialIndex + 1} // +1 for duplicated last item
        bounces={false}
        decelerationRate="fast"
      />
      
      {/* Fade overlay to hide rapid scrolling */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#000',
          opacity: fadeAnim,
        }}
      />
    </View>
  );
}
