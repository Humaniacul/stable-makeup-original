export default {
  expo: {
    name: "AI Makeup Assistant",
    slug: "ai-makeup-assistant",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    description: "Get personalized makeup recommendations using AI technology with advanced facial landmark detection. Upload your selfie and discover your perfect makeup style with curated products and step-by-step instructions.",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#FFF5F8"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.aimakeup.assistant",
      infoPlist: {
        NSCameraUsageDescription: "This app needs access to camera for real-time facial analysis and makeup try-on using MediaPipe technology.",
        NSPhotoLibraryUsageDescription: "This app needs access to your photos to let you select a selfie for makeup analysis."
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#FFF5F8"
      },
      package: "com.aimakeup.assistant",
      permissions: [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "INTERNET",
        "ACCESS_NETWORK_STATE"
      ],
      usesCleartextTraffic: true,
      networkSecurityConfig: {
        allowBackup: false,
        cleartextTrafficPermitted: true,
        domain: [
          {
            includeSubdomains: false,
            name: "10.5.0.2",
            cleartextTrafficPermitted: true
          },
          {
            includeSubdomains: false,
            name: "10.143.87.31",
            cleartextTrafficPermitted: true
          },
          {
            includeSubdomains: false,
            name: "10.25.159.31",
            cleartextTrafficPermitted: true
          },
          {
            includeSubdomains: false, 
            name: "localhost",
            cleartextTrafficPermitted: true
          },
          {
            includeSubdomains: false,
            name: "127.0.0.1",
            cleartextTrafficPermitted: true
          }
        ],
        baseConfig: {
          cleartextTrafficPermitted: true
        }
      }
    },
    web: {
      favicon: "./assets/favicon.png",
      name: "AI Makeup Assistant",
      shortName: "AI Makeup"
    },
    plugins: [
      [
        "expo-image-picker",
        {
          photosPermission: "This app needs access to your photos to let you select a selfie for makeup analysis.",
          cameraPermission: "This app needs access to your camera to let you take a selfie for makeup analysis."
        }
      ],
      [
        "expo-camera",
        {
          cameraPermission: "This app needs access to camera for facial analysis and makeup recommendations."
        }
      ],
      [
        "expo-build-properties",
        {
          android: {
            usesCleartextTraffic: true,
            networkSecurityConfig: "@xml/network_security_config"
          }
        }
      ],
      "expo-dev-client"
    ],
    extra: {
      eas: {
        projectId: "f8fb7e89-bd8c-4016-b809-1a82c34de5dd"
      }
    }
  }
}; 