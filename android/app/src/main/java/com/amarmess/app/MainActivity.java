package com.amarmess.app;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "AmarMess";
    private static final int RC_SIGN_IN = 9001;
    private GoogleSignInClient googleSignInClient;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Configure Google Sign-In with native phone account picker
        GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestEmail()
                .requestProfile()
                .build();
        googleSignInClient = GoogleSignIn.getClient(this, gso);

        attachBridge();
    }

    @Override
    public void onStart() {
        super.onStart();
        attachBridge();
    }

    @Override
    public void onResume() {
        super.onResume();
        attachBridge();
    }

    private void attachBridge() {
        try {
            if (this.getBridge() != null && this.getBridge().getWebView() != null) {
                WebView webView = this.getBridge().getWebView();
                webView.addJavascriptInterface(new AndroidAuthBridge(), "AndroidAuthBridge");
                Log.d(TAG, "AndroidAuthBridge attached successfully to Capacitor WebView");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error attaching AndroidAuthBridge: " + e.getMessage());
        }
    }

    public class AndroidAuthBridge {
        @JavascriptInterface
        public boolean isNative() {
            return true;
        }

        @JavascriptInterface
        public void launchGoogleSignIn() {
            runOnUiThread(() -> {
                try {
                    if (googleSignInClient != null) {
                        // Sign out first so Google always displays the bottom sheet account chooser with ALL accounts on the device
                        googleSignInClient.signOut().addOnCompleteListener(task -> {
                            Intent signInIntent = googleSignInClient.getSignInIntent();
                            startActivityForResult(signInIntent, RC_SIGN_IN);
                        });
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Error launching native Google sign-in: " + e.getMessage());
                }
            });
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == RC_SIGN_IN) {
            Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
            try {
                GoogleSignInAccount account = task.getResult(ApiException.class);
                if (account != null) {
                    String email = account.getEmail() != null ? account.getEmail() : "";
                    String displayName = account.getDisplayName() != null ? account.getDisplayName() : "";
                    String photoUrl = account.getPhotoUrl() != null ? account.getPhotoUrl().toString() : "";
                    String idToken = account.getIdToken() != null ? account.getIdToken() : "";

                    String js = String.format(
                        "if(window.onNativeGoogleLoginSuccess){ window.onNativeGoogleLoginSuccess('%s', '%s', '%s', '%s'); }",
                        escapeJs(email),
                        escapeJs(displayName),
                        escapeJs(photoUrl),
                        escapeJs(idToken)
                    );
                    WebView webView = getBridge().getWebView();
                    if (webView != null) {
                        webView.evaluateJavascript(js, null);
                    }
                }
            } catch (ApiException e) {
                Log.e(TAG, "Google sign-in ApiException code: " + e.getStatusCode());
                WebView webView = getBridge().getWebView();
                if (webView != null) {
                    if (e.getStatusCode() == 12501) {
                        // User dismissed the dialog
                        webView.evaluateJavascript("if(window.onNativeGoogleLoginCancel){ window.onNativeGoogleLoginCancel(); }", null);
                    } else {
                        // Fallback to web auth if any configuration issue
                        webView.evaluateJavascript("if(window.onNativeGoogleLoginFallback){ window.onNativeGoogleLoginFallback(); }", null);
                    }
                }
            }
        }
    }

    private String escapeJs(String text) {
        if (text == null) return "";
        return text.replace("\\", "\\\\").replace("'", "\\'").replace("\n", " ").replace("\r", "");
    }
}
