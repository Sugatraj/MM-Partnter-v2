import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';
import { FontAwesome6 } from "@expo/vector-icons";
import { APP_VERSION } from '../apiConfig';

const SocialFooter = () => {
  return (
    <View style={styles.footer}>
      <View style={styles.socialContainer}>
        <TouchableOpacity
          onPress={() => Linking.openURL("https://www.facebook.com/people/Menu-Mitra/61565082412478/")}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <FontAwesome6 name="facebook" size={24} color="#1877F2" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => Linking.openURL("https://www.instagram.com/menumitra/")}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <FontAwesome6 name="instagram" size={24} color="#E4405F" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => Linking.openURL("https://www.youtube.com/@menumitra")}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <FontAwesome6 name="youtube" size={24} color="#FF0000" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => Linking.openURL("https://x.com/MenuMitra")}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <FontAwesome6 name="x-twitter" size={24} color="#000000" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.poweredByContainer}>
        <View style={styles.poweredByRow}>
          <FontAwesome6 name="bolt-lightning" size={12} color="#6B7280" />
          <Text style={styles.poweredByText}>Powered by</Text>
        </View>
        <TouchableOpacity
          onPress={() => Linking.openURL("https://www.shekruweb.com")}
          activeOpacity={0.7}
        >
          <Text style={styles.companyText}>Shekru Labs India Pvt. Ltd.</Text>
        </TouchableOpacity>
        <Text style={styles.versionText}>version {APP_VERSION}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    paddingBottom: 16,
    paddingHorizontal: 16,
    zIndex: 999,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    marginBottom: 16,
  },
  poweredByContainer: {
    alignItems: 'center',
  },
  poweredByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  poweredByText: {
    fontSize: 12,
    color: '#6B7280',
  },
  companyText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
    marginTop: 4,
  },
  versionText: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
  },
});

export default SocialFooter; 