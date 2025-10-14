
# 🔐 react-native-meon-kyc

Complete KYC (Know Your Customer) solution for React Native with IPV verification, payment integration, and automatic permission handling.

[![npm version](https://badge.fury.io/js/react-native-meon-kyc.svg)](https://badge.fury.io/js/react-native-meon-kyc)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- ✅ **IPV (In-Person Verification)** - Complete video KYC with camera/microphone
- ✅ **Automatic Permission Handling** - Camera, Microphone, Location
- ✅ **Payment Integration** - UPI payments (GPay, PhonePe, Paytm, BHIM)
- ✅ **Session Management** - Automatic cleanup and logout
- ✅ **Custom Styling** - Full UI customization support
- ✅ **Callbacks** - Success, Error, and Close handlers
- ✅ **iOS & Android** - Full cross-platform support
- ✅ **Error Handling** - Comprehensive error states
- ✅ **Back Navigation** - Hardware back button support

## 📦 Installation

```bash
npm install react-native-meon-kyc react-native-webview react-native-permissions
```

### iOS Setup

```bash
cd ios && pod install
```

Add these permissions to your `ios/YourApp/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>Camera permission is required for face verification</string>
<key>NSMicrophoneUsageDescription</key>
<string>Microphone permission is required for video verification</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>Location permission is required for verification</string>
```

### Android Setup

Add these permissions to your `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.INTERNET" />
```

## 🚀 Usage

### Basic Usage

```javascript
import React from 'react';
import { View } from 'react-native';
import MeonKYC from 'react-native-meon-kyc';

const App = () => {
  return (
    <View style={{ flex: 1 }}>
      <MeonKYC
        companyName="your-company-name"
        workflow="individual"
        onSuccess={(data) => console.log('KYC Success:', data)}
        onError={(error) => console.log('KYC Error:', error)}
        onClose={() => console.log('KYC Closed')}
      />
    </View>
  );
};

export default App;
```

### Advanced Usage with All Props

```javascript
import React from 'react';
import { View, Alert } from 'react-native';
import MeonKYC from 'react-native-meon-kyc';

const KYCScreen = ({ navigation }) => {
  const handleSuccess = (data) => {
    console.log('✅ KYC completed successfully:', data);
    Alert.alert('Success', 'KYC completed successfully!');
    navigation.navigate('Dashboard');
  };

  const handleError = (error) => {
    console.error('❌ KYC error:', error);
    Alert.alert('Error', error);
  };

  const handleClose = () => {
    Alert.alert(
      'Exit KYC',
      'Are you sure you want to exit?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Exit', onPress: () => navigation.goBack() }
      ]
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <MeonKYC
        // Required
        companyName="your-company-name"
        
        // Optional Configuration
        workflow="individual"
        enableIPV={true}
        enablePayments={true}
        autoRequestPermissions={true}
        showHeader={true}
        headerTitle="Complete Your KYC"
        baseURL="https://live.meon.co.in"
        
        // Callbacks
        onSuccess={handleSuccess}
        onError={handleError}
        onClose={handleClose}
        
        // Custom Styling
        customStyles={{
          container: { 
            backgroundColor: '#f5f5f5' 
          },
          header: { 
            backgroundColor: '#0047AB',
            elevation: 4 
          },
          headerTitle: { 
            color: '#ffffff',
            fontSize: 20,
            fontWeight: 'bold'
          }
        }}
      />
    </View>
  );
};

export default KYCScreen;
```

## 📚 Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `companyName` | `string` | ✅ **Yes** | - | Your company identifier provided by Meon |
| `workflow` | `string` | No | `'individual'` | KYC workflow type (individual/business) |
| `onSuccess` | `function` | No | `undefined` | Callback when KYC is completed successfully |
| `onError` | `function` | No | `undefined` | Callback when an error occurs |
| `onClose` | `function` | No | `undefined` | Callback when user closes the KYC |
| `enableIPV` | `boolean` | No | `true` | Enable IPV (video) verification |
| `enablePayments` | `boolean` | No | `true` | Enable payment integration |
| `autoRequestPermissions` | `boolean` | No | `true` | Automatically request permissions for IPV |
| `showHeader` | `boolean` | No | `true` | Show navigation header |
| `headerTitle` | `string` | No | `'KYC Process'` | Custom header title |
| `baseURL` | `string` | No | `'https://live.meon.co.in'` | Base URL for KYC service |
| `customStyles` | `object` | No | `{}` | Custom style overrides |

### Custom Styles Object

```javascript
customStyles={{
  container: {
    // Container styles
  },
  header: {
    // Header container styles
  },
  headerTitle: {
    // Header title text styles
  }
}}
```

## 🎯 Permissions

The package automatically handles these permissions:

- **📷 Camera**: For face verification during IPV
- **🎤 Microphone**: For audio/video verification
- **📍 Location**: For geo-tagging verification

When IPV step is detected, the package will:
1. Automatically request required permissions
2. Show user-friendly permission dialogs
3. Provide option to open settings if denied
4. Reload WebView after permissions granted

## 💳 Payment Integration

Supports all major UPI payment apps:

- **Google Pay (GPay)** - `gpay://`, `tez://`
- **PhonePe** - `phonepe://`
- **Paytm** - `paytmmp://`
- **BHIM UPI** - `bhim://`
- **Amazon Pay** - `amazonpay://`
- And more...

The package automatically:
- Detects payment button clicks
- Opens the respective UPI app
- Handles app not installed scenarios
- Provides fallback to app store

## 🔄 Navigation & Back Handling

- **Hardware Back Button**: Automatically handled on Android
- **WebView Navigation**: Back button navigates within WebView
- **Close Button**: Shows confirmation dialog before closing

## 🐛 Error Handling

The package handles various error scenarios:

```javascript
onError={(error) => {
  console.log('Error type:', error);
  
  // Error types:
  // - 'companyName is required'
  // - 'Failed to load KYC page'
  // - Permission errors
  // - Network errors
}}
```

## 🔍 Debugging

Enable console logs to see detailed information:

```javascript
// The package logs important events with [MeonKYC] prefix
// Check your console for:
// - Navigation changes
// - Permission requests
// - Payment attempts
// - Error details
```

## 📱 Supported Platforms

- ✅ **iOS**: iOS 11.0+
- ✅ **Android**: Android 5.0+ (API 21+)

## 🤝 Dependencies

This package requires:
- `react-native-webview` (>=11.0.0)
- `react-native-permissions` (>=3.0.0)

These will be automatically installed as peer dependencies.

## 📄 Example App

Check out the example app in the repository:

```bash
git clone https://github.com/yourusername/react-native-meon-kyc.git
cd react-native-meon-kyc/example
npm install
cd ios && pod install && cd ..
npm run ios  # or npm run android
```

## 🛠️ Troubleshooting

### Issue: Permissions not working on iOS

**Solution**: Make sure you've added all required permission descriptions in `Info.plist`

### Issue: Payment apps not opening

**Solution**: 
1. Ensure UPI apps are installed
2. Check if LSApplicationQueriesSchemes is added in Info.plist (iOS)
3. Verify intent filters in AndroidManifest.xml (Android)

### Issue: WebView not loading

**Solution**:
1. Check internet connection
2. Verify `companyName` is correct
3. Check console for error messages
4. Ensure base URL is accessible

### Issue: Camera/Microphone not working

**Solution**:
1. Permissions must be granted
2. Test on real device (not simulator)
3. Check permission settings in device

## 📝 Changelog

### v1.0.0 (Current)
- Initial release
- IPV verification support
- Payment integration
- Automatic permission handling
- iOS & Android support

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Support

For support, email support@meon.co.in or create an issue in the GitHub repository.

## 🔗 Links

- [NPM Package](https://www.npmjs.com/package/react-native-meon-kyc)
- [GitHub Repository](https://github.com/yourusername/react-native-meon-kyc)
- [Documentation](https://github.com/yourusername/react-native-meon-kyc#readme)
- [Report Bug](https://github.com/yourusername/react-native-meon-kyc/issues)

---

Made with ❤️ by [Your Name]