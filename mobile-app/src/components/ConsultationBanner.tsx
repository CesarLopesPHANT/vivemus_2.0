import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Animated } from 'react-native';
import { useConsultation } from '../context/ConsultationContext';

interface ConsultationBannerProps {
  onPress: () => void;
}

const ConsultationBanner: React.FC<ConsultationBannerProps> = ({ onPress }) => {
  const { isActive } = useConsultation();
  const slideAnim = useRef(new Animated.Value(-60)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isActive) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();

      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      Animated.timing(slideAnim, {
        toValue: -60,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isActive, slideAnim, pulseAnim]);

  if (!isActive) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      <TouchableOpacity style={styles.banner} onPress={onPress} activeOpacity={0.8}>
        <View style={styles.iconContainer}>
          <Text style={styles.phoneIcon}>📞</Text>
          <Animated.View style={[styles.pulseDot, { opacity: pulseAnim }]} />
        </View>
        <Text style={styles.mainText}>Consulta em andamento</Text>
        <Text style={styles.subText}>Toque para voltar</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 60,
  },
  banner: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconContainer: {
    position: 'relative',
  },
  phoneIcon: {
    fontSize: 14,
  },
  pulseDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  mainText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  subText: {
    color: '#a7f3d0',
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 4,
  },
});

export default ConsultationBanner;
