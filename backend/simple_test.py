#!/usr/bin/env python3
"""
Simple test for Gemini API usage
"""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_gemini_api():
    """Test basic Gemini API functionality"""
    try:
        import google.generativeai as genai
        
        # Configure API
        genai.configure(api_key=os.getenv("GENAI_API_KEY"))
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        print("Testing Gemini API...")
        print("=" * 30)
        
        # Test non-streaming
        print("1. Testing non-streaming:")
        response = model.generate_content("Write 'Hello World' in Python")
        print(f"Response: {response.text}")
        
        # Test streaming
        print("\n2. Testing streaming:")
        response = model.generate_content("Write 'Hello World' in Python", stream=True)
        print("Streaming response:")
        for chunk in response:
            if chunk.text:
                print(chunk.text, end='', flush=True)
        
        print("\n\n✅ API test successful!")
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Install with: pip install google-generativeai")
        return False
    except Exception as e:
        print(f"❌ API error: {e}")
        return False

if __name__ == "__main__":
    test_gemini_api()
