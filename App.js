import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';

// Import screens
import HomeScreen from './app/screens/HomeScreen';
import SearchScreen from './app/screens/SearchScreen';
import ProfileScreen from './app/screens/ProfileScreen';
import FavoritesScreen from './app/screens/FavoritesScreen';
import ShopScreen from './app/screens/ShopScreen';
import ResultScreen from './app/screens/ResultScreen';
import LandmarkResultScreen from './app/screens/LandmarkResultScreen';
import AuthScreen from './app/screens/AuthScreen';
import VerificationScreen from './app/screens/VerificationScreen';

// Import context
import { UserProvider, useUser } from './app/context/UserContext';
import { ToastProvider } from './app/context/ToastContext';

const Stack = createStackNavigator();

/**
 * Navigation component that handles authenticated vs unauthenticated routes
 */
const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useUser();

  if (isLoading) {
    // Show loading screen while checking authentication
    return (
      <View style={{ flex: 1, backgroundColor: '#1e1e1e', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 18, marginBottom: 20 }}>Loading...</Text>
        <ActivityIndicator size="large" color="#FF6B9D" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={isAuthenticated ? "Home" : "Auth"}
      screenOptions={{
        headerShown: false,
      }}
    >
      {isAuthenticated ? (
        // Authenticated routes
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Search" component={SearchScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Favorites" component={FavoritesScreen} />
          <Stack.Screen name="Shop" component={ShopScreen} />
          <Stack.Screen name="Result" component={ResultScreen} />
          <Stack.Screen name="LandmarkResult" component={LandmarkResultScreen} />
        </>
      ) : (
        // Unauthenticated routes
        <>
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen name="Verification" component={VerificationScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

/**
 * Main App component with Stack Navigation
 * Now includes authentication routing
 */
export default function App() {
  return (
    <UserProvider>
      <ToastProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <AppNavigator />
        </NavigationContainer>
      </ToastProvider>
    </UserProvider>
  );
}
