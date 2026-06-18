[app]
# (string) Title of your application
title = MarkItDown Converter

# (string) Package name
package.name = markitdown

# (string) Package domain (needed for android packaging)
package.domain = org.nahid

# (string) Source code where the main.py lives
source.dir = .

# (list) Source files to include (let empty to include all the files)
source.include_exts = py,png,jpg,jpeg,html,css,js,json,txt,toml,yaml

# (list) List of exclusions using pattern matching
source.exclude_dirs = tests, bin, venv, .git

# (string) Application versioning
version = 1.0

# (list) Application requirements
# এখানে ফ্লাস্ক, কিভি, রিকোয়েস্টস এবং অন্যান্য কোর লাইব্রেরি দেওয়া হয়েছে
requirements = python3, kivy, flask, requests, urllib3, charset-normalizer, idna, certifi, jinja2, werkzeug, itsdangerous, click, beautifulsoup4, markdownify, defusedxml, android, pyjnius

# (str) Custom source folders for requirements
# requirements.source.kivy = 

# (list) Permissions required by the app
# ফাইল রিড/রাইট এবং ইন্টারনেট ব্যবহারের পারমিশন
android.permissions = INTERNET, READ_EXTERNAL_STORAGE, WRITE_EXTERNAL_STORAGE

# (int) Target Android API, should be as high as possible.
android.api = 33

# (int) Minimum API your APK will support.
android.minapi = 21

# (str) Android NDK version to use
# android.ndk = 25b

# (bool) Use --private data directory (True) or public (False)
android.private_storage = True

# (list) Screen orientations
orientation = portrait

# (bool) Indicate if the application should be fullscreen or not
fullscreen = 0

# (string) Icon of the application
icon.filename = webapp/static/icons/icon-512.png

# (string) Presplash of the application
# presplash.filename = %(source.dir)s/data/presplash.png

# (list) List of service to declare
# services = 

[buildozer]
# (int) Log level (0 = error only, 1 = info, 2 = debug (with compiler output))
log_level = 2

# (int) Display warning if buildozer is run as root (0 = False, 1 = True)
warn_on_root = 1
