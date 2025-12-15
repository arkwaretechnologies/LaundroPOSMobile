const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Expo config plugin to add missingDimensionStrategy for react-native-camera
 * This resolves the variant selection issue where Gradle cannot choose between
 * 'general' and 'mlkit' product flavors during EAS builds.
 */
module.exports = function withReactNativeCamera(config) {
  return withAppBuildGradle(config, (config) => {
    const buildGradle = config.modResults.contents;
    
    // Check if missingDimensionStrategy already exists
    if (buildGradle.includes("missingDimensionStrategy 'react-native-camera'")) {
      return config;
    }
    
    // Find the defaultConfig block and add missingDimensionStrategy before the closing brace
    // Match defaultConfig { ... } and insert before the closing brace
    const defaultConfigPattern = /(defaultConfig\s*\{[\s\S]*?)(\n\s*\})/;
    
    if (defaultConfigPattern.test(buildGradle)) {
      // Insert missingDimensionStrategy before the closing brace of defaultConfig
      // Use proper indentation (8 spaces, matching typical Gradle indentation)
      config.modResults.contents = buildGradle.replace(
        defaultConfigPattern,
        (match, configContent, closingBrace) => {
          // Add the missingDimensionStrategy with proper indentation
          return configContent + 
            "\n        missingDimensionStrategy 'react-native-camera', 'general'" +
            closingBrace;
        }
      );
    } else {
      // Fallback: try to add after defaultConfig { if pattern doesn't match
      config.modResults.contents = buildGradle.replace(
        /(defaultConfig\s*\{)/,
        `$1
        missingDimensionStrategy 'react-native-camera', 'general'`
      );
    }
    
    return config;
  });
};
