from flask import Flask, render_template
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/texts', methods=['GET'])
def get_texts():
    """API endpoint to get text content for overlays"""
    return {
        'topLeft': 'Top Left Text',
        'topRight': 'Top Right Text',
        'bottomLeft': 'Bottom Left Text',
        'bottomRight': 'Bottom Right Text'
    }

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)

