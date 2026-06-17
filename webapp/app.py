import os
import sys
import shutil
import tempfile
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
if __name__ == '__main__':
    # Run server on port 5000 and listen to all incoming network interfaces
    app.run(debug=True, host='0.0.0.0', port=5000)
