package com.messmanagement.app;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.app.AlertDialog;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import android.annotation.SuppressLint;
import android.app.Dialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Bundle;
import android.os.Message;
import android.util.Log;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.SslErrorHandler;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.view.KeyEvent;
import android.widget.ProgressBar;
import android.widget.Toast;

import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;

public class MainActivity extends AppCompatActivity {

    private static final String TAG = "MessApp";
    private static final int RC_SIGN_IN = 9001;
    private WebView webView;
    private ProgressBar progress;
    private View connectionError;
    private String websiteUrl;
    private NavigationPolicy navigationPolicy;
    private String lastWebsiteUrl;
    private boolean pageFailed;
    private boolean pageReady;
    private boolean wasPaused;
    private ValueCallback<Uri[]> fileCallback;
    private Dialog popupDialog;
    private GoogleSignInClient googleSignInClient;

    private final ActivityResultLauncher<Intent> filePicker = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(), result -> {
                if (fileCallback != null) {
                    fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(
                            result.getResultCode(), result.getData()));
                    fileCallback = null;
                }
            });

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.activity_main);
        webView = findViewById(R.id.website);
        progress = findViewById(R.id.progress);
        connectionError = findViewById(R.id.connection_error);
        websiteUrl = getString(R.string.website_url);
        lastWebsiteUrl = websiteUrl;
        navigationPolicy = new NavigationPolicy(websiteUrl);

        configureWebView(webView);
        WebView.setWebContentsDebuggingEnabled(
                (getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0);
        findViewById(R.id.retry).setOnClickListener(view -> loadWebsite());
        findViewById(R.id.reload).setOnClickListener(view ->
                new AlertDialog.Builder(this)
                        .setTitle(R.string.reload_title)
                        .setMessage(R.string.reload_message)
                        .setNegativeButton(android.R.string.cancel, null)
                        .setPositiveButton(R.string.reload, (dialog, which) -> loadWebsite())
                        .show());
        findViewById(R.id.open_browser).setOnClickListener(view -> openExternal(lastWebsiteUrl));

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        // Configure Google Sign-In (requests native phone account chooser)
        GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestEmail()
                .requestProfile()
                .build();
        googleSignInClient = GoogleSignIn.getClient(this, gso);

        // Register native JavaScript bridge
        webView.addJavascriptInterface(new AndroidAuthBridge(), "AndroidAuthBridge");

        webView.setWebViewClient(new WebsiteClient());
        webView.setDownloadListener((url, userAgent, disposition, mimeType, length) -> {
            if (NavigationPolicy.canOpenExternally(url)) {
                openExternal(url);
            } else {
                Toast.makeText(this, R.string.browser_download, Toast.LENGTH_LONG).show();
            }
        });
        setupWebChromeClient(webView);
        if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) {
            loadWebsite();
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView(WebView wv) {
        WebSettings settings = wv.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setSupportMultipleWindows(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
    }

    private void setupWebChromeClient(WebView wv) {
        wv.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int value) {
                progress.setProgress(value);
                progress.setVisibility(value == 100 || pageFailed ? View.INVISIBLE : View.VISIBLE);
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try {
                    filePicker.launch(params.createIntent());
                } catch (ActivityNotFoundException e) {
                    fileCallback.onReceiveValue(null);
                    fileCallback = null;
                    Toast.makeText(MainActivity.this, R.string.no_link_handler, Toast.LENGTH_LONG).show();
                }
                return true;
            }

            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                if (!isUserGesture) return false;
                if (popupDialog != null) popupDialog.dismiss();
                WebView popupWebView = new WebView(MainActivity.this);
                configureWebView(popupWebView);

                CookieManager.getInstance().setAcceptCookie(true);
                CookieManager.getInstance().setAcceptThirdPartyCookies(popupWebView, true);

                Dialog dialog = new Dialog(MainActivity.this, android.R.style.Theme_Black_NoTitleBar_Fullscreen);
                popupDialog = dialog;
                dialog.setContentView(popupWebView);
                dialog.setOnDismissListener(ignored -> {
                    popupWebView.stopLoading();
                    popupWebView.destroy();
                    popupDialog = null;
                });
                dialog.show();

                popupWebView.setWebChromeClient(new WebChromeClient() {
                    @Override
                    public void onCloseWindow(WebView window) {
                        dialog.dismiss();
                    }
                });

                popupWebView.setWebViewClient(new WebViewClient() {
                    @Override
                    public void onPageFinished(WebView view, String url) {
                        super.onPageFinished(view, url);
                        if (navigationPolicy.isWebsite(url)) {
                            dialog.dismiss();
                            webView.reload();
                        }
                    }
                });

                WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                transport.setWebView(popupWebView);
                resultMsg.sendToTarget();
                return true;
            }
        });
    }

    private void loadWebsite() {
        pageFailed = false;
        pageReady = false;
        connectionError.setVisibility(View.GONE);
        webView.setVisibility(View.VISIBLE);
        progress.setVisibility(View.VISIBLE);
        webView.loadUrl(lastWebsiteUrl);
    }

    private void showConnectionError() {
        pageFailed = true;
        pageReady = false;
        webView.setVisibility(View.INVISIBLE);
        progress.setVisibility(View.INVISIBLE);
        connectionError.setVisibility(View.VISIBLE);
    }

    private void openExternal(String url) {
        if (!NavigationPolicy.canOpenExternally(url)) return;
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (ActivityNotFoundException e) {
            Toast.makeText(this, R.string.no_link_handler, Toast.LENGTH_LONG).show();
        }
    }

    private final class WebsiteClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            if (!request.isForMainFrame()) return false;
            return handleNavigation(request.getUrl().toString());
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            return handleNavigation(url);
        }

        private boolean handleNavigation(String url) {
            if (navigationPolicy.isWebsite(url)) return false;
            openExternal(url);
            return true;
        }

        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            if (navigationPolicy.isWebsite(url)) {
                lastWebsiteUrl = url;
                pageReady = false;
                pageFailed = false;
                connectionError.setVisibility(View.GONE);
                webView.setVisibility(View.VISIBLE);
            }
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            pageReady = !pageFailed && navigationPolicy.isWebsite(url);
            progress.setVisibility(View.INVISIBLE);
            CookieManager.getInstance().flush();
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request.isForMainFrame()) showConnectionError();
        }

        @Override
        public void onReceivedError(WebView view, int code, String description, String failingUrl) {
            showConnectionError();
        }

        @Override
        public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
            if (request.isForMainFrame() && response.getStatusCode() >= 400) showConnectionError();
        }

        @Override
        public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
            handler.cancel();
            if (lastWebsiteUrl.equals(error.getUrl())) showConnectionError();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
            if (wasPaused && pageReady && navigationPolicy.isWebsite(webView.getUrl())) {
                webView.evaluateJavascript(
                        "if(!document.querySelector('input:focus,textarea:focus,select:focus,[contenteditable]:focus'))"
                                + "{window.dispatchEvent(new CustomEvent('app-global-refresh'));}", null);
            }
        }
        wasPaused = false;
    }

    @Override
    protected void onPause() {
        wasPaused = true;
        webView.onPause();
        CookieManager.getInstance().flush();
        super.onPause();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onDestroy() {
        if (popupDialog != null) popupDialog.dismiss();
        if (fileCallback != null) fileCallback.onReceiveValue(null);
        webView.stopLoading();
        webView.removeJavascriptInterface("AndroidAuthBridge");
        webView.destroy();
        super.onDestroy();
    }

    public class AndroidAuthBridge {
        @JavascriptInterface
        public void launchGoogleSignIn() {
            runOnUiThread(() -> {
                googleSignInClient.signOut().addOnCompleteListener(task -> {
                    Intent signInIntent = googleSignInClient.getSignInIntent();
                    startActivityForResult(signInIntent, RC_SIGN_IN);
                });
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
                    webView.evaluateJavascript(js, null);
                }
            } catch (ApiException e) {
                Log.e(TAG, "Google sign-in ApiException code: " + e.getStatusCode());
                if (e.getStatusCode() == 12501) {
                    // User dismissed the dialog
                    webView.evaluateJavascript("if(window.onNativeGoogleLoginCancel){ window.onNativeGoogleLoginCancel(); }", null);
                } else {
                    // Code 10 / 12500 / other developer configuration errors -> gracefully fallback to smooth Web Popup without breaking UX!
                    webView.evaluateJavascript("if(window.onNativeGoogleLoginFallback){ window.onNativeGoogleLoginFallback(); }", null);
                }
            }
        }
    }

    private String escapeJs(String text) {
        if (text == null) return "";
        return text.replace("\\", "\\\\").replace("'", "\\'").replace("\n", " ").replace("\r", "");
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }
}