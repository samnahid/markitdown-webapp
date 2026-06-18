import os
import sys
import shutil
import tempfile
import requests
import json
from flask import Flask, request, jsonify, render_template

# we append the local packages/markitdown/src path to ensure the local version of markitdown is importable 
# even if it hasn't been installed globally.
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../packages/markitdown/src')))

try:
    from markitdown import MarkItDown
except ImportError:
    # Fallback message if dependencies are not installed
    MarkItDown = None

app = Flask(__name__)

# Temporary directory for uploading files
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Limit file upload size to 32MB
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024

@app.route('/')
def index():
    """Renders the main single-page application index HTML page."""
    return render_template('index.html')

@app.route('/sw.js')
def serve_sw():
    """সার্ভিস ওয়ার্কার ফাইলটি রুট ডোমেন থেকে সার্ভ করার জন্য যাতে এটি পুরো অ্যাপ কভার করতে পারে (Scope: /)"""
    return app.send_static_file('js/sw.js')

@app.route('/manifest.json')
def serve_manifest():
    """ওয়েব ম্যানিফেস্ট ফাইলটি সার্ভ করার জন্য"""
    return app.send_static_file('manifest.json')

@app.route('/convert', methods=['POST'])
def convert_file():
    """Handles file uploads, runs MarkItDown converter, and returns Markdown content."""
    if not MarkItDown:
        return jsonify({
            'success': False,
            'error': 'MarkItDown library is not installed properly. Please run "pip install -e ../packages/markitdown[all]"'
        }), 500

    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'Empty filename'}), 400

    # Save file to a temporary location inside the uploads folder to prevent filename collision
    filename = file.filename
    temp_dir = tempfile.mkdtemp(dir=app.config['UPLOAD_FOLDER'])
    file_path = os.path.join(temp_dir, filename)
    
    try:
        # Save file to temp path
        file.save(file_path)
        
        # Initialize MarkItDown
        # We enable plugins and other parameters to give full capabilities
        md = MarkItDown(enable_plugins=True)
        
        # Perform conversion
        result = md.convert(file_path)
        
        # Return converted text content
        return jsonify({
            'success': True,
            'filename': filename,
            'markdown': result.text_content
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Conversion failed: {str(e)}'
        }), 500
        
    finally:
        # Cleanup file and temp directory
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
        except Exception as cleanup_error:
            # Log cleanup errors to console silently
            print(f"Error cleaning up temp files: {cleanup_error}")

@app.route('/ai_process', methods=['POST'])
def ai_process():
    """Gemma-4-31B মডেলের মাধ্যমে ফাইল প্রসেস, সামারাইজ বা কাস্টম প্রম্পটের সাহায্যে পরিবর্তন করার এন্ডপয়েন্ট"""
    data = request.json or {}
    markdown_content = data.get('markdown', '')
    user_prompt = data.get('prompt', '')
    action = data.get('action', 'custom')
    
    if not markdown_content:
        return jsonify({
            'success': False,
            'error': 'প্রসেস করার জন্য কোনো টেক্সট বা ফাইল কনটেন্ট পাওয়া যায়নি।'
        }), 400

    # ইউজারের অ্যাকশন অনুযায়ী উপযুক্ত প্রম্পট তৈরি করা
    if action == 'summarize':
        system_instruction = "তুমি একজন দক্ষ ফাইল রিডার এবং সামারাইজার। নিচের ফাইলটির একটি সুন্দর, তথ্যবহুল এবং সংক্ষিপ্ত সারসংক্ষেপ তৈরি করো সহজ বাংলায়।"
        prompt_content = f"{system_instruction}\n\nফাইলের কনটেন্ট:\n{markdown_content}"
    elif action == 'translate':
        system_instruction = "তুমি একজন প্রফেশনাল অনুবাদক। নিচের সম্পূর্ণ ফাইলটি সহজ এবং প্রাঞ্জল বাংলায় অনুবাদ করো।"
        prompt_content = f"{system_instruction}\n\nফাইলের কনটেন্ট:\n{markdown_content}"
    elif action == 'correct':
        system_instruction = "তুমি একজন বাংলা ভাষার ব্যাকরণবিদ। নিচের লেখার বানান, ব্যাকরণ এবং বাক্য গঠন ঠিক করো। কোনো তথ্য বা প্যারা বাদ না দিয়ে শুধু ত্রুটিগুলো সংশোধন করো।"
        prompt_content = f"{system_instruction}\n\nফাইলের কনটেন্ট:\n{markdown_content}"
    else:
        # কাস্টম নির্দেশনা
        system_instruction = "তুমি একজন ফাইল এডিটর। ব্যবহারকারীর নির্দেশ অনুযায়ী ফাইলের কন্টেন্ট সংশোধন বা পরিবর্তন করো। শুধুমাত্র পরিবর্তিত কনটেন্ট আউটপুট হিসেবে প্রদান করো।"
        prompt_content = f"ব্যবহারকারীর নির্দেশ: {user_prompt}\n\nফাইলের মূল কনটেন্ট:\n{markdown_content}"

    # Groq API এর মাধ্যমে Llama 3.3 কল করা
    api_key = os.environ.get("GROQ_API_KEY", "")
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {
                "role": "user",
                "content": prompt_content
            }
        ]
    }
    
    try:
        response = requests.post(url, headers=headers, data=json.dumps(payload))
        response_data = response.json()
        
        if 'error' in response_data:
            return jsonify({
                'success': False,
                'error': response_data['error'].get('message', 'Groq API Error occurred')
            }), 500
            
        choice = response_data['choices'][0]['message']
        result_text = choice.get('content', '')
        
        return jsonify({
            'success': True,
            'result': result_text
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'AI প্রসেস করতে ত্রুটি হয়েছে: {str(e)}'
        }), 500

if __name__ == '__main__':
    # Run server on port 5000 and listen to all incoming network interfaces
    app.run(debug=True, host='0.0.0.0', port=5000)
