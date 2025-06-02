
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing audio request...');
    
    const formData = await req.formData();
    const audioFile = formData.get('audio_file') as File;
    
    if (!audioFile) {
      throw new Error('No audio file provided');
    }

    console.log('Audio file received:', audioFile.name, audioFile.size);

    // Convert audio to text using OpenAI Whisper
    const question = await transcribeAudio(audioFile);
    console.log('Transcribed question:', question);

    // Only proceed if we have a valid transcription
    if (!question || question.trim().length === 0) {
      throw new Error('Could not understand the audio. Please speak clearly and try again.');
    }

    // Generate AI response using OpenAI
    const aiResponse = await generateAIResponse(question);
    console.log('AI response generated:', aiResponse);

    // Get cartoon image from Pixabay
    const imageUrl = await getCartoonImage(question);
    console.log('Image URL:', imageUrl);

    // Generate TTS audio using ElevenLabs
    const audioUrl = await generateTTSAudio(aiResponse);
    console.log('Audio URL generated');

    const response = {
      question: question,
      explanation: aiResponse,
      image_url: imageUrl,
      audio_url: audioUrl
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing audio:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Sorry, I couldn\'t process your question. Please try again!',
        details: error.message 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function transcribeAudio(audioFile: File): Promise<string> {
  try {
    console.log('Starting transcription with Whisper...');
    
    // Use the updated OpenAI API key
    const openaiApiKey = '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';
    
    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');
    formData.append('response_format', 'text');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI Whisper API error:', response.status, errorText);
      throw new Error(`Transcription failed: ${response.statusText}`);
    }

    const transcriptionText = await response.text();
    console.log('Raw transcription result:', transcriptionText);
    
    // Clean up the transcription
    const cleanedText = transcriptionText.trim();
    
    if (!cleanedText || cleanedText.length < 2) {
      throw new Error('No speech detected. Please speak louder and clearer.');
    }

    return cleanedText;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw new Error(`Transcription failed: ${error.message}`);
  }
}

async function generateAIResponse(question: string): Promise<string> {
  try {
    console.log('Generating AI response for question:', question);
    
    // Use the updated OpenAI API key
    const openaiApiKey = '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';
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a cheerful, educational AI assistant for toddlers aged 2-4 years old. Always answer questions in simple, fun language that toddlers can understand. Use emojis to make it more engaging. Keep your answers short (2-3 sentences maximum) and always be positive and encouraging. Make sure to directly answer the specific question asked. Be accurate and educational while keeping it simple.'
          },
          {
            role: 'user',
            content: `Please answer this question from a toddler in simple words: ${question}`
          }
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`AI response failed: ${response.statusText}`);
    }

    const result = await response.json();
    const aiAnswer = result.choices[0]?.message?.content;
    
    if (!aiAnswer) {
      throw new Error('No AI response generated');
    }

    console.log('AI response generated successfully:', aiAnswer);
    return aiAnswer.trim();
  } catch (error) {
    console.error('Error generating AI response:', error);
    throw new Error(`AI response failed: ${error.message}`);
  }
}

async function getCartoonImage(question: string): Promise<string> {
  try {
    console.log('Searching for image based on question:', question);
    
    const pixabayApiKey = Deno.env.get('PIXABAY_API_KEY');
    if (!pixabayApiKey) {
      console.warn('Pixabay API key not configured, using fallback image');
      return "https://via.placeholder.com/400x300/FF6B6B/FFFFFF?text=🌈+Learning+Fun";
    }
    
    // Extract better keywords from the question
    const keywords = extractKeywords(question);
    const searchQuery = `${keywords} children cartoon illustration educational`;
    
    console.log('Image search query:', searchQuery);
    
    const response = await fetch(
      `https://pixabay.com/api/?key=${pixabayApiKey}&q=${encodeURIComponent(searchQuery)}&image_type=illustration&category=education&safesearch=true&min_width=400&per_page=20&orientation=horizontal`
    );

    if (!response.ok) {
      console.error('Pixabay API error:', response.status);
      throw new Error(`Image search failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Pixabay search results:', result.totalHits, 'images found');
    
    if (result.hits && result.hits.length > 0) {
      // Return a random image from the first few results for variety
      const randomIndex = Math.floor(Math.random() * Math.min(result.hits.length, 5));
      const selectedImage = result.hits[randomIndex].webformatURL;
      console.log('Selected image URL:', selectedImage);
      return selectedImage;
    } else {
      // Try a broader search if no results
      console.log('No specific images found, trying broader search...');
      const broadQuery = `learning education children cartoon`;
      
      const broadResponse = await fetch(
        `https://pixabay.com/api/?key=${pixabayApiKey}&q=${encodeURIComponent(broadQuery)}&image_type=illustration&safesearch=true&min_width=400&per_page=10`
      );
      
      if (broadResponse.ok) {
        const broadResult = await broadResponse.json();
        if (broadResult.hits && broadResult.hits.length > 0) {
          return broadResult.hits[0].webformatURL;
        }
      }
      
      // Ultimate fallback
      return "https://via.placeholder.com/400x300/FF6B6B/FFFFFF?text=🌈+Learning+Fun";
    }
  } catch (error) {
    console.error('Error fetching image:', error);
    return "https://via.placeholder.com/400x300/FF6B6B/FFFFFF?text=🌈+Learning+Fun";
  }
}

function extractKeywords(question: string): string {
  // Remove common question words and extract meaningful terms
  const commonWords = ['what', 'is', 'are', 'how', 'why', 'where', 'when', 'a', 'an', 'the', 'do', 'does', 'can', 'will', 'would', 'should', 'could', 'tell', 'me', 'about', 'explain'];
  
  // Clean and split the question
  const words = question.toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter(word => 
      word.length > 2 && 
      !commonWords.includes(word) && 
      !word.match(/^\d+$/) // Remove pure numbers
    );
  
  // Take the most important words (usually nouns and key terms)
  const keywords = words.slice(0, 4).join(' ');
  
  console.log('Extracted keywords from question:', keywords);
  return keywords || 'learning education';
}

async function generateTTSAudio(text: string): Promise<string> {
  try {
    console.log('Generating TTS audio for text:', text.substring(0, 50) + '...');
    
    const elevenlabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!elevenlabsApiKey) {
      throw new Error('ElevenLabs API key not configured');
    }
    
    const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/9BWtsMINqrJLrRacOk9x', {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': elevenlabsApiKey,
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.6,
          similarity_boost: 0.9,
          style: 0.3,
          use_speaker_boost: true
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      throw new Error(`TTS generation failed: ${response.statusText}`);
    }

    // Convert audio to base64
    const arrayBuffer = await response.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    console.log('TTS audio generated successfully, size:', arrayBuffer.byteLength, 'bytes');
    
    // Return as data URL that can be played directly
    return `data:audio/mpeg;base64,${base64Audio}`;
  } catch (error) {
    console.error('Error generating TTS audio:', error);
    throw new Error(`TTS generation failed: ${error.message}`);
  }
}
