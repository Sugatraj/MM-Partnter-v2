import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform, Image, StatusBar } from "react-native";
import { FontAwesome, FontAwesome5 } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from 'react-native-safe-area-context';

const STATUSBAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight;

const Header = ({ title, showBack = true, showMenu = true, isDashboard = false, rightComponent = null }) => {
  const navigation = useNavigation();

  if (isDashboard) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <StatusBar backgroundColor="#fff" barStyle="dark-content" />
        <View style={styles.header}>
          <View style={styles.leftContainer}>
            <View style={styles.logoContainer}>
              <Image
                source={require("../assets/menumitra-logo.png")}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.logoText}>MenuMitra Partner</Text>
            </View>
          </View>

          <View style={styles.rightContainer}>
            <TouchableOpacity 
              onPress={() => navigation.openDrawer()}
              style={styles.menuButton}
            >
              <FontAwesome name="bars" size={20} color="#333" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      <View style={styles.header}>
        <View style={styles.leftContainer}>
          {showBack && (
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              style={styles.backButton}
            >
              <FontAwesome5 name="arrow-left" size={20} color="#333" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
        </View>

        <View style={styles.rightContainer}>
          {rightComponent ? (
            rightComponent
          ) : (
            showMenu && (
              <TouchableOpacity 
                onPress={() => navigation.openDrawer()}
                style={styles.menuButton}
              >
                <FontAwesome name="bars" size={20} color="#333" />
              </TouchableOpacity>
            )
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#fff',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  leftContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 2,
    alignItems: 'center',
  },
  rightContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  backButton: {
    padding: 8,
  },
  menuButton: {
    padding: 8,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 32,
    height: 32,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
});

export default Header;
