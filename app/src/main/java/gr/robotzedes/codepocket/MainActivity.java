package gr.robotzedes.codepocket;
import android.annotation.SuppressLint;import android.app.Activity;import android.os.Bundle;import android.webkit.JavascriptInterface;import android.webkit.WebSettings;import android.webkit.WebView;import android.webkit.WebViewClient;import android.content.ClipData;import android.content.ClipboardManager;import android.content.Context;import android.widget.Toast;
public class MainActivity extends Activity{
 WebView w;
 public class Bridge{@JavascriptInterface public void copyText(String t){runOnUiThread(()->{ClipboardManager c=(ClipboardManager)getSystemService(Context.CLIPBOARD_SERVICE);c.setPrimaryClip(ClipData.newPlainText("code",t));Toast.makeText(MainActivity.this,"Ο κώδικας αντιγράφηκε",Toast.LENGTH_SHORT).show();});}}
 @SuppressLint({"SetJavaScriptEnabled","JavascriptInterface"}) public void onCreate(Bundle b){super.onCreate(b);setContentView(R.layout.activity_main);w=findViewById(R.id.web);WebSettings s=w.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);w.addJavascriptInterface(new Bridge(),"Android");w.setWebViewClient(new WebViewClient());w.loadUrl("file:///android_asset/index.html");}
 @Override public void onBackPressed(){if(w.canGoBack())w.goBack();else super.onBackPressed();}
}
