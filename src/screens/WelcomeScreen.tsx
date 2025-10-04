/**
 * Welcome Screen
 * 
 * Entry point for unauthenticated users
 * Based on UI design reference: UI/Welcome/code.html
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {COLORS} from '@/constants/colors';
import {RootStackParamList} from '@/types';

type WelcomeScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Welcome'
>;

const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<WelcomeScreenNavigationProp>();

  const handleGetStarted = () => {
    navigation.navigate('Authentication');
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[COLORS.primaryLight, COLORS.primary]}
        style={styles.gradient}>
        <View style={styles.content}>
          {/* Logo/Icon */}
          <View style={styles.logoContainer}>
            <Icon name="psychology" size={80} color={COLORS.white} />
            <Text style={styles.logoText}>RAG Showcase</Text>
          </View>

          {/* Main content */}
          <View style={styles.textContainer}>
            <Text style={styles.title}>
              Compare RAG Techniques
            </Text>
            <Text style={styles.subtitle}>
              Explore and analyze different Retrieval-Augmented Generation approaches
              to understand their strengths and use cases.
            </Text>
          </View>

          {/* Features list */}
          <View style={styles.featuresContainer}>
            <View style={styles.feature}>
              <Icon name="search" size={24} color={COLORS.white} />
              <Text style={styles.featureText}>5 Production RAG Techniques</Text>
            </View>
            <View style={styles.feature}>
              <Icon name="compare" size={24} color={COLORS.white} />
              <Text style={styles.featureText}>Side-by-Side Comparison</Text>
            </View>
            <View style={styles.feature}>
              <Icon name="insights" size={24} color={COLORS.white} />
              <Text style={styles.featureText}>Detailed Analytics</Text>
            </View>
          </View>

          {/* CTA Button */}
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleGetStarted}
            activeOpacity={0.8}>
            <Text style={styles.ctaButtonText}>Get Started</Text>
            <Icon name="arrow-forward" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: 16,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.white,
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 24,
  },
  featuresContainer: {
    marginVertical: 32,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureText: {
    fontSize: 16,
    color: COLORS.white,
    marginLeft: 16,
  },
  ctaButton: {
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 32,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
    marginRight: 8,
  },
});

export default WelcomeScreen;
