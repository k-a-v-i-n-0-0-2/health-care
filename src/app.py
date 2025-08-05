from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import base64
import os
import tempfile
from PIL import Image
import io
import logging
from datetime import datetime
import traceback

# IBM Watson X AI imports
try:
    from ibm_watsonx_ai import Credentials
    from ibm_watsonx_ai.foundation_models import ModelInference
    WATSON_AVAILABLE = True
except ImportError:
    WATSON_AVAILABLE = False
    print("Warning: IBM Watson X AI not installed. Install with: pip install ibm-watsonx-ai")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# IBM Watson X AI Configuration
WATSONX_EU_APIKEY = "grsjZnkKVEfU6O3xITUQV1pur8cY8ZOLWdk6M9kT9LUb"
WATSONX_EU_PROJECT_ID = "3bb15573-631a-4c1d-9a24-41b1f50dc072"
WATSONX_URL = "https://us-south.ml.cloud.ibm.com"

class MedicalImageAnalyzer:
    def __init__(self):
        self.credentials = None
        self.models = {}
        self.initialize_watson()
    
    def initialize_watson(self):
        """Initialize Watson X AI credentials and models"""
        if not WATSON_AVAILABLE:
            logger.error("IBM Watson X AI not available")
            return False
            
        try:
            self.credentials = Credentials(
                url=WATSONX_URL,
                api_key=WATSONX_EU_APIKEY
            )
            
            # Initialize models
            self.models = {
                "pixtral": ModelInference(
                    model_id="mistralai/pixtral-12b",
                    credentials=self.credentials,
                    project_id=WATSONX_EU_PROJECT_ID,
                    params={"max_tokens": 300}
                ),
                "llama_vision": ModelInference(
                    model_id="meta-llama/llama-3-2-11b-vision-instruct",
                    credentials=self.credentials,
                    project_id=WATSONX_EU_PROJECT_ID,
                    params={"max_tokens": 300}
                )
            }
            
            logger.info("✅ Watson X AI models initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Watson X AI: {str(e)}")
            return False
    
    def encode_image_from_file(self, image_file):
        """Convert uploaded file to base64 encoded string"""
        try:
            # Read image file
            image_data = image_file.read()
            
            # Validate and process image
            image = Image.open(io.BytesIO(image_data))
            
            # Convert to RGB if needed
            if image.mode in ('RGBA', 'P'):
                image = image.convert('RGB')
            
            # Resize if too large (max 2048x2048)
            max_size = (2048, 2048)
            if image.size[0] > max_size[0] or image.size[1] > max_size[1]:
                image.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Convert back to bytes
            img_buffer = io.BytesIO()
            image.save(img_buffer, format='JPEG', quality=85)
            img_buffer.seek(0)
            
            # Encode to base64
            encoded_image = base64.b64encode(img_buffer.getvalue()).decode('utf-8')
            
            logger.info(f"✅ Image processed successfully - Size: {image.size}")
            return encoded_image
            
        except Exception as e:
            logger.error(f"❌ Image processing failed: {str(e)}")
            raise Exception(f"Image processing failed: {str(e)}")
    
    def create_analysis_message(self, prompt, encoded_image=None):
        """Create message format for Watson X AI"""
        if encoded_image:
            return [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": f"You are a medical AI assistant. Analyze this medical image and respond to: {prompt}. Provide a detailed, professional medical assessment."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{encoded_image}"
                            }
                        }
                    ]
                }
            ]
        else:
            return [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": f"""You are a medical AI assistant. The user asks: "{prompt}"

Provide a helpful, professional response with these guidelines:
- Be concise but informative
- Focus on medical accuracy
- For specific medical advice, recommend consulting a professional
- If the question is about image analysis, guide them to upload an image"""
                        }
                    ]
                }
            ]
    
    def analyze_with_model(self, model_name, model, messages):
        """Analyze image/text with specific model"""
        try:
            logger.info(f"🔬 Starting analysis with {model_name}")
            
            response = model.chat(messages=messages)
            
            if response and 'choices' in response and len(response['choices']) > 0:
                result_text = response['choices'][0]['message']['content']
                logger.info(f"✅ {model_name} analysis completed")
                
                return {
                    'status': 'success',
                    'model_name': model_name,
                    'response': result_text,
                    'timestamp': datetime.now().isoformat()
                }
            else:
                raise Exception("Invalid response format from model")
                
        except Exception as e:
            logger.error(f"❌ {model_name} analysis failed: {str(e)}")
            return {
                'status': 'error',
                'model_name': model_name,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def analyze_input(self, image_file=None, prompt=""):
        """Main analysis function for both text and images"""
        if not self.models:
            raise Exception("Watson X AI models not initialized")
        
        try:
            # Process image if provided
            encoded_image = self.encode_image_from_file(image_file) if image_file else None
            
            # Create messages
            messages = self.create_analysis_message(prompt, encoded_image)
            
            # Analyze with both models
            results = {}
            
            for model_key, model in self.models.items():
                model_name = "Pixtral 12B" if model_key == "pixtral" else "Llama 3.2 11B Vision"
                results[model_key] = self.analyze_with_model(model_name, model, messages)
            
            return results
            
        except Exception as e:
            logger.error(f"❌ Analysis failed: {str(e)}")
            raise e

# Initialize analyzer
analyzer = MedicalImageAnalyzer()

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'watson_available': WATSON_AVAILABLE,
        'models_initialized': bool(analyzer.models)
    })

@app.route('/api/analyze', methods=['POST'])
def analyze_medical_image():
    """Analyze medical image endpoint"""
    try:
        # Validate request
        if 'image' not in request.files:
            return jsonify({
                'status': 'error',
                'error': 'No image file provided'
            }), 400
        
        if 'prompt' not in request.form:
            return jsonify({
                'status': 'error',
                'error': 'No analysis prompt provided'
            }), 400
        
        image_file = request.files['image']
        prompt = request.form['prompt']
        
        # Validate file
        if image_file.filename == '':
            return jsonify({
                'status': 'error',
                'error': 'No image file selected'
            }), 400
        
        # Check file type
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'}
        file_extension = image_file.filename.rsplit('.', 1)[1].lower()
        
        if file_extension not in allowed_extensions:
            return jsonify({
                'status': 'error',
                'error': f'Unsupported file type. Allowed: {", ".join(allowed_extensions)}'
            }), 400
        
        logger.info(f"📤 Received analysis request: {prompt[:50]}...")
        
        # Analyze image
        results = analyzer.analyze_input(image_file, prompt)
        
        return jsonify({
            'status': 'success',
            'results': results,
            'prompt': prompt,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"❌ Analysis endpoint error: {str(e)}")
        logger.error(traceback.format_exc())
        
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/chat', methods=['POST'])
def chat_endpoint():
    """Optimized chat endpoint for faster responses"""
    try:
        data = request.get_json()
        
        if not data or 'message' not in data:
            return jsonify({
                'status': 'error',
                'error': 'No message provided'
            }), 400
        
        message = data['message']
        logger.info(f"💬 Received chat message: {message[:50]}...")
        
        if not analyzer.models:
            raise Exception("Watson X AI models not initialized")
        
        # Use only the most appropriate model for text chat (Pixtral)
        model = analyzer.models["pixtral"]
        model_name = "HealthMate AI"
        
        # Create optimized prompt for faster response
        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": f"""Provide a concise medical response to: "{message}"
                        
Guidelines:
- Respond in 2-3 sentences maximum
- Focus on key medical facts
- For complex cases, recommend professional consultation
- If image analysis needed, request upload"""
                    }
                ]
            }
        ]
        
        # Get response with shorter timeout
        response = model.chat(
            messages=messages,
            params={"max_tokens": 150}  # Limit response length
        )
        
        if response and 'choices' in response and len(response['choices']) > 0:
            result_text = response['choices'][0]['message']['content']
            
            # Post-process to ensure brevity
            if len(result_text.split()) > 50:  # If too long
                sentences = result_text.split('. ')
                result_text = '. '.join(sentences[:2]) + '.'  # Take first 2 sentences
            
            return jsonify({
                'status': 'success',
                'response': result_text,
                'timestamp': datetime.now().isoformat()
            })
            
        raise Exception("Invalid response format from model")
        
    except Exception as e:
        logger.error(f"❌ Chat error: {str(e)}")
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/models', methods=['GET'])
def get_models():
    """Get available models information"""
    models_info = {
        'pixtral': {
            'name': 'Pixtral 12B',
            'description': 'Mistral AI vision model specialized in image analysis',
            'capabilities': ['Medical imaging', 'General image analysis', 'Detailed descriptions']
        },
        'llama_vision': {
            'name': 'Llama 3.2 11B Vision',
            'description': 'Meta\'s vision-language model for comprehensive analysis',
            'capabilities': ['Medical assessment', 'Multi-modal understanding', 'Detailed reasoning']
        }
    }
    
    return jsonify({
        'status': 'success',
        'models': models_info,
        'available': bool(analyzer.models),
        'timestamp': datetime.now().isoformat()
    })

@app.errorhandler(413)
def too_large(e):
    return jsonify({
        'status': 'error',
        'error': 'File too large. Maximum size is 16MB.'
    }), 413

@app.errorhandler(500)
def internal_error(e):
    return jsonify({
        'status': 'error',
        'error': 'Internal server error occurred.'
    }), 500

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🏥 HealthMate Medical Image Analysis API")
    print("="*60)
    print(f"📡 Server starting on http://localhost:5000")
    print(f"🔬 Watson X AI Available: {WATSON_AVAILABLE}")
    print(f"🤖 Models Initialized: {bool(analyzer.models)}")
    print("="*60)
    print("\n📋 Available Endpoints:")
    print("  GET  /api/health     - Health check")
    print("  POST /api/analyze    - Analyze medical image")
    print("  POST /api/chat       - Text chat (now using Watson models)")
    print("  GET  /api/models     - Get model information")
    print("\n🚀 Ready to analyze medical images and chat!")
    print("="*60 + "\n")
    
    # Configure for production
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
    
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True,
        threaded=True
    )