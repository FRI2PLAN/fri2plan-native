import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Swiper from 'react-native-deck-swiper';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PageDeckSwiperProps {
  pages: React.ReactNode[];
  currentIndex: number;
  onPageChange: (index: number) => void;
}

export default function PageDeckSwiper({ pages, currentIndex, onPageChange }: PageDeckSwiperProps) {
  const swiperRef = useRef<any>(null);
  const totalPages = pages.length;

  // Créer un deck circulaire infini en dupliquant les pages
  const infinitePages = [...pages, ...pages, ...pages]; // 3 copies pour swipe infini
  const startIndex = totalPages + currentIndex; // Commencer au milieu

  const handleSwipedLeft = (cardIndex: number) => {
    // Swipe gauche = page suivante
    const realIndex = cardIndex % totalPages;
    const nextIndex = (realIndex + 1) % totalPages;
    onPageChange(nextIndex);
  };

  const handleSwipedRight = (cardIndex: number) => {
    // Swipe droite = page précédente
    const realIndex = cardIndex % totalPages;
    const prevIndex = (realIndex - 1 + totalPages) % totalPages;
    onPageChange(prevIndex);
  };

  const renderCard = (card: React.ReactNode, index: number) => {
    return (
      <View style={styles.card} key={index}>
        {card}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Swiper
        ref={swiperRef}
        cards={infinitePages}
        renderCard={renderCard}
        onSwipedLeft={handleSwipedLeft}
        onSwipedRight={handleSwipedRight}
        cardIndex={startIndex}
        backgroundColor="transparent"
        stackSize={3}
        stackSeparation={0}
        stackScale={0}
        disableBottomSwipe
        disableTopSwipe
        verticalSwipe={false}
        horizontalSwipe={true}
        infinite
        animateCardOpacity
        animateOverlayLabelsOpacity
        overlayLabels={{
          left: { element: <View />, style: { wrapper: { display: 'none' } } },
          right: { element: <View />, style: { wrapper: { display: 'none' } } },
        }}
        cardStyle={styles.cardStyle}
        containerStyle={styles.swiperContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  swiperContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  card: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#fff',
  },
  cardStyle: {
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
});
