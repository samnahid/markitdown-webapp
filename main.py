import threading
import time
import os
import sys
import webbrowser

# ১. ফ্লাস্ক সার্ভার ব্যাকগ্রাউন্ডে চালু করার ফাংশন
def start_flask():
    # webapp ফোল্ডারের পাথ পাইথন সিস্টেমে যোগ করছি যাতে app.py খুঁজে পায়
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'webapp')))
    
    # dependencies ইম্পোর্ট করার আগে packages পাথ যোগ করে নিচ্ছি
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'packages/markitdown/src')))
    
    from app import app
    # লোকালহোস্টে (127.0.0.1) এবং পোর্ট ৫০00 এ ফ্লাস্ক রান করা হচ্ছে
    app.run(host='127.0.0.1', port=5000, debug=False)

# ২. ফ্লাস্ক সার্ভারকে একটি আলাদা ব্যাকগ্রাউন্ড থ্রেডে স্টার্ট করা হচ্ছে
flask_thread = threading.Thread(target=start_flask)
flask_thread.daemon = True
flask_thread.start()

# ৩. ফ্লাস্ক সার্ভারটি পুরোপুরি চালু হতে ২ সেকেন্ড সময় দিচ্ছি
time.sleep(2)

# ৪. আমরা কি অ্যান্ড্রয়েড ওএসে আছি তা চেক করা হচ্ছে
# অ্যান্ড্রয়েড ওএসে থাকলে 'ANDROID_ARGUMENT' এনভায়রনমেন্ট ভেরিয়েবল সেট থাকে
is_android = 'ANDROID_ARGUMENT' in os.environ

if is_android:
    # ৫. অ্যান্ড্রয়েডের জন্য Kivy এবং Pyjnius ব্যবহার করে লোকাল WebView লোড করা
    from kivy.app import App
    from kivy.uix.boxlayout import BoxLayout
    from android.runnable import run_on_ui_thread
    from jnius import autoclass

    # অ্যান্ড্রয়েড নেটিভ ক্লাসগুলো ইম্পোর্ট করা হচ্ছে
    WebView = autoclass('android.webkit.WebView')
    WebViewClient = autoclass('android.webkit.WebViewClient')
    Activity = autoclass('org.kivy.android.PythonActivity').mActivity

    class WebViewWidget(BoxLayout):
        def __init__(self, **kwargs):
            super(WebViewWidget, self).__init__(**kwargs)
            self.create_webview()

        # অ্যান্ড্রয়েডের ইউজার ইন্টারফেস (UI) থ্রেডে ওয়েবভিউ রান করানো
        @run_on_ui_thread
        def create_webview(self):
            webview = WebView(Activity)
            webview.getSettings().setJavaScriptEnabled(True)  # জাভাস্ক্রিপ্ট সচল করা
            webview.getSettings().setDomStorageEnabled(True)   # লোকাল স্টোরেজ সচল করা
            webview.setWebViewClient(WebViewClient())
            
            # আমাদের লোকাল ফ্লাস্ক অ্যাপের হোমপেজ লোড করা
            webview.loadUrl('http://127.0.0.1:5000/')
            
            # পুরো স্ক্রিন জুড়ে ওয়েবভিউটি সেট করা
            Activity.setContentView(webview)

    class MarkItDownApp(App):
        def build(self):
            return WebViewWidget()

        # অ্যাপ ব্যাকগ্রাউন্ডে গেলে বা বন্ধ করার সময় ক্লিনআপ
        def on_stop(self):
            pass

    if __name__ == '__main__':
        MarkItDownApp().run()
else:
    # ৬. পিসি/উইন্ডোজ প্ল্যাটফর্মে থাকলে সরাসরি ব্রাউজারে ওপেন করা হবে
    print("লোকাল ফ্লাস্ক সার্ভার সফলভাবে চালু হয়েছে!")
    print("ব্রাউজারে ওপেন করতে ক্লিক করুন: http://127.0.0.1:5000/")
    webbrowser.open('http://127.0.0.1:5000/')
    
    # সার্ভার সচল রাখার জন্য ইনফিনিট লুপ
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nসার্ভার বন্ধ করা হচ্ছে...")
