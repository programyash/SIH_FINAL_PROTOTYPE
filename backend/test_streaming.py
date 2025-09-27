#!/usr/bin/env python3
"""
Test script for Gemini streaming functionality
"""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_gemini_streaming():
    """Test the Gemini streaming functionality"""
    try:
        from core import gemini_stream
        
        print("Testing Gemini streaming...")
        print("=" * 50)
        
        # Test with a simple prompt
        prompt = "Write a short Python function that calculates the factorial of a number. Include proper documentation and examples."
        
        print(f"Prompt: {prompt}")
        print("\nStreaming response:")
        print("-" * 30)
        
        chunk_count = 0
        for chunk in gemini_stream(prompt):
            print(chunk, end='', flush=True)
            chunk_count += 1
            if chunk_count > 10:  # Limit for testing
                print("\n... (truncated for testing)")
                break
        
        print(f"\n\nStreaming completed! Received {chunk_count} chunks.")
        return True
        
    except ImportError as e:
        print(f"Import error: {e}")
        print("Make sure to install required packages: pip install google-generativeai")
        return False
    except Exception as e:
        print(f"Error during streaming test: {e}")
        return False

if __name__ == "__main__":
    success = test_gemini_streaming()
    if success:
        print("\n✅ Streaming test passed!")
    else:
        print("\n❌ Streaming test failed!")
