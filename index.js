import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Platform,
  Text,
  Alert,
  TouchableOpacity,
  StatusBar,
  BackHandler,
  ActivityIndicator,
  Linking,
} from 'react-native';
import WebView from 'react-native-webview';
import { request, requestMultiple, PERMISSIONS, RESULTS, openSettings } from 'react-native-permissions';

const MeonKYC = ({
  companyName,
  workflow = 'individual',
  onSuccess,
  onError,
  onClose,
  customStyles = {},
  enableIPV = true,
  enablePayments = true,
  autoRequestPermissions = true,
  showHeader = true,
  headerTitle = 'KYC Process',
  baseURL = 'https://live.meon.co.in',
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [webViewLoading, setWebViewLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');
  const [error, setError] = useState(null);
  const [webViewRendered, setWebViewRendered] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [isIpvStep, setIsIpvStep] = useState(false);

  const webViewRef = useRef(null);
  const successCalledRef = useRef(false);
  const initialLogoutDoneRef = useRef(false);

  // Perform initial logout and validate required props
  useEffect(() => {
    const performInitialLogout = async () => {
      if (!companyName) {
        const errorMsg = 'companyName is required';
        setError(errorMsg);
        onError?.(errorMsg);
        setIsLoading(false);
        return;
      }

      // Perform initial logout only once
      if (!initialLogoutDoneRef.current) {
        try {
          console.log('[MeonKYC] Performing initial logout...');
          const logoutUrl = `${baseURL}/${companyName}/logout`;
          
          const logoutResponse = await fetch(logoutUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (logoutResponse.ok) {
            const logoutData = await logoutResponse.json();
            console.log('[MeonKYC] Initial logout successful:', logoutData);
          } else {
            console.warn('[MeonKYC] Initial logout failed with status:', logoutResponse.status);
          }
        } catch (logoutError) {
          console.error('[MeonKYC] Error in initial logout:', logoutError);
          // Continue even if logout fails
        }
        
        initialLogoutDoneRef.current = true;
      }
      
      setIsLoading(false);
    };

    performInitialLogout();
  }, [companyName, baseURL]);

  // Check if current URL is IPV step
  const checkIfIpvStep = (url) => {
    return url && (
      url.includes('face-finder.meon.co.in') ||
      url.includes('/ipv') ||
      url.toLowerCase().includes('face') ||
      url.toLowerCase().includes('video')
    );
  };

  // Check if current URL is success/completion page
  const checkIfSuccessPage = (url) => {
    return url && (
      url.includes('/thank-you') ||
      url.includes('/success') ||
      url.includes('/complete') ||
      url.includes('/thankyou') ||
      url.toLowerCase().includes('completed')
    );
  };

  // Request permissions
  const requestPermissions = async () => {
    if (!enableIPV) return true;

    try {
      console.log('[MeonKYC] Requesting permissions...');

      if (Platform.OS === 'android') {
        const permissions = [
          PERMISSIONS.ANDROID.CAMERA,
          PERMISSIONS.ANDROID.RECORD_AUDIO,
          PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
        ];

        const results = await requestMultiple(permissions);

        const allGranted = Object.values(results).every(
          result => result === RESULTS.GRANTED
        );

        if (allGranted) {
          console.log('[MeonKYC] All permissions granted');
          setPermissionsGranted(true);
          webViewRef.current?.reload();
          return true;
        } else {
          handlePermissionDenied(results);
          return false;
        }
      } else {
        const cameraResult = await request(PERMISSIONS.IOS.CAMERA);
        const microphoneResult = await request(PERMISSIONS.IOS.MICROPHONE);
        const locationResult = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);

        if (
          cameraResult === RESULTS.GRANTED &&
          microphoneResult === RESULTS.GRANTED &&
          locationResult === RESULTS.GRANTED
        ) {
          console.log('[MeonKYC] All iOS permissions granted');
          setPermissionsGranted(true);
          webViewRef.current?.reload();
          return true;
        } else {
          handlePermissionDenied({
            camera: cameraResult,
            microphone: microphoneResult,
            location: locationResult,
          });
          return false;
        }
      }
    } catch (error) {
      console.error('[MeonKYC] Error requesting permissions:', error);
      Alert.alert(
        'Permission Error',
        'Failed to request permissions. Please try again.',
        [{ text: 'OK' }]
      );
      return false;
    }
  };

  // Handle permission denied
  const handlePermissionDenied = (results) => {
    const deniedPermissions = [];

    if (Platform.OS === 'android') {
      if (results[PERMISSIONS.ANDROID.CAMERA] !== RESULTS.GRANTED) {
        deniedPermissions.push('Camera');
      }
      if (results[PERMISSIONS.ANDROID.RECORD_AUDIO] !== RESULTS.GRANTED) {
        deniedPermissions.push('Microphone');
      }
      if (results[PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION] !== RESULTS.GRANTED) {
        deniedPermissions.push('Location');
      }
    } else {
      if (results.camera !== RESULTS.GRANTED) {
        deniedPermissions.push('Camera');
      }
      if (results.microphone !== RESULTS.GRANTED) {
        deniedPermissions.push('Microphone');
      }
      if (results.location !== RESULTS.GRANTED) {
        deniedPermissions.push('Location');
      }
    }

    if (deniedPermissions.length > 0) {
      Alert.alert(
        'Permissions Required',
        `IPV process requires ${deniedPermissions.join(', ')} permission(s) to continue.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              if (canGoBack) {
                webViewRef.current?.goBack();
              } else {
                onClose?.();
              }
            },
          },
          {
            text: 'Open Settings',
            onPress: () => openSettings(),
          },
          {
            text: 'Retry',
            onPress: () => requestPermissions(),
          },
        ]
      );
    }
  };

  // Permission injection script
  const permissionInjectionScript = `
    (function() {
      const storePermissionInSession = (name, state) => {
        try {
          sessionStorage.setItem('permission_' + name, state);
          localStorage.setItem('permission_' + name, state);
        } catch(e) {}
      };

      const permissionsGranted = ${permissionsGranted};
      const permissions = ['camera', 'microphone', 'geolocation'];
      
      permissions.forEach(perm => {
        storePermissionInSession(perm, permissionsGranted ? 'granted' : 'denied');
      });

      if (navigator.permissions?.query) {
        const originalQuery = navigator.permissions.query;
        navigator.permissions.query = function(permissionDesc) {
          if (permissions.includes(permissionDesc.name)) {
            return Promise.resolve({
              state: permissionsGranted ? 'granted' : 'denied',
              onchange: null
            });
          }
          return originalQuery.call(this, permissionDesc);
        };
      }

      if (navigator.mediaDevices?.getUserMedia) {
        const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
        navigator.mediaDevices.getUserMedia = function(constraints) {
          if (!permissionsGranted) {
            return Promise.reject(new Error('Permissions not granted'));
          }
          return originalGetUserMedia.call(this, constraints);
        };
      }

      window.addEventListener('load', function() {
        if (permissionsGranted) {
          permissions.forEach(perm => storePermissionInSession(perm, 'granted'));
        }
      });
    })();
    true;
  `;

  // Success page detection script
  const successDetectionScript = `
    (function() {
      // Prevent multiple executions
      if (window.__kycSuccessDetected) {
        return;
      }
      
      const checkForSuccessPage = () => {
        // Get page text
        const pageText = document.body.innerText || document.body.textContent || '';
        
        // VERY SPECIFIC check - only trigger on the exact success page
        const hasThankYou = pageText.includes('Thank You');
        const hasJourneyCompleted = pageText.includes('journey has been completed');
        const hasRedirecting = pageText.includes('Redirecting in') || pageText.includes('redirecting in');
        
        // Only trigger if ALL three conditions are met
        if (hasThankYou && hasJourneyCompleted && hasRedirecting) {
          // Mark as detected to prevent duplicate calls
          if (window.__kycSuccessDetected) {
            return;
          }
          window.__kycSuccessDetected = true;
          
          console.log('[MeonKYC] Success page detected - Thank You page with redirect');
          
          // Send message to React Native
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'KYC_SUCCESS',
              status: 'completed',
              timestamp: new Date().toISOString(),
              url: window.location.href
            }));
          }
        }
      };
      
      // Check immediately
      checkForSuccessPage();
      
      // Check after DOM is fully loaded
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkForSuccessPage);
      }
      
      // Also check after delays for dynamic content
      setTimeout(checkForSuccessPage, 500);
      setTimeout(checkForSuccessPage, 1000);
      
      // Watch for DOM changes (in case content loads dynamically)
      const observer = new MutationObserver(() => {
        checkForSuccessPage();
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });
      
      // Stop observing after 3 seconds
      setTimeout(() => {
        observer.disconnect();
      }, 3000);
    })();
    true;
  `;

  // Payment handling script
  const paymentHandlingScript = enablePayments ? `
    (function() {
      const handlePaymentClick = (event) => {
        const target = event.target;
        const href = target.href || target.getAttribute('href');
        
        const isPaymentLink = href && (
          href.includes('upi://') ||
          href.includes('paytmmp://') ||
          href.includes('phonepe://') ||
          href.includes('gpay://') ||
          href.includes('tez://') ||
          href.includes('google.payments://') ||
          href.includes('googlepay://') ||
          href.includes('bhim://')
        );
        
        if (isPaymentLink) {
          console.log('[MeonKYC] Payment button clicked:', href);
        }
      };
      
      document.addEventListener('click', handlePaymentClick, true);
      
      const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          mutation.addedNodes.forEach(function(node) {
            if (node.nodeType === 1) {
              const links = node.querySelectorAll('a, button, [onclick]');
              links.forEach(link => link.addEventListener('click', handlePaymentClick, true));
            }
          });
        });
      });
      
      observer.observe(document.body, { childList: true, subtree: true });
    })();
    true;
  ` : 'true;';

  // Handle external URLs
  const handleExternalUrl = async (url) => {
    try {
      console.log('[MeonKYC] Opening external URL:', url);

      // Google Pay special handling
      if (url.includes('gpay') || url.includes('tez') || url.includes('google.payments')) {
        const gpaySchemes = [
          url,
          url.replace('gpay://', 'tez://'),
          url.replace('tez://', 'gpay://'),
          url.replace('google.payments://', 'gpay://'),
        ];

        for (const scheme of gpaySchemes) {
          try {
            const canOpen = await Linking.canOpenURL(scheme);
            if (canOpen) {
              await Linking.openURL(scheme);
              return true;
            }
          } catch (error) {
            continue;
          }
        }
      }

      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      }

      return false;
    } catch (error) {
      console.error('[MeonKYC] Error opening external URL:', error);
      return false;
    }
  };

  // Check if URL should be handled externally
  const shouldHandleExternally = (url) => {
    const externalSchemes = [
      'upi://', 'paytmmp://', 'phonepe://', 'gpay://', 'tez://',
      'google.payments://', 'googlepay://', 'bhim://', 'tel:',
      'mailto:', 'whatsapp://', 'intent://',
    ];
    return externalSchemes.some(scheme => url.startsWith(scheme));
  };

  // Handle hardware back button
  useEffect(() => {
    const onBackPress = () => {
      if (canGoBack && webViewRef.current && webViewRendered) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [canGoBack, webViewRendered]);

  // WebView navigation handler
  const handleWebViewNavigationStateChange = async (navState) => {
    console.log('[MeonKYC] Navigation:', navState.url);

    const isCurrentlyIpvStep = checkIfIpvStep(navState.url);

    if (isCurrentlyIpvStep && !isIpvStep && !navState.loading && autoRequestPermissions) {
      console.log('[MeonKYC] IPV step detected');
      setIsIpvStep(true);
      await requestPermissions();
    } else if (!isCurrentlyIpvStep && isIpvStep) {
      setIsIpvStep(false);
    }

    setCanGoBack(navState.canGoBack);
    setCurrentUrl(navState.url);

    return true;
  };

  // WebView request handler
  const handleShouldStartLoadWithRequest = (request) => {
    if (shouldHandleExternally(request.url)) {
      if (request.navigationType === 'click' || request.mainDocumentURL !== request.url) {
        handleExternalUrl(request.url);
        return false;
      }
      return false;
    }
    return true;
  };

  const handleWebViewLoadStart = () => setWebViewLoading(true);
  
  const handleWebViewLoadEnd = () => {
    setWebViewLoading(false);
    setWebViewRendered(true);
    
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        ${permissionInjectionScript}; 
        ${paymentHandlingScript};
        ${successDetectionScript}
      `);
    }
  };

  const handleWebViewError = (event) => {
    console.error('[MeonKYC] WebView error:', event.nativeEvent);
    
    if (event.nativeEvent.code === -10 && 
        event.nativeEvent.description === 'net::ERR_UNKNOWN_URL_SCHEME') {
      setWebViewLoading(false);
      return;
    }
    
    const errorMsg = 'Failed to load KYC page';
    setError(errorMsg);
    onError?.(errorMsg);
    setWebViewLoading(false);
  };

  const handleWebViewMessage = async (event) => {
    try {
      const data = event.nativeEvent.data;
      console.log('[MeonKYC] Message received:', data);

      // Try to parse as JSON
      let message;
      try {
        message = JSON.parse(data);
      } catch {
        message = { type: 'TEXT', data };
      }

      // Handle KYC success message
      if (message.type === 'KYC_SUCCESS' || 
          (typeof data === 'string' && data.includes('SUCCESS'))) {
        
        // Check if onSuccess already called
        if (successCalledRef.current) {
          console.log('[MeonKYC] Success already called, ignoring duplicate');
          return;
        }
        
        // Mark as called
        successCalledRef.current = true;
        
        console.log('[MeonKYC] KYC completed successfully');
        
        // Perform logout before calling onSuccess
        try {
          console.log('[MeonKYC] Performing logout...');
          const logoutUrl = `${baseURL}/${companyName}/logout`;
          
          const logoutResponse = await fetch(logoutUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (logoutResponse.ok) {
            const logoutData = await logoutResponse.json();
            console.log('[MeonKYC] Logout successful:', logoutData);
          } else {
            console.warn('[MeonKYC] Logout failed with status:', logoutResponse.status);
          }
        } catch (logoutError) {
          console.error('[MeonKYC] Error in logout:', logoutError);
          // Continue even if logout fails
        }
        
        // Call onSuccess after logout
        onSuccess?.({
          status: 'completed',
          timestamp: message.timestamp || new Date().toISOString(),
          url: message.url || currentUrl,
          message: 'KYC process completed successfully'
        });
      } 
      // Handle error messages
      else if (message.type === 'KYC_ERROR' || 
               (typeof data === 'string' && data.includes('ERROR'))) {
        console.log('[MeonKYC] KYC error');
        onError?.(message.message || data);
      }
    } catch (error) {
      console.log('[MeonKYC] Error handling message:', error);
    }
  };

  // Close handler
  const handleClose = () => {
    Alert.alert(
      'Close KYC',
      'Are you sure you want to close?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close',
          onPress: () => onClose?.(),
        },
      ]
    );
  };

  // Refresh handler
  const handleRefresh = () => {
    webViewRef.current?.reload();
  };

  // Render header
  const renderHeader = () => {
    if (!showHeader) return null;

    return (
      <View style={[styles.headerContainer, customStyles.header]}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        
        <TouchableOpacity
          style={styles.headerButton}
          onPress={canGoBack && webViewRendered ? () => webViewRef.current?.goBack() : handleClose}
        >
          <Text style={styles.headerButtonText}>
            {canGoBack && webViewRendered ? '←' : '✕'}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.headerTitle, customStyles.headerTitle]}>
          {isIpvStep ? 'IPV Verification' : headerTitle}
        </Text>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerButton} onPress={handleRefresh}>
            <Text style={styles.headerButtonText}>⟳</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleClose}>
            <Text style={styles.headerButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render loading
  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0047AB" />
        <Text style={styles.loadingText}>Initializing KYC...</Text>
      </View>
    );
  }

  // Render error
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Error</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => setError(null)}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, customStyles.container]}>
      {renderHeader()}

      <View style={styles.webViewContainer}>
        {webViewLoading && (
          <View style={styles.webViewLoader}>
            <ActivityIndicator size="small" color="#0047AB" />
          </View>
        )}
        
        <WebView
          ref={webViewRef}
          source={{ uri: `${baseURL}/${companyName}/${workflow}` }}
          style={styles.webView}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback={true}
          useWebkit={true}
          onNavigationStateChange={handleWebViewNavigationStateChange}
          onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
          onLoadStart={handleWebViewLoadStart}
          onLoadEnd={handleWebViewLoadEnd}
          onError={handleWebViewError}
          onMessage={handleWebViewMessage}
          originWhitelist={['*']}
          allowsProtectedMediaPlayback={true}
          mixedContentMode="compatibility"
          thirdPartyCookiesEnabled={true}
          sharedCookiesEnabled={true}
          cacheEnabled={true}
          allowsFullscreenVideo={true}
          userAgent="Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Mobile Safari/537.36"
          injectedJavaScript={`
            ${permissionInjectionScript}; 
            ${paymentHandlingScript};
            ${successDetectionScript}
          `}
          injectedJavaScriptBeforeContentLoaded={`
            window.permissionsGranted = ${permissionsGranted};
            window.paymentHandlingEnabled = ${enablePayments};
          `}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    minWidth: 36,
    alignItems: 'center',
  },
  headerButtonText: {
    fontSize: 20,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  webViewContainer: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webViewLoader: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    padding: 8,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 30,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#0047AB',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MeonKYC;